/**
 * @deprecated Not used by the current driver/passenger UI.
 * The app now uses `useSmartRealtimeFeed`, `useNotifications`, and the shared
 * `src/lib/realtimeRegistry.js` to avoid duplicate Supabase Realtime subscriptions.
 *
 * Kept for reference in case we revive an aggregated "all-in-one" realtime hook later.
 * See: `docs/DEPRECATED_CODE_MAP.md`
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { subscribePostgresChanges, subscribeChannelStatus } from '../lib/realtimeRegistry';

/**
 * Centralized Realtime Hook for Ride Management
 * 
 * Provides real-time subscriptions for rides, offers, and notifications
 * Supports both passenger and driver modes with proper cleanup and error handling
 * 
 * @param {string} userId - The user ID to subscribe to
 * @param {string} userType - 'passenger' or 'driver'
 * @param {object} options - Configuration options
 * @returns {object} - Realtime data and subscription status
 */
export const useRideRealtime = (userId, userType = 'passenger', options = {}) => {
  const {
    subscribeToRides = true,
    subscribeToOffers = true,
    subscribeToNotifications = true,
    onRideUpdate = null,
    onOfferUpdate = null,
    onNotification = null
  } = options;

  const [rides, setRides] = useState([]);
  const [offers, setOffers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const unsubscribersRef = useRef([]);
  const onRideUpdateRef = useRef(onRideUpdate);
  const onOfferUpdateRef = useRef(onOfferUpdate);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => { onRideUpdateRef.current = onRideUpdate; }, [onRideUpdate]);
  useEffect(() => { onOfferUpdateRef.current = onOfferUpdate; }, [onOfferUpdate]);
  useEffect(() => { onNotificationRef.current = onNotification; }, [onNotification]);

  // Handle ride updates
  const handleRideUpdate = useCallback((payload) => {
    console.log('📡 Ride update:', {
      event: payload.eventType,
      rideId: payload.new?.id,
      status: payload.new?.ride_status,
      timestamp: new Date().toISOString()
    });

    if (payload.eventType === 'INSERT') {
      setRides(prev => [...prev, payload.new]);
    } else if (payload.eventType === 'UPDATE') {
      setRides(prev =>
        prev.map(ride =>
          ride.id === payload.new.id ? payload.new : ride
        )
      );
    } else if (payload.eventType === 'DELETE') {
      setRides(prev => prev.filter(ride => ride.id !== payload.old.id));
    }

    // Call custom handler if provided
    onRideUpdateRef.current?.(payload);
  }, []);

  // Handle offer updates
  const handleOfferUpdate = useCallback((payload) => {
    console.log('📡 Offer update:', {
      event: payload.eventType,
      offerId: payload.new?.id,
      status: payload.new?.offer_status,
      timestamp: new Date().toISOString()
    });

    if (payload.eventType === 'INSERT') {
      setOffers(prev => [...prev, payload.new]);
    } else if (payload.eventType === 'UPDATE') {
      setOffers(prev =>
        prev.map(offer =>
          offer.id === payload.new.id ? payload.new : offer
        )
      );
    } else if (payload.eventType === 'DELETE') {
      setOffers(prev => prev.filter(offer => offer.id !== payload.old.id));
    }

    // Call custom handler if provided
    onOfferUpdateRef.current?.(payload);
  }, []);

  // Handle notification updates
  const handleNotificationUpdate = useCallback((payload) => {
    console.log('🔔 Notification received:', {
      notificationId: payload.new?.id,
      type: payload.new?.type,
      timestamp: new Date().toISOString()
    });

    if (payload.eventType === 'INSERT') {
      setNotifications(prev => [payload.new, ...prev]);
    }

    // Call custom handler if provided
    onNotificationRef.current?.(payload.new);
  }, []);

  useEffect(() => {
    if (!userId) {
      setConnectionStatus('disconnected');
      return;
    }

    console.log(`🔌 Setting up realtime subscriptions for ${userType}:`, userId);
    setConnectionStatus('connecting');

    try {
      // Cleanup any existing subs for this hook instance
      unsubscribersRef.current.forEach((unsub) => {
        try { unsub?.(); } catch (e) {}
      });
      unsubscribersRef.current = [];

      const channelName = `ride-realtime-${userType}-${userId}`;

      const unsubStatus = subscribeChannelStatus(channelName, (status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        if (status === 'CHANNEL_ERROR') {
          setError('Failed to connect to realtime updates');
          setConnectionStatus('error');
        }
        if (status === 'CLOSED') setConnectionStatus('disconnected');
      });

      unsubscribersRef.current.push(unsubStatus);

      // Subscribe to rides table
      if (subscribeToRides) {
        const filter =
          userType === 'passenger' ? `user_id=eq.${userId}` : `driver_id=eq.${userId}`;
        unsubscribersRef.current.push(
          subscribePostgresChanges({
            channelName,
            table: 'rides',
            event: '*',
            filter,
            listener: handleRideUpdate,
          })
        );
      }

      // Subscribe to ride_offers (for passengers)
      if (subscribeToOffers && userType === 'passenger') {
        unsubscribersRef.current.push(
          subscribePostgresChanges({
            channelName,
            table: 'ride_offers',
            event: '*',
            listener: handleOfferUpdate,
          })
        );
      }

      // Subscribe to notifications
      if (subscribeToNotifications) {
        unsubscribersRef.current.push(
          subscribePostgresChanges({
            channelName,
            table: 'notifications',
            event: 'INSERT',
            filter: `user_id=eq.${userId}`,
            listener: handleNotificationUpdate,
          })
        );
      }

    } catch (err) {
      console.error('❌ Error setting up realtime subscriptions:', err);
      setError(err.message);
      setConnectionStatus('error');
    }

    // Cleanup subscriptions
    return () => {
      console.log(`🔌 Cleaning up realtime subscriptions for ${userType}`);
      unsubscribersRef.current.forEach((unsub) => {
        try { unsub?.(); } catch (err) {
          console.error('Error unsubscribing channel:', err);
        }
      });
      unsubscribersRef.current = [];
      setConnectionStatus('disconnected');
    };
  }, [
    userId,
    userType,
    subscribeToRides,
    subscribeToOffers,
    subscribeToNotifications,
    handleRideUpdate,
    handleOfferUpdate,
    handleNotificationUpdate
  ]);

  return {
    rides,
    offers,
    notifications,
    connectionStatus,
    error,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error'
  };
};

export default useRideRealtime;
