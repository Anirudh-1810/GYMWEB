import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings, ShieldCheck } from 'lucide-react';
import type { UserDisplayInfo } from '../utils/supabaseSync';

interface ProfileMenuProps {
  userInfo: UserDisplayInfo;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

export function ProfileMenu({
  userInfo,
  onOpenSettings,
  onSignOut,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const showPhoto = Boolean(userInfo.avatarUrl && !avatarFailed);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Account menu for ${userInfo.displayName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 pl-1.5 pr-2 sm:pr-2.5 text-slate-900 hover:bg-slate-200 dark:border-white/[0.12] dark:bg-[#11151B] dark:text-[#F3F5F7] dark:hover:bg-[#1A2029] dark:hover:border-[#C8FF00]/50 transition-colors shrink-0"
      >
        {showPhoto ? (
          <img
            src={userInfo.avatarUrl}
            alt={userInfo.displayName}
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
            className="h-7 w-7 rounded-md object-cover shrink-0"
          />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 text-[#C8FF00] dark:bg-[#C8FF00]/15 dark:text-[#C8FF00] border border-slate-900/15 dark:border-[#C8FF00]/40 text-xs font-bold shrink-0"
          >
            {userInfo.initials}
          </span>
        )}
        <span className="hidden lg:inline max-w-[110px] truncate text-xs font-semibold">
          {userInfo.displayName}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 dark:text-[#8A97AB] transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account profile and sign out"
          className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#11151B] shadow-2xl overflow-hidden z-50"
        >
          {/* Signed-in user identity */}
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0D1117]">
            <div className="flex items-center gap-3 min-w-0">
              {showPhoto ? (
                <img
                  src={userInfo.avatarUrl}
                  alt={userInfo.displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-white/[0.12] shrink-0"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-[#C8FF00] dark:bg-[#C8FF00]/15 dark:text-[#C8FF00] border border-slate-900/15 dark:border-[#C8FF00]/40 text-sm font-bold shrink-0"
                >
                  {userInfo.initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-950 dark:text-[#F3F5F7] truncate">
                  {userInfo.displayName}
                </p>
                {userInfo.email && (
                  <p className="text-xs text-slate-600 dark:text-[#8A97AB] truncate">
                    {userInfo.email}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Private Google account workspace</span>
            </div>
          </div>

          {/* Menu actions */}
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-[#E2E8F0] dark:hover:bg-white/[0.06] transition-colors"
            >
              <Settings className="h-4 w-4 text-slate-500 dark:text-[#8A97AB] shrink-0" aria-hidden="true" />
              <span>Gym Branding &amp; Settings</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/12 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
