import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import { CurrencyCode, formatMoney } from '../utils/branding';
import { PaymentMode, RevenueSummary as RevenueSummaryData } from '../utils/memberLogic';

interface RevenueSummaryProps {
  summary: RevenueSummaryData;
  currency: CurrencyCode;
  balanceOnly: boolean;
  paymentModeFilter: PaymentMode | 'all';
  onToggleBalanceOnly: () => void;
  onSelectPaymentMode: (mode: PaymentMode | 'all') => void;
}

const PAYMENT_MODE_ICON: Record<PaymentMode, typeof Banknote> = {
  Cash: Banknote,
  UPI: Smartphone,
  Card: CreditCard,
};

export function RevenueSummary({
  summary,
  currency,
  balanceOnly,
  paymentModeFilter,
  onToggleBalanceOnly,
  onSelectPaymentMode,
}: RevenueSummaryProps) {
  const maxPlanCollected = Math.max(
    1,
    ...summary.byPlan.map((item) => item.collected)
  );

  return (
    <section
      aria-label="Revenue and fee summary"
      data-testid="revenue-summary"
      className="mt-4 sm:mt-5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] overflow-hidden"
    >
      {/* Top Row: Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-white/[0.08]">
        {/* Monthly Revenue Collected */}
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-[#94A3B8]">
              Monthly Revenue Collected
            </span>
            <span className="font-mono text-[11px] font-medium text-slate-500 dark:text-[#7E8B9E] tabular-nums whitespace-nowrap">
              {summary.monthLabel}
            </span>
          </div>
          <div
            data-testid="revenue-monthly-collected"
            className="mt-1.5 font-display text-3xl sm:text-4xl font-bold leading-none tabular-nums tracking-tight text-emerald-700 dark:text-[#C8FF00]"
          >
            {formatMoney(summary.monthlyCollected, currency)}
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-[#7E8B9E] tabular-nums">
            {summary.monthlyPaymentsCount}{' '}
            {summary.monthlyPaymentsCount === 1 ? 'payment' : 'payments'} this month ·{' '}
            <span className="font-medium text-slate-800 dark:text-[#CBD5E1]">
              {formatMoney(summary.totalCollectedAll, currency)}
            </span>{' '}
            total roster
          </p>
        </div>

        {/* Pending & Overdue Fees */}
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-[#94A3B8]">
              Pending &amp; Overdue Fees
            </span>
            <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 whitespace-nowrap">
              Action needed
            </span>
          </div>
          <div
            data-testid="revenue-pending-overdue"
            className="mt-1.5 font-display text-3xl sm:text-4xl font-bold leading-none tabular-nums tracking-tight text-rose-700 dark:text-rose-400"
          >
            {formatMoney(summary.pendingAndOverdueTotal, currency)}
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-[#7E8B9E] tabular-nums">
            {formatMoney(summary.overdueRenewalTotal, currency)} overdue ({summary.overdueRenewalCount}) ·{' '}
            {formatMoney(summary.balanceDueTotal, currency)} balances ({summary.balanceDueCount})
          </p>
        </div>

        {/* Partial Balances Due (Interactive Filter Button) */}
        <button
          type="button"
          onClick={onToggleBalanceOnly}
          aria-pressed={balanceOnly}
          data-testid="revenue-balance-filter"
          className={`text-left px-5 py-4 sm:px-6 sm:py-5 transition-colors duration-150 ${
            balanceOnly
              ? 'bg-amber-50/90 dark:bg-amber-500/12'
              : 'hover:bg-slate-50 dark:hover:bg-white/[0.025]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-[#94A3B8]">
              Partial Balances Due
            </span>
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap">
              {balanceOnly ? 'Showing balances' : 'Click to filter'}
            </span>
          </div>
          <div
            data-testid="revenue-balance-due"
            className="mt-1.5 font-display text-3xl sm:text-4xl font-bold leading-none tabular-nums tracking-tight text-amber-700 dark:text-amber-400"
          >
            {formatMoney(summary.balanceDueTotal, currency)}
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-[#7E8B9E] tabular-nums">
            {summary.balanceDueCount === 0
              ? 'All members paid in full'
              : `${summary.balanceDueCount} ${summary.balanceDueCount === 1 ? 'member has' : 'members have'} unpaid balance`}
          </p>
        </button>
      </div>

      {/* Bottom Row: Plan Breakdown (1/2/3/6/12 Months) & Payment Modes (Cash/UPI/Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] border-t border-slate-200 dark:border-white/[0.08] divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-white/[0.08] bg-slate-50/60 dark:bg-[#0D1117]">
        {/* Plan Breakdown */}
        <div className="px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-semibold tracking-wide text-slate-800 dark:text-[#CBD5E1]">
              Revenue by Plan
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-[#7E8B9E]">
              1 · 2 · 3 · 6 · 12 Months
            </span>
          </div>
          <div className="space-y-2.5" data-testid="plan-breakdown">
            {summary.byPlan.map((item) => {
              const barWidth =
                item.collected > 0
                  ? Math.max(6, Math.round((item.collected / maxPlanCollected) * 100))
                  : 0;
              return (
                <div key={item.plan} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-[#F3F5F7] whitespace-nowrap">
                        {item.plan}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-[#7E8B9E] tabular-nums whitespace-nowrap">
                        {item.memberCount} {item.memberCount === 1 ? 'client' : 'clients'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums font-mono">
                      {item.balanceDue > 0 && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          +{formatMoney(item.balanceDue, currency)} due
                        </span>
                      )}
                      <span className="font-bold text-slate-950 dark:text-[#F3F5F7]">
                        {formatMoney(item.collected, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-slate-900 dark:bg-[#C8FF00] transition-[width] duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Mode Breakdown */}
        <div className="px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-semibold tracking-wide text-slate-800 dark:text-[#CBD5E1]">
              Payment Modes
            </h2>
            {paymentModeFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => onSelectPaymentMode('all')}
                className="text-[11px] font-semibold text-lime-800 dark:text-[#C8FF00] hover:underline whitespace-nowrap"
              >
                Clear mode filter
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-[#7E8B9E]">
                Click to filter roster
              </span>
            )}
          </div>

          <div className="space-y-2" data-testid="payment-mode-breakdown">
            {summary.byPaymentMode.map((item) => {
              const Icon = PAYMENT_MODE_ICON[item.mode];
              const isSelected = paymentModeFilter === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() =>
                    onSelectPaymentMode(isSelected ? 'all' : item.mode)
                  }
                  aria-pressed={isSelected}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors duration-150 ${
                    isSelected
                      ? 'border-slate-950 bg-slate-950 text-white dark:border-[#C8FF00]/60 dark:bg-[#171D26] dark:text-[#F3F5F7]'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/[0.07] dark:bg-[#11151B] dark:hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isSelected
                            ? 'text-[#C8FF00]'
                            : 'text-slate-600 dark:text-[#94A3B8]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-semibold whitespace-nowrap">
                        {item.mode}
                      </span>
                      <span
                        className={`text-[11px] tabular-nums whitespace-nowrap ${
                          isSelected
                            ? 'text-slate-300 dark:text-[#94A3B8]'
                            : 'text-slate-500 dark:text-[#7E8B9E]'
                        }`}
                      >
                        {item.memberCount} · {item.sharePercent}%
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold tabular-nums whitespace-nowrap ${
                        isSelected
                          ? 'text-[#C8FF00]'
                          : 'text-slate-950 dark:text-[#F3F5F7]'
                      }`}
                    >
                      {formatMoney(item.collected, currency)}
                    </span>
                  </div>
                  <div
                    className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${
                      isSelected
                        ? 'bg-white/15 dark:bg-white/10'
                        : 'bg-slate-200 dark:bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${
                        isSelected
                          ? 'bg-[#C8FF00]'
                          : 'bg-emerald-600 dark:bg-emerald-400'
                      }`}
                      style={{
                        width: `${item.collected > 0 ? Math.max(6, item.sharePercent) : 0}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
