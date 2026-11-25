import { useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { GymBranding, splitBrandWordmark } from '../utils/branding';
import type { UserDisplayInfo } from '../utils/supabaseSync';
import { PWAInstallButton } from './PWAInstallButton';

interface GymHeroProps {
  branding: GymBranding;
  todayDisplay: string;
  userInfo?: UserDisplayInfo | null;
  onOpenSettings: () => void;
  onSignOut?: () => void;
}

const HERO_BACKDROP_SRC = '/src/assets/images/hero_gym_studio_1795519838843.jpg';

export function GymLogoMark({ className = 'h-14 w-14' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill="#0D1117"
        stroke="#C8FF00"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <rect x="10" y="21" width="5" height="22" rx="1.5" fill="#F3F5F7" />
      <rect x="16.5" y="16" width="5.5" height="32" rx="1.5" fill="#C8FF00" />
      <rect x="42" y="16" width="5.5" height="32" rx="1.5" fill="#C8FF00" />
      <rect x="49" y="21" width="5" height="22" rx="1.5" fill="#F3F5F7" />
      <path
        d="M22 32H26.5L29.5 23.5L34.5 40.5L37.5 32H42"
        stroke="#F3F5F7"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogoAvatar({
  logoUrl,
  gymName,
  className = 'h-14 w-14',
}: {
  logoUrl?: string;
  gymName: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <div
        className={`${className} overflow-hidden rounded-xl border border-[#C8FF00]/45 bg-[#0D1117] p-1 shrink-0`}
      >
        <img
          src={logoUrl}
          alt={`${gymName} logo`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain rounded-lg"
        />
      </div>
    );
  }

  return <GymLogoMark className={`${className} shrink-0`} />;
}

export function GymHero({
  branding,
  todayDisplay,
  userInfo,
  onOpenSettings,
  onSignOut,
}: GymHeroProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const wordmark = splitBrandWordmark(branding.gymName);

  return (
    <section
      aria-label="Gym overview hero"
      className="relative mb-5 sm:mb-6 overflow-hidden rounded-2xl border border-slate-900/15 dark:border-white/[0.1] bg-[#0B0E13]"
    >
      {/* Background gym studio photography with graceful fallback */}
      {!imgFailed ? (
        <img
          src={HERO_BACKDROP_SRC}
          alt={`${branding.gymName} strength studio`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-right opacity-85"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#0B0E13] via-[#131A24] to-[#090B0E]"
        />
      )}

      {/* Measured contrast scrim for guaranteed WCAG AA legibility in both dark & light themes */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#090B0E]/96 via-[#090B0E]/82 to-[#090B0E]/42"
      />

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-7">
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <BrandLogoAvatar
            logoUrl={branding.logoUrl}
            gymName={branding.gymName}
            className="h-14 w-14 sm:h-16 sm:w-16 drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)]"
          />
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-wider text-white leading-none [text-wrap:balance]">
              {wordmark.lead}
              {wordmark.accent ? (
                <>
                  {wordmark.lead === 'IRON' && wordmark.accent === 'PULSE'
                    ? ''
                    : ' '}
                  <span className="text-[#C8FF00]">{wordmark.accent}</span>
                </>
              ) : null}
              {wordmark.trailing ? (
                <span className="text-slate-200"> {wordmark.trailing}</span>
              ) : null}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Strength &amp; Conditioning · Client Roster, Revenue &amp; Due Dates
            </p>
            {userInfo && (
              <div className="mt-2.5 inline-flex items-center gap-2 text-xs text-slate-300">
                {userInfo.avatarUrl && !avatarFailed ? (
                  <img
                    src={userInfo.avatarUrl}
                    alt={userInfo.displayName}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                    className="h-5 w-5 rounded-full object-cover border border-white/25 shrink-0"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#C8FF00]/20 text-[10px] font-bold text-[#C8FF00] border border-[#C8FF00]/40 shrink-0"
                  >
                    {userInfo.initials}
                  </span>
                )}
                <span className="truncate max-w-[230px] sm:max-w-[320px]">
                  <strong className="font-semibold text-white">
                    {userInfo.displayName}
                  </strong>
                  {userInfo.email ? (
                    <span className="text-slate-300"> · {userInfo.email}</span>
                  ) : null}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:flex-col sm:items-end gap-2.5 shrink-0">
          <p className="font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
            {todayDisplay}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton gymName={branding.gymName} variant="hero" />
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-2 text-xs font-semibold text-white hover:border-[#C8FF00]/70 hover:bg-white/15 hover:text-[#C8FF00] transition-colors whitespace-nowrap"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Gym Settings</span>
            </button>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-rose-400/45 bg-rose-500/15 backdrop-blur-sm px-3.5 py-2 text-xs font-semibold text-rose-100 hover:border-rose-300 hover:bg-rose-500/30 hover:text-white transition-colors whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
