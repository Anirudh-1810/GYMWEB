import type { ThemeMode } from './theme';

export type PWAInstallMode =
  | 'installed'
  | 'native_prompt'
  | 'ios_guide'
  | 'manual_guide';

/**
 * Determines whether the application is currently running as an installed
 * full-screen / standalone PWA on iOS or Chromium platforms.
 */
export function detectStandaloneDisplayMode(
  matchMediaStandalone: boolean,
  navigatorStandalone?: boolean
): boolean {
  return Boolean(matchMediaStandalone || navigatorStandalone === true);
}

/**
 * Detects iPhone, iPad, iPod, and iPadOS Safari (which reports MacIntel + touch points).
 */
export function detectIOSUserAgent(
  userAgent: string,
  platform = '',
  maxTouchPoints = 0
): boolean {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return true;
  }
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

/**
 * Resolves the appropriate install UI behavior based on runtime capabilities.
 */
export function getPWAInstallMode(params: {
  isInstalled: boolean;
  hasDeferredPrompt: boolean;
  isIOS: boolean;
}): PWAInstallMode {
  if (params.isInstalled) return 'installed';
  if (params.hasDeferredPrompt) return 'native_prompt';
  if (params.isIOS) return 'ios_guide';
  return 'manual_guide';
}

/**
 * Returns the browser status-bar theme-color hex matching the active theme.
 */
export function getThemeColorHex(theme: ThemeMode): string {
  return theme === 'light' ? '#FFFFFF' : '#090B0E';
}
