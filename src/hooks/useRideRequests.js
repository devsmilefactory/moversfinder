/**
 * @deprecated Legacy driver "ride requests" hook used by the older `RideRequestsViewContainer` flow.
 * Current driver experience uses `useDriverRidesFeed` + `useSmartRealtimeFeed` directly.
 *
 * Kept for reference.
 * See: `docs/DEPRECATED_CODE_MAP.md`
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDriverRidesFeed } from './useDriverRidesFeed';
import { useAuthStore } from '../stores';
import { supabase } from '../lib/supabase';

/**
 * useRideRequests Hook
 * Manages ride requests data fetching and state for driver dashboard
 */
const useRideRequests = ({
  initialFilters = {},
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
} = {}) => {
  const { user } = useAuthStore();
  
  // Use existing driver rides feed hook
  const {
    rides,
    loading,
    error,
    refreshRides,
    subscribeToUpdates,
    unsubscribeFromUpdates
  } = useDriverRidesFeed();
  
  // Additional state for ride requests
  const [selectedRide, setSelectedRide] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Driver status state
  const [driverStatus, setDriverStatus] = useState({
    isOnline: false,
    isAvailable: true,
    currentLocation: null,
    activeRideId: null
  });
  
  // Fetch driver status
  const fetchDriverStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('is_online, is_available, current_location, active_ride_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      setDriverStatus({
        isOnline: data.is_online || false,
        isAvailable: data.is_available || true,
        currentLocation: data.current_location,
        activeRideId: data.active_ride_id
      });
    } catch (error) {
      console.error('Error fetching driver status:', error);
    }
  }, [user?.id]);
  
  // Update driver online status
  const updateOnlineStatus = useCallback(async (isOnline) => {
    if (!user?.id) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setDriverStatus(prev => ({ ...prev, isOnline }));
      
      // Refresh rides when going online
      if (isOnline) {
        await refreshRides();
      }
    } catch (error) {
      console.error('Error updating online status:', error);
      setActionError('Failed to update online status');
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, refreshRides]);
  
  // Update driver availability
  const updateAvailability = useCallback(async (isAvailable) => {
    if (!user?.id) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({ is_available: isAvailable })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setDriverStatus(prev => ({ ...prev, isAvailable }));
    } catch (error) {
      console.error('Error updating availability:', error);
      setActionError('Failed to update availability');
    } finally {
      setActionLoading(false);
    }
  }, [user?.id]);
  
  // Place bid on a ride
  const placeBid = useCallback(async (rideId, bidAmount, message = '') => {
    if (!user?.id) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { error } = await supabase
        .from('ride_offers')
        .insert({
          ride_id: rideId,
          driver_id: user.id,
          offer_amount: bidAmount,
          message,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Refresh rides to update the UI
      await refreshRides();
      
      return { success: true };
    } catch (error) {
      console.error('Error placing bid:', error);
      setActionError('Failed to place bid');
      return { success: false, error: error.message };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, refreshRides]);
  
  // Accept a ride (for direct assignments)
  const acceptRide = useCallback(async (rideId) => {
    if (!user?.id) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { error } = await supabase.rpc('accept_ride_assignment', {
        p_ride_id: rideId,
        p_driver_id: user.id
      });
      
      if (error) throw error;
      
      // Update driver status
      setDriverStatus(prev => ({ 
        ...prev, 
        activeRideId: rideId,
        isAvailable: false 
      }));
      
      // Refresh rides
      await refreshRides();
      
      return { success: true };
    } catch (error) {
      console.error('Error accepting ride:', error);
      setActionError('Failed to accept ride');
      return { success: false, error: error.message };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, refreshRides]);
  
  // Decline a ride
  const declineRide = useCallback(async (rideId, reason = '') => {
    if (!user?.id) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { error } = await supabase
        .from('ride_declines')
        .insert({
          ride_id: rideId,
          driver_id: user.id,
          reason,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Refresh rides to update the UI
      await refreshRides();
      
      return { success: true };
    } catch (error) {
      console.error('Error declining ride:', error);
      setActionError('Failed to decline ride');
      return { success: false, error: error.message };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, refreshRides]);
  
  // Get ride statistics
  const rideStats = useMemo(() => {
    if (!rides) return { total: 0, available: 0, assigned: 0, completed: 0 };
    
    return rides.reduce((stats, ride) => {
      stats.total++;
      
      switch (ride.status) {
        case 'pending':
        case 'open':
          stats.available++;
          break;
        case 'assigned':
        case 'accepted':
          stats.assigned++;
          break;
        case 'completed':
          stats.completed++;
          break;
      }
      
      return stats;
    }, { total: 0, available: 0, assigned: 0, completed: 0 });
  }, [rides]);
  
  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !driverStatus.isOnline) return;
    
    const interval = setInterval(() => {
      refreshRides();
      setLastRefresh(new Date());
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, driverStatus.isOnline, refreshInterval, refreshRides]);
  
  // Initialize driver status on mount
  useEffect(() => {
    if (user?.id) {
      fetchDriverStatus();
    }
  }, [user?.id, fetchDriverStatus]);
  
  // Subscribe to real-time updates when online
  useEffect(() => {
    if (driverStatus.isOnline && user?.id) {
      subscribeToUpdates();
    } else {
      unsubscribeFromUpdates();
    }
    
    return () => unsubscribeFromUpdates();
  }, [driverStatus.isOnline, user?.id, subscribeToUpdates, unsubscribeFromUpdates]);
  
  // Clear action error after some time
  useEffect(() => {
    if (actionError) {
      const timeout = setTimeout(() => {
        setActionError(null);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [actionError]);
  
  return {
    // Data
    rides,
    selectedRide,
    driverStatus,
    rideStats,
    lastRefresh,
    
    // Loading states
    loading,
    actionLoading,
    
    // Errors
    error,
    actionError,
    
    // Actions
    setSelectedRide,
    updateOnlineStatus,
    updateAvailability,
    placeBid,
    acceptRide,
    declineRide,
    refreshRides,
    fetchDriverStatus,
    
    // Utilities
    clearActionError: () => setActionError(null)
  };
};

export default useRideRequests;