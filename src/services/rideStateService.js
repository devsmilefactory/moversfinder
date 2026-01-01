/**
 * Ride State Service
 * 
 * Centralized service for ride state transitions using the new platform ride logic.
 * Provides helper functions for common state transitions.
 */

import { supabase } from '../lib/supabase';

/**
 * Ride States
 */
export const RIDE_STATE = {
  PENDING: 'PENDING',
  ACTIVE_PRE_TRIP: 'ACTIVE_PRE_TRIP',
  ACTIVE_EXECUTION: 'ACTIVE_EXECUTION',
  COMPLETED_INSTANCE: 'COMPLETED_INSTANCE',
  COMPLETED_FINAL: 'COMPLETED_FINAL',
  CANCELLED: 'CANCELLED'
};

/**
 * Execution Sub-States
 */
export const EXECUTION_SUB_STATE = {
  DRIVER_ON_THE_WAY: 'DRIVER_ON_THE_WAY',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  TRIP_STARTED: 'TRIP_STARTED',
  TRIP_COMPLETED: 'TRIP_COMPLETED'
};

/**
 * Task States
 */
export const TASK_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  ACTIVATE_TASK: 'ACTIVATE_TASK',
  DRIVER_ON_THE_WAY: 'DRIVER_ON_THE_WAY',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  TASK_STARTED: 'TASK_STARTED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_CANCELLED: 'TASK_CANCELLED'
};

/**
 * Transition ride to a new state
 */
