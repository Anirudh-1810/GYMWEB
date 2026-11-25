import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  DEFAULT_BRANDING,
  GymBranding,
  resolveGymBranding,
} from './branding';
import { Member, migrateStoredMember } from './memberLogic';

export interface DbMemberRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  plan: string;
  fees: number;
  amount_paid: number;
  payment_mode: string;
  manual_status: string;
  paid_date: string;
  renewal_date: string;
  joined_date: string;
  avatar_url: string | null;
  notes: string | null;
  last_messaged_at: string | null;
  updated_at?: string;
}

export interface DbBrandingRow {
  user_id: string;
  gym_name: string;
  logo_url: string | null;
  currency: string;
  updated_at?: string;
}

export interface UserDisplayInfo {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  initials: string;
}

export interface WorkspaceLoadResult {
  members: Member[];
  branding: GymBranding;
  cloudConnected: boolean;
  schemaMissing: boolean;
  errorMessage?: string;
}

export interface CloudSyncResult<T = undefined> {
  ok: boolean;
  data?: T;
  schemaMissing?: boolean;
  errorMessage?: string;
}

const LEGACY_STATIC_STORAGE_KEYS = [
  'ironpulse_members_v1',
  'ironpulse_gym_branding_v1',
];

/**
 * Removes any legacy pre-auth localStorage keys that previously stored static
 * seed data across the browser, ensuring every Gmail account is 100% isolated.
 */
export function purgeLegacyStaticStorage(): void {
  try {
    for (const key of LEGACY_STATIC_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

/**
 * Converts a Supabase PostgREST / PostgreSQL error into a concise, actionable
 * user-facing message without leaking raw internal stack traces.
 */
export function formatDbSyncError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Could not sync to Supabase right now — saved locally on this device.';
  }
  const err = error as { code?: unknown; message?: unknown };
  const code = typeof err.code === 'string' ? err.code : '';
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : '';

  if (isMissingTableError(error)) {
    return 'Run supabase/schema.sql in your Supabase SQL Editor to create the members & gym_branding tables.';
  }
  if (
    code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied')
  ) {
    return 'Supabase permission check blocked this write. Sign out and sign back in, or re-run the RLS policies in supabase/schema.sql.';
  }
  if (code === '23503' || message.includes('foreign key')) {
    return 'Your login session needs a quick refresh. Please log out and sign in with Google again.';
  }
  if (message.includes('jwt') || message.includes('not authenticated') || code === 'PGRST301') {
    return 'Your session expired. Please log out and sign in again to sync to Supabase.';
  }
  return 'Could not sync to Supabase right now — check your internet connection and try again.';
}

/**
 * Normalizes a Supabase project URL by stripping accidental API path suffixes
 * (such as /rest/v1 or /auth/v1) and trailing slashes so createClient() always
 * targets the project origin cleanly.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const cleanedPath = parsed.pathname
      .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+\/?$/i, '')
      .replace(/\/+$/, '');
    return `${parsed.origin}${cleanedPath}`;
  } catch {
    return trimmed
      .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+\/?$/i, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Generates strictly user-scoped localStorage keys so different logins on the
 * same browser never read or overwrite each other's cached roster or branding.
 */
export function getUserStorageKeys(userId: string): {
  membersKey: string;
  brandingKey: string;
} {
  const safeId = userId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeId) {
    throw new Error('Cannot compute storage keys for an empty user ID.');
  }
  return {
    membersKey: `ironpulse_members_v2_${safeId}`,
    brandingKey: `ironpulse_branding_v2_${safeId}`,
  };
}

/**
 * Converts an in-app Member model into a snake_case Supabase row strictly
 * bound to the authenticated user's ID.
 */
