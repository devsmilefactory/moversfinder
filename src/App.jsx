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

  // Initialize auth on mount with timeout to prevent infinite loading
  useEffect(() => {
    console.log('🔄 App.jsx: Initializing auth...');
    const initAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn('⏱️ Auth initialization timeout - proceeding without auth');
          setShowSplash(false);
        }, 10000); // 10 second timeout

        await initialize();
        console.log('✅ App.jsx: Auth initialization complete');
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('❌ App.jsx: Failed to initialize auth:', error);
      }
    };

    initAuth();
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
          <IOSInstallInstructions />

          {/* Main Content */}
          {/* Always render routes so public pages like /login are reachable even while auth initializes */}
          <>
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

