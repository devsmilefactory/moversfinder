import { useState, useEffect, useCallback, useRef } from 'react';
import { checkInternetConnectivity, isNetworkError } from '../utils/networkDetection';

/**
 * Custom hook for monitoring network status
 * Provides real-time online/offline status with actual connectivity checks
 */
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(true); // Actual internet connectivity
  const [isChecking, setIsChecking] = useState(false);
  const checkTimeoutRef = useRef(null);

  // Check actual internet connectivity (not just network interface)
  const checkConnectivity = useCallback(async () => {
    setIsChecking(true);
    try {
      const connected = await checkInternetConnectivity();
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.error('Error checking connectivity:', error);
      setIsConnected(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Handle online event
  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    // Double-check with actual connectivity test
    await checkConnectivity();
  }, [checkConnectivity]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setIsConnected(false);
  }, []);

  // Handle visibility change - check connectivity when user returns to tab
  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      await checkConnectivity();
    }
  }, [checkConnectivity]);

  // Set up event listeners
  useEffect(() => {
    // Initial connectivity check
    checkConnectivity();

    // Listen to browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic connectivity check (every 30 seconds when online)
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkConnectivity();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [handleOnline, handleOffline, handleVisibilityChange, checkConnectivity]);

  return {
    isOnline, // Browser's navigator.onLine status
    isConnected, // Actual internet connectivity (verified with fetch)
    isChecking, // Whether we're currently checking connectivity
    checkConnectivity, // Manual connectivity check function
  };
};

export default useNetworkStatus;

