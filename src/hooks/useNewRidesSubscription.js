/**
 * useNewRidesSubscription Hook
 * 
 * Manages real-time subscription for new available rides.
 * Only subscribes when on Available tab and driver is online.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNewRidesSubscription(driverId, activeTab, isOnline) {
  const [hasNewRides, setHasNewRides] = useState(false);
  const [newRidesCount, setNewRidesCount] = useState(0);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(null);
  const seenRideIdsRef = useRef(new Set());

  useEffect(() => {
    // Only subscribe when on Available tab and online
    if (!driverId || activeTab !== 'AVAILABLE' || !isOnline) {
      return;
    }

    console.log('🔌 Setting up new rides subscription for driver:', driverId);

    // Subscribe to new pending rides
    const channel = supabase
      .channel(`new-available-rides-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
          filter: 'ride_status=eq.pending'
        },
        (payload) => {
          const rideId = payload.new?.id;
          if (!rideId) {
            return;
          }
          console.log('📡 New ride detected:', payload.new?.id);
          
          // Only show notification if we have a last fetch timestamp
          // and the new ride was created after that timestamp
          if (lastFetchTimestamp) {
            const rideCreatedAt = new Date(payload.new.created_at);
            const lastFetch = new Date(lastFetchTimestamp);
            
            if (rideCreatedAt > lastFetch) {
              // Avoid counting the same ride twice
              if (!seenRideIdsRef.current.has(rideId)) {
                seenRideIdsRef.current.add(rideId);
                setHasNewRides(true);
                setNewRidesCount((count) => count + 1);
              }
            }
          } else {
            // If no timestamp yet, show notification for any new ride
            if (!seenRideIdsRef.current.has(rideId)) {
              seenRideIdsRef.current.add(rideId);
              setHasNewRides(true);
              setNewRidesCount((count) => count + 1);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 New rides subscription status:', status);
      });

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      console.log('🔌 Cleaning up new rides subscription');
      channel.unsubscribe();
    };
  }, [driverId, activeTab, isOnline, lastFetchTimestamp]);

  // Function to update the last fetch timestamp
  const updateLastFetch = useCallback(() => {
    setLastFetchTimestamp(new Date().toISOString());
    setHasNewRides(false);
    setNewRidesCount(0);
    seenRideIdsRef.current.clear();
  }, []);

  // Function to reset the new rides flag
  const resetNewRides = useCallback(() => {
    setHasNewRides(false);
    setNewRidesCount(0);
    seenRideIdsRef.current.clear();
  }, []);

  return {
    hasNewRides,
    newRidesCount,
    updateLastFetch,
    resetNewRides
  };
}
