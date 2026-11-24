import { AlertCircle, Clock, Plus, Users } from 'lucide-react';
import { StatusFilter } from '../utils/memberLogic';

interface MobileBottomNavProps {
  activeFilter: StatusFilter;
  expiringCount: number;
  expiredCount: number;
  onSelectFilter: (filter: StatusFilter) => void;
  onAddMember: () => void;
}

export function MobileBottomNav({
  activeFilter,
  expiringCount,
  expiredCount,
  onSelectFilter,
  onAddMember,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-slate-200 dark:border-white/[0.09] bg-white/95 dark:bg-[#0B0E13]/95 backdrop-blur-md pb-safe"
    >
      <div className="grid grid-cols-4 h-14">
        <button
          type="button"
          onClick={() => onSelectFilter('all')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            activeFilter === 'all'
              ? 'text-slate-950 font-semibold dark:text-[#C8FF00]'
              : 'text-slate-600 dark:text-[#8A97AB]'
          }`}
        >
          <Users className="h-5 w-5" aria-hidden="true" />
          <span>All</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectFilter('expiring_soon')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            activeFilter === 'expiring_soon'
              ? 'text-amber-700 font-semibold dark:text-amber-400'
              : 'text-slate-600 dark:text-[#8A97AB]'
          }`}
        >
          <Clock className="h-5 w-5" aria-hidden="true" />
          <span className="tabular-nums">Expiring ({expiringCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectFilter('expired')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            activeFilter === 'expired'
              ? 'text-rose-700 font-semibold dark:text-rose-400'
              : 'text-slate-600 dark:text-[#8A97AB]'
          }`}
        >
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          <span className="tabular-nums">Expired ({expiredCount})</span>
        </button>

        <button
          type="button"
          onClick={onAddMember}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-lime-800 dark:text-[#C8FF00]"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          <span>Add</span>
        </button>
      </div>
    </nav>
  );
}
