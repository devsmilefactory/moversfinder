import React, { useState } from 'react';
import useLocationTracking from '../../../hooks/useLocationTracking';

/**
 * LocationSelector Component
 * 
 * Provides location selection and current location functionality
 */
const LocationSelector = ({ 
  onLocationSelect, 
  onCurrentLocationClick,
  showCurrentLocationButton = true,
  className = '' 
}) => {
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  const { 
    currentLocation, 
    locationError, 
    getCurrentLocationOnce,
    locationPermission 
  } = useLocationTracking({});

  const handleCurrentLocationClick = async () => {
    if (onCurrentLocationClick) {
      onCurrentLocationClick();
      return;
    }

    setLoadingLocation(true);
    try {
      const location = await getCurrentLocationOnce();
      if (onLocationSelect) {
        onLocationSelect(location);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const getLocationButtonText = () => {
    if (loadingLocation) return 'Getting location...';
    if (locationError) return 'Location unavailable';
    if (locationPermission === 'denied') return 'Location access denied';
    if (currentLocation) return 'Use current location';
    return 'Get current location';
  };

  const getLocationButtonIcon = () => {
    if (loadingLocation) return '⏳';
    if (locationError) return '❌';
    if (locationPermission === 'denied') return '🚫';
    if (currentLocation) return '📍';
    return '📍';
  };

  if (!showCurrentLocationButton) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Current Location Button */}
      <button
        onClick={handleCurrentLocationClick}
        disabled={loadingLocation || locationPermission === 'denied'}
        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
          locationError || locationPermission === 'denied'
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : currentLocation
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="text-xl">{getLocationButtonIcon()}</span>
        <div className="flex-1 text-left">
          <p className="font-medium">{getLocationButtonText()}</p>
          {currentLocation && (
            <p className="text-sm opacity-75">
              {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </p>
          )}
          {locationError && (
            <p className="text-sm text-red-600">{locationError}</p>
          )}
        </div>
        {loadingLocation && (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      {/* Location Permission Help */}
      {locationPermission === 'denied' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 text-sm">⚠️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Location access is blocked</p>
              <p className="mt-1">
                To use your current location, please enable location access in your browser settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location Accuracy Info */}
      {currentLocation?.accuracy && (
        <div className="text-xs text-gray-500 text-center">
          Location accuracy: ±{Math.round(currentLocation.accuracy)}m
        </div>
      )}
    </div>
  );
};

export default LocationSelector;