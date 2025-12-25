import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores';
import { subscribePostgresChanges, subscribeChannelStatus } from '../lib/realtimeRegistry';
import { agentLog } from '../utils/agentLog';

/**
 * useRealTimeUpdates Hook
 * Manages real-time subscriptions for ride updates
 */
const useRealTimeUpdates = ({
  onRideUpdate = () => {},
  onOfferUpdate = () => {},
  onError = () => {},
  enabled = true
} = {}) => {
  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const unsubscribersRef = useRef([]);
  const onRideUpdateRef = useRef(onRideUpdate);
  const onOfferUpdateRef = useRef(onOfferUpdate);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onRideUpdateRef.current = onRideUpdate;
  }, [onRideUpdate]);

  useEffect(() => {
    onOfferUpdateRef.current = onOfferUpdate;
  }, [onOfferUpdate]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  
  const startSubscriptions = useCallback(() => {
    if (!enabled || !user?.id) return;

    agentLog({
      location: 'useRealTimeUpdates.js:startSubscriptions',
      message: 'Starting subscriptions',
      data: { userId: user.id },
    });

    // Cleanup existing
    unsubscribersRef.current.forEach((unsub) => {
      try {
        unsub?.();
      } catch (e) {
        // ignore
      }
    });
    unsubscribersRef.current = [];

    const channelName = `driver-realtime-${user.id}`;

    // Connection status listener
    const unsubStatus = subscribeChannelStatus(channelName, (status) => {
      agentLog({
        location: 'useRealTimeUpdates.js:subscribeChannelStatus',
        message: 'Ride subscription status',
        data: { status },
      });
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setConnectionError(null);
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setConnectionError('Failed to connect to realtime updates');
        onErrorRef.current?.('Failed to connect to realtime updates');
      }
    });

    // Rides assigned to this driver
    const unsubDriverRides = subscribePostgresChanges({
      channelName,
      table: 'rides',
      event: '*',
      filter: `driver_id=eq.${user.id}`,
      listener: (payload) => {
        agentLog({
          location: 'useRealTimeUpdates.js:rides',
          message: 'Ride update received',
          data: { eventType: payload.eventType, rideId: payload.new?.id },
        });
        onRideUpdateRef.current?.({
          type: 'ride_update',
          event: payload.eventType,
          data: payload.new || payload.old,
          payload,
        });
      },
    });

    // New available rides (FIX: use ride_status field, not status)
    const unsubPendingRides = subscribePostgresChanges({
      channelName,
      table: 'rides',
      event: 'INSERT',
      filter: 'ride_status=eq.pending',
      listener: (payload) => {
        agentLog({
          location: 'useRealTimeUpdates.js:pendingRides',
          message: 'New ride available',
          data: { rideId: payload.new?.id },
        });
        onRideUpdateRef.current?.({
          type: 'new_ride_available',
          event: payload.eventType,
          data: payload.new,
          payload,
        });
      },
    });

    // Offers for this driver
    const unsubOffers = subscribePostgresChanges({
      channelName,
      table: 'ride_offers',
      event: '*',
      filter: `driver_id=eq.${user.id}`,
      listener: (payload) => {
        agentLog({
          location: 'useRealTimeUpdates.js:offers',
          message: 'Offer update received',
          data: { eventType: payload.eventType, offerId: payload.new?.id },
        });
        onOfferUpdateRef.current?.({
          type: 'offer_update',
          event: payload.eventType,
          data: payload.new || payload.old,
          payload,
        });
      },
    });

    // Notifications for this driver
    const unsubNotifications = subscribePostgresChanges({
      channelName,
      table: 'notifications',
      event: 'INSERT',
      filter: `user_id=eq.${user.id}`,
      listener: (payload) => {
        agentLog({
          location: 'useRealTimeUpdates.js:notifications',
          message: 'Notification received',
          data: { notificationId: payload.new?.id },
        });
        onRideUpdateRef.current?.({
          type: 'notification',
          event: payload.eventType,
          data: payload.new,
          payload,
        });
      },
    });

    unsubscribersRef.current = [
      unsubStatus,
      unsubDriverRides,
      unsubPendingRides,
      unsubOffers,
      unsubNotifications,
    ].filter(Boolean);
  }, [enabled, user?.id]);
  
  // Stop all subscriptions
  const stopSubscriptions = useCallback(() => {
    agentLog({
      location: 'useRealTimeUpdates.js:stopSubscriptions',
      message: 'Stopping subscriptions',
      data: {},
    });
    
    unsubscribersRef.current.forEach((unsub) => {
      try {
        unsub?.();
      } catch (e) {
        // ignore
      }
    });
    unsubscribersRef.current = [];
    setIsConnected(false);
    setConnectionError(null);
  }, []);
  
  // Restart subscriptions (useful for reconnection)
  const restartSubscriptions = useCallback(() => {
    stopSubscriptions();
    setTimeout(() => {
      startSubscriptions();
    }, 1000); // Small delay to ensure cleanup
  }, [stopSubscriptions, startSubscriptions]);
  
  // Check connection status
  const checkConnection = useCallback(() => {
    // Simple ping to check if Supabase is reachable
    // NOTE: avoid extra DB pings here; registry+realtime already handles status.
    // Keep a no-op checkConnection for callers, but don't create additional polling load.
    if (!enabled) return;
    if (!isConnected) {
      restartSubscriptions();
    }
  }, [isConnected, enabled, restartSubscriptions]);
  
  // Start subscriptions when enabled and user is available
  useEffect(() => {
    if (enabled && user?.id) {
      startSubscriptions();
    } else {
      stopSubscriptions();
    }
    
    return () => {
      stopSubscriptions();
    };
  }, [enabled, user?.id, startSubscriptions, stopSubscriptions]);
  
  // Periodic connection check
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [enabled, checkConnection]);
  
  // Handle browser visibility changes
  useEffect(() => {
    if (!enabled) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, check connection
        checkConnection();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, checkConnection]);
  
  return {
    // State
    isConnected,
    connectionError,
    
    // Actions
    startSubscriptions,
    stopSubscriptions,
    restartSubscriptions,
    checkConnection,
    
    // Utilities
    clearConnectionError: () => setConnectionError(null)
  };
};

export default useRealTimeUpdates;