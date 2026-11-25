import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { LogOut, RotateCcw, Upload, X } from 'lucide-react';
import {
  CURRENCY_OPTIONS,
  CurrencyCode,
  DEFAULT_BRANDING,
  GymBranding,
  formatMoney,
  splitBrandWordmark,
} from '../utils/branding';
import { GymLogoMark } from './GymHero';
import { PWAInstallButton } from './PWAInstallButton';

interface AccountSummary {
  displayName: string;
  email: string;
  photoURL?: string | null;
}

interface BrandingSettingsModalProps {
  isOpen: boolean;
  branding: GymBranding;
  account?: AccountSummary | null;
  onClose: () => void;
  onSave: (nextBranding: GymBranding) => void;
  onSignOut?: () => void;
}

export function BrandingSettingsModal({
  isOpen,
  branding,
  account,
  onClose,
  onSave,
  onSignOut,
}: BrandingSettingsModalProps) {
  const [gymName, setGymName] = useState(branding.gymName);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(branding.logoUrl);
  const [currency, setCurrency] = useState<CurrencyCode>(branding.currency);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setGymName(branding.gymName);
    setLogoUrl(branding.logoUrl);
    setCurrency(branding.currency);
    setNameError(undefined);
  }, [isOpen, branding]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setLogoUrl(result);
          return;
        }
        const scale = Math.min(size / img.width, size / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const dx = (size - drawW) / 2;
        const dy = (size - drawH) / 2;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, dx, dy, drawW, drawH);
        setLogoUrl(canvas.toDataURL('image/png'));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    setGymName(DEFAULT_BRANDING.gymName);
    setLogoUrl(undefined);
    setCurrency(DEFAULT_BRANDING.currency);
    setNameError(undefined);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = gymName.trim();
    if (!trimmedName) {
      setNameError('Enter your gym name.');
      return;
    }
    onSave({
      gymName: trimmedName,
      logoUrl,
      currency,
    });
  };

  const previewWordmark = splitBrandWordmark(gymName || DEFAULT_BRANDING.gymName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 dark:bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branding-settings-title"
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11151B] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] px-5 py-4 sm:px-6">
          <div>
            <h2
              id="branding-settings-title"
              className="font-display text-2xl font-bold tracking-wide text-slate-950 dark:text-[#F3F5F7]"
            >
              Gym Branding Settings
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#8A97AB] mt-0.5">
              Customize your gym name, logo, and display currency across the dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close branding settings"
            className="flex h-11 w-11 -mr-2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:bg-white/[0.06] dark:hover:text-[#F3F5F7] transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          id="branding-settings-form"
          onSubmit={handleSubmit}
          noValidate
          className="overflow-y-auto px-5 py-5 sm:px-6 space-y-5"
        >
          {/* Live Brand Preview */}
          <div className="rounded-xl border border-slate-800/40 bg-[#0B0E13] px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {logoUrl ? (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#C8FF00]/45 bg-[#11151B] p-1">
                  <img
                    src={logoUrl}
                    alt="Custom gym logo preview"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <GymLogoMark className="h-12 w-12 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="block text-[10px] font-medium tracking-wider text-slate-400">
                  Live Header Preview
                </span>
                <p className="font-display text-xl font-bold tracking-wider text-white truncate">
                  {previewWordmark.lead}
                  {previewWordmark.accent ? (
                    <>
                      {previewWordmark.lead === 'IRON' &&
                      previewWordmark.accent === 'PULSE'
                        ? ''
                        : ' '}
                      <span className="text-[#C8FF00]">
                        {previewWordmark.accent}
                      </span>
                    </>
                  ) : null}
                  {previewWordmark.trailing ? (
                    <span className="text-slate-200">
                      {' '}
                      {previewWordmark.trailing}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="block text-[10px] text-slate-400">Sample Fee</span>
              <span className="font-mono text-base font-bold tabular-nums text-[#C8FF00]">
                {formatMoney(1500, currency)}
              </span>
            </div>
          </div>

          {/* Gym Name */}
          <div>
            <label
              htmlFor="branding-gym-name"
              className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
            >
              Gym Name
            </label>
            <input
              id="branding-gym-name"
              name="gymName"
              type="text"
              maxLength={48}
              placeholder="e.g. Titan Strength Gym"
              value={gymName}
              onChange={(e) => {
                setGymName(e.target.value);
                if (nameError) setNameError(undefined);
              }}
              aria-invalid={Boolean(nameError)}
              className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2.5 text-sm font-medium text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
            />
            {nameError && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                {nameError}
              </p>
            )}
          </div>

          {/* Custom Logo Upload */}
          <div>
            <span className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5">
              Gym Logo Image
            </span>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#F3F5F7]">
                  {logoUrl ? 'Custom logo uploaded' : 'Using default emblem'}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-[#7E8B9E]">
                  PNG, JPG, or SVG · shown in Hero banner and Footer
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={logoInputRef}
                  id="branding-logo-input"
                  aria-label="Upload gym logo image"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#161C25] px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-[#F3F5F7] hover:border-slate-950 dark:hover:border-[#C8FF00]/60 dark:hover:text-[#C8FF00] transition-colors whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl(undefined);
                      if (logoInputRef.current) logoInputRef.current.value = '';
                    }}
                    className="min-h-[40px] rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:text-rose-700 dark:text-[#8A97AB] dark:hover:text-rose-400 whitespace-nowrap"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preferred Currency */}
          <div>
            <span className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5">
              Preferred Currency
            </span>
            <div
              role="group"
              aria-label="Preferred currency"
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {CURRENCY_OPTIONS.map((opt) => {
                const isSelected = currency === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setCurrency(opt.code)}
                    aria-pressed={isSelected}
                    className={`min-h-[44px] rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                      isSelected
                        ? 'border-slate-950 bg-slate-950 text-[#C8FF00] dark:border-[#C8FF00] dark:bg-[#C8FF00] dark:text-[#090B0E]'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-slate-950 dark:border-white/[0.1] dark:bg-[#0B0E13] dark:text-[#CBD5E1] dark:hover:border-white/25'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Installable Mobile App (PWA) */}
          <div>
            <span className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5">
              Mobile App (Home Screen)
            </span>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#F3F5F7]">
                  Full-screen app mode
                </p>
                <p className="text-[11px] text-slate-600 dark:text-[#7E8B9E]">
                  Launch from your phone home screen without browser bars
                </p>
              </div>
              <PWAInstallButton
                gymName={gymName.trim() || branding.gymName}
                variant="settings"
              />
            </div>
          </div>

          {/* Connected Account */}
          {account && onSignOut && (
            <div>
              <span className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5">
                Signed-In Account
              </span>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  {account.photoURL ? (
                    <img
                      src={account.photoURL}
                      alt={account.displayName}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full border border-slate-300 dark:border-white/15 object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-[#C8FF00] dark:bg-[#C8FF00] dark:text-[#090B0E] shrink-0">
                      {account.displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-[#F3F5F7] truncate">
                      {account.displayName}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-[#7E8B9E] truncate">
                      {account.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#161C25] px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-rose-400 hover:text-rose-700 dark:text-[#CBD5E1] dark:hover:border-rose-400/60 dark:hover:text-rose-300 transition-colors whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0D1117] px-5 py-4 sm:px-6 pb-safe">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-transparent px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-[#CBD5E1] dark:hover:bg-white/[0.05] dark:hover:text-white transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="branding-settings-form"
              className="min-h-[44px] rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-5 py-2 text-sm font-bold transition-colors whitespace-nowrap"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
