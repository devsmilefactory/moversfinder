import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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
    if (onRideUpdate) {
      onRideUpdate(payload);
    }
  }, [onRideUpdate]);

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
    if (onOfferUpdate) {
      onOfferUpdate(payload);
    }
  }, [onOfferUpdate]);

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
    if (onNotification) {
      onNotification(payload.new);
    }
  }, [onNotification]);

  useEffect(() => {
    if (!userId) {
      setConnectionStatus('disconnected');
      return;
    }

    console.log(`🔌 Setting up realtime subscriptions for ${userType}:`, userId);
    setConnectionStatus('connecting');

    const channels = [];

    try {
      // Subscribe to rides table
      if (subscribeToRides) {
        const ridesChannel = supabase
          .channel(`${userType}-rides-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'rides',
              filter: userType === 'passenger'
                ? `user_id=eq.${userId}`
                : `driver_id=eq.${userId}`
            },
            handleRideUpdate
          )
          .subscribe((status) => {
            console.log(`🔌 Rides subscription status (${userType}):`, status);
            
            if (status === 'SUBSCRIBED') {
              setConnectionStatus('connected');
            } else if (status === 'SUBSCRIPTION_ERROR') {
              console.error('❌ Rides subscription error');
              setError('Failed to connect to ride updates');
              setConnectionStatus('error');
            } else if (status === 'CLOSED') {
              console.warn('⚠️ Rides connection closed');
              setConnectionStatus('disconnected');
            }
          });

        channels.push(ridesChannel);
      }

      // Subscribe to ride_offers (for passengers)
      if (subscribeToOffers && userType === 'passenger') {
        const offersChannel = supabase
          .channel(`passenger-offers-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'ride_offers'
            },
            handleOfferUpdate
          )
          .subscribe((status) => {
            console.log('🔌 Offers subscription status:', status);
            
            if (status === 'SUBSCRIPTION_ERROR') {
              console.error('❌ Offers subscription error');
            }
          });

        channels.push(offersChannel);
      }

      // Subscribe to notifications
      if (subscribeToNotifications) {
        const notificationsChannel = supabase
          .channel(`notifications-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`
            },
            handleNotificationUpdate
          )
          .subscribe((status) => {
            console.log('🔌 Notifications subscription status:', status);
            
            if (status === 'SUBSCRIPTION_ERROR') {
              console.error('❌ Notifications subscription error');
            }
          });

        channels.push(notificationsChannel);
      }

    } catch (err) {
      console.error('❌ Error setting up realtime subscriptions:', err);
      setError(err.message);
      setConnectionStatus('error');
    }

    // Cleanup subscriptions
    return () => {
      console.log(`🔌 Cleaning up realtime subscriptions for ${userType}`);
      channels.forEach(channel => {
        try {
          channel.unsubscribe();
        } catch (err) {
          console.error('Error unsubscribing channel:', err);
        }
      });
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
