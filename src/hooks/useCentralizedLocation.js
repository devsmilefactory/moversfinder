/**
 * Centralized Location Hook
 * Simple, reliable location detection without infinite loops
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Suppress unhandled promise rejections for location permission errors
// These are handled gracefully by the UI
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error && (
      error.message?.includes('Location permission denied') ||
      error.message?.includes('location access') ||
      (error.isPermissionDenied === true) ||
      (error.code === 1)
    )) {
      // Suppress these errors - they're handled by the permission modal
      event.preventDefault();
    }
  });
}
import { 
  getCurrentLocation, 
  watchLocation, 
  clearLocationWatch,
  detectCurrentLocationWithCity,
  toGeoJSON
} from '../utils/locationServices';
import { supabase } from '../lib/supabase';

/**
 * Update driver location in database
 */
const updateDriverLocationInDatabase = async (driverId, coords) => {
  if (!driverId || !coords) {
    return;
  }

  try {
    const geoJsonCoords = toGeoJSON(coords);
    if (!geoJsonCoords) {
      return;
    }

    const { error } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        coordinates: geoJsonCoords,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'driver_id'
      });

    if (error) {
      // Silent error handling
    }
  } catch (error) {
    // Silent error handling
  }
};

/**
 * Centralized location hook
 */
export const useCentralizedLocation = ({
  enableTracking = false,
  trackingInterval = 30000,
  updateDatabase = false,
  userId = null,
  autoDetect = false,
  onLocationUpdate = null,
  onError = null
} = {}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [city, setCity] = useState(null);
  const [address, setAddress] = useState(null);
  
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const hasAutoDetectedRef = useRef(false);

  // Detect current location once
  const detectLocation = useCallback(async (options = {}) => {
    if (!isMountedRef.current) {
      return null;
    }

    setIsDetecting(true);
    setLocationError(null);

    try {
      let location;
      
      // Try with Google Maps geocoding first
      try {
        if (window.google?.maps?.importLibrary) {
          location = await detectCurrentLocationWithCity({
            timeout: 20000
          });
          setCity(location.city);
          setAddress(location.address);
        } else {
          // Load Google Maps if not available
          const { waitForGoogleMaps } = await import('../utils/googleMapsLoader');
          const mapsAvailable = await waitForGoogleMaps(5000);
          
          if (mapsAvailable && window.google?.maps?.importLibrary) {
            location = await detectCurrentLocationWithCity({
              timeout: 20000
            });
            setCity(location.city);
            setAddress(location.address);
          } else {
            // Fallback to basic location
            location = await getCurrentLocation({
              enableHighAccuracy: true,
              timeout: 15000
            });
          }
        }
      } catch (geocodeError) {
        // Fallback to basic location - but if it's a permission error, don't retry
        if (geocodeError.isPermissionDenied || geocodeError.code === 1) {
          // Permission denied - rethrow to be caught by outer catch
          throw geocodeError;
        }
        // For other errors, try basic location
        try {
          location = await getCurrentLocation({
            enableHighAccuracy: true,
            timeout: 15000
          });
        } catch (fallbackError) {
          // If fallback also fails, throw the original error
          throw geocodeError;
        }
      }

      const coords = location.coords || location;
      
      if (!isMountedRef.current) return null;

      setCurrentLocation(coords);
      setIsDetecting(false);
      setLocationPermission('granted');

      // Update database if enabled
      if (updateDatabase && userId && coords) {
        await updateDriverLocationInDatabase(userId, coords);
      }

      // Call callback
      if (onLocationUpdate) {
        onLocationUpdate(coords, { 
          city: location.city || city, 
          address: location.address || address 
        });
      }

      return coords;
    } catch (error) {
      if (!isMountedRef.current) return null;

      const errorMessage = error.message || 'Failed to detect location';
      setLocationError(errorMessage);
      setIsDetecting(false);

      // Set permission state based on error
      if (error.isPermissionDenied || error.code === 1) {
        setLocationPermission('denied');
      }

      if (onError) {
        onError(error);
      }

      // Don't throw errors - just set error state and let UI handle it
      // This prevents unhandled promise rejections
      return null;
    }
  }, [updateDatabase, userId, onLocationUpdate, onError, city, address]);

  // Start continuous location tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported by your browser');
      setLocationError(error.message);
      if (onError) onError(error);
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    watchIdRef.current = watchLocation(
      async (location) => {
        if (!isMountedRef.current) return;

        setCurrentLocation(location);

        if (updateDatabase && userId) {
          try {
            await updateDriverLocationInDatabase(userId, location);
          } catch (error) {
            // Silent error handling
          }
        }

        if (onLocationUpdate) {
          onLocationUpdate(location);
        }
      },
      (error) => {
        if (!isMountedRef.current) return;

        setLocationError(error.message || 'Location tracking failed');
        setIsTracking(false);
        
        if (onError) {
          onError(error);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    // Periodic database updates
    if (updateDatabase && userId) {
      updateIntervalRef.current = setInterval(async () => {
        if (currentLocation) {
          try {
            await updateDriverLocationInDatabase(userId, currentLocation);
          } catch (error) {
            // Silent error handling
          }
        }
      }, trackingInterval);
    }
  }, [updateDatabase, userId, onLocationUpdate, onError, trackingInterval, currentLocation]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      clearLocationWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setIsTracking(false);
  }, []);

  // Auto-detect location on mount if enabled - only once
  useEffect(() => {
    if (autoDetect && !currentLocation && !isDetecting && !hasAutoDetectedRef.current) {
      hasAutoDetectedRef.current = true;
      // Call detectLocation - wrap to prevent any unhandled rejections
      (async () => {
        try {
          await detectLocation();
        } catch (error) {
          // Error already handled in detectLocation - this just prevents console errors
          // The error state is set, and UI will show the permission modal
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetect]);

  // Start/stop tracking based on enableTracking
  useEffect(() => {
    if (enableTracking) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enableTracking, startTracking, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopTracking();
    };
  }, [stopTracking]);

  return {
    // State
    currentLocation,
    locationError,
    isDetecting,
    isTracking,
    locationPermission,
    city,
    address,

    // Actions
    detectLocation,
    startTracking,
    stopTracking,

    // Helpers
    hasLocation: !!currentLocation,
    hasError: !!locationError
  };
};

export default useCentralizedLocation;
