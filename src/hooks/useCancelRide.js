import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { notifyRideCancelled } from '../services/notificationService';
import { transitionRideStatusRpc, RIDE_STATE } from '../services/rideStateService';

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
          .select('driver_id, user_id')
          .eq('id', rideId)
          .single();

        if (rideFetchError) {
          console.error('Error fetching ride details:', rideFetchError);
          // Continue anyway - we'll still try to cancel the ride
        }

        // Persist cancellation metadata (state/ride_status are managed via state machine + sync triggers)
        const { error: metaError } = await supabase
          .from('rides')
          .update({
            cancelled_by: role,
            cancellation_reason: reason || null,
            status_updated_at: now,
            ...extraRideUpdates,
          })
          .eq('id', rideId);

        if (metaError) {
          console.error('Error updating cancellation metadata:', metaError);
          // Continue; we still attempt to transition state below
        }

        // State machine transition (single source of truth)
        const actorType = role === 'driver' ? 'DRIVER' : 'PASSENGER';
        let actorId = null;
        try {
          const { data: authData } = await supabase.auth.getUser();
          actorId = authData?.user?.id || null;
        } catch (_) {}

        await transitionRideStatusRpc({
          rideId,
          newState: RIDE_STATE.CANCELLED,
          newSubState: null,
          actorType,
          actorId,
        });

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

