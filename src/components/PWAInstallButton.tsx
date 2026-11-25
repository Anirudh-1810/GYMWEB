import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  gymName: string;
  variant?: 'hero' | 'settings';
}

export function PWAInstallButton({
  gymName,
  variant = 'hero',
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!showGuide) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGuide]);

  // Automatically suppress hero button when already running as an installed standalone PWA
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <span
          data-testid="pwa-installed-status"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Installed on Home Screen</span>
        </span>
      );
    }
    return null;
  }

  // Chromium / Android / Desktop native install prompt
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        data-testid={variant === 'hero' ? 'pwa-install-hero' : 'pwa-install-settings'}
        className={
          variant === 'hero'
            ? 'inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#C8FF00] text-[#090B0E] hover:bg-[#D6FF3D] px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap'
            : 'inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap'
        }
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  // Guided installation for iOS Safari and browsers before beforeinstallprompt fires
  const buttonLabel = isIOS
    ? 'Install on iPhone'
    : variant === 'hero'
      ? 'Install App'
      : 'Install Guide';

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        data-testid={variant === 'hero' ? 'pwa-install-hero' : 'pwa-install-settings'}
        className={
          variant === 'hero'
            ? 'inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-2 text-xs font-semibold text-white hover:border-[#C8FF00]/70 hover:bg-white/15 hover:text-[#C8FF00] transition-colors whitespace-nowrap'
            : 'inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#161C25] px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-[#F3F5F7] hover:border-slate-950 dark:hover:border-[#C8FF00]/60 dark:hover:text-[#C8FF00] transition-colors whitespace-nowrap'
        }
      >
        <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{buttonLabel}</span>
      </button>

      {showGuide &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm p-0 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGuide(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-guide-title"
              className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11151B] p-6 shadow-2xl pb-safe"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="pwa-guide-title"
                    className="font-display text-2xl font-bold tracking-wide text-slate-950 dark:text-[#F3F5F7]"
                  >
                    Install {gymName}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-[#8A97AB]">
                    Add to your phone&apos;s home screen so it opens full-screen like a native app and works offline.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close install instructions"
                  className="flex h-10 w-10 -mr-2 -mt-1 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:bg-white/[0.06] dark:hover:text-[#F3F5F7] transition-colors"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] p-3.5">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-950 dark:text-[#F3F5F7]">
                    <Share className="h-3.5 w-3.5 text-lime-700 dark:text-[#C8FF00]" aria-hidden="true" />
                    <span>iPhone &amp; iPad (Safari)</span>
                  </p>
                  <ol className="mt-1.5 list-decimal list-inside space-y-1">
                    <li>
                      Tap the <strong>Share</strong> icon in Safari&apos;s bottom toolbar.
                    </li>
                    <li>
                      Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                    </li>
                  </ol>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] p-3.5">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-950 dark:text-[#F3F5F7]">
                    <Download className="h-3.5 w-3.5 text-lime-700 dark:text-[#C8FF00]" aria-hidden="true" />
                    <span>Android &amp; Desktop (Chrome / Edge)</span>
                  </p>
                  <ol className="mt-1.5 list-decimal list-inside space-y-1">
                    <li>
                      Open the browser menu (<strong>⋮</strong>) or address bar install icon.
                    </li>
                    <li>
                      Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                    </li>
                  </ol>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] text-sm font-bold transition-colors"
              >
                Got It
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
