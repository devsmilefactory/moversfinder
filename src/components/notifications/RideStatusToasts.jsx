import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { useToast } from '../ui/ToastProvider';
import useRideNotifications from '../../hooks/useRideNotifications';

// Centralized notification-driven toasts for ride updates
const RideStatusToasts = () => {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Hook now manages subscription to notifications table and basic toast
  const { notifications } = useRideNotifications(user?.id);

  // We rely on useRideNotifications to show toasts; this component can
  // in the future be extended to add extra ride-specific behaviour.

  return null;
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
        case 'trip_completed':
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
                type: ['trip_completed', 'completed'].includes(curr) ? 'success' : 'info',
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

