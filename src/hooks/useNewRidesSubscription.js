/**
 * useNewRidesSubscription Hook
 * 
 * Manages real-time subscription for new available rides.
 * Only subscribes when on Available tab and driver is online.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { subscribePostgresChanges } from '../lib/realtimeRegistry';

export function useNewRidesSubscription(driverId, activeTab, isOnline) {
  const [hasNewRides, setHasNewRides] = useState(false);
  const [newRidesCount, setNewRidesCount] = useState(0);
  const lastFetchTimestampRef = useRef(null);
  const seenRideIdsRef = useRef(new Set());

  useEffect(() => {
    // Only subscribe when on Available tab and online
    if (!driverId || activeTab !== 'AVAILABLE' || !isOnline) {
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNewRidesSubscription.js:23',message:'Setting up new rides subscription',data:{driverId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    const channelName = `driver-new-rides-${driverId}`;

    // Subscribe to new pending rides
    const unsubscribe = subscribePostgresChanges({
      channelName,
      table: 'rides',
      event: 'INSERT',
      filter: 'ride_status=eq.pending',
      listener: (payload) => {
        const rideId = payload.new?.id;
        if (!rideId) {
          return;
        }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNewRidesSubscription.js:41',message:'New ride detected',data:{rideId:payload.new?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          
          // Only show notification if we have a last fetch timestamp
          // and the new ride was created after that timestamp
          if (lastFetchTimestampRef.current) {
            const rideCreatedAt = new Date(payload.new.created_at);
            const lastFetch = new Date(lastFetchTimestampRef.current);
            
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
      },
    });

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNewRidesSubscription.js:73',message:'Cleaning up new rides subscription',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      unsubscribe?.();
    };
  }, [driverId, activeTab, isOnline]);

  // Function to update the last fetch timestamp
  const updateLastFetch = useCallback(() => {
    lastFetchTimestampRef.current = new Date().toISOString();
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
