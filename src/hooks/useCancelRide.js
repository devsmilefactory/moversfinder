import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { notifyRideCancelled } from '../services/notificationService';

/**
 * useCancelRide
 *
 * Shared hook for cancelling rides from either passenger or driver flows.
 *
 * Handles:
 * - rides.ride_status = 'cancelled'
 * - cancelled_at, cancelled_by, cancellation_reason, status_updated_at
 * - optional notification to the other party
 */
export function useCancelRide() {
  const { addToast } = useToast();
  const [cancelling, setCancelling] = useState(false);

  const cancelRide = useCallback(
    async ({
      rideId,
      role, // 'passenger' | 'driver'
      reason,
      otherPartyUserId, // user to notify, if any
      extraRideUpdates = {},
    }) => {
      if (!rideId) {
        throw new Error('rideId is required to cancel a ride');
      }
      if (!role) {
        throw new Error('role is required to cancel a ride');
      }

      setCancelling(true);
      try {
        const now = new Date().toISOString();

        // First, get the ride to check if it has a driver assigned
        const { data: rideData, error: rideFetchError } = await supabase
          .from('rides')
          .select('driver_id')
          .eq('id', rideId)
          .single();

        if (rideFetchError) {
          console.error('Error fetching ride details:', rideFetchError);
          // Continue anyway - we'll still try to cancel the ride
        }

        const rideUpdate = {
          ride_status: 'cancelled',
          status: 'cancelled',
          cancelled_at: now,
          cancelled_by: role,
          cancellation_reason: reason || null,
          status_updated_at: now,
          ...extraRideUpdates,
        };

        const { error: rideError } = await supabase
          .from('rides')
          .update(rideUpdate)
          .eq('id', rideId);

        if (rideError) {
          console.error('Error cancelling ride:', rideError);
          throw rideError;
        }

        // Mark driver as available again if ride had a driver assigned
        const driverId = rideData?.driver_id;
        if (driverId) {
          try {
            const { error: availError } = await supabase
              .from('driver_locations')
              .update({ 
                is_available: true,
                active_ride_id: null 
              })
              .eq('driver_id', driverId);
            
            if (availError) {
              console.error('Error updating driver availability after cancellation:', availError);
            } else {
              console.log(`✅ Driver ${driverId} marked as available after ride cancellation`);
            }
          } catch (availErr) {
            console.error('Exception updating driver availability after cancellation:', availErr);
          }
        }

        if (otherPartyUserId) {
          try {
            await notifyRideCancelled({
              userId: otherPartyUserId,
              rideId,
              cancelledBy: role,
            });
          } catch (notifErr) {
            console.error('Error sending cancellation notification:', notifErr);
          }
        }

        addToast?.({
          type: 'success',
          title: 'Ride cancelled successfully',
        });

        return { success: true };
      } catch (error) {
        console.error('useCancelRide error:', error);
        addToast?.({
          type: 'error',
          title: 'Failed to cancel ride',
          message: error.message || 'Please try again or contact support if the issue persists',
        });
        return { success: false, error };
      } finally {
        setCancelling(false);
      }
    },
    [addToast]
  );

  return { cancelRide, cancelling };
}

