import * as React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import useNetworkStatus from './hooks/useNetworkStatus';
import SplashScreen from './components/SplashScreen';
import ProfileCompletionModal from './components/auth/ProfileCompletionModal';
import OfflinePage from './components/OfflinePage';
import AppRoutes from './Routes';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/ToastProvider';
import { PWAInstallPrompt, PWAUpdateNotification, IOSInstallInstructions } from './components/pwa';
// GoogleMapsProvider removed - using vanilla Google Maps API instead
import RideStatusToasts from './components/notifications/RideStatusToasts';

import NotificationBell from './components/notifications/NotificationBell';
import { checkAndHandleUpdate, getCurrentVersion } from './utils/versionManager';

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

  const { user, isAuthenticated, authLoading, authError, initialize } = useAuthStore();
  const { isOnline, isConnected, checkConnectivity } = useNetworkStatus();

  // Check for app updates and clear caches if needed
  useEffect(() => {
    const checkForUpdates = async () => {
      console.log('🔍 Checking for app updates...');
      console.log('📦 Current app version:', getCurrentVersion());

      try {
        const wasUpdated = await checkAndHandleUpdate();

        if (wasUpdated) {
          console.log('✅ App was updated - caches cleared');
          // Force re-authentication after update to ensure fresh state
          const currentState = useAuthStore.getState();
          if (currentState.isAuthenticated) {
            console.log('🔄 Re-initializing auth after update...');
            await initialize();
          }
        }
      } catch (error) {
        console.error('❌ Error checking for updates:', error);
      }
    };

    checkForUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Initialize auth on mount with timeout to prevent infinite loading
  useEffect(() => {
    console.log('🔄 App.jsx: Initializing auth...');
    let timeoutId;
    let isTimedOut = false;

    const initAuth = async () => {
      try {
        // Set a timeout to force-stop auth loading after 8 seconds
        timeoutId = setTimeout(() => {
          console.warn('⏱️ Auth initialization timeout - forcing authLoading to false');
          isTimedOut = true;
          // Force clear loading state if it's still true
          const currentState = useAuthStore.getState();
          if (currentState.authLoading) {
            useAuthStore.setState({ authLoading: false });
          }
          setShowSplash(false);
        }, 8000); // 8 second timeout

        await initialize();

        if (!isTimedOut) {
          console.log('✅ App.jsx: Auth initialization complete');
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('❌ App.jsx: Failed to initialize auth:', error);
        // Ensure loading state is cleared on error
        useAuthStore.setState({ authLoading: false });
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    initAuth();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle splash screen - force hide after 2 seconds
  useEffect(() => {
    console.log('⏰ App.jsx: Starting 2-second splash timer');
    const timer = setTimeout(() => {
      console.log('✅ App.jsx: 2-second timer complete - hiding splash');
      setShowSplash(false);
    }, 2000);

    return () => {
      console.log('🧹 App.jsx: Cleaning up splash timer');
      clearTimeout(timer);
    };
  }, []);

  // Safety mechanism: Force clear authLoading after 10 seconds to prevent infinite loading
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      const currentState = useAuthStore.getState();
      if (currentState.authLoading) {
        console.warn('⚠️ Safety timeout: Force clearing authLoading after 10 seconds');
        useAuthStore.setState({ authLoading: false });
      }
    }, 10000);

    return () => clearTimeout(safetyTimer);
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

  // Retry auth initialization when connection is restored
  useEffect(() => {
    if (isConnected && authError === 'NETWORK_ERROR') {
      console.log('Connection restored - retrying auth initialization');
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, authError]); // Don't include initialize to prevent infinite loop

  // Handle retry from offline page
  const handleOfflineRetry = async () => {
    const connected = await checkConnectivity();
    if (connected) {
      setShowOfflinePage(false);
      // Retry auth initialization
      await initialize();
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
          <BrowserRouter>
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
              {isAuthenticated && user && (
                <div className="fixed top-4 right-4 z-[9990]">
                  <NotificationBell />
                </div>
              )}

          <IOSInstallInstructions />

          {/* Main Content */}
          {/* Always render routes so public pages like /login are reachable even while auth initializes */}
          <>
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

