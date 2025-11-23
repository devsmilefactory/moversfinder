/**
 * Network Detection Utility
 * Provides robust online/offline detection for the PWA
 */

/**
 * Check if the browser is online
 * Uses multiple methods for reliability
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Check if we can actually reach the internet (not just connected to a network)
 * This is more reliable than navigator.onLine which only checks network interface
 */
export const checkInternetConnectivity = async (timeout = 5000) => {
  // First check navigator.onLine for quick response
  if (!navigator.onLine) {
    return false;
  }

  // Try to fetch a small resource to verify actual internet connectivity
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Use a reliable endpoint - Google's generate_204 endpoint
    // Returns 204 No Content if internet is available
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    // If fetch fails, we're likely offline or have connectivity issues
    return false;
  }
};

/**
 * Check if a specific URL is reachable
 * Useful for checking if Supabase is accessible
 */
export const checkUrlReachability = async (url, timeout = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    return false;
  }
};

/**
 * Detect if an error is a network error
 */
export const isNetworkError = (error) => {
  if (!error) return false;

  const errorMessage = error?.message || error?.toString() || '';
  const errorName = error?.name || '';

  // Check for common network error patterns
  const networkErrorPatterns = [
    'Failed to fetch',
    'NetworkError',
    'Network request failed',
    'ERR_NAME_NOT_RESOLVED',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_CONNECTION_REFUSED',
    'ERR_CONNECTION_RESET',
    'ERR_CONNECTION_TIMED_OUT',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ECONNRESET',
    'fetch failed',
    'network',
  ];

  return networkErrorPatterns.some(
    (pattern) =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
      errorName.toLowerCase().includes(pattern.toLowerCase())
  );
};

/**
 * Create a network status monitor
 * Returns an object with methods to subscribe to network status changes
 */
export const createNetworkMonitor = () => {
  const listeners = new Set();
  let currentStatus = navigator.onLine;

  const handleOnline = async () => {
    // Double-check with actual connectivity test
    const isActuallyOnline = await checkInternetConnectivity();
    if (isActuallyOnline && currentStatus !== true) {
      currentStatus = true;
      listeners.forEach((listener) => listener(true));
    }
  };

  const handleOffline = () => {
    if (currentStatus !== false) {
      currentStatus = false;
      listeners.forEach((listener) => listener(false));
    }
  };

  // Listen to browser events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Also listen to visibility change to check when user returns to tab
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      const isActuallyOnline = await checkInternetConnectivity();
      if (isActuallyOnline !== currentStatus) {
        currentStatus = isActuallyOnline;
        listeners.forEach((listener) => listener(isActuallyOnline));
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      // Immediately call with current status
      listener(currentStatus);
      return () => listeners.delete(listener);
    },
    getStatus: () => currentStatus,
    checkConnectivity: checkInternetConnectivity,
    destroy: () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      listeners.clear();
    },
  };
};

/**
 * Wait for internet connection to be restored
 * Returns a promise that resolves when connection is back
 */
export const waitForConnection = (maxWaitTime = 60000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkConnection = async () => {
      const isConnected = await checkInternetConnectivity();
      
      if (isConnected) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime > maxWaitTime) {
        reject(new Error('Connection timeout'));
        return;
      }

      // Check again in 2 seconds
      setTimeout(checkConnection, 2000);
    };

    checkConnection();
  });
};

/**
 * Retry a function with exponential backoff when network is available
 */
export const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 10000
) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check if we're online before attempting
      const isConnected = await checkInternetConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection');
      }

      return await fn();
    } catch (error) {
      lastError = error;
      
      // If it's not a network error, don't retry
      if (!isNetworkError(error)) {
        throw error;
      }

      // If this was the last retry, throw the error
      if (i === maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);
      
      console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
      
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

