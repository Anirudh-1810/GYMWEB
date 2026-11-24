import { DashboardMetrics, StatusFilter } from '../utils/memberLogic';

interface MetricsStripProps {
  metrics: DashboardMetrics;
  activeFilter: StatusFilter;
  onSelectFilter: (filter: StatusFilter) => void;
}

export function MetricsStrip({
  metrics,
  activeFilter,
  onSelectFilter,
}: MetricsStripProps) {
  const cells: Array<{
    id: StatusFilter;
    label: string;
    value: number;
    detail: string;
    accentClass: string;
  }> = [
    {
      id: 'all',
      label: 'Total Clients',
      value: metrics.total,
      detail: `${metrics.activeRate}% in active standing`,
      accentClass: 'text-slate-950 dark:text-[#C8FF00]',
    },
    {
      id: 'active',
      label: 'Active Members',
      value: metrics.active,
      detail: metrics.paused > 0 ? `${metrics.paused} paused` : 'All plans current',
      accentClass: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      id: 'expiring_soon',
      label: 'Renewing in 7 Days',
      value: metrics.expiringSoon,
      detail: metrics.expiringSoon > 0 ? 'Send reminders soon' : 'None due this week',
      accentClass: 'text-amber-700 dark:text-amber-400',
    },
    {
      id: 'expired',
      label: 'Expired Plans',
      value: metrics.expired,
      detail: metrics.expired > 0 ? 'Follow-up needed' : 'Zero overdue accounts',
      accentClass: 'text-rose-700 dark:text-rose-400',
    },
  ];

  return (
    <section
      aria-label="Gym membership summary"
      className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] overflow-hidden"
    >
      {cells.map((cell, index) => {
        const isSelected = activeFilter === cell.id;
        const showFilteredTag = isSelected && cell.id !== 'all';
        return (
          <button
            key={cell.id}
            type="button"
            onClick={() => onSelectFilter(cell.id)}
            aria-pressed={isSelected}
            data-testid={`metric-${cell.id}`}
            className={`group text-left px-4 py-3 sm:px-6 sm:py-5 min-h-[76px] sm:min-h-[88px] transition-colors duration-150 focus-visible:z-10 ${
              index % 2 === 1 ? 'border-l border-slate-200 dark:border-white/[0.08]' : ''
            } ${index >= 2 ? 'border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/[0.08]' : ''} ${
              isSelected && cell.id !== 'all'
                ? 'bg-slate-100 dark:bg-[#171D26]'
                : 'hover:bg-slate-50 dark:hover:bg-white/[0.025]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs font-medium tracking-wide transition-colors ${
                  isSelected
                    ? 'text-slate-950 dark:text-[#F3F5F7]'
                    : 'text-slate-600 group-hover:text-slate-900 dark:text-[#94A3B8] dark:group-hover:text-[#CBD5E1]'
                }`}
              >
                {cell.label}
              </span>
              {showFilteredTag && (
                <span className="text-[11px] font-semibold text-lime-800 dark:text-[#C8FF00] whitespace-nowrap shrink-0">
                  Active filter
                </span>
              )}
            </div>

            <div
              className={`mt-1.5 sm:mt-2 font-display text-3xl sm:text-[42px] font-bold leading-none tabular-nums tracking-tight ${cell.accentClass}`}
            >
              {cell.value}
            </div>

            <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-600 dark:text-[#7E8B9E] truncate">
              {cell.detail}
            </p>
          </button>
        );
      })}
    </section>
  );
}