async function transitionRideStatus(rideId, newState, newSubState = null, actorType, actorId) {
  // First, check current state to see if we need to call RPC or just update table
  const { data: ride, error: fetchError } = await supabase
    .from('rides')
    .select('state')
    .eq('id', rideId)
    .single();

  if (fetchError) throw fetchError;

  // If already in target state and it's ACTIVE_EXECUTION, update sub-state AND ride_status
  // so passenger UIs (and other consumers) that rely on ride_status remain in sync.
  if (ride.state === newState && newState === RIDE_STATE.ACTIVE_EXECUTION && newSubState) {
    const sub = String(newSubState || '').toUpperCase();
    const rideStatusForSubState = (() => {
      if (sub === EXECUTION_SUB_STATE.DRIVER_ON_THE_WAY) return 'driver_on_way';
      if (sub === EXECUTION_SUB_STATE.DRIVER_ARRIVED) return 'driver_arrived';
      if (sub === EXECUTION_SUB_STATE.TRIP_STARTED) return 'trip_started';
      // TRIP_COMPLETED is handled by COMPLETED_INSTANCE transitions; keep ride_status unchanged here.
      return null;
    })();

    const { data, error } = await supabase
      .from('rides')
      .update({
        execution_sub_state: newSubState,
        ...(rideStatusForSubState
          ? {
              ride_status: rideStatusForSubState,
              // Compatibility with legacy code paths still reading `status`
              status: rideStatusForSubState,
            }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)
      .select();
    
    if (error) throw error;
    return { success: true, data };
  }

  const { data, error } = await supabase.rpc('transition_ride_status', {
    p_ride_id: rideId,
    p_new_state: newState,
    p_new_sub_state: newSubState,
    p_actor_type: actorType,
    p_actor_id: actorId
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'State transition failed');
  
  return data;
}

/**
 * Public transition wrapper: always use this when transitioning platform state from client code.
 *
 * It calls the canonical RPC and then performs a **best-effort compatibility sync**
 * for `ride_status` (and legacy `status`) so UIs/feeds that rely on `ride_status`
 * never drift from `state`/`execution_sub_state` across deployments.
 */
export async function transitionRideStatusRpc({
  rideId,
  newState,
  newSubState = null,
  actorType,
  actorId
}) {
  if (!rideId) throw new Error('rideId is required');
  if (!newState) throw new Error('newState is required');
  if (!actorType) throw new Error('actorType is required');
  if (!actorId) throw new Error('actorId is required');

  const result = await transitionRideStatus(rideId, newState, newSubState, actorType, actorId);

  // Best-effort ride_status mapping. This is intentionally conservative:
  // - It does not attempt to encode every possible legacy alias.
  // - It only ensures the canonical statuses used by current UI/feeds are set.
  const stateUpper = String(newState || '').toUpperCase();
  const subUpper = String(newSubState || '').toUpperCase();

  const mappedRideStatus = (() => {
    if (stateUpper === RIDE_STATE.PENDING) return 'pending';
    if (stateUpper === RIDE_STATE.ACTIVE_PRE_TRIP) return 'accepted';
    if (stateUpper === RIDE_STATE.ACTIVE_EXECUTION) {
      if (subUpper === EXECUTION_SUB_STATE.DRIVER_ON_THE_WAY) return 'driver_on_way';
      if (subUpper === EXECUTION_SUB_STATE.DRIVER_ARRIVED) return 'driver_arrived';
      if (subUpper === EXECUTION_SUB_STATE.TRIP_STARTED) return 'trip_started';
      // If sub-state isn't known, keep ride_status as-is.
      return null;
    }
    if (stateUpper === RIDE_STATE.COMPLETED_INSTANCE) return 'trip_completed';
    if (stateUpper === RIDE_STATE.COMPLETED_FINAL) return 'completed';
    if (stateUpper === RIDE_STATE.CANCELLED) return 'cancelled';
    return null;
  })();

  if (mappedRideStatus) {
    try {
      await supabase
        .from('rides')
        .update({
          ride_status: mappedRideStatus,
          status: mappedRideStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rideId);
    } catch {
      // Non-fatal: RPC is the source of truth; this is compatibility only.
    }
  }

  return result;
}

/**
 * Driver marks as on the way
 */
export async function driverOnTheWay(rideId, driverId) {
  return transitionRideStatusRpc({
    rideId,
    newState: RIDE_STATE.ACTIVE_EXECUTION,
    newSubState: EXECUTION_SUB_STATE.DRIVER_ON_THE_WAY,
    actorType: 'DRIVER',
    actorId: driverId,
  });
}

/**
 * Driver marks as arrived
 */
export async function driverArrived(rideId, driverId) {
  return transitionRideStatusRpc({
    rideId,
    newState: RIDE_STATE.ACTIVE_EXECUTION,
    newSubState: EXECUTION_SUB_STATE.DRIVER_ARRIVED,
    actorType: 'DRIVER',
    actorId: driverId,
  });
}

/**
 * Driver starts the trip
 */
export async function startTrip(rideId, driverId) {
  return transitionRideStatusRpc({
    rideId,
    newState: RIDE_STATE.ACTIVE_EXECUTION,
    newSubState: EXECUTION_SUB_STATE.TRIP_STARTED,
    actorType: 'DRIVER',
    actorId: driverId,
  });
}

/**
 * Driver completes the trip
 */
export async function completeTrip(rideId, driverId) {
  return transitionRideStatusRpc({
    rideId,
    newState: RIDE_STATE.COMPLETED_INSTANCE,
    newSubState: EXECUTION_SUB_STATE.TRIP_COMPLETED,
    actorType: 'DRIVER',
    actorId: driverId,
  });
}

/**
 * Complete outbound leg of round trip
 */
export async function completeOutboundLeg(rideId, driverId) {
  const { data, error } = await supabase.rpc('complete_round_trip_leg', {
    p_ride_id: rideId,
    p_driver_id: driverId,
    p_leg_type: 'outbound'
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Outbound leg completion failed');
  
  return data;
}

/**
 * Complete return leg of round trip
 */
export async function completeReturnLeg(rideId, driverId) {
  const { data, error } = await supabase.rpc('complete_round_trip_leg', {
    p_ride_id: rideId,
    p_driver_id: driverId,
    p_leg_type: 'return'
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Return leg completion failed');
  
  return data;
}

/**
 * Passenger confirms payment
 */
export async function confirmPayment(rideId, passengerId) {
  return transitionRideStatusRpc({
    rideId,
    newState: RIDE_STATE.COMPLETED_FINAL,
    newSubState: null,
    actorType: 'PASSENGER',
    actorId: passengerId,
  });
}

/**
 * Driver finalizes a completed-instance ride after driver-side rating flow.
 *
 * Note: Some deployments may restrict COMPLETED_FINAL transitions to PASSENGER only.
 * This helper attempts a canonical transition as DRIVER for consistency where allowed.
 */
export async function finalizeRideAsDriver(rideId, driverId) {
  return transitionRideStatusRpc({
    rideId,
    newState: RIDE_STATE.COMPLETED_FINAL,
    newSubState: null,
    actorType: 'DRIVER',
    actorId: driverId,
  });
}

/**
 * Cancel ride (by driver or passenger)
 */
export async function cancelRide(rideId, actorId, actorType = 'DRIVER') {
  const result = await transitionRideStatusRpc({
    rideId,
    newState: RIDE_STATE.CANCELLED,
    newSubState: null,
    actorType,
    actorId,
  });

  return result;
}

/**
 * Activate a scheduled/recurring ride
 */
export async function activateRide(rideId, driverId) {
  const { data, error } = await supabase.rpc('activate_ride', {
    p_ride_id: rideId,
    p_driver_id: driverId
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Activation failed');
  
  return data;
}

/**
 * Transition errand task
 */
export async function transitionErrandTask(rideId, taskIndex, newTaskStatus, driverId) {
  const { data, error } = await supabase.rpc('transition_errand_task', {
    p_ride_id: rideId,
    p_task_index: taskIndex,
    p_new_task_status: newTaskStatus,
    p_driver_id: driverId
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Task transition failed');
  
  return data;
}

/**
 * Accept driver offer
 */
export async function acceptOffer(offerId, passengerId) {
  // Canonical flow: call Edge Function which calls the atomic DB RPC.
  // passengerId is ignored (kept for backwards-compatible signature); JWT determines passenger.
  const { data, error } = await supabase.functions.invoke('accept-offer', {
    body: { offer_id: offerId }
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Offer acceptance failed');

  return data?.data || data;
}

/**
 * Complete recurring instance
 */
export async function completeRecurringInstance(rideId, driverId) {
  const { data, error } = await supabase.rpc('complete_recurring_instance', {
    p_ride_id: rideId,
    p_driver_id: driverId
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Recurring completion failed');
  
  return data;
}
