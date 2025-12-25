/**
 * useActiveRideCheck Hook
 * 
 * Manages priority UI state for active instant rides and imminent scheduled rides.
 * Handles checking for active rides and scheduled alerts on page load.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchActiveInstantRide, fetchImminentScheduledRides, ensureDriverAvailability } from '../services/driverRidesApi';

export function useActiveRideCheck(driverId) {
  // Active instant ride state
  const [activeInstantRide, setActiveInstantRide] = useState(null);
  
  // Scheduled alerts state
  const [scheduledAlerts, setScheduledAlerts] = useState([]);
  
  // UI state
  const [showActiveRideModal, setShowActiveRideModal] = useState(false);
  const [hasActiveRideToast, setHasActiveRideToast] = useState(false);
  
  // Loading state
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Check for active instant ride
   */
  const checkActiveInstantRide = useCallback(async () => {
    if (!driverId) return;

    try {
      const result = await fetchActiveInstantRide(driverId);
      
      if (result.data) {
        setActiveInstantRide(result.data);
        setShowActiveRideModal(true);
        setHasActiveRideToast(true);
      } else {
        setActiveInstantRide(null);
        setShowActiveRideModal(false);
        setHasActiveRideToast(false);
      }
    } catch (error) {
      console.error('Error checking active instant ride:', error);
    }
  }, [driverId]);

  /**
   * Check for imminent scheduled rides
   */
  const checkImminentScheduledRides = useCallback(async (windowMinutes = 30) => {
    if (!driverId) return;

    try {
      const result = await fetchImminentScheduledRides(driverId, windowMinutes);
      
      if (result.data && result.data.length > 0) {
        setScheduledAlerts(result.data);
      } else {
        setScheduledAlerts([]);
      }
    } catch (error) {
      console.error('Error checking imminent scheduled rides:', error);
    }
  }, [driverId]);

  /**
   * Run all priority checks
   */
  const runPriorityChecks = useCallback(async () => {
    setIsChecking(true);
    
    try {
      // Check active instant ride first
      await checkActiveInstantRide();
      
      // Then check imminent scheduled rides
      await checkImminentScheduledRides();
    } finally {
      setIsChecking(false);
    }
  }, [checkActiveInstantRide, checkImminentScheduledRides]);

  /**
   * Dismiss active ride toast
   */
  const dismissActiveRideToast = useCallback(() => {
    setHasActiveRideToast(false);
  }, []);

  /**
   * Dismiss active ride modal
   */
  const dismissActiveRideModal = useCallback(() => {
    setShowActiveRideModal(false);
  }, []);

  /**
   * Clear scheduled alerts
   */
  const clearScheduledAlerts = useCallback(() => {
    setScheduledAlerts([]);
  }, []);

  /**
   * Update active ride (after activation or status change)
   */
  const updateActiveRide = useCallback((ride) => {
    setActiveInstantRide(ride);
    if (ride) {
      setShowActiveRideModal(true);
      setHasActiveRideToast(true);
    } else {
      setShowActiveRideModal(false);
      setHasActiveRideToast(false);
    }
  }, []);

  /**
   * On page focus/visibility, ensure driver availability is reset if no active ride
   */
  useEffect(() => {
    const onResume = async () => {
      if (!driverId) return;
      // If we don't currently track an active ride, mark available defensively
      if (!activeInstantRide) {
        await ensureDriverAvailability(driverId);
      }
    };

    window.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    return () => {
      window.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [driverId, activeInstantRide]);

  /**
   * Run priority checks on mount
   */
  useEffect(() => {
    if (driverId) {
      runPriorityChecks();
    }
  }, [driverId, runPriorityChecks]);

  return {
    // State
    activeInstantRide,
    scheduledAlerts,
    showActiveRideModal,
    hasActiveRideToast,
    isChecking,
    
    // Actions
    checkActiveInstantRide,
    checkImminentScheduledRides,
    runPriorityChecks,
    dismissActiveRideToast,
    dismissActiveRideModal,
    clearScheduledAlerts,
    updateActiveRide
  };
}
