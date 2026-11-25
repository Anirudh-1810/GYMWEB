import { useEffect, useState } from 'react';
import {
  PWAInstallMode,
  detectIOSUserAgent,
  detectStandaloneDisplayMode,
  getPWAInstallMode,
} from '../utils/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    const syncStandalone = () => {
      const navStandalone = (window.navigator as unknown as { standalone?: boolean })
        .standalone;
      setIsInstalled(
        detectStandaloneDisplayMode(standaloneQuery.matches, navStandalone)
      );
    };

    syncStandalone();

    setIsIOS(
      detectIOSUserAgent(
        window.navigator.userAgent,
        window.navigator.platform,
        window.navigator.maxTouchPoints
      )
    );

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    standaloneQuery.addEventListener?.('change', syncStandalone);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener?.('change', syncStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const installMode: PWAInstallMode = getPWAInstallMode({
    isInstalled,
    hasDeferredPrompt: Boolean(deferredPrompt),
    isIOS,
  });

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    installMode,
    install,
  };
}
