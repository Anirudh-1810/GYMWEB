export type MembershipPlan =
  | '1 Month'
  | '2 Months'
  | '3 Months'
  | '6 Months'
  | '12 Months';

export type ManualStatus = 'active' | 'paused';

export type ComputedStatus = 'active' | 'expiring_soon' | 'expired' | 'paused';

export type StatusFilter = 'all' | ComputedStatus;

export type SortOption = 'renewal_soonest' | 'name_asc' | 'newest_added';

export interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  plan: MembershipPlan;
  fees: number;
  manualStatus: ManualStatus;
  paidDate: string; // YYYY-MM-DD
  renewalDate: string; // YYYY-MM-DD (calculated due date)
  joinedDate: string; // YYYY-MM-DD
  avatarUrl?: string;
  notes?: string;
  lastMessagedAt?: string; // ISO string
}

export interface MemberFormInput {
  name: string;
  phone: string;
  email?: string;
  plan: MembershipPlan;
  fees: number;
  manualStatus: ManualStatus;
  paidDate: string;
  renewalDate?: string;
  avatarUrl?: string;
  notes?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof MemberFormInput, string>>;
}

export interface DashboardMetrics {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  paused: number;
  activeStanding: number; // active + expiringSoon
  activeRate: number; // 0-100 integer percentage
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  '1 Month',
  '2 Months',
  '3 Months',
  '6 Months',
  '12 Months',
];

export const FEE_PRESETS: number[] = [1000, 1500, 2500, 4500, 8000];

export const EXPIRING_SOON_DAYS = 7;

/**
 * Returns the number of months represented by a membership plan.
 */
export function getPlanMonths(plan: MembershipPlan): number {
  switch (plan) {
    case '1 Month':
      return 1;
    case '2 Months':
      return 2;
    case '3 Months':
      return 3;
    case '6 Months':
      return 6;
    case '12 Months':
      return 12;
  }
}

/**
 * Returns the approximate billing cycle length in days for a membership plan.
 */
export function getPlanCycleDays(plan: MembershipPlan): number {
  switch (plan) {
    case '12 Months':
      return 365;
    case '6 Months':
      return 180;
    case '3 Months':
      return 90;
    case '2 Months':
      return 60;
    case '1 Month':
    default:
      return 30;
  }
}

/**
 * Normalizes plan labels (including legacy labels and CSV aliases) to one of the
 * standard duration plans (1, 2, 3, 6, or 12 Months).
 */
export function normalizeMembershipPlan(rawPlan: string): MembershipPlan {
  const lower = rawPlan.trim().toLowerCase();
  const exact = MEMBERSHIP_PLANS.find((p) => p.toLowerCase() === lower);
  if (exact) return exact;

  if (
    lower.includes('12') ||
    lower.includes('annual') ||
    lower.includes('year') ||
    lower === '1y'
  ) {
    return '12 Months';
  }
  if (lower.includes('6') || lower.includes('half') || lower.includes('semi')) {
    return '6 Months';
  }
  if (lower.includes('3') || lower.includes('quarter')) {
    return '3 Months';
  }
  if (lower.includes('2') || lower.includes('bi-month') || lower.includes('bimonth')) {
    return '2 Months';
  }
  return '1 Month';
}

/**
 * Formats a membership fee amount cleanly with currency symbol and grouping.
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '₹0';
  }
  return `₹${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))}`;
}

/**
 * Formats a Date object as YYYY-MM-DD in local calendar time.
 */
export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD date string strictly into a local-midnight Date.
 * Returns null if the string is not a valid calendar date.
 */
export function parseIsoDate(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }
  const [y, m, d] = isoDate.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return null;
  }
  return parsed;
}

/**
 * Adds (or subtracts when negative) calendar months to a YYYY-MM-DD string,
 * clamping month-end days safely (e.g. Jan 31 + 1 month -> Feb 28).
 */
export function addMonthsToIsoDate(
  baseIsoDate: string,
  monthsDelta: number
): string {
  const parsed = parseIsoDate(baseIsoDate);
  if (!parsed) {
    return '';
  }
  const originalDay = parsed.getDate();
  parsed.setDate(1);
  parsed.setMonth(parsed.getMonth() + monthsDelta);
  const maxDayInMonth = new Date(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    0
  ).getDate();
  parsed.setDate(Math.min(originalDay, maxDayInMonth));
  return toIsoDateString(parsed);
}

/**
 * Calculates the next due/renewal date from a paid date and membership plan.
 */
