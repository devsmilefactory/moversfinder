import { useState, useEffect, useCallback } from 'react';

/**
 * Robust platform detection
 * Handles iOS (including iPadOS 13+), Android, and Chromium browsers
 */
function detectPlatform() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;

  // iOS detection (iPhone, iPad, iPod)
  // iPadOS 13+ reports as Mac but has touch support
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Android detection
  const isAndroid = /Android/.test(ua);

  // Chrome/Chromium check (for beforeinstallprompt support)
  const isChromium = /Chrome|Chromium/.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua);

  // Check if running in Safari (for iOS instructions)
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS/.test(ua);

  // Check if in-app browser (WebView) - don't show prompts
  const isInAppBrowser = /(FBAN|FBAV|Instagram|Twitter|Line|WeChat|MicroMessenger)/.test(ua);

  return { isIOS, isAndroid, isChromium, isSafari, isInAppBrowser };
}

/**
 * Check if PWA is already installed/running in standalone mode
 * Combines multiple detection methods for reliability
 */
async function isAppInstalled() {
  try {
    // 1) iOS Safari homescreen mode
    if (window.navigator.standalone === true) {
      return true;
    }

    // 2) Standard display-mode check (works in most modern browsers)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // 3) getInstalledRelatedApps (Chrome) - checks for related native apps
    if (navigator.getInstalledRelatedApps) {
      try {
        const related = await navigator.getInstalledRelatedApps();
        if (Array.isArray(related) && related.length > 0) {
          return true;
        }
      } catch (e) {
        // Ignore permission/browser restrictions
      }
    }

    // 4) Check localStorage flag set when appinstalled event fired
    if (localStorage.getItem('pwa_installed_flag') === 'true') {
      return true;
    }

  } catch (err) {
    console.warn('isAppInstalled() check error:', err);
  }

  return false;
}

/**
 * Install prompt metadata management
 */
const INSTALL_STORAGE_KEY = 'pwa_install_prompt_meta';
const VISITS_KEY = 'pwa_visits';
const ACTIVE_TIME_KEY = 'pwa_active_seconds';

function getInstallMeta() {
  const raw = localStorage.getItem(INSTALL_STORAGE_KEY);
  return raw ? JSON.parse(raw) : { 
    shown: 0, 
    lastShown: 0, 
    dismissed: 0, 
    installed: false 
  };
}

function saveInstallMeta(meta) {
  localStorage.setItem(INSTALL_STORAGE_KEY, JSON.stringify(meta));
}

/**
 * Determine if install prompt should be shown based on anti-annoy rules
 */
async function shouldShowInstallPrompt({
  minVisits = 2,
  minSeconds = 30,
  maxShows = 3,
  cooldownDays = 30
} = {}) {
  // 1) If already installed, never show
  if (await isAppInstalled()) {
    return false;
  }

  // 2) Check engagement thresholds
  const visits = Number(localStorage.getItem(VISITS_KEY) || 0);
  const activeSeconds = Number(localStorage.getItem(ACTIVE_TIME_KEY) || 0);
  
  if (visits < minVisits || activeSeconds < minSeconds) {
    return false;
  }

  // 3) Check backoff rules
  const meta = getInstallMeta();
  
  if (meta.installed) {
    return false;
  }

  if (meta.shown >= maxShows) {
    return false;
  }

  if (meta.dismissed > 0) {
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    if (Date.now() - meta.lastShown < cooldownMs) {
      return false;
    }
  }

  return true;
}

/**
 * Record prompt events
 */
function recordPromptShown() {
  const meta = getInstallMeta();
  meta.shown += 1;
  meta.lastShown = Date.now();
  saveInstallMeta(meta);
}

function recordPromptDismissed() {
  const meta = getInstallMeta();
  meta.dismissed += 1;
  meta.lastShown = Date.now();
  saveInstallMeta(meta);
}

function recordInstalled() {
  const meta = getInstallMeta();
  meta.installed = true;
  saveInstallMeta(meta);
  localStorage.setItem('pwa_installed_flag', 'true');
}

