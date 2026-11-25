import { CurrencyCode, DEFAULT_BRANDING, GymBranding, resolveGymBranding } from './branding';
import {
  MEMBERSHIP_PLANS,
  Member,
  MembershipPlan,
  PAYMENT_MODES,
  PaymentMode,
  migrateStoredMember,
  toIsoDateString,
} from './memberLogic';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_CURRENCIES: readonly CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD'];
const MAX_MEDIA_DATA_LENGTH = 200000;

export interface SupabaseMemberRow {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  email: string | null;
  plan: MembershipPlan;
  fees: number;
  amount_paid: number;
  payment_mode: PaymentMode;
  manual_status: 'active' | 'paused';
  paid_date: string;
  renewal_date: string;
  joined_date: string;
  avatar_url: string | null;
  notes: string | null;
  last_messaged_at: string | null;
}

export interface SupabaseBrandingRow {
  owner_id: string;
  gym_name: string;
  currency: CurrencyCode;
  logo_url: string | null;
}

export interface ParsedOAuthCallback {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
}

export function sanitizeRowId(raw: string, fallbackPrefix = 'mem'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  if (VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

function sanitizeIsoDate(raw: string | undefined, fallback?: string): string {
  if (typeof raw === 'string' && ISO_DATE_REGEX.test(raw.trim())) {
    return raw.trim();
  }
  if (fallback && ISO_DATE_REGEX.test(fallback)) {
    return fallback;
  }
  return toIsoDateString(new Date());
}

function clampString(raw: string | undefined | null, maxLength: number): string {
  return (raw ?? '').trim().slice(0, maxLength);
}

function sanitizeCurrency(currency: string | undefined): CurrencyCode {
  if (currency && ALLOWED_CURRENCIES.includes(currency as CurrencyCode)) {
    return currency as CurrencyCode;
  }
  return DEFAULT_BRANDING.currency;
}

export function brandingToSupabaseRow(
  ownerId: string,
  branding: GymBranding
): SupabaseBrandingRow {
  const resolved = resolveGymBranding(branding);
  const logoUrl =
    resolved.logoUrl && resolved.logoUrl.length <= MAX_MEDIA_DATA_LENGTH
      ? resolved.logoUrl
      : null;

  return {
    owner_id: ownerId,
    gym_name: clampString(resolved.gymName, 48) || DEFAULT_BRANDING.gymName,
    currency: sanitizeCurrency(resolved.currency),
    logo_url: logoUrl,
  };
}

export function supabaseRowToBranding(row: Record<string, unknown> | null): GymBranding {
  if (!row) return { ...DEFAULT_BRANDING };
  return resolveGymBranding({
    gymName: typeof row.gym_name === 'string' ? row.gym_name : undefined,
    currency: typeof row.currency === 'string' ? row.currency : undefined,
    logoUrl: typeof row.logo_url === 'string' && row.logo_url ? row.logo_url : undefined,
  });
}

export function memberToSupabaseRow(ownerId: string, member: Member): SupabaseMemberRow {
  const plan: MembershipPlan = MEMBERSHIP_PLANS.includes(member.plan) ? member.plan : '1 Month';
  const paymentMode: PaymentMode = PAYMENT_MODES.includes(member.paymentMode)
    ? member.paymentMode
    : 'Cash';
  const manualStatus: 'active' | 'paused' =
    member.manualStatus === 'paused' ? 'paused' : 'active';
  const feesRaw = Number.isFinite(member.fees) && member.fees > 0 ? Math.round(member.fees) : 1000;
  const fees = Math.min(Math.max(feesRaw, 1), 10000000);
  const paidRaw = Number.isFinite(member.amountPaid) ? Math.round(member.amountPaid) : fees;
  const amountPaid = Math.min(Math.max(paidRaw, 0), fees);
  const today = toIsoDateString(new Date());
  const paidDate = sanitizeIsoDate(member.paidDate, today);
  const renewalDate = sanitizeIsoDate(member.renewalDate, paidDate);
  const joinedDate = sanitizeIsoDate(member.joinedDate, paidDate);

  const email = clampString(member.email, 254);
  const notes = clampString(member.notes, 500);
  const lastMessagedAt = clampString(member.lastMessagedAt, 64);
  const avatarUrl =
    typeof member.avatarUrl === 'string' &&
    member.avatarUrl.trim().length > 0 &&
    member.avatarUrl.trim().length <= MAX_MEDIA_DATA_LENGTH
      ? member.avatarUrl.trim()
      : null;

  return {
    id: sanitizeRowId(member.id, 'mem'),
    owner_id: ownerId,
    name: clampString(member.name, 100) || 'Member',
    phone: clampString(member.phone, 40) || 'N/A',
    email: email || null,
    plan,
    fees,
    amount_paid: amountPaid,
    payment_mode: paymentMode,
    manual_status: manualStatus,
    paid_date: paidDate,
    renewal_date: renewalDate,
    joined_date: joinedDate,
    avatar_url: avatarUrl,
    notes: notes || null,
    last_messaged_at: lastMessagedAt || null,
  };
}

export function supabaseRowToMember(row: Record<string, unknown>): Member {
  return migrateStoredMember({
    id: typeof row.id === 'string' ? row.id : '',
    name: typeof row.name === 'string' ? row.name : '',
    phone: typeof row.phone === 'string' ? row.phone : '',
    email: typeof row.email === 'string' ? row.email : undefined,
    plan: typeof row.plan === 'string' ? row.plan : undefined,
    fees: typeof row.fees === 'number' ? row.fees : undefined,
    amountPaid: typeof row.amount_paid === 'number' ? row.amount_paid : undefined,
    paymentMode: typeof row.payment_mode === 'string' ? row.payment_mode : undefined,
    manualStatus: typeof row.manual_status === 'string' ? row.manual_status : undefined,
    paidDate: typeof row.paid_date === 'string' ? row.paid_date : undefined,
    renewalDate: typeof row.renewal_date === 'string' ? row.renewal_date : undefined,
    joinedDate: typeof row.joined_date === 'string' ? row.joined_date : undefined,
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    lastMessagedAt: typeof row.last_messaged_at === 'string' ? row.last_messaged_at : undefined,
  });
}

export function parseOAuthCallbackParams(search: string, hash: string): ParsedOAuthCallback {
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  return {
    code: searchParams.get('code') || hashParams.get('code'),
    accessToken: hashParams.get('access_token') || searchParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token') || searchParams.get('refresh_token'),
    error: searchParams.get('error') || hashParams.get('error'),
    errorDescription:
      searchParams.get('error_description') || hashParams.get('error_description'),
  };
}

export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

export function mapSupabaseAuthError(error: unknown): string {
  const rawMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : typeof error === 'string'
        ? error
        : '';

  if (/provider is not enabled|unsupported provider/i.test(rawMessage)) {
    return 'Google Sign-In is not enabled yet in your Supabase project. Enable Google under Authentication → Providers in Supabase, or sign in with email & password below.';
  }
  if (/invalid login credentials/i.test(rawMessage)) {
    return 'Incorrect email or password. Double-check your credentials or create a new account.';
  }
  if (/email not confirmed/i.test(rawMessage)) {
    return 'Please confirm your email address using the link sent to your inbox before signing in.';
  }
  if (/user already registered/i.test(rawMessage)) {
    return 'An account with this email already exists. Switch to Sign In to access it.';
  }
  if (/password should be at least/i.test(rawMessage)) {
    return 'Password must be at least 6 characters long.';
  }
  if (/popup/i.test(rawMessage)) {
    return rawMessage;
  }
  if (/failed to fetch|network/i.test(rawMessage)) {
    return 'Network error while connecting to Supabase. Check your connection and try again.';
  }
  return rawMessage || 'Could not complete authentication. Please try again.';
}
