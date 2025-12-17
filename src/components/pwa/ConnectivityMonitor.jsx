/**
 * Connectivity Monitor Component
 * 
 * Monitors network connectivity and provides visual feedback
 * - Shows connection status
 * - Displays connection quality
 * - Provides retry mechanisms
 * - Shows connection history
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import { checkInternetConnectivity } from '../../utils/networkDetection';
import Button from '../ui/Button';

const ConnectivityMonitor = () => {
  const { isOnline, isConnected, isChecking, checkConnectivity } = useNetworkStatus();
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [lastCheck, setLastCheck] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check connection quality
  const checkConnectionQuality = useCallback(async () => {
    if (!isOnline) {
      setConnectionQuality('offline');
      return;
    }

    const startTime = Date.now();
    try {
      const connected = await checkInternetConnectivity(3000);
      const latency = Date.now() - startTime;

      if (!connected) {
        setConnectionQuality('offline');
        return;
      }

      if (latency < 500) {
        setConnectionQuality('good');
      } else if (latency < 1500) {
        setConnectionQuality('slow');
      } else {
        setConnectionQuality('poor');
      }

      setLastCheck(new Date());
      setRetryCount(0);
    } catch (error) {
      setConnectionQuality('offline');
    }
  }, [isOnline]);

  // Periodic quality checks
  useEffect(() => {
    checkConnectionQuality();
    const interval = setInterval(checkConnectionQuality, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [checkConnectionQuality]);

  // Update quality when connection status changes
  useEffect(() => {
    if (!isConnected) {
      setConnectionQuality('offline');
    } else {
      checkConnectionQuality();
    }
  }, [isConnected, checkConnectionQuality]);

  // Manual retry
  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    await checkConnectivity();
    await checkConnectionQuality();
  }, [checkConnectivity, checkConnectionQuality]);

  // Don't show if connection is good
  if (isConnected && connectionQuality === 'good' && !isChecking) {
    return null;
  }

  const getStatusColor = () => {
    if (!isConnected || connectionQuality === 'offline') return 'bg-red-600';
    if (connectionQuality === 'poor') return 'bg-orange-600';
    if (connectionQuality === 'slow') return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const getStatusText = () => {
    if (!isConnected || connectionQuality === 'offline') return 'No Connection';
    if (connectionQuality === 'poor') return 'Poor Connection';
    if (connectionQuality === 'slow') return 'Slow Connection';
    return 'Connected';
  };

  const getStatusIcon = () => {
    if (!isConnected || connectionQuality === 'offline') {
      return <WifiOff className="w-4 h-4" />;
    }
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[9997]">
      <div className={`${getStatusColor()} text-white rounded-lg shadow-lg p-3 animate-slide-down`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {isChecking ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              getStatusIcon()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">{getStatusText()}</span>
              {lastCheck && (
                <span className="text-xs text-white/80">
                  {Math.floor((Date.now() - lastCheck.getTime()) / 1000)}s ago
                </span>
              )}
            </div>
            {connectionQuality === 'offline' && (
              <p className="text-xs text-white/90">
                Checking connection...
              </p>
            )}
            {connectionQuality === 'slow' && (
              <p className="text-xs text-white/90">
                Connection is slower than usual
              </p>
            )}
            {connectionQuality === 'poor' && (
              <p className="text-xs text-white/90">
                Connection quality is poor. Some features may be limited.
              </p>
            )}
          </div>
          {(connectionQuality !== 'good' || isChecking) && (
            <Button
              onClick={handleRetry}
              disabled={isChecking}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 border-white/30"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectivityMonitor;

