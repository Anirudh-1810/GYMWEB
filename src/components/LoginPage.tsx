import { useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { sanitizeAuthError } from '../utils/supabaseSync';
import { ThemeMode } from '../utils/theme';
import { GymLogoMark } from './GymHero';

interface LoginPageProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  initialError?: string | null;
}

const LOGIN_STUDIO_IMAGE = '/src/assets/images/hero_gym_studio_1795519838843.jpg';

function GoogleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3c-1.07.72-2.45 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.25v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.27A7.2 7.2 0 0 1 4.87 12c0-.79.14-1.56.38-2.27v-3.1H1.25A12 12 0 0 0 0 12c0 1.94.46 3.77 1.25 5.37l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.25 6.63l4 3.1c.95-2.85 3.61-4.97 6.75-4.97Z"
      />
    </svg>
  );
}

export function LoginPage({
  theme,
  onToggleTheme,
  initialError = null,
}: LoginPageProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        'Supabase credentials are missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.'
      );
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/`;

    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }

    if (isInIframe) {
      // Google blocks cross-origin sign-in inside iframes, so open a normal
      // full browser tab (not a small popup window) synchronously on click.
      const authTab = window.open('about:blank', '_blank');

      if (!authTab) {
        setLoading(false);
        setErrorMessage(
          'Your browser blocked opening the Google sign-in tab. Please allow popups/tabs for this site and try again.'
        );
        return;
      }

      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: {
              prompt: 'select_account',
            },
          },
        });

        if (error || !data?.url) {
          authTab.close();
          setLoading(false);
          setErrorMessage(sanitizeAuthError(error));
          return;
        }

        authTab.location.href = data.url;
        setLoading(false);
      } catch (err) {
        authTab.close();
        setLoading(false);
        setErrorMessage(sanitizeAuthError(err));
      }
      return;
    }

    // Normal browser tab or installed mobile PWA: standard full-page OAuth redirect
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        setLoading(false);
        setErrorMessage(sanitizeAuthError(error));
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage(sanitizeAuthError(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-950 dark:bg-[#090B0E] dark:text-[#F3F5F7] flex flex-col transition-colors duration-150">
      {/* Top Bar */}
      <header className="w-full pt-safe border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#090B0E]/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <GymLogoMark className="h-8 w-8 shrink-0" />
            <span className="font-display text-xl sm:text-2xl font-bold tracking-wider text-slate-950 dark:text-[#F3F5F7] whitespace-nowrap">
              IRON
              <span className="text-lime-700 dark:text-[#C8FF00]">PULSE</span>{' '}
              <span className="text-slate-600 dark:text-slate-300">GYM</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'light'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950 dark:border-white/[0.1] dark:bg-[#11151B] dark:text-[#CBD5E1] dark:hover:border-[#C8FF00]/50 dark:hover:text-[#C8FF00] transition-colors shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Main Split Auth Workspace */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid w-full grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11151B] shadow-xl">
          {/* Left Athletic Brand Panel */}
          <section
            aria-label="Gym owner workspace overview"
            className="relative lg:col-span-7 overflow-hidden bg-[#0B0E13] px-6 py-8 sm:px-9 sm:py-11 flex flex-col justify-between min-h-[260px] lg:min-h-[520px]"
          >
            {!imgFailed ? (
              <img
                src={LOGIN_STUDIO_IMAGE}
                alt="IronPulse strength studio"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 h-full w-full object-cover object-center opacity-75"
              />
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-[#0B0E13] via-[#131A24] to-[#090B0E]"
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#090B0E] via-[#090B0E]/82 to-[#090B0E]/55"
            />

            <div className="relative z-10 flex items-center gap-3.5">
              <GymLogoMark className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)] shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8FF00]">
                  Owner Workspace
                </p>
                <p className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-white leading-tight">
                  IRON<span className="text-[#C8FF00]">PULSE</span> GYM
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-8 lg:mt-12">
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-wide text-white leading-[1.06] [text-wrap:balance]">
                YOUR GYM ROSTER,{' '}
                <span className="text-[#C8FF00]">YOUR PRIVATE CLOUD.</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm sm:text-base text-slate-300 leading-relaxed">
                Sign in with Google to access your own dynamic member list, Cash &amp; UPI fee totals, custom gym branding, and one-tap renewal tracking from any device.
              </p>

              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/15 pt-5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#C8FF00] mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-semibold text-white">Isolated Accounts</dt>
                    <dd className="text-[11px] text-slate-300 mt-0.5">
                      Each login loads only its own gym data
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Wallet className="h-4 w-4 text-[#C8FF00] mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-semibold text-white">Cash &amp; UPI Sorted</dt>
                    <dd className="text-[11px] text-slate-300 mt-0.5">
                      One-tap Paid resets next month due date
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users className="h-4 w-4 text-[#C8FF00] mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-semibold text-white">Live Sync</dt>
                    <dd className="text-[11px] text-slate-300 mt-0.5">
                      Members &amp; branding follow your sign-in
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </section>

          {/* Right Google Sign-In Card */}
          <section
            aria-label="Sign in to your gym dashboard"
            className="lg:col-span-5 flex flex-col justify-center px-6 py-8 sm:px-9 sm:py-11 bg-white dark:bg-[#11151B]"
          >
            <div className="mx-auto w-full max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-700 dark:text-[#C8FF00]">
                Gym Owner Login
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-wide text-slate-950 dark:text-[#F3F5F7]">
                Sign In to Continue
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                Use your Google account to open your personal gym dashboard. Every owner login keeps its own members, fees, and branding separate.
              </p>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-300 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-3 text-xs sm:text-sm text-rose-900 dark:text-rose-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full min-h-[50px] inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-white/[0.14] bg-slate-950 text-white hover:bg-slate-800 dark:bg-[#F3F5F7] dark:text-[#090B0E] dark:hover:bg-white px-5 py-3 text-sm sm:text-base font-bold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden="true" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <GoogleMark />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0D1117] px-4 py-3.5">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0]">
                  Private by default
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-[#8A97AB] leading-relaxed">
                  Your roster and revenue metrics are tied to your Google user ID with database Row Level Security. Switching Google accounts immediately switches to that owner&apos;s workspace.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0E13] py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-xs text-slate-600 dark:text-[#8A97AB]">
            IronPulse Gym · Secure owner workspace
          </p>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
            Made by{' '}
            <span className="font-semibold text-slate-950 dark:text-[#F3F5F7]">
              Anirudh Sharma
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
