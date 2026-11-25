import { getThemeColorHex } from './pwa';

export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'ironpulse_theme_v1';

/**
 * Resolves the initial theme from a persisted storage value, defaulting to
 * IronPulse's signature neon dark mode when unset or invalid.
 */
export function resolveInitialTheme(storedValue: string | null | undefined): ThemeMode {
  if (storedValue === 'light') {
    return 'light';
  }
  return 'dark';
}

export function getNextTheme(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = theme;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', getThemeColorHex(theme));
  }
}
