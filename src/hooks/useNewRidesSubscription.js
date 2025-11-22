/**
 * useNewRidesSubscription Hook
 * 
 * Manages real-time subscription for new available rides.
 * Only subscribes when on Available tab and driver is online.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useNewRidesSubscription(driverId, activeTab, isOnline) {
  const [hasNewRides, setHasNewRides] = useState(false);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(null);

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
          console.log('📡 New ride detected:', payload.new?.id);
          
          // Only show notification if we have a last fetch timestamp
          // and the new ride was created after that timestamp
          if (lastFetchTimestamp) {
            const rideCreatedAt = new Date(payload.new.created_at);
            const lastFetch = new Date(lastFetchTimestamp);
            
            if (rideCreatedAt > lastFetch) {
              setHasNewRides(true);
            }
          } else {
            // If no timestamp yet, show notification for any new ride
            setHasNewRides(true);
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
  const updateLastFetch = () => {
    setLastFetchTimestamp(new Date().toISOString());
  };

  // Function to reset the new rides flag
  const resetNewRides = () => {
    setHasNewRides(false);
  };

  return {
    hasNewRides,
    updateLastFetch,
    resetNewRides
  };
}