export function calculateRenewalFromPaidDate(
  paidDate: string,
  plan: MembershipPlan
): string {
  return addMonthsToIsoDate(paidDate, getPlanMonths(plan));
}

/**
 * Returns the whole-day difference between renewalDate and referenceDate
 * (positive = days remaining, 0 = due today, negative = days overdue).
 */
export function getDaysUntilRenewal(
  renewalDate: string,
  referenceDate: Date = new Date()
): number {
  const target = parseIsoDate(renewalDate);
  if (!target) {
    return 0;
  }
  const todayUtc = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const targetUtc = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

/**
 * Computes the effective membership status from manual override + renewal date.
 */
export function computeMemberStatus(
  member: Pick<Member, 'renewalDate' | 'manualStatus'>,
  referenceDate: Date = new Date()
): ComputedStatus {
  if (member.manualStatus === 'paused') {
    return 'paused';
  }
  const days = getDaysUntilRenewal(member.renewalDate, referenceDate);
  if (days < 0) {
    return 'expired';
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return 'expiring_soon';
  }
  return 'active';
}

export function getStatusLabel(status: ComputedStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expiring_soon':
      return 'Expiring Soon';
    case 'expired':
      return 'Expired';
    case 'paused':
      return 'Paused';
  }
}

export function formatDisplayDate(isoDate: string): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export function formatRelativeRenewal(
  renewalDate: string,
  status: ComputedStatus,
  referenceDate: Date = new Date()
): string {
  if (status === 'paused') {
    return 'Membership on hold';
  }
  const days = getDaysUntilRenewal(renewalDate, referenceDate);
  if (days < -1) {
    return `${Math.abs(days)} days overdue`;
  }
  if (days === -1) {
    return '1 day overdue';
  }
  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return 'Due tomorrow';
  }
  return `In ${days} days`;
}

/**
 * Computes billing cycle progress (0-100) that fills as the due/payment date approaches.
 * Uses the exact span between paidDate and renewalDate when valid, otherwise falls back
 * to the plan cycle length.
 */
export function computeRenewalProgress(
  member: Pick<Member, 'plan' | 'renewalDate' | 'manualStatus'> & {
    paidDate?: string;
  },
  referenceDate: Date = new Date()
): number {
  let cycleDays = getPlanCycleDays(member.plan);

  if (member.paidDate) {
    const paid = parseIsoDate(member.paidDate);
    const due = parseIsoDate(member.renewalDate);
    if (paid && due) {
      const paidUtc = Date.UTC(paid.getFullYear(), paid.getMonth(), paid.getDate());
      const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
      const span = Math.round((dueUtc - paidUtc) / 86_400_000);
      if (span > 0) {
        cycleDays = span;
      }
    }
  }

  const daysRemaining = getDaysUntilRenewal(member.renewalDate, referenceDate);

  if (member.manualStatus === 'paused') {
    const rawPaused = Math.round(
      ((cycleDays - Math.max(daysRemaining, 0)) / cycleDays) * 100
    );
    return Math.max(10, Math.min(95, rawPaused));
  }

  if (daysRemaining <= 0) {
    return 100;
  }

  const elapsed = cycleDays - daysRemaining;
  const percentage = Math.round((elapsed / cycleDays) * 100);
  return Math.max(6, Math.min(99, percentage));
}

/**
 * Computes aggregate client counts for the top dashboard strip.
 */
export function computeDashboardMetrics(
  members: Member[],
  referenceDate: Date = new Date()
): DashboardMetrics {
  let active = 0;
  let expiringSoon = 0;
  let expired = 0;
  let paused = 0;

  for (const member of members) {
    const status = computeMemberStatus(member, referenceDate);
    if (status === 'active') active += 1;
    else if (status === 'expiring_soon') expiringSoon += 1;
    else if (status === 'expired') expired += 1;
    else if (status === 'paused') paused += 1;
  }

  const total = members.length;
  const activeStanding = active + expiringSoon;
  const activeRate = total === 0 ? 0 : Math.round((activeStanding / total) * 100);

  return {
    total,
    active,
    expiringSoon,
    expired,
    paused,
    activeStanding,
    activeRate,
  };
}

/**
 * Filters members by search query + status filter and applies deterministic sorting.
 */
