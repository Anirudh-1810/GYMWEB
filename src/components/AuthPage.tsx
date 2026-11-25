import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CloudCheck,
  Loader2,
  Moon,
  ShieldCheck,
  Sun,
  Wallet,
} from 'lucide-react';
import { GymBranding, splitBrandWordmark } from '../utils/branding';
import { ThemeMode } from '../utils/theme';
import { BrandLogoAvatar } from './GymHero';

interface AuthPageProps {
  branding: GymBranding;
  theme: ThemeMode;
  authLoading: boolean;
  authError: string | null;
  authNotice: string | null;
  onToggleTheme: () => void;
  onGoogleAuth: () => void;
  onEmailSignIn: (email: string, password: string) => void;
  onEmailSignUp: (email: string, password: string, fullName?: string) => void;
  onClearMessages: () => void;
}

type AuthTab = 'signin' | 'signup';

const HERO_BACKDROP_SRC = '/src/assets/images/hero_gym_studio_1795519838843.jpg';

function GoogleMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const HIGHLIGHTS = [
  {
    icon: CalendarClock,
    title: 'Member Roster & Due Dates',
    detail: 'Track 1 to 12-month plans, upcoming renewals, and direct WhatsApp reminders.',
  },
  {
    icon: Wallet,
    title: 'One-Tap Cash & UPI Fee Sorting',
    detail: 'Mark members paid in a single tap to reset due dates and tally monthly collections.',
  },
  {
    icon: CloudCheck,
    title: 'Private Per-Account Database',
    detail: 'Every gym account starts fresh and stores only its own members and custom branding.',
  },
];

