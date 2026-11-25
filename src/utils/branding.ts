export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD';

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
  presets: number[];
}

export interface GymBranding {
  gymName: string;
  logoUrl?: string;
  currency: CurrencyCode;
}

export const BRANDING_STORAGE_KEY = 'ironpulse_branding_v1';

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  {
    code: 'INR',
    symbol: '₹',
    label: 'INR (₹)',
    locale: 'en-IN',
    presets: [1000, 1500, 2500, 4500, 8000],
  },
  {
    code: 'USD',
    symbol: '$',
    label: 'USD ($)',
    locale: 'en-US',
    presets: [40, 60, 100, 180, 350],
  },
  {
    code: 'EUR',
    symbol: '€',
    label: 'EUR (€)',
    locale: 'en-US',
    presets: [40, 60, 100, 180, 350],
  },
  {
    code: 'GBP',
    symbol: '£',
    label: 'GBP (£)',
    locale: 'en-GB',
    presets: [35, 55, 90, 160, 300],
  },
  {
    code: 'AED',
    symbol: 'AED ',
    label: 'AED',
    locale: 'en-AE',
    presets: [150, 250, 450, 800, 1500],
  },
  {
    code: 'AUD',
    symbol: 'A$',
    label: 'AUD (A$)',
    locale: 'en-AU',
    presets: [50, 80, 140, 250, 480],
  },
];

export const DEFAULT_BRANDING: GymBranding = {
  gymName: 'IronPulse Gym',
  currency: 'INR',
};

export function getCurrencyOption(code: CurrencyCode): CurrencyOption {
  return (
    CURRENCY_OPTIONS.find((opt) => opt.code === code) ?? CURRENCY_OPTIONS[0]
  );
}

/**
 * Formats a numeric amount using the selected gym currency and locale grouping.
 */
export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'INR'
): string {
  const option = getCurrencyOption(currency);
  if (!Number.isFinite(amount)) {
    return `${option.symbol}0`;
  }
  const formatted = new Intl.NumberFormat(option.locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${option.symbol}${formatted}`;
}

/**
 * Safely resolves stored gym branding JSON into a validated GymBranding object.
 */
export function resolveGymBranding(raw: unknown): GymBranding {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_BRANDING };
  }
  const record = raw as Record<string, unknown>;
  const rawName =
    typeof record.gymName === 'string' ? record.gymName.trim() : '';
  const validCurrency = CURRENCY_OPTIONS.some(
    (opt) => opt.code === record.currency
  )
    ? (record.currency as CurrencyCode)
    : DEFAULT_BRANDING.currency;
  const logoUrl =
    typeof record.logoUrl === 'string' && record.logoUrl.trim()
      ? record.logoUrl.trim()
      : undefined;

  const resolved: GymBranding = {
    gymName: rawName || DEFAULT_BRANDING.gymName,
    currency: validCurrency,
  };
  if (logoUrl) {
    resolved.logoUrl = logoUrl;
  }
  return resolved;
}

/**
 * Splits a gym name into two visual segments for stylized athletic wordmarks.
 */
export function splitBrandWordmark(gymName: string): {
  lead: string;
  accent: string;
  trailing: string;
} {
  const cleaned = gymName.trim() || DEFAULT_BRANDING.gymName;
  if (cleaned.toLowerCase() === 'ironpulse gym') {
    return { lead: 'IRON', accent: 'PULSE', trailing: 'GYM' };
  }
  const words = cleaned.split(/\s+/);
  if (words.length === 1) {
    const word = words[0].toUpperCase();
    const splitAt = Math.max(1, Math.ceil(word.length / 2));
    return {
      lead: word.slice(0, splitAt),
      accent: word.slice(splitAt),
      trailing: '',
    };
  }
  if (words.length === 2) {
    return {
      lead: words[0].toUpperCase(),
      accent: words[1].toUpperCase(),
      trailing: '',
    };
  }
  return {
    lead: words[0].toUpperCase(),
    accent: words[1].toUpperCase(),
    trailing: words.slice(2).join(' ').toUpperCase(),
  };
}
