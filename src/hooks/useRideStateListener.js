/**
 * useRideStateListener Hook
 * 
 * Listens to state changes for a specific ride and triggers feed transitions.
 * Integrates with useFeedTransitions to handle automatic feed updates and navigation.
 * 
 * @see Design Doc: Feed Transitions section
 * @see Requirements: 16.1-16.5
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for listening to ride state changes
 * 
 * @param {string} rideId - UUID of the ride to monitor
 * @param {Function} onStateChange - Callback when state changes (rideBefore, rideAfter)
 * @param {boolean} enabled - Whether to enable the subscription (default: true)
 * @returns {Object} Subscription status and controls
 * 
 * @example
 * const { isConnected, error } = useRideStateListener(
 *   rideId,
 *   (rideBefore, rideAfter) => {
 *     console.log('State changed:', rideBefore.state, '->', rideAfter.state);
 *     handleStateChange(rideBefore, rideAfter);
 *   }
 * );
 */
export function useRideStateListener(rideId, onStateChange, enabled = true) {
  const subscriptionRef = useRef(null);
  const previousRideRef = useRef(null);
  const isConnectedRef = useRef(false);

  /**
   * Handle ride update from Supabase realtime
   */
  const handleRideUpdate = useCallback((payload) => {
    console.log('[Ride State Listener] Update received:', {
      rideId: payload.new?.id,
      eventType: payload.eventType,
      oldState: payload.old?.state,
      newState: payload.new?.state,
      timestamp: new Date().toISOString()
    });

    // Only handle UPDATE events
    if (payload.eventType !== 'UPDATE') {
      return;
    }

    const rideBefore = payload.old;
    const rideAfter = payload.new;

    // Check if state actually changed
    if (rideBefore.state !== rideAfter.state) {
      console.log('[Ride State Listener] State change detected:', {
        rideId: rideAfter.id,
        from: rideBefore.state,
        to: rideAfter.state
      });

      // Store current ride for next comparison
      previousRideRef.current = rideAfter;

      // Trigger callback
      if (onStateChange) {
        onStateChange(rideBefore, rideAfter);
      }
    } else {
      // State didn't change, but other fields might have
      console.log('[Ride State Listener] Ride updated (no state change)');
      previousRideRef.current = rideAfter;
    }
  }, [onStateChange]);

  /**
   * Subscribe to ride changes
   */
  useEffect(() => {
    if (!rideId || !enabled) {
      console.log('[Ride State Listener] Subscription disabled:', { rideId, enabled });
      return;
    }

    console.log('[Ride State Listener] Setting up subscription for ride:', rideId);

    // Create subscription
    const channel = supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`
        },
        handleRideUpdate
      )
      .subscribe((status) => {
        console.log('[Ride State Listener] Subscription status:', status);
        isConnectedRef.current = status === 'SUBSCRIBED';
      });

    subscriptionRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log('[Ride State Listener] Cleaning up subscription for ride:', rideId);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [rideId, enabled, handleRideUpdate]);

  return {
    isConnected: isConnectedRef.current,
    unsubscribe: useCallback(() => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        isConnectedRef.current = false;
      }
    }, [])
  };
}

/**
 * Hook for listening to multiple rides' state changes
 * 
 * @param {Array<string>} rideIds - Array of ride UUIDs to monitor
 * @param {Function} onStateChange - Callback when any ride's state changes
 * @param {boolean} enabled - Whether to enable the subscription (default: true)
 * @returns {Object} Subscription status
 * 
 * @example
 * const { isConnected, activeSubscriptions } = useMultipleRideStateListener(
 *   [rideId1, rideId2, rideId3],
 *   (rideBefore, rideAfter) => {
 *     handleStateChange(rideBefore, rideAfter);
 *   }
 * );
 */
export function useMultipleRideStateListener(rideIds, onStateChange, enabled = true) {
  const subscriptionsRef = useRef(new Map());
  const isConnectedRef = useRef(false);

  /**
   * Handle ride update from Supabase realtime
   */
  const handleRideUpdate = useCallback((payload) => {
    if (payload.eventType !== 'UPDATE') return;

    const rideBefore = payload.old;
    const rideAfter = payload.new;

    // Check if state changed
    if (rideBefore.state !== rideAfter.state && onStateChange) {
      console.log('[Multiple Ride State Listener] State change detected:', {
        rideId: rideAfter.id,
        from: rideBefore.state,
        to: rideAfter.state
      });
      onStateChange(rideBefore, rideAfter);
    }
  }, [onStateChange]);

  /**
   * Subscribe to all rides
   */
  useEffect(() => {
    if (!rideIds || rideIds.length === 0 || !enabled) {
      return;
    }

    console.log('[Multiple Ride State Listener] Setting up subscriptions for rides:', rideIds);

    // Create subscriptions for each ride
    rideIds.forEach((rideId) => {
      if (!rideId || subscriptionsRef.current.has(rideId)) {
        return; // Skip if already subscribed
      }

      const channel = supabase
        .channel(`ride:${rideId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rides',
            filter: `id=eq.${rideId}`
          },
          handleRideUpdate
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            isConnectedRef.current = true;
          }
        });

      subscriptionsRef.current.set(rideId, channel);
    });

    // Cleanup subscriptions for rides no longer in the list
    subscriptionsRef.current.forEach((channel, rideId) => {
      if (!rideIds.includes(rideId)) {
        console.log('[Multiple Ride State Listener] Removing subscription for ride:', rideId);
        supabase.removeChannel(channel);
        subscriptionsRef.current.delete(rideId);
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('[Multiple Ride State Listener] Cleaning up all subscriptions');
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current.clear();
      isConnectedRef.current = false;
    };
  }, [rideIds, enabled, handleRideUpdate]);

  return {
    isConnected: isConnectedRef.current,
    activeSubscriptions: subscriptionsRef.current.size
  };
}
