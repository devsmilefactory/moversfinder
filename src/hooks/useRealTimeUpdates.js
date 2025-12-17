import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores';

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
  const subscriptionsRef = useRef([]);
  
  // Subscribe to ride updates
  const subscribeToRides = useCallback(() => {
    if (!user?.id || !enabled) return null;
    
    const subscription = supabase
      .channel('ride_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Ride update received:', payload);
          onRideUpdate({
            type: 'ride_update',
            event: payload.eventType,
            data: payload.new || payload.old,
            payload
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `status=eq.pending` // Listen to new available rides
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            console.log('New ride available:', payload);
            onRideUpdate({
              type: 'new_ride_available',
              event: payload.eventType,
              data: payload.new,
              payload
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Ride subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Failed to connect to ride updates');
          onError('Failed to connect to ride updates');
        }
      });
    
    return subscription;
  }, [user?.id, enabled, onRideUpdate, onError]);
  
  // Subscribe to offer updates
  const subscribeToOffers = useCallback(() => {
    if (!user?.id || !enabled) return null;
    
    const subscription = supabase
      .channel('offer_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_offers',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Offer update received:', payload);
          onOfferUpdate({
            type: 'offer_update',
            event: payload.eventType,
            data: payload.new || payload.old,
            payload
          });
        }
      )
      .subscribe((status) => {
        console.log('Offer subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Failed to connect to offer updates');
          onError('Failed to connect to offer updates');
        }
      });
    
    return subscription;
  }, [user?.id, enabled, onOfferUpdate, onError]);
  
  // Subscribe to driver-specific notifications
  const subscribeToNotifications = useCallback(() => {
    if (!user?.id || !enabled) return null;
    
    const subscription = supabase
      .channel('driver_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification received:', payload);
          onRideUpdate({
            type: 'notification',
            event: payload.eventType,
            data: payload.new,
            payload
          });
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Failed to connect to notifications');
          onError('Failed to connect to notifications');
        }
      });
    
    return subscription;
  }, [user?.id, enabled, onRideUpdate, onError]);
  
  // Start all subscriptions
  const startSubscriptions = useCallback(() => {
    if (!enabled || !user?.id) return;
    
    console.log('Starting real-time subscriptions for driver:', user.id);
    
    // Clear existing subscriptions
    subscriptionsRef.current.forEach(sub => {
      if (sub) {
        supabase.removeChannel(sub);
      }
    });
    subscriptionsRef.current = [];
    
    // Create new subscriptions
    const rideSubscription = subscribeToRides();
    const offerSubscription = subscribeToOffers();
    const notificationSubscription = subscribeToNotifications();
    
    // Store subscriptions for cleanup
    subscriptionsRef.current = [
      rideSubscription,
      offerSubscription,
      notificationSubscription
    ].filter(Boolean);
    
  }, [enabled, user?.id, subscribeToRides, subscribeToOffers, subscribeToNotifications]);
  
  // Stop all subscriptions
  const stopSubscriptions = useCallback(() => {
    console.log('Stopping real-time subscriptions');
    
    subscriptionsRef.current.forEach(subscription => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    });
    
    subscriptionsRef.current = [];
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
    supabase
      .from('rides')
      .select('id')
      .limit(1)
      .then(() => {
        if (!isConnected && enabled) {
          console.log('Connection restored, restarting subscriptions');
          restartSubscriptions();
        }
      })
      .catch((error) => {
        console.error('Connection check failed:', error);
        setIsConnected(false);
        setConnectionError('Connection lost');
      });
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