export function filterAndSortMembers(
  members: Member[],
  options: {
    query: string;
    statusFilter: StatusFilter;
    sortBy: SortOption;
  },
  referenceDate: Date = new Date()
): Member[] {
  const normalizedQuery = options.query.trim().toLowerCase();

  const filtered = members.filter((member) => {
    if (options.statusFilter !== 'all') {
      const status = computeMemberStatus(member, referenceDate);
      if (status !== options.statusFilter) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    const digitsOnlyQuery = normalizedQuery.replace(/\D/g, '');
    const phoneDigits = member.phone.replace(/\D/g, '');
    const emailLower = (member.email ?? '').toLowerCase();
    const feesString = String(member.fees);

    return (
      member.name.toLowerCase().includes(normalizedQuery) ||
      emailLower.includes(normalizedQuery) ||
      member.plan.toLowerCase().includes(normalizedQuery) ||
      member.phone.toLowerCase().includes(normalizedQuery) ||
      feesString.includes(normalizedQuery) ||
      (digitsOnlyQuery.length >= 3 && phoneDigits.includes(digitsOnlyQuery))
    );
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'name_asc') {
      return a.name.localeCompare(b.name);
    }
    if (options.sortBy === 'newest_added') {
      return (
        b.paidDate.localeCompare(a.paidDate) ||
        b.joinedDate.localeCompare(a.joinedDate) ||
        a.name.localeCompare(b.name)
      );
    }
    // renewal_soonest: paused members at bottom, then soonest renewal date
    const statusA = computeMemberStatus(a, referenceDate);
    const statusB = computeMemberStatus(b, referenceDate);
    if (statusA === 'paused' && statusB !== 'paused') return 1;
    if (statusB === 'paused' && statusA !== 'paused') return -1;
    return (
      a.renewalDate.localeCompare(b.renewalDate) || a.name.localeCompare(b.name)
    );
  });
}

/**
 * Validates new/edited member form values strictly without substituting fallbacks.
 * Email is optional; when provided, it must be a valid email address.
 */
