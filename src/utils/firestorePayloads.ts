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

export function sanitizeDocumentId(raw: string, fallbackPrefix = 'mem'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  if (VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

export function sanitizeIsoDate(raw: string | undefined, fallback?: string): string {
  if (typeof raw === 'string' && ISO_DATE_REGEX.test(raw.trim())) {
    return raw.trim();
  }
  if (fallback && ISO_DATE_REGEX.test(fallback)) {
    return fallback;
  }
  return toIsoDateString(new Date());
}

export function clampString(raw: string | undefined, maxLength: number): string {
  return (raw ?? '').trim().slice(0, maxLength);
}

export interface AuthUserInput {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export function buildUserProfileCreatePayload<T>(
  user: AuthUserInput,
  timestampToken: T
): Record<string, unknown> {
  const email = clampString(user.email ?? '', 254);
  const fallbackName = email.includes('@') ? email.split('@')[0] : 'Gym Owner';
  const displayName = clampString(user.displayName || fallbackName, 100) || 'Gym Owner';
  const payload: Record<string, unknown> = {
    uid: sanitizeDocumentId(user.uid, 'user'),
    displayName,
    email,
    createdAt: timestampToken,
    updatedAt: timestampToken,
  };
  const photoURL = clampString(user.photoURL ?? '', 1024);
  if (photoURL) {
    payload.photoURL = photoURL;
  }
  return payload;
}

export function buildUserProfileUpdatePayload<T, D>(
  user: AuthUserInput,
  timestampToken: T,
  deleteFieldToken: D
): Record<string, unknown> {
  const email = clampString(user.email ?? '', 254);
  const fallbackName = email.includes('@') ? email.split('@')[0] : 'Gym Owner';
  const displayName = clampString(user.displayName || fallbackName, 100) || 'Gym Owner';
  const payload: Record<string, unknown> = {
    displayName,
    email,
    updatedAt: timestampToken,
  };
  const photoURL = clampString(user.photoURL ?? '', 1024);
  if (photoURL) {
    payload.photoURL = photoURL;
  } else {
    payload.photoURL = deleteFieldToken;
  }
  return payload;
}

function sanitizeCurrency(currency: string | undefined): CurrencyCode {
  if (currency && ALLOWED_CURRENCIES.includes(currency as CurrencyCode)) {
    return currency as CurrencyCode;
  }
  return DEFAULT_BRANDING.currency;
}

export function buildBrandingCreatePayload<T>(
  ownerId: string,
  branding: GymBranding,
  timestampToken: T
): Record<string, unknown> {
  const resolved = resolveGymBranding(branding);
  const payload: Record<string, unknown> = {
    ownerId: sanitizeDocumentId(ownerId, 'user'),
    gymName: clampString(resolved.gymName, 48) || DEFAULT_BRANDING.gymName,
    currency: sanitizeCurrency(resolved.currency),
    createdAt: timestampToken,
    updatedAt: timestampToken,
  };
  if (resolved.logoUrl && resolved.logoUrl.length <= MAX_MEDIA_DATA_LENGTH) {
    payload.logoUrl = resolved.logoUrl;
  }
  return payload;
}

export function buildBrandingUpdatePayload<T, D>(
  branding: GymBranding,
  timestampToken: T,
  deleteFieldToken: D
): Record<string, unknown> {
  const resolved = resolveGymBranding(branding);
  const payload: Record<string, unknown> = {
    gymName: clampString(resolved.gymName, 48) || DEFAULT_BRANDING.gymName,
    currency: sanitizeCurrency(resolved.currency),
    updatedAt: timestampToken,
  };
  if (resolved.logoUrl && resolved.logoUrl.length <= MAX_MEDIA_DATA_LENGTH) {
    payload.logoUrl = resolved.logoUrl;
  } else {
    payload.logoUrl = deleteFieldToken;
  }
  return payload;
}

function normalizeMemberCore(member: Member) {
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

  return {
    id: sanitizeDocumentId(member.id, 'mem'),
    name: clampString(member.name, 100) || 'Member',
    phone: clampString(member.phone, 40) || 'N/A',
    email: clampString(member.email, 254),
    plan,
    fees,
    amountPaid,
    paymentMode,
    manualStatus,
    paidDate,
    renewalDate,
    joinedDate,
    avatarUrl:
      typeof member.avatarUrl === 'string' &&
      member.avatarUrl.trim().length > 0 &&
      member.avatarUrl.trim().length <= MAX_MEDIA_DATA_LENGTH
        ? member.avatarUrl.trim()
        : '',
    notes: clampString(member.notes, 500),
    lastMessagedAt: clampString(member.lastMessagedAt, 64),
  };
}

export function buildMemberCreatePayload<T>(
  ownerId: string,
  member: Member,
  timestampToken: T
): Record<string, unknown> {
  const core = normalizeMemberCore(member);
  const payload: Record<string, unknown> = {
    id: core.id,
    ownerId: sanitizeDocumentId(ownerId, 'user'),
    name: core.name,
    phone: core.phone,
    plan: core.plan,
    fees: core.fees,
    amountPaid: core.amountPaid,
    paymentMode: core.paymentMode,
    manualStatus: core.manualStatus,
    paidDate: core.paidDate,
    renewalDate: core.renewalDate,
    joinedDate: core.joinedDate,
    createdAt: timestampToken,
    updatedAt: timestampToken,
  };
  if (core.email) payload.email = core.email;
  if (core.avatarUrl) payload.avatarUrl = core.avatarUrl;
  if (core.notes) payload.notes = core.notes;
  if (core.lastMessagedAt) payload.lastMessagedAt = core.lastMessagedAt;
  return payload;
}

export function buildMemberUpdatePayload<T, D>(
  member: Member,
  timestampToken: T,
  deleteFieldToken: D
): Record<string, unknown> {
  const core = normalizeMemberCore(member);
  return {
    name: core.name,
    phone: core.phone,
    email: core.email ? core.email : deleteFieldToken,
    plan: core.plan,
    fees: core.fees,
    amountPaid: core.amountPaid,
    paymentMode: core.paymentMode,
    manualStatus: core.manualStatus,
    paidDate: core.paidDate,
    renewalDate: core.renewalDate,
    joinedDate: core.joinedDate,
    avatarUrl: core.avatarUrl ? core.avatarUrl : deleteFieldToken,
    notes: core.notes ? core.notes : deleteFieldToken,
    updatedAt: timestampToken,
  };
}

export function buildMemberQuickPayUpdatePayload<T>(
  updated: Pick<Member, 'paidDate' | 'renewalDate' | 'paymentMode' | 'amountPaid' | 'fees' | 'manualStatus'>,
  timestampToken: T
): Record<string, unknown> {
  const fees = Number.isFinite(updated.fees) && updated.fees > 0 ? Math.round(updated.fees) : 1000;
  const amountPaid = Math.min(Math.max(Math.round(updated.amountPaid), 0), fees);
  const paymentMode: PaymentMode = PAYMENT_MODES.includes(updated.paymentMode)
    ? updated.paymentMode
    : 'Cash';
  const manualStatus: 'active' | 'paused' =
    updated.manualStatus === 'paused' ? 'paused' : 'active';
  const today = toIsoDateString(new Date());

  return {
    paidDate: sanitizeIsoDate(updated.paidDate, today),
    renewalDate: sanitizeIsoDate(updated.renewalDate, today),
    paymentMode,
    amountPaid,
    manualStatus,
    updatedAt: timestampToken,
  };
}

export function buildMemberMessagedUpdatePayload<T>(
  isoTimestamp: string,
  timestampToken: T
): Record<string, unknown> {
  return {
    lastMessagedAt: clampString(isoTimestamp || new Date().toISOString(), 64),
    updatedAt: timestampToken,
  };
}

export function docDataToMember(docId: string, data: Record<string, unknown>): Member {
  return migrateStoredMember({
    ...data,
    id: typeof data.id === 'string' && data.id ? data.id : docId,
  });
}

export function mapAuthErrorToMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing Google sign-in. Tap the button again to continue.';
    case 'auth/cancelled-popup-request':
      return 'A Google sign-in popup is already open. Please finish signing in there.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Check your internet connection and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet authorized for Google Sign-In in Firebase Authentication settings.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email using a different sign-in method.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Wait a moment and try again.';
    default:
      if (error instanceof Error && error.message) {
        return 'Could not complete Google sign-in. Please try again.';
      }
      return 'Could not complete Google sign-in. Please try again.';
  }
}
