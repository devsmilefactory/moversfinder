import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocation } from '../utils/locationServices';

/**
 * useLocationTracking Hook
 * 
 * Manages location tracking and geolocation functionality
 */
const useLocationTracking = ({ 
  enableTracking = false, 
  trackingInterval = 30000, // 30 seconds
  onLocationUpdate 
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationPermission, setLocationPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'

  // Check location permission status
  const checkLocationPermission = useCallback(async () => {
    if (!navigator.permissions) {
      return 'prompt';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermission(permission.state);
      return permission.state;
    } catch (error) {
      console.warn('Could not check location permission:', error);
      return 'prompt';
    }
  }, []);

  // Get current location once
  const getCurrentLocationOnce = useCallback(async () => {
    setLocationError(null);
    
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      
      if (onLocationUpdate) {
        onLocationUpdate(location);
      }
      
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      setLocationError(error.message);
      throw error;
    }
  }, [onLocationUpdate]);

  // Start location tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        };
        
        setCurrentLocation(location);
        
        if (onLocationUpdate) {
          onLocationUpdate(location);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        setLocationError(error.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, [onLocationUpdate]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (enableTracking) {
      const cleanup = startTracking();
      return cleanup;
    }
  }, [enableTracking, startTracking]);

  // Check permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  // Calculate distance between two points
  const calculateDistance = useCallback((point1, point2) => {
    if (!point1 || !point2) return null;

    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance; // Distance in kilometers
  }, []);

  // Check if location is within radius
  const isWithinRadius = useCallback((centerPoint, targetPoint, radiusKm) => {
    const distance = calculateDistance(centerPoint, targetPoint);
    return distance !== null && distance <= radiusKm;
  }, [calculateDistance]);

  return {
    currentLocation,
    locationError,
    isTracking,
    locationPermission,
    getCurrentLocationOnce,
    startTracking,
    stopTracking,
    checkLocationPermission,
    calculateDistance,
    isWithinRadius
  };
};

export default useLocationTracking;