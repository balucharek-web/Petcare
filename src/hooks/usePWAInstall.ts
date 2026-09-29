import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function detectIsAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Capacitor native mobile runtime (Android / iOS)
    const isCapacitor =
      typeof (window as any).Capacitor !== 'undefined' ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      /Capacitor/i.test(navigator.userAgent);
    if (isCapacitor) return true;

    // 2. Android WebView or embedded WebAPK
    const ua = navigator.userAgent;
    const isAndroidWebView = /Android/i.test(ua) && (/wv|Version\/[\d.]+/i.test(ua) || ua.includes('; wv'));
    if (isAndroidWebView) return true;

    // 3. Standalone / Fullscreen / Minimal-UI display modes (Installed PWA)
    const isStandalone =
      (window.matchMedia && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches
      )) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    if (isStandalone) return true;

    // 4. Stored persistent installation flag
    if (localStorage.getItem('petcare_app_installed') === 'true') {
      return true;
    }
  } catch {
    // Ignore access errors
  }

  return false;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as any).deferredPWAInstallPrompt) || null;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectIsAppInstalled());
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Re-verify install state on mount
    const installed = detectIsAppInstalled();
    setIsInstalled(installed);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Pick up pre-captured prompt if available
    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }

    const handlePromptReady = (e: any) => {
      const promptEvent = e.detail || (window as any).deferredPWAInstallPrompt;
      if (promptEvent) {
        setDeferredPrompt(promptEvent);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('petcare_app_installed', 'true');
      } catch {}
      if (typeof window !== 'undefined') {
        (window as any).deferredPWAInstallPrompt = null;
      }
    };

    const mediaQuery = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        try {
          localStorage.setItem('petcare_app_installed', 'true');
        } catch {}
      }
    };

    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery?.addEventListener?.('change', handleMediaChange);

    return () => {
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery?.removeEventListener?.('change', handleMediaChange);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).deferredPWAInstallPrompt);
    if (!promptEvent) {
      window.dispatchEvent(new CustomEvent('pwa-open-install-guide'));
      return false;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem('petcare_app_installed', 'true');
        } catch {}
        if (typeof window !== 'undefined') {
          (window as any).deferredPWAInstallPrompt = null;
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Install prompt error:', err);
      window.dispatchEvent(new CustomEvent('pwa-open-install-guide'));
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt || !!(typeof window !== 'undefined' && (window as any).deferredPWAInstallPrompt),
    isInstalled,
    isIOS,
    install,
  };
}
