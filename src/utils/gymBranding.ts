export type CurrencySymbol = '₹' | '$' | '€' | '£' | 'AED ';

export interface CurrencyOption {
  symbol: CurrencySymbol;
  code: string;
  label: string;
  locale: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { symbol: '₹', code: 'INR', label: 'INR (₹)', locale: 'en-IN' },
  { symbol: '$', code: 'USD', label: 'USD ($)', locale: 'en-US' },
  { symbol: '€', code: 'EUR', label: 'EUR (€)', locale: 'de-DE' },
  { symbol: '£', code: 'GBP', label: 'GBP (£)', locale: 'en-GB' },
  { symbol: 'AED ', code: 'AED', label: 'AED', locale: 'en-AE' },
];

export interface GymBranding {
  gymName: string;
  tagline: string;
  currencySymbol: CurrencySymbol;
  logoDataUrl?: string;
}

export const BRANDING_STORAGE_KEY = 'ironpulse_branding_v1';

export const DEFAULT_BRANDING: GymBranding = {
  gymName: 'IronPulse Gym',
  tagline: 'Strength & Conditioning · Client Roster, Membership Fees & Due Dates',
  currencySymbol: '₹',
  logoDataUrl: undefined,
};

export function normalizeBranding(raw: unknown): GymBranding {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_BRANDING };
  }
  const obj = raw as Record<string, unknown>;
  const gymName =
    typeof obj.gymName === 'string' && obj.gymName.trim().length > 0
      ? obj.gymName.trim().slice(0, 48)
      : DEFAULT_BRANDING.gymName;

  const tagline =
    typeof obj.tagline === 'string' && obj.tagline.trim().length > 0
      ? obj.tagline.trim().slice(0, 110)
      : DEFAULT_BRANDING.tagline;

  const validSymbols = new Set<string>(CURRENCY_OPTIONS.map((c) => c.symbol));
  const currencySymbol: CurrencySymbol =
    typeof obj.currencySymbol === 'string' && validSymbols.has(obj.currencySymbol)
      ? (obj.currencySymbol as CurrencySymbol)
      : DEFAULT_BRANDING.currencySymbol;

  const logoDataUrl =
    typeof obj.logoDataUrl === 'string' && obj.logoDataUrl.startsWith('data:image/')
      ? obj.logoDataUrl
      : undefined;

  return {
    gymName,
    tagline,
    currencySymbol,
    logoDataUrl,
  };
}

export function getCurrencyLocale(symbol: CurrencySymbol): string {
  const match = CURRENCY_OPTIONS.find((opt) => opt.symbol === symbol);
  return match?.locale ?? 'en-IN';
}

export function loadInitialBranding(): GymBranding {
  try {
    const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRANDING };
    return normalizeBranding(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}
