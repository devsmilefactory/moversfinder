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

  // If already in target state and it's ACTIVE_EXECUTION, just update sub-state
  if (ride.state === newState && newState === RIDE_STATE.ACTIVE_EXECUTION && newSubState) {
    const { data, error } = await supabase
      .from('rides')
      .update({ execution_sub_state: newSubState })
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
 * Driver marks as on the way
 */
export async function driverOnTheWay(rideId, driverId) {
  return transitionRideStatus(
    rideId,
    RIDE_STATE.ACTIVE_EXECUTION,
    EXECUTION_SUB_STATE.DRIVER_ON_THE_WAY,
    'DRIVER',
    driverId
  );
}

/**
 * Driver marks as arrived
 */
export async function driverArrived(rideId, driverId) {
  return transitionRideStatus(
    rideId,
    RIDE_STATE.ACTIVE_EXECUTION,
    EXECUTION_SUB_STATE.DRIVER_ARRIVED,
    'DRIVER',
    driverId
  );
}

/**
 * Driver starts the trip
 */
export async function startTrip(rideId, driverId) {
  return transitionRideStatus(
    rideId,
    RIDE_STATE.ACTIVE_EXECUTION,
    EXECUTION_SUB_STATE.TRIP_STARTED,
    'DRIVER',
    driverId
  );
}

/**
 * Driver completes the trip
 */
export async function completeTrip(rideId, driverId) {
  return transitionRideStatus(
    rideId,
    RIDE_STATE.COMPLETED_INSTANCE,
    EXECUTION_SUB_STATE.TRIP_COMPLETED,
    'DRIVER',
    driverId
  );
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
  return transitionRideStatus(
    rideId,
    RIDE_STATE.COMPLETED_FINAL,
    null,
    'PASSENGER',
    passengerId
  );
}

/**
 * Cancel ride (by driver or passenger)
 */
export async function cancelRide(rideId, actorId, actorType = 'DRIVER') {
  return transitionRideStatus(
    rideId,
    RIDE_STATE.CANCELLED,
    null,
    actorType,
    actorId
  );
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
  const { data, error } = await supabase.rpc('accept_driver_offer', {
    p_offer_id: offerId,
    p_passenger_id: passengerId
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Offer acceptance failed');
  
  return data;
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
