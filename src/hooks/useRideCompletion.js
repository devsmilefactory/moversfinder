import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import useAuthStore from '../stores/authStore';
import { RIDE_STATUSES } from './useRideStatus';
import { notifyTripCompleted } from '../services/notificationService';

/**
 * useRideCompletion
 *
 * Shared hook to complete a ride in a canonical way.
 * Handles:
 * - rides.ride_status = 'trip_completed'
 * - trip_completed_at, actual_dropoff_time, status_updated_at
 * - payment_status = 'paid'
 * - driver_locations.is_available = true (for drivers)
 * - optional notification to passenger
 */
export function useRideCompletion() {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [completing, setCompleting] = useState(false);

  const completeRide = useCallback(
    async ({
      rideId,
      passengerId,
      notifyPassenger = true,
      extraRideUpdates = {},
    }) => {
      if (!rideId) {
        throw new Error('rideId is required to complete a ride');
      }

      setCompleting(true);
      try {
        const now = new Date().toISOString();

        const rideUpdate = {
          ride_status: RIDE_STATUSES.TRIP_COMPLETED,
          trip_completed_at: now,
          actual_dropoff_time: now,
          payment_status: 'paid',
          status_updated_at: now,
          ...extraRideUpdates,
        };

        const { error: rideError } = await supabase
          .from('rides')
          .update(rideUpdate)
          .eq('id', rideId);

        if (rideError) {
          console.error('Error completing ride:', rideError);
          throw rideError;
        }

        // Mark driver available again if we know the current user is a driver
        if (user?.id) {
          try {
            await supabase
              .from('driver_locations')
              .update({ is_available: true })
              .eq('driver_id', user.id);
          } catch (availErr) {
            console.error('Error updating driver availability after completion:', availErr);
          }
        }

        if (notifyPassenger && passengerId) {
          try {
            await notifyTripCompleted({ userId: passengerId, rideId });
          } catch (notifErr) {
            console.error('Error sending trip completion notification:', notifErr);
          }
        }

        addToast?.({
          type: 'success',
          title: 'Trip completed successfully',
        });

        return { success: true };
      } catch (error) {
        console.error('useRideCompletion error:', error);
        addToast?.({
          type: 'error',
          title: 'Failed to complete trip',
          message: error.message || 'Please try again or contact support if the issue persists',
        });
        return { success: false, error };
      } finally {
        setCompleting(false);
      }
    },
    [addToast, user?.id]
  );

  return { completeRide, completing };
}

