import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/authStore';
import { useToast } from '../ui/ToastProvider';

// Lightweight listener that shows clickable toasts for ride status updates
const RideStatusToasts = () => {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const lastStatusesRef = useRef({}); // rideId -> last status string
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    const statusLabel = (s) => {
      switch (s) {
        case 'accepted':
        case 'driver_assigned':
        case 'offer_accepted':
          return 'Driver accepted your ride';
        case 'driver_on_way':
        case 'driver_en_route':
          return 'Driver is on the way';
        case 'driver_arrived':
          return 'Driver has arrived at pickup';
        case 'trip_started':
        case 'in_progress':
        case 'journey_started':
          return 'Your ride has started';
        case 'completed':
          return 'Ride completed';
        case 'cancelled':
          return 'Ride cancelled';
        default:
          return null;
      }
    };

    // Subscribe to updates on rides for this user
    const channel = supabase
      .channel(`ride-status-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const ride = payload.new;
          if (!ride) return;
          const prev = lastStatusesRef.current[ride.id];
          const curr = ride.ride_status || ride.status;
          if (curr && prev !== curr) {
            lastStatusesRef.current[ride.id] = curr;
            const msg = statusLabel(curr);
            if (msg) {
              addToast({
                type: curr === 'completed' ? 'success' : 'info',
                title: 'Ride update',
                message: msg,
                duration: 7000,
                onClick: () => navigate('/user/rides')
              });
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      try { channelRef.current && supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    };
  }, [user?.id, addToast, navigate]);

  return null;
};

export default RideStatusToasts;

