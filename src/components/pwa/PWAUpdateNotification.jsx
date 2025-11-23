/**
 * PWA Update Notification Component
 * 
 * Displays a toast notification when a new version of the app is available.
 * Allows users to reload and activate the new service worker.
 * 
 * Integrates with vite-plugin-pwa's useRegisterSW hook.
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from '../ui/Button';
import { handleAppUpdate } from '../../utils/versionManager';

const PWAUpdateNotification = () => {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('Service Worker registered:', registration);
      
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          console.log('Checking for service worker updates...');
          registration.update();
        }, 60 * 60 * 1000); // 1 hour
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('New content available, please refresh.');
      setShowReloadPrompt(true);
      
      // Track update available event (optional analytics)
      if (window.gtag) {
        window.gtag('event', 'pwa_update_available', {
          event_category: 'engagement'
        });
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
      
      // Track offline ready event (optional analytics)
      if (window.gtag) {
        window.gtag('event', 'pwa_offline_ready', {
          event_category: 'engagement'
        });
      }
    },
  });

  const handleUpdate = async () => {
    setIsUpdating(true);

    try {
      console.log('🔄 PWA Update: Starting update process...');

      // Track update acceptance (optional analytics)
      if (window.gtag) {
        window.gtag('event', 'pwa_update_accepted', {
          event_category: 'engagement'
        });
      }

      // Clear all caches and auth state before updating
      console.log('🧹 Clearing caches before update...');
      await handleAppUpdate();

      // Update service worker
      console.log('🔄 Updating service worker...');
      await updateServiceWorker(true);

      // The page will reload automatically after updateServiceWorker
      // But if it doesn't, force reload after a short delay
      setTimeout(() => {
        console.log('🔄 Force reloading page...');
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ Error updating service worker:', error);
      setIsUpdating(false);

      // Even if there's an error, try to reload to get the new version
      setTimeout(() => {
        console.log('🔄 Reloading despite error...');
        window.location.reload();
      }, 2000);
    }
  };

  const handleDismiss = () => {
    setShowReloadPrompt(false);
    setNeedRefresh(false);
    
    // Track dismissal (optional analytics)
    if (window.gtag) {
      window.gtag('event', 'pwa_update_dismissed', {
        event_category: 'engagement'
      });
    }
  };

  // Show offline ready notification briefly
  useEffect(() => {
    if (offlineReady) {
      const timer = setTimeout(() => {
        setOfflineReady(false);
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [offlineReady, setOfflineReady]);

  // Offline Ready Toast
  if (offlineReady && !needRefresh) {
    return (
      <div className="fixed top-4 right-4 z-[9999] max-w-sm animate-slide-in-right">
        <div className="bg-green-600 text-white rounded-lg shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">App Ready for Offline Use</h4>
              <p className="text-sm text-white/90">
                TaxiCab is now available offline!
              </p>
            </div>
            <button
              onClick={() => setOfflineReady(false)}
              className="flex-shrink-0 text-white/80 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Update Available Toast
  if (showReloadPrompt && needRefresh) {
    return (
      <div className="fixed top-4 right-4 z-[9999] max-w-sm animate-slide-in-right">
        <div className="bg-blue-600 text-white rounded-lg shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">New Version Available</h4>
              <p className="text-sm text-white/90 mb-3">
                A new version of TaxiCab is ready. Reload to update.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Reload Now
                    </>
                  )}
                </Button>
                <button
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  className="text-white/90 hover:text-white text-sm font-medium px-3 py-2 disabled:opacity-50"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              disabled={isUpdating}
              className="flex-shrink-0 text-white/80 hover:text-white disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAUpdateNotification;