/**
 * Track user engagement (visits and active time)
 */
function incrementVisits() {
  const visits = Number(localStorage.getItem(VISITS_KEY) || 0);
  localStorage.setItem(VISITS_KEY, String(visits + 1));
}

function incrementActiveTime(seconds) {
  const activeTime = Number(localStorage.getItem(ACTIVE_TIME_KEY) || 0);
  localStorage.setItem(ACTIVE_TIME_KEY, String(activeTime + seconds));
}

/**
 * React Hook for PWA Install Management
 * 
 * Handles platform detection, install state, and anti-annoy rules
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.minVisits - Minimum visits before showing prompt (default: 2)
 * @param {number} options.minSeconds - Minimum active seconds before showing prompt (default: 30)
 * @param {number} options.maxShows - Maximum times to show prompt (default: 3)
 * @param {number} options.cooldownDays - Days to wait after dismissal (default: 30)
 * @param {number} options.delaySeconds - Delay before showing prompt (default: 3)
 * 
 * @returns {Object} PWA install state and actions
 */
export function usePWAInstall(options = {}) {
  const [platform, setPlatform] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Check install status
  useEffect(() => {
    const checkInstallStatus = async () => {
      const installed = await isAppInstalled();
      setIsInstalled(installed);
    };

    checkInstallStatus();
    setPlatform(detectPlatform());

    // Increment visits on mount
    incrementVisits();
  }, []);

  // Track active time
  useEffect(() => {
    let activeSeconds = 0;
    let isActive = true;
    let interval;

    const handleVisibilityChange = () => {
      isActive = !document.hidden;
    };

    const handleActivity = () => {
      isActive = true;
    };

    // Track active time every second
    interval = setInterval(() => {
      if (isActive) {
        activeSeconds += 1;
        if (activeSeconds % 10 === 0) {
          // Save every 10 seconds
          incrementActiveTime(10);
        }
      }
    }, 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('touchstart', handleActivity);
    document.addEventListener('keydown', handleActivity);

    return () => {
      clearInterval(interval);
      // Save remaining time
      if (activeSeconds % 10 !== 0) {
        incrementActiveTime(activeSeconds % 10);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  }, []);

  // Handle beforeinstallprompt event (Android/Chromium)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      console.log('PWA installed');
      recordInstalled();
      setIsInstalled(true);
      setShouldShow(false);
      
      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: 'PWA Installed'
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Determine if prompt should be shown
  useEffect(() => {
    const checkShouldShow = async () => {
      if (!platform || isInstalled) {
        setShouldShow(false);
        return;
      }

      // Don't show in in-app browsers
      if (platform.isInAppBrowser) {
        setShouldShow(false);
        return;
      }

      const show = await shouldShowInstallPrompt(options);
      
      if (show) {
        // Delay showing prompt
        const delay = (options.delaySeconds || 3) * 1000;
        setTimeout(() => {
          setShouldShow(true);
          recordPromptShown();
        }, delay);
      }
    };

    checkShouldShow();
  }, [platform, isInstalled, options]);

  // Prompt user to install (Android/Chromium)
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: 'no-prompt' };
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      recordInstalled();
      setIsInstalled(true);
      
      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'pwa_install_accepted', {
          event_category: 'engagement'
        });
      }
    } else {
      recordPromptDismissed();
      
      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'pwa_install_dismissed', {
          event_category: 'engagement'
        });
      }
    }

    setDeferredPrompt(null);
    setShouldShow(false);

    return choice;
  }, [deferredPrompt]);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    recordPromptDismissed();
    setShouldShow(false);
    
    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'pwa_prompt_dismissed', {
        event_category: 'engagement'
      });
    }
  }, []);

  return {
    platform,
    isInstalled,
    shouldShow,
    canPrompt: !!deferredPrompt,
    promptInstall,
    dismissPrompt
  };
}

export default usePWAInstall;