export function memberToDbRow(member: Member, userId: string): DbMemberRow {
  return {
    id: member.id,
    user_id: userId,
    name: member.name.trim(),
    phone: member.phone.trim(),
    email: member.email?.trim() ? member.email.trim() : null,
    plan: member.plan,
    fees: Math.max(1, Math.round(member.fees)),
    amount_paid: Math.max(0, Math.min(Math.round(member.fees), Math.round(member.amountPaid))),
    payment_mode: member.paymentMode,
    manual_status: member.manualStatus === 'paused' ? 'paused' : 'active',
    paid_date: member.paidDate,
    renewal_date: member.renewalDate,
    joined_date: member.joinedDate,
    avatar_url: member.avatarUrl?.trim() ? member.avatarUrl.trim() : null,
    notes: member.notes?.trim() ? member.notes.trim() : null,
    last_messaged_at: member.lastMessagedAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Converts a Supabase members table row into a validated in-app Member.
 */
export function dbRowToMember(row: Record<string, unknown>): Member {
  return migrateStoredMember({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    plan: row.plan,
    fees: row.fees,
    amountPaid: row.amount_paid ?? row.amountPaid,
    paymentMode: row.payment_mode ?? row.paymentMode,
    manualStatus: row.manual_status ?? row.manualStatus,
    paidDate: row.paid_date ?? row.paidDate,
    renewalDate: row.renewal_date ?? row.renewalDate,
    joinedDate: row.joined_date ?? row.joinedDate,
    avatarUrl: row.avatar_url ?? row.avatarUrl ?? undefined,
    notes: row.notes ?? undefined,
    lastMessagedAt: row.last_messaged_at ?? row.lastMessagedAt ?? undefined,
  });
}

/**
 * Converts GymBranding to a snake_case Supabase row bound to userId.
 */
export function brandingToDbRow(
  branding: GymBranding,
  userId: string
): DbBrandingRow {
  const safe = resolveGymBranding(branding);
  return {
    user_id: userId,
    gym_name: safe.gymName,
    logo_url: safe.logoUrl ?? null,
    currency: safe.currency,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Converts a Supabase gym_branding row into a validated GymBranding object.
 */
export function dbRowToBranding(
  row: Record<string, unknown> | null | undefined
): GymBranding {
  if (!row) {
    return { ...DEFAULT_BRANDING };
  }
  return resolveGymBranding({
    gymName: row.gym_name ?? row.gymName,
    logoUrl: row.logo_url ?? row.logoUrl ?? undefined,
    currency: row.currency,
  });
}

/**
 * Returns true if a Supabase/PostgREST error indicates the required database
 * tables have not been created yet in the project.
 */
export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: unknown; message?: unknown };
  const code = typeof err.code === 'string' ? err.code : '';
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

/**
 * Maps raw Supabase authentication errors to safe, user-readable messages
 * without leaking internal stack traces or backend implementation details.
 */
export function sanitizeAuthError(error: unknown): string {
  if (!error) return 'Sign-in could not be completed. Please try again.';
  const rawMessage =
    typeof error === 'string'
      ? error
      : typeof (error as { message?: unknown }).message === 'string'
        ? ((error as { message: string }).message)
        : '';
  const lower = rawMessage.toLowerCase();

  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Google sign-in is not enabled yet in your Supabase project. Enable Google under Authentication → Providers.';
  }
  if (lower.includes('redirect_uri') || lower.includes('redirect url')) {
    return 'This app URL is not allow-listed yet in Supabase Authentication → URL Configuration.';
  }
  if (lower.includes('popup')) {
    return 'Sign-in window was blocked by your browser. Please allow popups and try again.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Unable to reach Supabase right now. Check your internet connection and try again.';
  }
  return 'Could not complete Google sign-in. Verify Google Auth settings in your Supabase dashboard and try again.';
}

/**
 * Safely extracts owner identity metadata from a Supabase User object.
 */
export function getUserDisplayInfo(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>
): UserDisplayInfo {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const rawName =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    '';
  const email = (user.email ?? '').trim();
  const displayName = rawName || (email ? email.split('@')[0] : 'Gym Owner');
  const rawAvatar =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url.trim()) ||
    (typeof metadata.picture === 'string' && metadata.picture.trim()) ||
    undefined;

  const safeAvatar =
    rawAvatar && /^https?:\/\//i.test(rawAvatar) ? rawAvatar : undefined;

  const parts = displayName.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase() || 'GO';

  const info: UserDisplayInfo = {
    id: user.id,
    displayName,
    email,
    initials,
  };
  if (safeAvatar) {
    info.avatarUrl = safeAvatar;
  }
  return info;
}

/**
 * Reads user-isolated cached members from localStorage (fallback for offline
 * or before SQL schema is executed).
 */
export function readUserCachedMembers(userId: string): Member[] {
  try {
    const { membersKey } = getUserStorageKeys(userId);
    const raw = window.localStorage.getItem(membersKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === 'object')
      )
      .map((item) => migrateStoredMember(item));
  } catch {
    return [];
  }
}

export function writeUserCachedMembers(userId: string, members: Member[]): void {
  try {
    const { membersKey } = getUserStorageKeys(userId);
    window.localStorage.setItem(membersKey, JSON.stringify(members));
  } catch {
    // Ignore storage quota issues in restricted browser contexts
  }
}

