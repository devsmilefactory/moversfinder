import React from 'react';
import { RefreshCw, Wifi, WifiOff, MapPin } from 'lucide-react';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import Button from '../../../components/ui/Button';

/**
 * RideRequestsHeader Component
 * 
 * Header section for the ride requests view with online/offline toggle,
 * connection status, and ride statistics.
 */
const RideRequestsHeader = ({
  driverStatus,
  rideStats,
  lastRefresh,
  isConnected,
  connectionError,
  onToggleOnline,
  onRefresh,
  loading = false
}) => {
  const formatLastRefresh = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getLocationDisplay = () => {
    if (!driverStatus.currentLocation) return null;
    
    const { lat, lng } = driverStatus.currentLocation;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Status Section */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-xl font-bold text-gray-900">Driver Status</h2>
            
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              {driverStatus.isOnline ? (
                isConnected ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <Wifi className="w-4 h-4" />
                    <span className="text-xs font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-orange-600">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-xs font-medium">Reconnecting...</span>
                  </div>
                )
              ) : null}
            </div>
          </div>

          {/* Status Description */}
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              {driverStatus.isOnline ? (
                <>
                  🟢 You are online and receiving ride requests
                  {driverStatus.currentLocation && ' within 5km'}
                </>
              ) : (
                '⚪ You are offline. Go online to receive ride requests'
              )}
            </p>
            
            {/* Location Display */}
            {driverStatus.isOnline && driverStatus.currentLocation && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3 text-green-600" />
                <span>Location: {getLocationDisplay()}</span>
              </div>
            )}

            {/* Connection Error */}
            {connectionError && (
              <p className="text-xs text-red-600">
                ⚠️ {connectionError}
              </p>
            )}

            {/* Last Refresh */}
            {lastRefresh && driverStatus.isOnline && (
              <p className="text-xs text-gray-500">
                Last updated: {formatLastRefresh(lastRefresh)}
              </p>
            )}
          </div>
        </div>

        {/* Stats Section */}
        {driverStatus.isOnline && rideStats && (
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600">{rideStats.available}</div>
              <div className="text-gray-500">Available</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-green-600">{rideStats.assigned}</div>
              <div className="text-gray-500">Assigned</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-gray-600">{rideStats.total}</div>
              <div className="text-gray-500">Total</div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          {driverStatus.isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {loading ? 'Refreshing...' : 'Refresh'}
              </span>
            </Button>
          )}

          {/* Online/Offline Toggle */}
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={driverStatus.isOnline}
              onChange={onToggleOnline}
              disabled={loading}
              size="lg"
              className="flex-shrink-0"
            />
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {driverStatus.isOnline ? 'Online' : 'Offline'}
              </p>
              {!driverStatus.isOnline && (
                <p className="text-xs text-gray-600">
                  Tap to go online
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Ride Indicator */}
      {driverStatus.activeRideId && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">🚗</span>
            <span className="text-sm font-medium text-yellow-800">
              You have an active ride in progress
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideRequestsHeader;