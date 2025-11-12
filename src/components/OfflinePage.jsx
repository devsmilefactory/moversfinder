import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { checkInternetConnectivity } from '../utils/networkDetection';

/**
 * Offline Page Component
 * Displayed when the app detects no internet connection
 * Provides retry functionality and connection status
 */
const OfflinePage = ({ onRetry }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const handleRetry = async () => {
    setIsChecking(true);
    setLastChecked(new Date());

    try {
      const isOnline = await checkInternetConnectivity();
      
      if (isOnline && onRetry) {
        onRetry();
      } else if (!isOnline) {
        // Show a brief message that we're still offline
        setTimeout(() => setIsChecking(false), 1000);
      }
    } catch (error) {
      console.error('Error checking connectivity:', error);
      setIsChecking(false);
    }
  };

  // Auto-check connection every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const isOnline = await checkInternetConnectivity();
      if (isOnline && onRetry) {
        onRetry();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [onRetry]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <WifiOff className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          No Internet Connection
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          Please check your internet connection and try again. The app requires an active
          internet connection to function properly.
        </p>

        {/* Connection Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-900 mb-2 text-sm">
            Connection Tips:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Check if Wi-Fi or mobile data is enabled</li>
            <li>• Try turning airplane mode off</li>
            <li>• Move to an area with better signal</li>
            <li>• Restart your device if the problem persists</li>
          </ul>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={isChecking}
          className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking Connection...' : 'Retry Connection'}
        </button>

        {/* Last Checked */}
        {lastChecked && (
          <p className="text-xs text-gray-500 mt-4">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}

        {/* Auto-retry notice */}
        <p className="text-xs text-gray-500 mt-2">
          Automatically checking connection every 10 seconds...
        </p>
      </div>
    </div>
  );
};

export default OfflinePage;