export function AuthPage({
  branding,
  theme,
  authLoading,
  authError,
  authNotice,
  onToggleTheme,
  onGoogleAuth,
  onEmailSignIn,
  onEmailSignUp,
  onClearMessages,
}: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [heroFailed, setHeroFailed] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const wordmark = splitBrandWordmark(branding.gymName);
  const isSignUp = activeTab === 'signup';
  const displayedError = localError || authError;

  const handleSelectTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setLocalError(null);
    onClearMessages();
  };

  const handleEmailSubmit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setLocalError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (isSignUp) {
      onEmailSignUp(trimmedEmail, password, fullName);
    } else {
      onEmailSignIn(trimmedEmail, password);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-950 dark:bg-[#090B0E] dark:text-[#F3F5F7] flex flex-col transition-colors duration-150">
      {/* Main Split Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Athletic Brand Showcase */}
        <section
          aria-label="Gym platform overview"
          className="relative lg:col-span-6 xl:col-span-7 overflow-hidden bg-[#0B0E13] text-white flex flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 border-b lg:border-b-0 lg:border-r border-slate-900/20 dark:border-white/[0.08]"
        >
          {/* Studio Photography Backdrop */}
          {!heroFailed ? (
            <img
              src={HERO_BACKDROP_SRC}
              alt={`${branding.gymName} strength training floor`}
              referrerPolicy="no-referrer"
              onError={() => setHeroFailed(true)}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-60"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-[#0B0E13] via-[#131B26] to-[#090B0E]"
            />
          )}

          {/* Measured Contrast Scrim */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-[#090B0E]/96 via-[#090B0E]/82 to-[#090B0E]/68"
          />

          {/* Top Brand Lockup */}
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <BrandLogoAvatar
                logoUrl={branding.logoUrl}
                gymName={branding.gymName}
                className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)]"
              />
              <div className="min-w-0">
                <p className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-white leading-none truncate">
                  {wordmark.lead}
                  {wordmark.accent ? (
                    <>
                      {wordmark.lead === 'IRON' && wordmark.accent === 'PULSE' ? '' : ' '}
                      <span className="text-[#C8FF00]">{wordmark.accent}</span>
                    </>
                  ) : null}
                  {wordmark.trailing ? (
                    <span className="text-slate-200"> {wordmark.trailing}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-slate-300 tracking-wide">
                  Gym Client &amp; Fee Operations
                </p>
              </div>
            </div>

            {/* Mobile-only theme toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'light'}
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:border-[#C8FF00]/70 hover:text-[#C8FF00] transition-colors shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Center Editorial Statement */}
          <div className="relative z-10 mt-8 lg:mt-16 max-w-xl">
            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-bold tracking-wide text-white leading-[0.98] [text-wrap:balance]">
              RUN YOUR GYM FLOOR{' '}
              <span className="text-[#C8FF00]">WITHOUT SPREADSHEETS.</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
              Keep every client&apos;s membership plan, custom fee, Cash &amp; UPI collection, and renewal date organized in one fast dashboard.
            </p>

            {/* Value Points */}
            <dl className="hidden sm:grid mt-8 gap-4 border-t border-white/10 pt-6">
              {HIGHLIGHTS.map(({ icon: Icon, title, detail }) => (
                <div key={title} className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C8FF00]/30 bg-[#C8FF00]/10 text-[#C8FF00]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-white">{title}</dt>
                    <dd className="mt-0.5 text-xs text-slate-300 leading-relaxed">{detail}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {/* Bottom Attribution on Desktop */}
          <div className="relative z-10 hidden lg:flex items-center justify-between pt-8 text-xs text-slate-400">
            <span>Installable mobile PWA · Private account sync</span>
            <span>
              Made by <strong className="font-semibold text-white">Anirudh Sharma</strong>
            </span>
          </div>
        </section>

        {/* Right Authentication Surface */}
        <section
          aria-label="Account sign in"
          className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between px-5 py-7 sm:px-10 sm:py-10 lg:px-12 lg:py-10"
        >
          {/* Desktop Top Utility Row */}
          <div className="hidden lg:flex items-center justify-end">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'light'}
              title={
                theme === 'dark'
                  ? 'Switch to high-contrast light mode'
                  : 'Switch to neon dark mode'
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:border-slate-950 hover:text-slate-950 dark:border-white/[0.1] dark:bg-[#11151B] dark:text-[#CBD5E1] dark:hover:border-[#C8FF00]/50 dark:hover:text-[#C8FF00] transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" aria-hidden="true" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>

          {/* Centered Auth Card */}
          <div className="mx-auto my-auto w-full max-w-md py-2 sm:py-4">
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11151B] p-6 sm:p-8 shadow-xl shadow-slate-950/[0.04] dark:shadow-black/40">
              {/* Sign In / Sign Up Mode Switcher */}
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#090B0E] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-signin"
                  aria-selected={!isSignUp}
                  aria-controls="auth-tabpanel"
                  onClick={() => handleSelectTab('signin')}
                  className={`min-h-[42px] rounded-lg text-sm font-bold transition-colors ${
                    !isSignUp
                      ? 'bg-slate-950 text-[#C8FF00] dark:bg-[#C8FF00] dark:text-[#090B0E] shadow-sm'
                      : 'text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-signup"
                  aria-selected={isSignUp}
                  aria-controls="auth-tabpanel"
                  onClick={() => handleSelectTab('signup')}
                  className={`min-h-[42px] rounded-lg text-sm font-bold transition-colors ${
                    isSignUp
                      ? 'bg-slate-950 text-[#C8FF00] dark:bg-[#C8FF00] dark:text-[#090B0E] shadow-sm'
                      : 'text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Active Tab Panel */}
              <div
                id="auth-tabpanel"
                role="tabpanel"
                aria-labelledby={isSignUp ? 'tab-signup' : 'tab-signin'}
                className="mt-5"
              >
                <h2 className="font-display text-3xl font-bold tracking-wide text-slate-950 dark:text-[#F3F5F7]">
                  {isSignUp ? 'Create Your Gym Account' : 'Welcome Back'}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                  {isSignUp
                    ? 'Each account starts with its own clean roster and private cloud database.'
                    : 'Sign in to access your private gym roster, fee totals, and settings.'}
                </p>

                {/* Inline Auth Error Alert */}
                {displayedError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-900 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                    <span className="leading-relaxed">{displayedError}</span>
                  </div>
                )}

                {/* Inline Auth Success Notice */}
                {authNotice && (
                  <div
                    role="status"
                    className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-xs font-medium text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-200"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span className="leading-relaxed">{authNotice}</span>
                  </div>
                )}

                {/* Primary Google Auth Button */}
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    onGoogleAuth();
                  }}
                  disabled={authLoading}
                  data-testid="google-auth-button"
                  className="mt-5 flex min-h-[50px] w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-950 bg-slate-950 px-5 py-2.5 text-sm sm:text-base font-bold text-white hover:bg-slate-800 dark:border-[#C8FF00] dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden="true" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white shrink-0">
                        <GoogleMark className="h-4 w-4" />
                      </span>
                      <span>{isSignUp ? 'Sign up with Google' : 'Sign in with Google'}</span>
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-[#64748B]">
                    or use email
                  </span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                </div>

                {/* Email & Password Form */}
                <form onSubmit={handleEmailSubmit} noValidate className="space-y-3.5">
                  {isSignUp && (
                    <div>
                      <label
                        htmlFor="auth-fullname"
                        className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1"
                      >
                        Your Name
                      </label>
                      <input
                        id="auth-fullname"
                        type="text"
                        autoComplete="name"
                        placeholder="e.g. Anirudh Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2 text-sm text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="owner@yourgym.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (localError) setLocalError(null);
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2 text-sm text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1"
                    >
                      Password
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      required
                      minLength={6}
                      placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (localError) setLocalError(null);
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2 text-sm text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="mt-1 flex min-h-[46px] w-full items-center justify-center rounded-xl border border-slate-300 dark:border-white/[0.14] bg-slate-100 hover:bg-slate-200 dark:bg-[#161C25] dark:hover:bg-[#1E2633] px-4 py-2.5 text-sm font-bold text-slate-950 dark:text-[#F3F5F7] disabled:opacity-60 transition-colors"
                  >
                    {isSignUp ? 'Create Account with Email' : 'Sign In with Email'}
                  </button>
                </form>

                {/* Security Assurance Strip */}
                <div className="mt-5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700 dark:text-[#C8FF00]"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                      Row-level database isolation ensures each gym account sees and edits only the clients and branding they add themselves.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile / Tablet Footer */}
          <footer className="mt-6 lg:hidden text-center text-xs text-slate-600 dark:text-[#8A97AB]">
            Made by{' '}
            <span className="font-semibold text-slate-950 dark:text-[#F3F5F7]">
              Anirudh Sharma
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}