export function validateMemberInput(input: MemberFormInput): ValidationResult {
  const errors: Partial<Record<keyof MemberFormInput, string>> = {};

  if (!input.name.trim()) {
    errors.name = 'Full name is required.';
  } else if (input.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  const digits = input.phone.replace(/\D/g, '');
  if (!input.phone.trim()) {
    errors.phone = 'WhatsApp / phone number is required.';
  } else if (digits.length < 7 || digits.length > 15) {
    errors.phone = 'Enter a valid phone number (7–15 digits, include country code).';
  }

  const trimmedEmail = (input.email ?? '').trim();
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address or leave blank.';
  }

  if (!Number.isFinite(input.fees) || input.fees <= 0) {
    errors.fees = 'Enter a valid fee amount greater than 0.';
  }

  if (!input.paidDate.trim()) {
    errors.paidDate = 'Paid date is required.';
  } else if (!parseIsoDate(input.paidDate)) {
    errors.paidDate = 'Enter a valid paid date.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Normalizes a phone string to E.164 digits and builds a wa.me deep link.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message.trim());
  if (!encodedMessage) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodedMessage}`;
}

/**
 * Builds a mailto: URL with properly encoded subject and body.
 */
export function buildMailtoUrl(
  email: string,
  subject: string,
  body: string
): string {
  const params = new URLSearchParams();
  if (subject.trim()) params.set('subject', subject.trim());
  if (body.trim()) params.set('body', body.trim());
  const query = params.toString().replace(/\+/g, '%20');
  return query ? `mailto:${email.trim()}?${query}` : `mailto:${email.trim()}`;
}

/**
 * Extends a renewal date by the given number of months.
 * If the membership is already expired, extends from referenceDate so the
 * member gets full remaining time starting today.
 */
export function extendRenewalDate(
  currentRenewalDate: string,
  monthsToAdd: number,
  referenceDate: Date = new Date()
): string {
  const parsedCurrent = parseIsoDate(currentRenewalDate);
  const todayLocal = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const baseDate =
    parsedCurrent && parsedCurrent.getTime() >= todayLocal.getTime()
      ? toIsoDateString(parsedCurrent)
      : toIsoDateString(todayLocal);

  return addMonthsToIsoDate(baseDate, monthsToAdd);
}

/**
 * Migrates any legacy localStorage member records cleanly to the current schema
 * (1/2/3/6/12 Month plans, paidDate, fees, optional email).
 */
export function migrateStoredMember(
  raw: Record<string, unknown>,
  fallbackAvatarUrl?: string
): Member {
  const plan = normalizeMembershipPlan(String(raw.plan ?? '1 Month'));
  const months = getPlanMonths(plan);
  const todayIso = toIsoDateString(new Date());

  const rawRenewal =
    typeof raw.renewalDate === 'string' && parseIsoDate(raw.renewalDate)
      ? raw.renewalDate
      : calculateRenewalFromPaidDate(todayIso, plan);

  const rawPaid =
    typeof raw.paidDate === 'string' && parseIsoDate(raw.paidDate)
      ? raw.paidDate
      : addMonthsToIsoDate(rawRenewal, -months) || todayIso;

  const defaultFeeForPlan: Record<MembershipPlan, number> = {
    '1 Month': 1500,
    '2 Months': 2800,
    '3 Months': 4000,
    '6 Months': 7500,
    '12 Months': 13500,
  };

  const parsedFees = Number(raw.fees);
  const fees =
    Number.isFinite(parsedFees) && parsedFees > 0
      ? parsedFees
      : defaultFeeForPlan[plan];

  const emailValue = typeof raw.email === 'string' ? raw.email.trim() : '';

  return {
    id: String(raw.id ?? `mem-${Date.now()}`),
    name: String(raw.name ?? 'Member'),
    phone: String(raw.phone ?? ''),
    email: emailValue || undefined,
    plan,
    fees,
    manualStatus: raw.manualStatus === 'paused' ? 'paused' : 'active',
    paidDate: rawPaid,
    renewalDate: rawRenewal,
    joinedDate:
      typeof raw.joinedDate === 'string' && parseIsoDate(raw.joinedDate)
        ? raw.joinedDate
        : rawPaid,
    avatarUrl:
      typeof raw.avatarUrl === 'string' && raw.avatarUrl
        ? raw.avatarUrl
        : fallbackAvatarUrl,
    notes: typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes : undefined,
    lastMessagedAt:
      typeof raw.lastMessagedAt === 'string' ? raw.lastMessagedAt : undefined,
  };
}

/**
 * Extracts up to 2 uppercase initials from a member's full name.
 */
export function getMemberInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface MessageTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

/**
 * Generates contextual WhatsApp / Email templates tailored to member status.
 */
export function getMessageTemplates(
  member: Member,
  status: ComputedStatus,
  referenceDate: Date = new Date()
): MessageTemplate[] {
  const firstName = member.name.trim().split(/\s+/)[0] || 'there';
  const formattedDate = formatDisplayDate(member.renewalDate);
  const formattedFees = formatCurrency(member.fees);
  const days = getDaysUntilRenewal(member.renewalDate, referenceDate);

  const renewalTemplate: MessageTemplate =
    status === 'expired'
      ? {
          id: 'renewal',
          label: 'Renewal Follow-Up',
          subject: `Renew your ${member.plan} membership at IronPulse Gym`,
          body: `Hey ${firstName}, your ${member.plan} plan (${formattedFees}) at IronPulse Gym was due on ${formattedDate} (${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago). Reply here whenever you're ready to renew and keep your momentum going!`,
        }
      : {
          id: 'renewal',
          label: 'Renewal Reminder',
          subject: `Upcoming renewal on ${formattedDate} — IronPulse Gym`,
          body: `Hey ${firstName}, quick heads-up that your ${member.plan} plan (${formattedFees}) is due on ${formattedDate}. Let me know if you'd like to renew for another term or switch plans!`,
        };

  const checkinTemplate: MessageTemplate = {
    id: 'checkin',
    label: 'Training Check-In',
    subject: `Quick check-in from IronPulse Gym`,
    body: `Hey ${firstName}, hope your training week is going strong! Let me know if you need any program tweaks or want to book a form check session this week.`,
  };

  const welcomeBackTemplate: MessageTemplate = {
    id: 'welcome',
    label: status === 'paused' ? 'Resume Membership' : 'Welcome Note',
    subject:
      status === 'paused'
        ? `Ready to unpause your IronPulse Gym membership?`
        : `Welcome to IronPulse Gym, ${firstName}!`,
    body:
      status === 'paused'
        ? `Hey ${firstName}, hope you're doing well! Whenever you're ready to unpause your ${member.plan} membership and get back on the floor, just reply here and I'll reactivate it right away.`
        : `Welcome to IronPulse Gym, ${firstName}! Your ${member.plan} plan (${formattedFees}) is active through ${formattedDate}. Message me anytime if you need anything at the gym.`,
  };

  return [renewalTemplate, checkinTemplate, welcomeBackTemplate];
}
