import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import useNetworkStatus from './hooks/useNetworkStatus';
import SplashScreen from './components/SplashScreen';
import ProfileCompletionModal from './components/auth/ProfileCompletionModal';
import OfflinePage from './components/OfflinePage';
import AppRoutes from './Routes';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/ui/ToastProvider';
import { PWAInstallPrompt, PWAUpdateNotification, IOSInstallInstructions } from './components/pwa';
import PermissionsManager from './components/pwa/PermissionsManager';
// GoogleMapsProvider removed - using vanilla Google Maps API instead
import RideStatusToasts from './components/notifications/RideStatusToasts';
import useActiveRideLoginNotifier from './hooks/useActiveRideLoginNotifier';
import PushNotificationsProvider from './components/notifications/PushNotificationsProvider';

import { checkAndHandleUpdate, getCurrentVersion } from './utils/versionManager';
import { checkAndNotifyAppUpdate } from './services/appUpdateNotificationService';

/**
 * Main App Component for TaxiCab PWA
 *
 * Features:
 * - Splash screen on initial load
 * - Authentication via dedicated login/register pages
 * - Profile completion modal for incomplete profiles
 * - Dual-mode routing (client and driver)
 * - PWA install prompt handling
 * - Offline detection with proper handling
 * - Connection restoration detection
 */
function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOfflinePage, setShowOfflinePage] = useState(false);
  const appUpdateToastShownRef = useRef(false);

  const { user, isAuthenticated, authLoading, authError, initialize } = useAuthStore();
  const { isOnline, isConnected, checkConnectivity } = useNetworkStatus();
  useActiveRideLoginNotifier(user);
  const { addToast } = useToast();

  // Check for app updates and clear caches if needed
  // This runs on every page load/refresh to detect version changes
  useEffect(() => {
    const checkForUpdates = async () => {
      console.log('🔍 Checking for app updates on page load...');
      console.log('📦 Current app version:', getCurrentVersion());

      try {
        const wasUpdated = await checkAndHandleUpdate();

        if (wasUpdated) {
          console.log('✅ App was updated - caches cleared');
          // Version changed - the PWAUpdateNotification component will show the update banner
          // Don't re-initialize auth here - it will be done by the main initialization below
        }
      } catch (error) {
        console.error('❌ Error checking for updates:', error);
      }
    };

    // Check immediately on page load/refresh
    checkForUpdates();
    
    // Set up periodic version checking (every 10 minutes) for when app is open
    const versionCheckInterval = setInterval(() => {
      checkForUpdates();
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearInterval(versionCheckInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Initialize auth on mount - simple, no complicated timeouts
  useEffect(() => {
    console.log('🔄 App.jsx: Initializing auth...');

    initialize().then(() => {
      console.log('✅ App.jsx: Auth initialization complete');
    }).catch((error) => {
      console.error('❌ App.jsx: Failed to initialize auth:', error);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Check for app updates and send push notifications when user is authenticated
  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      return;
    }

    const checkForAppUpdate = async () => {
      try {
        const result = await checkAndNotifyAppUpdate(user.id);
        if (result.updated) {
          console.log('✅ App update detected and notification sent:', result);
          if (!appUpdateToastShownRef.current) {
            appUpdateToastShownRef.current = true;
            addToast?.({
              type: 'info',
              title: 'New version available',
              message: 'A new version is ready. Click to refresh now.',
              duration: 12000,
              onClick: () => window.location.reload(),
            });
          }
        }
      } catch (error) {
        console.error('❌ Error checking for app update:', error);
      }
    };

    // Check immediately when user logs in
    checkForAppUpdate();

    // Set up periodic checking (every 15 minutes)
    const updateCheckInterval = setInterval(() => {
      checkForAppUpdate();
    }, 15 * 60 * 1000); // 15 minutes

    return () => {
      clearInterval(updateCheckInterval);
    };
  }, [user?.id, isAuthenticated]);

  // Handle splash screen - hide after 1.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Handle network status and show offline page when needed
  useEffect(() => {
    // If we have a network error from auth and we're offline, show offline page
    if (authError === 'NETWORK_ERROR' && !isConnected) {
      setShowOfflinePage(true);
    } else if (isConnected) {
      setShowOfflinePage(false);
    }
  }, [authError, isConnected]);

  // Handle retry from offline page
  const handleOfflineRetry = async () => {
    const connected = await checkConnectivity();
    if (connected) {
      setShowOfflinePage(false);
      // Don't retry initialization - user can manually login if needed
    }
  };

  // If offline page should be shown, show it instead of the app
  if (showOfflinePage) {
    return (
      <ErrorBoundary>
        <ToastProvider>
          <OfflinePage onRetry={handleOfflineRetry} />
        </ToastProvider>
      </ErrorBoundary>
    );
  }

  return (
      <ErrorBoundary>
        <ToastProvider>
          <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <div className="app-container min-h-screen bg-background">
          {/* Offline Indicator - Show when browser is offline but we haven't shown full offline page */}
          {!isOnline && !showOfflinePage && (
            <div className="fixed top-0 left-0 right-0 bg-warning text-white text-center py-2 px-4 z-[9998]">
              <p className="text-sm font-medium">
                You are offline. Some features may be limited.
              </p>
            </div>
          )}

          {/* Connection Restored Indicator */}
          {isOnline && isConnected && authError === 'NETWORK_ERROR' && (
            <div className="fixed top-0 left-0 right-0 bg-green-600 text-white text-center py-2 px-4 z-[9998]">
              <p className="text-sm font-medium">
                Connection restored! Reconnecting...
              </p>
            </div>
          )}

          {/* PWA Components */}
          <PWAUpdateNotification />
          <PWAInstallPrompt />
          <IOSInstallInstructions />
          <PermissionsManager />

          {/* Main Content */}
          {/* Always render routes so public pages like /login are reachable even while auth initializes */}
          <>
            <PushNotificationsProvider />
            <RideStatusToasts />
            <AppRoutes />

            {/* Profile Completion Modal - Only show for authenticated users */}
            {isAuthenticated && user && (
              <ProfileCompletionModal />
            )}

            {/* Optional: lightweight loader overlay while auth initializes (non-blocking) */}
            {authLoading && !showOfflinePage && (
              <div className="fixed inset-0 pointer-events-none flex items-start justify-center pt-10 z-[9996]">
                <div className="flex items-center gap-2 bg-white/80 rounded-full px-3 py-1 shadow">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  <span className="text-sm text-gray-600">Checking session…</span>
                </div>
              </div>
            )}
          </>
          </div>
        </BrowserRouter>
            {/* Splash overlay (non-blocking) */}
            {showSplash && (
              <SplashScreen onComplete={() => setShowSplash(false)} />
            )}
        </ToastProvider>

      </ErrorBoundary>
  );
}

export default App;

