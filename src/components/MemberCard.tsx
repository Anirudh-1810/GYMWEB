import { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  PauseCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { CurrencyCode } from '../utils/branding';
import {
  ComputedStatus,
  Member,
  computeMemberStatus,
  computeRenewalProgress,
  formatCurrency,
  formatDisplayDate,
  formatRelativeRenewal,
  getMemberBalanceDue,
  getMemberInitials,
  getStatusLabel,
} from '../utils/memberLogic';

interface MemberCardProps {
  member: Member;
  currency: CurrencyCode;
  onMessage: (member: Member, channel: 'whatsapp' | 'email') => void;
  onManage: (member: Member) => void;
  onQuickPay?: (member: Member) => void;
  onSettleBalance?: (memberId: string) => void;
}

const STATUS_META: Record<
  ComputedStatus,
  {
    textClass: string;
    dueDateClass: string;
    avatarBorderClass: string;
    avatarFallbackClass: string;
    barFillClass: string;
    Icon: typeof CheckCircle2;
  }
> = {
  active: {
    textClass: 'text-emerald-700 dark:text-emerald-400',
    dueDateClass: 'text-slate-950 dark:text-[#F3F5F7]',
    avatarBorderClass: 'border-emerald-600/35 dark:border-emerald-500/35',
    avatarFallbackClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
    barFillClass: 'bg-emerald-600 dark:bg-[#C8FF00]',
    Icon: CheckCircle2,
  },
  expiring_soon: {
    textClass: 'text-amber-700 dark:text-amber-400',
    dueDateClass: 'text-amber-800 dark:text-amber-300',
    avatarBorderClass: 'border-amber-500/45 dark:border-amber-400/45',
    avatarFallbackClass:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
    barFillClass: 'bg-amber-500 dark:bg-amber-400',
    Icon: Clock,
  },
  expired: {
    textClass: 'text-rose-700 dark:text-rose-400',
    dueDateClass: 'text-rose-700 dark:text-rose-300',
    avatarBorderClass: 'border-rose-500/45 dark:border-rose-500/45',
    avatarFallbackClass:
      'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
    barFillClass: 'bg-rose-600 dark:bg-rose-500',
    Icon: AlertCircle,
  },
  paused: {
    textClass: 'text-slate-600 dark:text-slate-400',
    dueDateClass: 'text-slate-700 dark:text-slate-300',
    avatarBorderClass: 'border-slate-300 dark:border-slate-500/35',
    avatarFallbackClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30',
    barFillClass: 'bg-slate-400 dark:bg-slate-500',
    Icon: PauseCircle,
  },
};

export function MemberCard({
  member,
  currency,
  onMessage,
  onManage,
  onQuickPay,
  onSettleBalance,
}: MemberCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const status = computeMemberStatus(member);
  const statusLabel = getStatusLabel(status);
  const renewalFormatted = formatDisplayDate(member.renewalDate);
  const paidFormatted = formatDisplayDate(member.paidDate);
  const relativeRenewal = formatRelativeRenewal(member.renewalDate, status);
  const renewalProgress = computeRenewalProgress(member);
  const initials = getMemberInitials(member.name);
  const balanceDue = getMemberBalanceDue(member);
  const {
    textClass,
    dueDateClass,
    avatarBorderClass,
    avatarFallbackClass,
    barFillClass,
    Icon: StatusIcon,
  } = STATUS_META[status];

  const showPhoto = Boolean(member.avatarUrl) && !imgFailed;
  const wasMessagedRecently = Boolean(member.lastMessagedAt);
  const hasEmail = Boolean(member.email?.trim());

  return (
    <article
      data-testid={`member-card-${member.id}`}
      className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] transition-colors duration-150 hover:border-slate-300 dark:hover:border-white/[0.16]"
    >
      {/* Top Body: Member Details on Left, Person Photo / Avatar on Right */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Status Kicker (Unboxed, icon + color + text) */}
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${textClass}`}>
              <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{statusLabel}</span>
              {wasMessagedRecently && (
                <>
                  <span aria-hidden="true" className="text-slate-300 dark:text-white/25">
                    ·
                  </span>
                  <span className="text-lime-800 dark:text-[#C8FF00] font-semibold dark:font-medium whitespace-nowrap">
                    Messaged
                  </span>
                </>
              )}
            </div>

            {/* Name & Prominent Fees + Plan + Payment Mode */}
            <h3 className="mt-1.5 text-2xl sm:text-[26px] font-bold leading-tight text-slate-950 dark:text-[#F3F5F7] truncate tracking-tight">
              {member.name}
            </h3>
            <div className="mt-1.5 flex items-baseline gap-2 min-w-0 flex-wrap">
              <span className="font-mono text-xl sm:text-[22px] font-bold leading-none tabular-nums text-lime-800 dark:text-[#C8FF00] whitespace-nowrap">
                {formatCurrency(member.fees, currency)}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-white/25">
                ·
              </span>
              <span className="text-sm font-medium text-slate-600 dark:text-[#94A3B8] whitespace-nowrap">
                {member.plan}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-white/25">
                ·
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-[#7E8B9E] whitespace-nowrap">
                {member.paymentMode}
              </span>
            </div>

            {/* Contact Info */}
            <div className="mt-2.5 space-y-0.5 text-xs text-slate-600 dark:text-[#8A97AB]">
              <p className="font-mono tabular-nums text-slate-800 dark:text-[#B4C0D3] truncate">
                {member.phone}
              </p>
              {hasEmail && <p className="truncate">{member.email}</p>}
            </div>
          </div>

          {/* Right Side: Person Photo / Initials Avatar + Quick Paid Button Below */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            {showPhoto ? (
              <div
                className={`h-20 w-20 overflow-hidden rounded-xl border bg-slate-100 dark:bg-[#0B0E13] ${avatarBorderClass}`}
              >
                <img
                  src={member.avatarUrl}
                  alt={`${member.name} profile`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover object-top"
                />
              </div>
            ) : (
              <div
                aria-hidden="true"
                className={`flex h-20 w-20 items-center justify-center rounded-xl border font-display text-2xl font-bold tracking-wider ${avatarFallbackClass}`}
              >
                {initials}
              </div>
            )}

            {onQuickPay && (
              <button
                type="button"
                onClick={() => onQuickPay(member)}
                data-testid={`quick-pay-${member.id}`}
                aria-label={`Mark ${member.name} as paid`}
                className="inline-flex w-20 min-h-[34px] items-center justify-center gap-1 rounded-lg border border-emerald-600/35 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white dark:border-[#C8FF00]/45 dark:bg-[#C8FF00]/12 dark:text-[#C8FF00] dark:hover:bg-[#C8FF00] dark:hover:text-[#090B0E] text-xs font-bold transition-colors duration-150 whitespace-nowrap"
              >
                <Check className="h-3.5 w-3.5 stroke-[2.5] shrink-0" aria-hidden="true" />
                <span>Paid</span>
              </button>
            )}
          </div>
        </div>

        {member.notes && (
          <p className="mt-3 text-xs text-slate-600 dark:text-[#7E8B9E] truncate">{member.notes}</p>
        )}
      </div>

      {/* Partial Payment Balance Due Line (only when unpaid balance > 0) */}
      {balanceDue > 0 && (
        <div
          data-testid={`balance-due-${member.id}`}
          className="flex items-center justify-between gap-3 border-t border-amber-200 dark:border-amber-500/25 bg-amber-50/90 dark:bg-amber-500/10 px-5 py-2.5 text-xs"
        >
          <div className="min-w-0 tabular-nums">
            <span className="font-bold text-amber-900 dark:text-amber-300">
              Balance Due {formatCurrency(balanceDue, currency)}
            </span>
            <span className="text-amber-800/80 dark:text-amber-200/75">
              {' '}
              · Paid {formatCurrency(member.amountPaid, currency)}
            </span>
          </div>
          {onSettleBalance && (
            <button
              type="button"
              onClick={() => onSettleBalance(member.id)}
              aria-label={`Mark balance paid for ${member.name}`}
              className="shrink-0 rounded-md border border-amber-700/30 dark:border-amber-400/40 bg-white dark:bg-[#11151B] px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-700 hover:text-white dark:text-amber-300 dark:hover:bg-amber-400 dark:hover:text-[#090B0E] transition-colors whitespace-nowrap"
            >
              Mark Paid
            </button>
          )}
        </div>
      )}

      {/* Prominent Due Date & Billing Cycle Progress Bar (Directly above WhatsApp & Email) */}
      <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#0D1117]">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-wide text-slate-600 dark:text-[#94A3B8] truncate">
              Due Date{' '}
              <span className="font-normal text-slate-500 dark:text-[#64748B]">
                · Paid {paidFormatted}
              </span>
            </span>
            <div
              className={`mt-0.5 flex items-center gap-1.5 font-mono text-base sm:text-[17px] font-bold leading-tight tabular-nums whitespace-nowrap ${dueDateClass}`}
            >
              <Calendar className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
              <span>{renewalFormatted}</span>
            </div>
          </div>

          <span
            className={`text-xs sm:text-[13px] font-bold tabular-nums whitespace-nowrap shrink-0 pb-0.5 ${
              status === 'expired'
                ? 'text-rose-700 dark:text-rose-400'
                : status === 'expiring_soon'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-700 dark:text-[#CBD5E1]'
            }`}
          >
            {relativeRenewal}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label={`Billing cycle progress for ${member.name}`}
          aria-valuenow={renewalProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid={`renewal-bar-${member.id}`}
          className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.09]"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-out ${barFillClass}`}
            style={{ width: `${renewalProgress}%` }}
          />
        </div>
      </div>

      {/* Direct Action Bar: WhatsApp, Email, Manage */}
      <div className="grid grid-cols-[1fr_1fr_auto] border-t border-slate-200 dark:border-white/[0.07]">
        <button
          type="button"
          onClick={() => onMessage(member, 'whatsapp')}
          aria-label={`Message ${member.name} on WhatsApp`}
          className="flex min-h-[46px] items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950 dark:text-[#D6FFE0] dark:hover:bg-emerald-500/12 dark:hover:text-[#4ADE80] transition-colors duration-150 rounded-bl-xl whitespace-nowrap"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          disabled={!hasEmail}
          onClick={() => {
            if (hasEmail) onMessage(member, 'email');
          }}
          title={hasEmail ? `Email ${member.name}` : 'No email address saved for this member'}
          aria-label={hasEmail ? `Email ${member.name}` : `No email on file for ${member.name}`}
          className={`flex min-h-[46px] items-center justify-center gap-2 border-l border-slate-200 dark:border-white/[0.07] px-3 py-2.5 text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
            hasEmail
              ? 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 dark:text-[#CBD5E1] dark:hover:bg-white/[0.05] dark:hover:text-[#C8FF00]'
              : 'text-slate-400 dark:text-[#4B5563] cursor-not-allowed'
          }`}
        >
          <Mail
            className={`h-4 w-4 shrink-0 ${
              hasEmail ? 'text-slate-600 dark:text-[#94A3B8]' : 'text-slate-300 dark:text-[#3B4453]'
            }`}
            aria-hidden="true"
          />
          <span>Email</span>
        </button>

        <button
          type="button"
          onClick={() => onManage(member)}
          aria-label={`Manage ${member.name}`}
          className="flex min-h-[46px] min-w-[48px] items-center justify-center border-l border-slate-200 dark:border-white/[0.07] px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:bg-white/[0.05] dark:hover:text-[#F3F5F7] transition-colors duration-150 rounded-br-xl"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
