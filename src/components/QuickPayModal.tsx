import { useEffect } from 'react';
import { Banknote, Calendar, CreditCard, Smartphone, X } from 'lucide-react';
import { CurrencyCode } from '../utils/branding';
import {
  Member,
  PaymentMode,
  extendRenewalDate,
  formatCurrency,
  formatDisplayDate,
  getPlanMonths,
} from '../utils/memberLogic';

interface QuickPayModalProps {
  member: Member | null;
  currency: CurrencyCode;
  onClose: () => void;
  onConfirm: (memberId: string, paymentMode: PaymentMode) => void;
}

export function QuickPayModal({
  member,
  currency,
  onClose,
  onConfirm,
}: QuickPayModalProps) {
  useEffect(() => {
    if (!member) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [member, onClose]);

  if (!member) return null;

  const months = getPlanMonths(member.plan);
  const nextDueIso = extendRenewalDate(member.renewalDate, months);
  const nextDueFormatted = formatDisplayDate(nextDueIso);
  const firstName = member.name.trim().split(/\s+/)[0] || member.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 dark:bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-pay-title"
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11151B] shadow-2xl overflow-hidden pb-safe"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="quick-pay-title"
              className="font-display text-2xl font-bold tracking-wide text-slate-950 dark:text-[#F3F5F7]"
            >
              Mark Fee Paid
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-[#8A97AB] truncate">
              {member.name} · {member.plan} ·{' '}
              <span className="font-mono font-semibold text-lime-800 dark:text-[#C8FF00]">
                {formatCurrency(member.fees, currency)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="flex h-10 w-10 -mr-2 -mt-1 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:bg-white/[0.06] dark:hover:text-[#F3F5F7] transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 sm:px-6 space-y-4">
          {/* Next Due Date Preview */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] px-4 py-3">
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-slate-500 dark:text-[#7E8B9E]">
                Resets cycle (+{months} {months === 1 ? 'Month' : 'Months'})
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 font-mono text-sm font-bold text-slate-950 dark:text-[#F3F5F7] tabular-nums">
                <Calendar className="h-4 w-4 text-lime-700 dark:text-[#C8FF00] shrink-0" aria-hidden="true" />
                <span>Next Due: {nextDueFormatted}</span>
              </span>
            </div>
            <span className="font-mono text-lg font-bold tabular-nums text-lime-800 dark:text-[#C8FF00] shrink-0">
              {formatCurrency(member.fees, currency)}
            </span>
          </div>

          {/* Payment Mode Prompt */}
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-[#F3F5F7]">
              How did {firstName} pay?
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-[#8A97AB]">
              Choose Cash or UPI so your funds stay sorted automatically.
            </p>

            {/* Primary Cash & UPI Choices */}
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="quick-pay-cash"
                onClick={() => onConfirm(member.id, 'Cash')}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0D1117] px-4 py-4 text-center hover:border-slate-950 hover:bg-slate-950 hover:text-[#C8FF00] dark:hover:border-[#C8FF00] dark:hover:bg-[#C8FF00] dark:hover:text-[#090B0E] transition-colors duration-150 group"
              >
                <Banknote
                  className="h-6 w-6 text-emerald-700 dark:text-[#C8FF00] group-hover:text-[#C8FF00] dark:group-hover:text-[#090B0E]"
                  aria-hidden="true"
                />
                <span className="text-sm font-bold">Paid by Cash</span>
              </button>

              <button
                type="button"
                data-testid="quick-pay-upi"
                onClick={() => onConfirm(member.id, 'UPI')}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0D1117] px-4 py-4 text-center hover:border-slate-950 hover:bg-slate-950 hover:text-[#C8FF00] dark:hover:border-[#C8FF00] dark:hover:bg-[#C8FF00] dark:hover:text-[#090B0E] transition-colors duration-150 group"
              >
                <Smartphone
                  className="h-6 w-6 text-emerald-700 dark:text-[#C8FF00] group-hover:text-[#C8FF00] dark:group-hover:text-[#090B0E]"
                  aria-hidden="true"
                />
                <span className="text-sm font-bold">Paid by UPI</span>
              </button>
            </div>

            {/* Optional Card Choice */}
            <button
              type="button"
              data-testid="quick-pay-card"
              onClick={() => onConfirm(member.id, 'Card')}
              className="mt-2.5 flex w-full min-h-[42px] items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-950 hover:text-slate-950 dark:text-[#94A3B8] dark:hover:border-[#C8FF00]/60 dark:hover:text-[#C8FF00] transition-colors"
            >
              <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Or mark Paid by Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
