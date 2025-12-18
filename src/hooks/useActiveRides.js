import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { ACTIVE_RIDE_STATUSES } from './useRideStatus';
import useAuthStore from '../stores/authStore';
import useRatingStore from '../stores/ratingStore';

/**
 * useActiveRides Hook
 * 
 * Manages active rides state and real-time updates for passengers
 */
const useActiveRides = () => {
  const user = useAuthStore((state) => state.user);
  const { addToast } = useToast();
  const { shouldShowRating, markRatingShown } = useRatingStore();

  // State
  const [activeRides, setActiveRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driverLocations, setDriverLocations] = useState({});
  const [driverInfo, setDriverInfo] = useState({});

  // Load active rides
  const loadActiveRides = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(
            id,
            full_name,
            phone,
            profile_picture_url,
            vehicle_make,
            vehicle_model,
            vehicle_color,
            license_plate
          )
        `)
        .eq('user_id', user.id)
        .in('ride_status', ACTIVE_RIDE_STATUSES)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading active rides:', fetchError);
        setError(fetchError.message);
        return;
      }

      setActiveRides(data || []);

      // Load driver info for each ride
      const driverInfoMap = {};
      data?.forEach(ride => {
        if (ride.driver) {
          driverInfoMap[ride.driver_id] = ride.driver;
        }
      });
      setDriverInfo(driverInfoMap);

    } catch (error) {
      console.error('Error loading active rides:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load driver location for a specific ride
  const loadDriverLocation = useCallback(async (rideId, driverId) => {
    if (!rideId || !driverId) return;

    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('latitude, longitude, updated_at')
        .eq('driver_id', driverId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading driver location:', error);
        return;
      }

      if (data) {
        setDriverLocations(prev => ({
          ...prev,
          [rideId]: {
            lat: data.latitude,
            lng: data.longitude,
            updated_at: data.updated_at
          }
        }));
      }
    } catch (error) {
      console.error('Error loading driver location:', error);
    }
  }, []);

  // Handle ride status updates
  const handleRideUpdate = useCallback((payload) => {
    const updatedRide = payload.new;
    
    setActiveRides(prev => {
      const existingIndex = prev.findIndex(ride => ride.id === updatedRide.id);
      const isStillActive = ACTIVE_RIDE_STATUSES.includes(updatedRide.ride_status);
      
      if (existingIndex >= 0) {
        if (isStillActive) {
          // Update existing ride
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...updatedRide };
          
          // Check if ride is completed and should trigger rating
          if (updatedRide.ride_status === 'trip_completed' && 
              shouldShowRating(updatedRide.id, updatedRide.passenger_rated_at)) {
            markRatingShown(updatedRide.id);
          }
          
          return updated;
        } else {
          // Remove ride that is no longer active
          return prev.filter(ride => ride.id !== updatedRide.id);
        }
      } else if (isStillActive) {
        // Add new active ride
        return [updatedRide, ...prev];
      }
      
      return prev;
    });

    // Show status update toast
    const statusMessages = {
      'driver_on_way': '🚗 Your driver is on the way!',
      'driver_arrived': '📍 Your driver has arrived at pickup',
      'trip_started': '🎯 Your trip has started',
      'trip_completed': '✅ Trip completed successfully'
    };

    const message = statusMessages[updatedRide.ride_status];
    if (message) {
      addToast({
        type: 'success',
        title: 'Ride Update',
        message
      });
    }
  }, [shouldShowRating, markRatingShown, addToast]);

  // Handle driver location updates
  const handleDriverLocationUpdate = useCallback((payload) => {
    const locationUpdate = payload.new;
    
    // Find rides with this driver
    activeRides.forEach(ride => {
      if (ride.driver_id === locationUpdate.driver_id) {
        setDriverLocations(prev => ({
          ...prev,
          [ride.id]: {
            lat: locationUpdate.latitude,
            lng: locationUpdate.longitude,
            updated_at: locationUpdate.updated_at
          }
        }));
      }
    });
  }, [activeRides]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to ride updates
    const rideSubscription = supabase
      .channel('passenger_rides')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `user_id=eq.${user.id}`
        },
        handleRideUpdate
      )
      .subscribe();

    // Subscribe to driver location updates
    const locationSubscription = supabase
      .channel('driver_locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_locations'
        },
        handleDriverLocationUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rideSubscription);
      supabase.removeChannel(locationSubscription);
    };
  }, [user?.id, handleRideUpdate, handleDriverLocationUpdate]);

  // Load initial data
  useEffect(() => {
    loadActiveRides();
  }, [loadActiveRides]);

  // Load driver locations for active rides
  useEffect(() => {
    activeRides.forEach(ride => {
      if (ride.driver_id && !driverLocations[ride.id]) {
        loadDriverLocation(ride.id, ride.driver_id);
      }
    });
  }, [activeRides, driverLocations, loadDriverLocation]);

  return {
    activeRides,
    loading,
    error,
    driverLocations,
    driverInfo,
    loadActiveRides,
    loadDriverLocation
  };
};

export default useActiveRides;