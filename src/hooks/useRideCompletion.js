import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import useAuthStore from '../stores/authStore';
import { RIDE_STATUSES } from './useRideStatus';
import { notifyTripCompleted } from '../services/notificationService';
import { transitionRideStatusRpc, RIDE_STATE, EXECUTION_SUB_STATE } from '../services/rideStateService';

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

        // 1. Get ride details first to check for recurring rides and other metadata
        const { data: rideData, error: rideFetchError } = await supabase
          .from('rides')
          .select('*, series_id, number_of_trips, estimated_cost, payment_method, company_id')
          .eq('id', rideId)
          .single();

        if (rideFetchError) {
          console.error('Error fetching ride details:', rideFetchError);
          throw rideFetchError;
        }

        // 2. Prepare metadata updates (separate from state transition)
        const metadataUpdates = {
          trip_completed_at: now,
          actual_dropoff_time: now,
          payment_status: 'paid', // Or pending based on business logic, keeping 'paid' as per existing
          ...extraRideUpdates,
        };

        // For recurring rides, calculate per-trip cost if needed
        let tripCost = parseFloat(rideData.fare || rideData.estimated_cost || 0);
        if (rideData.number_of_trips && rideData.number_of_trips > 1 && rideData.estimated_cost) {
          tripCost = parseFloat(rideData.estimated_cost) / rideData.number_of_trips;
          metadataUpdates.fare = tripCost;
        }

        // 3. EXECUTE STATE TRANSITION VIA CANONICAL WRAPPER
        // Move state to COMPLETED_INSTANCE (and keep ride_status/status in sync).
        await transitionRideStatusRpc({
          rideId,
          newState: RIDE_STATE.COMPLETED_INSTANCE,
          newSubState: EXECUTION_SUB_STATE.TRIP_COMPLETED,
          actorType: 'DRIVER',
          actorId: user?.id,
        });

        // 4. Update additional metadata
        const { error: metadataError } = await supabase
          .from('rides')
          .update(metadataUpdates)
          .eq('id', rideId);

        if (metadataError) {
          console.error('Error updating ride metadata:', metadataError);
          // Don't fail the whole process if metadata update fails after transition
        }

        // Handle automatic deduction for corporate account_balance payments
        // This happens automatically via the database trigger, but we ensure it here too
        if (rideData.payment_method === 'account_balance' && rideData.company_id) {
          try {
            const { data: companyData, error: companyError } = await supabase
              .from('corporate_profiles')
              .select('credit_balance, low_balance_threshold')
              .eq('user_id', rideData.company_id)
              .single();

            if (!companyError && companyData) {
              const currentBalance = parseFloat(companyData.credit_balance || 0);
              const newBalance = currentBalance - tripCost;
              const threshold = parseFloat(companyData.low_balance_threshold || 100);

              // Update balance
              await supabase
                .from('corporate_profiles')
                .update({ credit_balance: newBalance })
                .eq('user_id', rideData.company_id);

              // Create transaction record
              await supabase
                .from('credit_transactions')
                .insert({
                  company_id: rideData.company_id,
                  transaction_type: 'deduction',
                  amount: tripCost,
                  balance_before: currentBalance,
                  balance_after: newBalance,
                  reference_type: 'ride',
                  reference_id: rideId,
                  description: `Recurring trip payment (trip ${rideData.series_trip_number || 1} of ${rideData.number_of_trips || 1})`,
                  created_by: user?.id,
                  platform: 'taxicab'
                });

              console.log(`✅ Recurring ride deduction: $${tripCost.toFixed(2)} (New balance: $${newBalance.toFixed(2)})`);
            }
          } catch (deductionError) {
            console.error('Error processing recurring ride deduction:', deductionError);
            // Don't fail the completion if deduction fails
          }
        }

        // Mark driver available again - use ride's driver_id to ensure we update the correct driver
        // This handles cases where the completion might be triggered by admin/system
        const driverId = rideData.driver_id || user?.id;
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
              console.error('Error updating driver availability after completion:', availError);
            } else {
              console.log(`✅ Driver ${driverId} marked as available after ride completion`);
            }
          } catch (availErr) {
            console.error('Exception updating driver availability after completion:', availErr);
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

        // Fetch updated ride for UI consumers (overlay/rating flows)
        let updatedRide = null;
        try {
          const { data: refreshedRide } = await supabase
            .from('rides')
            .select('*')
            .eq('id', rideId)
            .single();
          updatedRide = refreshedRide || null;
        } catch (e) {
          // Non-fatal; callers can fall back to local ride status update.
          updatedRide = null;
        }

        return { success: true, ride: updatedRide };
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