export function readUserCachedBranding(userId: string): GymBranding {
  try {
    const { brandingKey } = getUserStorageKeys(userId);
    const raw = window.localStorage.getItem(brandingKey);
    if (!raw) return { ...DEFAULT_BRANDING };
    return resolveGymBranding(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export function writeUserCachedBranding(
  userId: string,
  branding: GymBranding
): void {
  try {
    const { brandingKey } = getUserStorageKeys(userId);
    window.localStorage.setItem(brandingKey, JSON.stringify(branding));
  } catch {
    // Ignore storage quota issues in restricted browser contexts
  }
}

/**
 * Loads the authenticated user's isolated members and gym branding from Supabase,
 * falling back cleanly to that user's scoped local cache if offline or if tables
 * have not been provisioned yet.
 */
export async function loadUserWorkspace(
  client: SupabaseClient,
  userId: string
): Promise<WorkspaceLoadResult> {
  purgeLegacyStaticStorage();
  const cachedMembers = readUserCachedMembers(userId);
  const cachedBranding = readUserCachedBranding(userId);

  try {
    const [membersRes, brandingRes] = await Promise.all([
      client
        .from('members')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      client
        .from('gym_branding')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (membersRes.error || brandingRes.error) {
      const primaryError = membersRes.error ?? brandingRes.error;
      if (isMissingTableError(primaryError)) {
        return {
          members: cachedMembers,
          branding: cachedBranding,
          cloudConnected: false,
          schemaMissing: true,
        };
      }
      return {
        members: cachedMembers,
        branding: cachedBranding,
        cloudConnected: false,
        schemaMissing: false,
        errorMessage: formatDbSyncError(primaryError),
      };
    }

    const remoteMembers = (membersRes.data ?? []).map((row) =>
      dbRowToMember(row as Record<string, unknown>)
    );
    const remoteBranding = brandingRes.data
      ? dbRowToBranding(brandingRes.data as Record<string, unknown>)
      : { ...DEFAULT_BRANDING };

    writeUserCachedMembers(userId, remoteMembers);
    writeUserCachedBranding(userId, remoteBranding);

    return {
      members: remoteMembers,
      branding: remoteBranding,
      cloudConnected: true,
      schemaMissing: false,
    };
  } catch {
    return {
      members: cachedMembers,
      branding: cachedBranding,
      cloudConnected: false,
      schemaMissing: false,
      errorMessage: 'Offline mode — showing your saved local copy for this account.',
    };
  }
}

export async function createUserMember(
  client: SupabaseClient,
  userId: string,
  member: Member
): Promise<CloudSyncResult<Member>> {
  try {
    const { data, error } = await client
      .from('members')
      .insert(memberToDbRow(member, userId))
      .select()
      .single();
    if (error) {
      return {
        ok: false,
        schemaMissing: isMissingTableError(error),
        errorMessage: formatDbSyncError(error),
      };
    }
    return {
      ok: true,
      data: data ? dbRowToMember(data as Record<string, unknown>) : member,
    };
  } catch {
    return {
      ok: false,
      errorMessage: 'Saved locally while offline — reconnect to sync to Supabase.',
    };
  }
}

export async function updateUserMember(
  client: SupabaseClient,
  userId: string,
  member: Member
): Promise<CloudSyncResult<Member>> {
  try {
    const row = memberToDbRow(member, userId);
    const { data, error } = await client
      .from('members')
      .update(row)
      .eq('user_id', userId)
      .eq('id', member.id)
      .select()
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        schemaMissing: isMissingTableError(error),
        errorMessage: formatDbSyncError(error),
      };
    }

    // If the record existed only in offline cache before tables were created, upsert it now
    if (!data) {
      return upsertUserMember(client, userId, member);
    }

    return {
      ok: true,
      data: dbRowToMember(data as Record<string, unknown>),
    };
  } catch {
    return {
      ok: false,
      errorMessage: 'Saved locally while offline — reconnect to sync to Supabase.',
    };
  }
}

export async function upsertUserMember(
  client: SupabaseClient,
  userId: string,
  member: Member
): Promise<CloudSyncResult<Member>> {
  try {
    const { data, error } = await client
      .from('members')
      .upsert(memberToDbRow(member, userId), { onConflict: 'user_id,id' })
      .select()
      .single();
    if (error) {
      return {
        ok: false,
        schemaMissing: isMissingTableError(error),
        errorMessage: formatDbSyncError(error),
      };
    }
    return {
      ok: true,
      data: data ? dbRowToMember(data as Record<string, unknown>) : member,
    };
  } catch {
    return {
      ok: false,
      errorMessage: 'Saved locally while offline — reconnect to sync to Supabase.',
    };
  }
}

export async function deleteUserMember(
  client: SupabaseClient,
  userId: string,
  memberId: string
): Promise<CloudSyncResult> {
  try {
    const { error } = await client
      .from('members')
      .delete()
      .eq('user_id', userId)
      .eq('id', memberId);
    if (error) {
      return {
        ok: false,
        schemaMissing: isMissingTableError(error),
        errorMessage: formatDbSyncError(error),
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      errorMessage: 'Removed locally while offline — reconnect to sync to Supabase.',
    };
  }
}

export async function upsertUserBranding(
  client: SupabaseClient,
  userId: string,
  branding: GymBranding
): Promise<CloudSyncResult<GymBranding>> {
  try {
    const { data, error } = await client
      .from('gym_branding')
      .upsert(brandingToDbRow(branding, userId), { onConflict: 'user_id' })
      .select()
      .single();
    if (error) {
      return {
        ok: false,
        schemaMissing: isMissingTableError(error),
        errorMessage: formatDbSyncError(error),
      };
    }
    return {
      ok: true,
      data: data ? dbRowToBranding(data as Record<string, unknown>) : branding,
    };
  } catch {
    return {
      ok: false,
      errorMessage: 'Saved branding locally while offline — reconnect to sync to Supabase.',
    };
  }
}
