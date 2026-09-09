import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(window.__deferredPrompt || null);
  const [isInstallable, setIsInstallable] = useState(Boolean(window.__deferredPrompt));
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);

  useEffect(() => {
    // Verificar si ya corre en modo standalone / app instalada
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMac = /macintosh|mac os x/i.test(ua);

    setIsIOS(isIosDevice);
    setIsMacSafari(isMac && isSafari && !isIosDevice);

    if (window.__deferredPrompt) {
      setDeferredPrompt(window.__deferredPrompt);
      setIsInstallable(true);
    }

    const handlePrompt = (e) => {
      e.preventDefault();
      window.__deferredPrompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleCustomPrompt = () => {
      if (window.__deferredPrompt) {
        setDeferredPrompt(window.__deferredPrompt);
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.__deferredPrompt = null;
      setIsStandalone(true);
      console.log('[PWA] Aplicación instalada exitosamente');
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa-prompt-available', handleCustomPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa-prompt-available', handleCustomPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    const prompt = deferredPrompt || window.__deferredPrompt;
    if (prompt) {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstallable(false);
          setDeferredPrompt(null);
          window.__deferredPrompt = null;
          return true;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    return false;
  };

  return {
    isInstallable,
    isStandalone,
    isIOS,
    isMacSafari,
    installApp
  };
}
