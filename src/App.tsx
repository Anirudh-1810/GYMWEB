/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowUpDown,
  ChevronDown,
  Database,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserPlus,
  X,
} from 'lucide-react';
import { BrandingSettingsModal } from './components/BrandingSettingsModal';
import { BrandLogoAvatar, GymHero, GymLogoMark } from './components/GymHero';
import { LoginPage } from './components/LoginPage';
import { MemberCard } from './components/MemberCard';
import { MemberFormModal } from './components/MemberFormModal';
import { MessageComposerModal } from './components/MessageComposerModal';
import { MetricsStrip } from './components/MetricsStrip';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProfileMenu } from './components/ProfileMenu';
import { QuickPayModal } from './components/QuickPayModal';
import { RevenueSummary } from './components/RevenueSummary';
import { supabase } from './lib/supabase';
import {
  DEFAULT_BRANDING,
  GymBranding,
  splitBrandWordmark,
} from './utils/branding';
import {
  Member,
  MemberFormInput,
  PaymentMode,
  SortOption,
  StatusFilter,
  calculateRenewalFromPaidDate,
  computeDashboardMetrics,
  computeRevenueSummary,
  extendRenewalDate,
  filterAndSortMembers,
  formatCurrency,
  formatDisplayDate,
  recordQuickPayment,
  toIsoDateString,
} from './utils/memberLogic';
import {
  createUserMember,
  deleteUserMember,
  getUserDisplayInfo,
  loadUserWorkspace,
  sanitizeAuthError,
  updateUserMember,
  upsertUserBranding,
  writeUserCachedBranding,
  writeUserCachedMembers,
} from './utils/supabaseSync';
import {
  THEME_STORAGE_KEY,
  ThemeMode,
  applyThemeToDocument,
  getNextTheme,
  resolveInitialTheme,
} from './utils/theme';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return resolveInitialTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      return 'dark';
    }
  });

  // Supabase Auth state
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Per-user dynamic workspace state
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [dismissedSchemaNotice, setDismissedSchemaNotice] = useState(false);
  const [branding, setBranding] = useState<GymBranding>({ ...DEFAULT_BRANDING });
  const [members, setMembers] = useState<Member[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [balanceOnly, setBalanceOnly] = useState(false);
  const [paymentModeFilter, setPaymentModeFilter] = useState<PaymentMode | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('renewal_soonest');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [quickPayMember, setQuickPayMember] = useState<Member | null>(null);

  const [messagingState, setMessagingState] = useState<{
    member: Member;
    channel: 'whatsapp' | 'email';
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user?.id ?? null;

  const userInfo = useMemo(
    () => (session?.user ? getUserDisplayInfo(session.user) : null),
    [session]
  );

  // Sync theme class on <html> and persist preference
  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota issues in restricted environments
    }
  }, [theme]);

  // Initialize Supabase Auth session, subscribe to changes, and sync across tabs
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;
    const client = supabase;

    // Surface OAuth callback error query param cleanly if redirected back with an error
    const urlParams = new URLSearchParams(window.location.search);
    const oauthErrorDesc =
      urlParams.get('error_description') || urlParams.get('error');
    if (oauthErrorDesc) {
      setAuthError(sanitizeAuthError(oauthErrorDesc));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const cleanOAuthCodeFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('code')) {
        params.delete('code');
        const nextQuery = params.toString();
        const nextUrl = nextQuery
          ? `${window.location.pathname}?${nextQuery}`
          : window.location.pathname;
        window.history.replaceState({}, document.title, nextUrl);
      }
    };

    const hydrateSession = async (isInitial = false) => {
      try {
        const { data, error } = await client.auth.getSession();
        if (!isMounted) return;
        if (error) {
          if (isInitial) {
            setAuthError(sanitizeAuthError(error));
          }
          return;
        }
        if (data.session) {
          setSession(data.session);
          cleanOAuthCodeFromUrl();
        } else if (isInitial) {
          setSession(null);
        }
      } catch (err) {
        if (isMounted && isInitial) {
          setAuthError(sanitizeAuthError(err));
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    void hydrateSession(true);

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setAuthLoading(false);
        return;
      }
      if (nextSession) {
        setSession(nextSession);
        setAuthError(null);
        cleanOAuthCodeFromUrl();
      } else if (event === 'INITIAL_SESSION') {
        setSession(null);
      }
      setAuthLoading(false);
    });

    const handleStorageSync = (event: StorageEvent) => {
      if (event.key && event.key.includes('auth-token')) {
        void hydrateSession(true);
      }
    };

    const handleWindowFocus = () => {
      void hydrateSession(false);
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Load strictly per-user workspace whenever the authenticated user changes
  useEffect(() => {
    if (!userId || !supabase) {
      // Wipe in-memory user data immediately when signed out
      setMembers([]);
      setBranding({ ...DEFAULT_BRANDING });
      setSchemaMissing(false);
      setDismissedSchemaNotice(false);
      setWorkspaceLoading(false);
      setSearchQuery('');
      setStatusFilter('all');
      setBalanceOnly(false);
      setPaymentModeFilter('all');
      setIsFormOpen(false);
      setEditingMember(null);
      setIsSettingsOpen(false);
      setQuickPayMember(null);
      setMessagingState(null);
      return;
    }

    let cancelled = false;
    setWorkspaceLoading(true);
    setMembers([]);
    setBranding({ ...DEFAULT_BRANDING });
    setDismissedSchemaNotice(false);

    void loadUserWorkspace(supabase, userId).then((result) => {
      if (cancelled) return;
      setMembers(result.members);
      setBranding(result.branding);
      setSchemaMissing(result.schemaMissing);
      setWorkspaceLoading(false);
      if (result.errorMessage) {
        setToastMessage(result.errorMessage);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Sync document & iOS home-screen title with current user's gym branding
  useEffect(() => {
    document.title = session
      ? `${branding.gymName} — Gym Client Dashboard`
      : 'IronPulse Gym — Owner Login';
    const appleTitleMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]'
    );
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', branding.gymName);
    }
  }, [branding.gymName, session]);

  // Press "/" anywhere outside inputs to focus search quickly (authenticated view only)
  useEffect(() => {
    if (!session) return;
    const handleGlobalKey = (event: KeyboardEvent) => {
      if (
        event.key === '/' &&
        !isFormOpen &&
        !messagingState &&
        !isSettingsOpen &&
        !quickPayMember &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [session, isFormOpen, messagingState, isSettingsOpen, quickPayMember]);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const metrics = useMemo(() => computeDashboardMetrics(members), [members]);
  const revenueSummary = useMemo(() => computeRevenueSummary(members), [members]);

  const visibleMembers = useMemo(
    () =>
      filterAndSortMembers(members, {
        query: searchQuery,
        statusFilter,
        sortBy,
        balanceOnly,
        paymentModeFilter,
      }),
    [members, searchQuery, statusFilter, sortBy, balanceOnly, paymentModeFilter]
  );

  const todayDisplay = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const headerWordmark = useMemo(
    () => splitBrandWordmark(branding.gymName),
    [branding.gymName]
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      statusFilter !== 'all' ||
      balanceOnly ||
      paymentModeFilter !== 'all'
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setBalanceOnly(false);
    setPaymentModeFilter('all');
  };

  const handleToggleTheme = () => {
    setTheme((prev) => getNextTheme(prev));
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ensure local session clears cleanly even if network fails
      }
    } finally {
      setAuthError(null);
      setSession(null);
      setMembers([]);
      setBranding({ ...DEFAULT_BRANDING });
    }
  };

  // Persist helpers for member create & update mutations (updates user-scoped cache + Supabase)
  const syncMemberCreate = (updatedMembers: Member[], createdMember: Member) => {
    if (!userId) return;
    writeUserCachedMembers(userId, updatedMembers);
    if (supabase) {
      void createUserMember(supabase, userId, createdMember).then((res) => {
        if (res.schemaMissing) {
          setSchemaMissing(true);
        } else if (!res.ok && res.errorMessage) {
          showToast(res.errorMessage);
        }
      });
    }
  };

  const syncMemberUpdate = (updatedMembers: Member[], savedMember: Member) => {
    if (!userId) return;
    writeUserCachedMembers(userId, updatedMembers);
    if (supabase) {
      void updateUserMember(supabase, userId, savedMember).then((res) => {
        if (res.schemaMissing) {
          setSchemaMissing(true);
        } else if (!res.ok && res.errorMessage) {
          showToast(res.errorMessage);
        }
      });
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  const openManageModal = (member: Member) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleSaveMember = (input: MemberFormInput, editingId: string | null) => {
    if (!userId) return;
    const computedRenewal =
      input.renewalDate || calculateRenewalFromPaidDate(input.paidDate, input.plan);
    const resolvedAmountPaid =
      input.amountPaid !== undefined ? input.amountPaid : input.fees;

    if (editingId) {
      let savedRecord: Member | null = null;
      const nextMembers = members.map((m) => {
        if (m.id !== editingId) return m;
        savedRecord = {
          ...m,
          name: input.name,
          phone: input.phone,
          email: input.email,
          plan: input.plan,
          fees: input.fees,
          amountPaid: resolvedAmountPaid,
          paymentMode: input.paymentMode,
          manualStatus: input.manualStatus,
          paidDate: input.paidDate,
          renewalDate: computedRenewal,
          avatarUrl: input.avatarUrl,
          notes: input.notes,
        };
        return savedRecord;
      });
      setMembers(nextMembers);
      if (savedRecord) {
        syncMemberUpdate(nextMembers, savedRecord);
      }
      showToast(`Updated ${input.name}`);
    } else {
      const newMember: Member = {
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name,
        phone: input.phone,
        email: input.email,
        plan: input.plan,
        fees: input.fees,
        amountPaid: resolvedAmountPaid,
        paymentMode: input.paymentMode,
        manualStatus: input.manualStatus,
        paidDate: input.paidDate,
        renewalDate: computedRenewal,
        joinedDate: input.paidDate || toIsoDateString(new Date()),
        avatarUrl: input.avatarUrl,
        notes: input.notes,
      };
      const nextMembers = [newMember, ...members];
      setMembers(nextMembers);
      syncMemberCreate(nextMembers, newMember);
      resetAllFilters();
      showToast(`Added ${newMember.name} to your roster`);
    }
    setIsFormOpen(false);
    setEditingMember(null);
  };

  const handleQuickPay = (memberId: string, paymentMode: PaymentMode) => {
    if (!userId) return;
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    const updated = recordQuickPayment(target, paymentMode);
    const nextMembers = members.map((m) => (m.id === memberId ? updated : m));
    setMembers(nextMembers);
    syncMemberUpdate(nextMembers, updated);
    setQuickPayMember(null);
    showToast(
      `Marked ${target.name} paid via ${paymentMode} · Next due ${formatDisplayDate(updated.renewalDate)}`
    );
  };

  const handleQuickRenew = (memberId: string, months: number) => {
    if (!userId) return;
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    const nextDate = extendRenewalDate(target.renewalDate, months);
    const todayIso = toIsoDateString(new Date());
    const updated: Member = {
      ...target,
      paidDate: todayIso,
      renewalDate: nextDate,
      amountPaid: target.fees,
      manualStatus: 'active',
    };
    const nextMembers = members.map((m) => (m.id === memberId ? updated : m));
    setMembers(nextMembers);
    syncMemberUpdate(nextMembers, updated);
    setIsFormOpen(false);
    setEditingMember(null);
    showToast(`Renewed ${target.name} through ${formatDisplayDate(nextDate)}`);
  };

  const handleSettleBalance = (memberId: string) => {
    if (!userId) return;
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    const todayIso = toIsoDateString(new Date());
    const updated: Member = {
      ...target,
      amountPaid: target.fees,
      paidDate: todayIso,
    };
    const nextMembers = members.map((m) => (m.id === memberId ? updated : m));
    setMembers(nextMembers);
    syncMemberUpdate(nextMembers, updated);
    setIsFormOpen(false);
    setEditingMember(null);
    showToast(
      `Balance cleared for ${target.name} (${formatCurrency(target.fees, branding.currency)} paid)`
    );
  };

  const handleDeleteMember = (memberId: string) => {
    if (!userId) return;
    const target = members.find((m) => m.id === memberId);
    const nextMembers = members.filter((m) => m.id !== memberId);
    setMembers(nextMembers);
    writeUserCachedMembers(userId, nextMembers);
    if (supabase) {
      void deleteUserMember(supabase, userId, memberId).then((res) => {
        if (res.schemaMissing) {
          setSchemaMissing(true);
        } else if (!res.ok && res.errorMessage) {
          showToast(res.errorMessage);
        }
      });
    }
    setIsFormOpen(false);
    setEditingMember(null);
    if (target) {
      showToast(`Removed ${target.name} from roster`);
    }
  };

  const handleMarkMessaged = (memberId: string) => {
    if (!userId) return;
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    const updated: Member = {
      ...target,
      lastMessagedAt: new Date().toISOString(),
    };
    const nextMembers = members.map((m) => (m.id === memberId ? updated : m));
    setMembers(nextMembers);
    syncMemberUpdate(nextMembers, updated);
  };

  const handleSaveBranding = (nextBranding: GymBranding) => {
    if (!userId) return;
    setBranding(nextBranding);
    writeUserCachedBranding(userId, nextBranding);
    if (supabase) {
      void upsertUserBranding(supabase, userId, nextBranding).then((res) => {
        if (res.schemaMissing) {
          setSchemaMissing(true);
        } else if (!res.ok && res.errorMessage) {
          showToast(res.errorMessage);
        }
      });
    }
    setIsSettingsOpen(false);
    showToast(`Saved branding for ${nextBranding.gymName}`);
  };

  const filterTabs: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: metrics.total },
    { id: 'active', label: 'Active', count: metrics.active },
    { id: 'expiring_soon', label: 'Expiring Soon', count: metrics.expiringSoon },
    { id: 'expired', label: 'Expired', count: metrics.expired },
    { id: 'paused', label: 'Paused', count: metrics.paused },
  ];

  // 1. Auth session bootstrap screen (prevents flashing dashboard or login prematurely)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] text-slate-950 dark:bg-[#090B0E] dark:text-[#F3F5F7] flex flex-col items-center justify-center px-6">
        <GymLogoMark className="h-14 w-14" />
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
          <Loader2 className="h-4 w-4 animate-spin text-lime-700 dark:text-[#C8FF00]" aria-hidden="true" />
          <span>Checking your gym session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Login Page
  if (!session) {
    return (
      <LoginPage
        theme={theme}
        onToggleTheme={handleToggleTheme}
        initialError={authError}
      />
    );
  }

  // 3. Authenticated Owner Dashboard
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-950 dark:bg-[#090B0E] dark:text-[#F3F5F7] flex flex-col transition-colors duration-150">
      {/* Top Navigation Bar (Strict 3-Zone Contract, compact 52px on mobile) */}
      <header className="sticky top-0 z-30 pt-safe border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#090B0E]/92 backdrop-blur-md">
        <div className="mx-auto flex h-[52px] md:h-16 max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              resetAllFilters();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-xl sm:text-2xl font-bold tracking-wider text-slate-950 dark:text-[#F3F5F7] whitespace-nowrap shrink-0 max-w-[180px] sm:max-w-none truncate"
          >
            {headerWordmark.lead}
            {headerWordmark.accent ? (
              <>
                {headerWordmark.lead === 'IRON' && headerWordmark.accent === 'PULSE'
                  ? ''
                  : ' '}
                <span className="text-lime-700 dark:text-[#C8FF00]">
                  {headerWordmark.accent}
                </span>
              </>
            ) : null}
          </a>

          {/* Zone 2: Clean single-line nav links */}
          <nav
            aria-label="Primary roster views"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {(
              [
                { id: 'all', label: 'All Members' },
                { id: 'active', label: 'Active' },
                { id: 'expiring_soon', label: 'Expiring Soon' },
                { id: 'expired', label: 'Expired' },
              ] as const
            ).map((item) => {
              const isCurrent = statusFilter === item.id && !balanceOnly;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(item.id);
                    setBalanceOnly(false);
                  }}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isCurrent
                      ? 'border-slate-950 text-slate-950 font-semibold dark:border-[#C8FF00] dark:text-[#F3F5F7]'
                      : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Theme Toggle, Primary Action & Profile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'light'}
              title={theme === 'dark' ? 'Switch to high-contrast light mode' : 'Switch to neon dark mode'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950 dark:border-white/[0.1] dark:bg-[#11151B] dark:text-[#CBD5E1] dark:hover:border-[#C8FF00]/50 dark:hover:text-[#C8FF00] transition-colors duration-150 shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 stroke-[2.5] shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Add Member</span>
              <span className="sm:hidden">Add</span>
            </button>

            {userInfo && (
              <ProfileMenu
                userInfo={userInfo}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onSignOut={handleSignOut}
              />
            )}

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Logout and switch Google account"
              title="Logout to switch Gmail account"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-rose-300/80 bg-rose-50 px-2.5 sm:px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-400 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 dark:hover:border-rose-400/60 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="top"
        className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-7 pb-10"
      >
        {/* Gym Hero Section: Logo, Name, Signed-In Account, Settings & Sign Out */}
        <GymHero
          branding={branding}
          todayDisplay={todayDisplay}
          userInfo={userInfo}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSignOut={handleSignOut}
        />

        {/* One-time Supabase SQL setup notice if tables haven't been created yet */}
        {schemaMissing && !dismissedSchemaNotice && (
          <div
            role="status"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-amber-300 dark:border-amber-500/35 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-950 dark:text-amber-200"
          >
            <div className="flex items-start gap-2.5">
              <Database className="h-4 w-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
              <p>
                <strong className="font-semibold">Cloud tables not set up yet:</strong>{' '}
                Your data is currently saved privately for your login on this device. Run{' '}
                <code className="font-mono text-xs px-1 py-0.5 rounded bg-amber-200/70 dark:bg-amber-400/15">
                  supabase/schema.sql
                </code>{' '}
                in your Supabase SQL Editor to enable live multi-device cloud sync.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissedSchemaNotice(true)}
              aria-label="Dismiss setup notice"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-amber-800 hover:bg-amber-200/60 dark:text-amber-200 dark:hover:bg-amber-400/15 shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* KPI Overview Strip */}
        <MetricsStrip
          metrics={metrics}
          activeFilter={statusFilter}
          onSelectFilter={(filter) => {
            setStatusFilter(filter);
            if (filter === 'all') setBalanceOnly(false);
          }}
        />

        {/* Revenue & Fee Summary + Plan & Payment Mode Breakdown */}
        <RevenueSummary
          summary={revenueSummary}
          currency={branding.currency}
          balanceOnly={balanceOnly}
          paymentModeFilter={paymentModeFilter}
          onToggleBalanceOnly={() => setBalanceOnly((prev) => !prev)}
          onSelectPaymentMode={setPaymentModeFilter}
        />

        {/* Search, Filter Tabs & Sort Toolbar */}
        <section
          aria-label="Search and filter members"
          className="mt-5 sm:mt-6 flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 flex-1 lg:max-w-md">
            <div className="relative flex-1 min-w-0">
              <label htmlFor="client-search" className="sr-only">
                Search clients by name, plan, email, phone, payment mode, or fees
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-[#7E8B9E]"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                id="client-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, plan, mode, or fees..."
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#11151B] pl-10 pr-10 py-2.5 text-sm text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-500 dark:placeholder:text-[#64748B] transition-colors focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs + Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
            <div
              role="group"
              aria-label="Filter by membership status"
              className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] p-1"
            >
              {filterTabs.map((tab) => {
                const isSelected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    aria-pressed={isSelected}
                    className={`min-h-[36px] sm:min-h-[38px] rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      isSelected
                        ? 'bg-slate-950 text-[#C8FF00] dark:bg-[#C8FF00] dark:text-[#090B0E]'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-[#94A3B8] dark:hover:text-[#F3F5F7] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab.label}{' '}
                    <span
                      className={
                        isSelected
                          ? 'text-[#C8FF00]/80 dark:text-[#090B0E]/75'
                          : 'text-slate-500 dark:text-[#64748B]'
                      }
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative flex items-center shrink-0">
              <label htmlFor="sort-members" className="sr-only">
                Sort members
              </label>
              <ArrowUpDown
                className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-500 dark:text-[#7E8B9E]"
                aria-hidden="true"
              />
              <select
                id="sort-members"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full sm:w-auto min-h-[44px] appearance-none rounded-xl border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-[#11151B] pl-9 pr-9 py-2 text-xs font-medium text-slate-800 dark:text-[#CBD5E1] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none cursor-pointer"
              >
                <option value="renewal_soonest" className="bg-white text-slate-950 dark:bg-[#11151B] dark:text-[#F3F5F7]">
                  Sort: Renewal Soonest
                </option>
                <option value="name_asc" className="bg-white text-slate-950 dark:bg-[#11151B] dark:text-[#F3F5F7]">
                  Sort: Name (A–Z)
                </option>
                <option value="newest_added" className="bg-white text-slate-950 dark:bg-[#11151B] dark:text-[#F3F5F7]">
                  Sort: Recently Paid
                </option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-500 dark:text-[#7E8B9E]"
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        {/* Results Count Caption & Active Filter Readout */}
        <div className="mt-4 sm:mt-5 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-[#7E8B9E]">
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span>
              Showing{' '}
              <strong className="font-semibold text-slate-950 dark:text-[#CBD5E1]">
                {visibleMembers.length}
              </strong>{' '}
              of{' '}
              <strong className="font-semibold text-slate-950 dark:text-[#CBD5E1]">
                {members.length}
              </strong>{' '}
              {members.length === 1 ? 'client' : 'clients'}
            </span>
            {balanceOnly && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-amber-800 dark:text-amber-300">
                  Balances due only
                </span>
              </>
            )}
            {paymentModeFilter !== 'all' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-lime-800 dark:text-[#C8FF00]">
                  Mode: {paymentModeFilter}
                </span>
              </>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="font-semibold text-lime-800 dark:text-[#C8FF00] hover:underline whitespace-nowrap"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Client Cards Grid, Loading State, or Empty States */}
        {workspaceLoading ? (
          <section className="mt-4 flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] px-6 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-lime-700 dark:text-[#C8FF00]" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-[#8A97AB]">
              Loading your gym roster...
            </p>
          </section>
        ) : members.length === 0 ? (
          <section className="mt-4 flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] px-6 py-16 text-center">
            <UserPlus className="h-10 w-10 text-lime-700 dark:text-[#C8FF00]" aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-[#F3F5F7]">
              No Clients Yet
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-slate-600 dark:text-[#8A97AB]">
              Your account starts completely clean—no predefined data. Add your first gym member to save it directly to your database, or customize your gym name and logo.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-5 py-2.5 text-sm font-bold transition-colors"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                <span>Add First Member</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 dark:border-white/[0.14] bg-white dark:bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-slate-950 dark:text-[#CBD5E1] dark:hover:border-[#C8FF00]/60 dark:hover:text-[#C8FF00] transition-colors"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span>Gym Settings</span>
              </button>
            </div>
          </section>
        ) : visibleMembers.length === 0 ? (
          <section className="mt-4 flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] px-6 py-14 text-center">
            <h2 className="font-display text-2xl font-bold text-slate-950 dark:text-[#F3F5F7]">
              No Matching Clients
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-slate-600 dark:text-[#8A97AB]">
              No members match your current search or active filters. Try adjusting them or reset filters below.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-5 inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-transparent px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-950 dark:text-[#F3F5F7] dark:hover:border-[#C8FF00]/60 dark:hover:text-[#C8FF00] transition-colors"
            >
              Clear Filters
            </button>
          </section>
        ) : (
          <section
            aria-label="Client cards"
            data-testid="member-grid"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {visibleMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                currency={branding.currency}
                onMessage={(target, channel) =>
                  setMessagingState({ member: target, channel })
                }
                onManage={openManageModal}
                onQuickPay={setQuickPayMember}
                onSettleBalance={handleSettleBalance}
              />
            ))}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0E13] pb-24 md:pb-7 pt-5 sm:pt-6">
        <div className="mx-auto flex max-w-7xl flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogoAvatar
              logoUrl={branding.logoUrl}
              gymName={branding.gymName}
              className="h-7 w-7"
            />
            <span className="font-display text-base font-bold tracking-wider text-slate-950 dark:text-[#F3F5F7] truncate">
              {headerWordmark.lead}
              {headerWordmark.accent ? (
                <>
                  {headerWordmark.lead === 'IRON' && headerWordmark.accent === 'PULSE'
                    ? ''
                    : ' '}
                  <span className="text-lime-700 dark:text-[#C8FF00]">
                    {headerWordmark.accent}
                  </span>
                </>
              ) : null}
              {headerWordmark.trailing ? (
                <span className="text-slate-700 dark:text-slate-300">
                  {' '}
                  {headerWordmark.trailing}
                </span>
              ) : null}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-[#94A3B8] text-right whitespace-nowrap">
            Made by{' '}
            <span className="font-semibold text-slate-950 dark:text-[#F3F5F7]">
              Anirudh Sharma
            </span>
          </p>
        </div>
      </footer>

      {/* Subtle Toast Confirmation */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 rounded-lg border border-slate-950/20 dark:border-[#C8FF00]/40 bg-slate-950 text-[#F3F5F7] dark:bg-[#151A22] px-4 py-3 text-xs sm:text-sm font-medium shadow-xl"
        >
          {toastMessage}
        </div>
      )}

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Mobile Ergonomic Bottom Nav */}
      <MobileBottomNav
        activeFilter={statusFilter}
        expiringCount={metrics.expiringSoon}
        expiredCount={metrics.expired}
        onSelectFilter={(filter) => {
          setStatusFilter(filter);
          if (filter === 'all') setBalanceOnly(false);
        }}
        onAddMember={openAddModal}
      />

      {/* Add / Manage Member Modal */}
      <MemberFormModal
        isOpen={isFormOpen}
        currency={branding.currency}
        editingMember={editingMember}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMember(null);
        }}
        onSave={handleSaveMember}
        onQuickRenew={handleQuickRenew}
        onSettleBalance={handleSettleBalance}
        onDelete={handleDeleteMember}
      />

      {/* Quick Mark Paid (Cash / UPI) Modal */}
      <QuickPayModal
        member={quickPayMember}
        currency={branding.currency}
        onClose={() => setQuickPayMember(null)}
        onConfirm={handleQuickPay}
      />

      {/* Custom Gym Branding Settings Modal */}
      <BrandingSettingsModal
        isOpen={isSettingsOpen}
        branding={branding}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveBranding}
      />

      {/* Direct WhatsApp / Email Composer Modal */}
      <MessageComposerModal
        member={messagingState?.member ?? null}
        initialChannel={messagingState?.channel ?? 'whatsapp'}
        branding={branding}
        onClose={() => setMessagingState(null)}
        onMarkMessaged={handleMarkMessaged}
      />
    </div>
  );
}
