/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, ChevronDown, Moon, Plus, Search, Sun, UserPlus, X } from 'lucide-react';
import { GymHero, GymLogoMark } from './components/GymHero';
import { MemberCard } from './components/MemberCard';
import { MemberFormModal } from './components/MemberFormModal';
import { MessageComposerModal } from './components/MessageComposerModal';
import { MetricsStrip } from './components/MetricsStrip';
import { MobileBottomNav } from './components/MobileBottomNav';
import { createSeedMembers } from './data/seedMembers';
import {
  Member,
  MemberFormInput,
  SortOption,
  StatusFilter,
  calculateRenewalFromPaidDate,
  computeDashboardMetrics,
  extendRenewalDate,
  filterAndSortMembers,
  formatDisplayDate,
  migrateStoredMember,
  toIsoDateString,
} from './utils/memberLogic';
import {
  THEME_STORAGE_KEY,
  ThemeMode,
  applyThemeToDocument,
  getNextTheme,
  resolveInitialTheme,
} from './utils/theme';

const STORAGE_KEY = 'ironpulse_members_v1';

function loadInitialMembers(): Member[] {
  const seedMembers = createSeedMembers();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seedMembers;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const seedAvatarById = new Map(
        seedMembers
          .filter((m) => m.avatarUrl)
          .map((m) => [m.id, m.avatarUrl as string])
      );
      return parsed
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((rawMember) =>
          migrateStoredMember(
            rawMember,
            typeof rawMember.id === 'string' ? seedAvatarById.get(rawMember.id) : undefined
          )
        );
    }
  } catch {
    // Fallback cleanly to deterministic seed data
  }
  return seedMembers;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return resolveInitialTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      return 'dark';
    }
  });
  const [members, setMembers] = useState<Member[]>(loadInitialMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('renewal_soonest');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialMode, setFormInitialMode] = useState<'single' | 'csv'>('single');
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [messagingState, setMessagingState] = useState<{
    member: Member;
    channel: 'whatsapp' | 'email';
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync theme class on <html> and persist preference
  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota issues in restricted environments
    }
  }, [theme]);

  // Persist roster updates to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch {
      // Ignore storage quota issues in restricted environments
    }
  }, [members]);

  // Press "/" anywhere outside inputs to focus search quickly
  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      if (
        event.key === '/' &&
        !isFormOpen &&
        !messagingState &&
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
  }, [isFormOpen, messagingState]);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const metrics = useMemo(() => computeDashboardMetrics(members), [members]);

  const visibleMembers = useMemo(
    () =>
      filterAndSortMembers(members, {
        query: searchQuery,
        statusFilter,
        sortBy,
      }),
    [members, searchQuery, statusFilter, sortBy]
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

  const openAddModal = () => {
    setEditingMember(null);
    setFormInitialMode('single');
    setIsFormOpen(true);
  };

  const openCsvModal = () => {
    setEditingMember(null);
    setFormInitialMode('csv');
    setIsFormOpen(true);
  };

  const openManageModal = (member: Member) => {
    setEditingMember(member);
    setFormInitialMode('single');
    setIsFormOpen(true);
  };

  const handleSaveMember = (input: MemberFormInput, editingId: string | null) => {
    const computedRenewal =
      input.renewalDate || calculateRenewalFromPaidDate(input.paidDate, input.plan);

    if (editingId) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? {
                ...m,
                name: input.name,
                phone: input.phone,
                email: input.email,
                plan: input.plan,
                fees: input.fees,
                manualStatus: input.manualStatus,
                paidDate: input.paidDate,
                renewalDate: computedRenewal,
                avatarUrl: input.avatarUrl,
                notes: input.notes,
              }
            : m
        )
      );
      showToast(`Updated ${input.name}`);
    } else {
      const newMember: Member = {
        id: `mem-${Date.now()}`,
        name: input.name,
        phone: input.phone,
        email: input.email,
        plan: input.plan,
        fees: input.fees,
        manualStatus: input.manualStatus,
        paidDate: input.paidDate,
        renewalDate: computedRenewal,
        joinedDate: input.paidDate || toIsoDateString(new Date()),
        avatarUrl: input.avatarUrl,
        notes: input.notes,
      };
      setMembers((prev) => [newMember, ...prev]);
      if (statusFilter !== 'all') {
        setStatusFilter('all');
      }
      if (searchQuery.trim()) {
        setSearchQuery('');
      }
      showToast(`Added ${newMember.name} to your roster`);
    }
    setIsFormOpen(false);
    setEditingMember(null);
  };

  const handleBulkImport = (inputs: MemberFormInput[]) => {
    if (inputs.length === 0) return;
    const todayIso = toIsoDateString(new Date());
    const baseTimestamp = Date.now();
    const createdMembers: Member[] = inputs.map((input, idx) => ({
      id: `mem-${baseTimestamp}-${idx}`,
      name: input.name,
      phone: input.phone,
      email: input.email,
      plan: input.plan,
      fees: input.fees,
      manualStatus: input.manualStatus,
      paidDate: input.paidDate,
      renewalDate:
        input.renewalDate || calculateRenewalFromPaidDate(input.paidDate, input.plan),
      joinedDate: input.paidDate || todayIso,
      avatarUrl: input.avatarUrl,
      notes: input.notes,
    }));

    setMembers((prev) => [...createdMembers, ...prev]);
    if (statusFilter !== 'all') {
      setStatusFilter('all');
    }
    if (searchQuery.trim()) {
      setSearchQuery('');
    }
    setIsFormOpen(false);
    setEditingMember(null);
    showToast(
      `Imported ${createdMembers.length} ${createdMembers.length === 1 ? 'member' : 'members'} to your roster`
    );
  };

  const handleQuickRenew = (memberId: string, months: number) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    const nextDate = extendRenewalDate(target.renewalDate, months);
    const todayIso = toIsoDateString(new Date());
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              paidDate: todayIso,
              renewalDate: nextDate,
              manualStatus: 'active',
            }
          : m
      )
    );
    setIsFormOpen(false);
    setEditingMember(null);
    showToast(`Renewed ${target.name} through ${formatDisplayDate(nextDate)}`);
  };

  const handleDeleteMember = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setIsFormOpen(false);
    setEditingMember(null);
    if (target) {
      showToast(`Removed ${target.name} from roster`);
    }
  };

  const handleMarkMessaged = (memberId: string) => {
    const nowIso = new Date().toISOString();
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, lastMessagedAt: nowIso } : m))
    );
  };

  const filterTabs: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: metrics.total },
    { id: 'active', label: 'Active', count: metrics.active },
    { id: 'expiring_soon', label: 'Expiring Soon', count: metrics.expiringSoon },
    { id: 'expired', label: 'Expired', count: metrics.expired },
    { id: 'paused', label: 'Paused', count: metrics.paused },
  ];

  const handleToggleTheme = () => {
    setTheme((prev) => getNextTheme(prev));
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-950 dark:bg-[#090B0E] dark:text-[#F3F5F7] flex flex-col transition-colors duration-150">
      {/* Top Navigation Bar (Strict 3-Zone Contract, compact 52px on mobile) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#090B0E]/92 backdrop-blur-md">
        <div className="mx-auto flex h-[52px] md:h-16 max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setStatusFilter('all');
              setSearchQuery('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-2xl font-bold tracking-wider text-slate-950 dark:text-[#F3F5F7] whitespace-nowrap shrink-0"
          >
            IRON<span className="text-lime-700 dark:text-[#C8FF00]">PULSE</span>
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
              const isCurrent = statusFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatusFilter(item.id)}
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

          {/* Zone 3: Theme Toggle + Primary Action */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 stroke-[2.5] shrink-0" aria-hidden="true" />
              <span>Add Member</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="top"
        className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-7 pb-10"
      >
        {/* Gym Hero Section: Logo, Name & Overview */}
        <GymHero
          todayDisplay={todayDisplay}
          onOpenCsvImport={openCsvModal}
        />

        {/* KPI Overview Strip */}
        <MetricsStrip
          metrics={metrics}
          activeFilter={statusFilter}
          onSelectFilter={setStatusFilter}
        />

        {/* Search, Filter Tabs & Sort Toolbar */}
        <section
          aria-label="Search and filter members"
          className="mt-4 sm:mt-6 flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 flex-1 lg:max-w-md">
            <div className="relative flex-1 min-w-0">
              <label htmlFor="client-search" className="sr-only">
                Search clients by name, plan, email, or phone
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
                placeholder="Search by name, phone, plan, or fees..."
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
                  Sort: Recently Joined
                </option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-500 dark:text-[#7E8B9E]"
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        {/* Results Count Caption */}
        <div className="mt-4 sm:mt-5 mb-3 flex items-center justify-between text-xs text-slate-600 dark:text-[#7E8B9E]">
          <span className="tabular-nums">
            Showing <strong className="font-semibold text-slate-950 dark:text-[#CBD5E1]">{visibleMembers.length}</strong> of{' '}
            <strong className="font-semibold text-slate-950 dark:text-[#CBD5E1]">{members.length}</strong>{' '}
            {members.length === 1 ? 'client' : 'clients'}
          </span>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="font-semibold text-lime-800 dark:text-[#C8FF00] hover:underline whitespace-nowrap"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Client Cards Grid or Empty States */}
        {members.length === 0 ? (
          <section className="mt-4 flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] px-6 py-16 text-center">
            <UserPlus className="h-10 w-10 text-lime-700 dark:text-[#C8FF00]" aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl font-bold text-slate-950 dark:text-[#F3F5F7]">
              No Clients Yet
            </h2>
            <p className="mt-1.5 max-w-sm text-sm text-slate-600 dark:text-[#8A97AB]">
              Add your first gym member to track renewal dates and send quick WhatsApp or email reminders.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-5 py-2.5 text-sm font-bold transition-colors"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              <span>Add First Member</span>
            </button>
          </section>
        ) : visibleMembers.length === 0 ? (
          <section className="mt-4 flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11151B] px-6 py-14 text-center">
            <h2 className="font-display text-2xl font-bold text-slate-950 dark:text-[#F3F5F7]">
              No Matching Clients
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-slate-600 dark:text-[#8A97AB]">
              No members match{' '}
              {searchQuery ? (
                <span className="font-medium text-slate-950 dark:text-[#F3F5F7]">"{searchQuery}"</span>
              ) : (
                'the selected status filter'
              )}
              . Try a different search or reset your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
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
                onMessage={(target, channel) =>
                  setMessagingState({ member: target, channel })
                }
                onManage={openManageModal}
              />
            ))}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0E13] pb-24 md:pb-7 pt-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <GymLogoMark className="h-7 w-7 shrink-0" />
            <span className="font-display text-base font-bold tracking-wider text-slate-950 dark:text-[#F3F5F7]">
              IRON<span className="text-lime-700 dark:text-[#C8FF00]">PULSE</span> GYM
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
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

      {/* Mobile Ergonomic Bottom Nav */}
      <MobileBottomNav
        activeFilter={statusFilter}
        expiringCount={metrics.expiringSoon}
        expiredCount={metrics.expired}
        onSelectFilter={setStatusFilter}
        onAddMember={openAddModal}
      />

      {/* Add / Manage Member Modal */}
      <MemberFormModal
        isOpen={isFormOpen}
        initialMode={formInitialMode}
        editingMember={editingMember}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMember(null);
        }}
        onSave={handleSaveMember}
        onBulkImport={handleBulkImport}
        onQuickRenew={handleQuickRenew}
        onDelete={handleDeleteMember}
      />

      {/* Direct WhatsApp / Email Composer Modal */}
      <MessageComposerModal
        member={messagingState?.member ?? null}
        initialChannel={messagingState?.channel ?? 'whatsapp'}
        onClose={() => setMessagingState(null)}
        onMarkMessaged={handleMarkMessaged}
      />
    </div>
  );
}
