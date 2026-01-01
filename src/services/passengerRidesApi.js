/**
 * Passenger Rides API Service
 * 
 * Centralized service for all passenger ride data access using new platform ride logic.
 * This is the single source of truth for fetching passenger rides.
 */

import { supabase } from '../lib/supabase';
import { getSortTimestampForFeed, sortRidesByFeed } from './feedHelpers';
import { transitionRideStatusRpc } from './rideStateService';

/**
 * Map old status groups to new feed categories
 */
const STATUS_GROUP_TO_FEED_CATEGORY = {
  'PENDING': 'pending',
  'ACTIVE': 'active',
  'COMPLETED': 'completed',
  'CANCELLED': 'cancelled'
};

/**
 * Map ride type filters to service types
 */
const RIDE_TYPE_TO_SERVICE_TYPE = {
  'TAXI': 'taxi',
  'COURIER': 'courier',
  'ERRANDS': 'errands',
  'SCHOOL_RUN': 'school_run'
};

/**
 * Fetch passenger rides with filtering and pagination using new get_passenger_feed RPC
 * 
 * @param {string} userId - UUID of the passenger
 * @param {string} statusGroup - PENDING | ACTIVE | COMPLETED | CANCELLED
 * @param {string} rideTypeFilter - ALL | TAXI | COURIER | ERRANDS | SCHOOL_RUN
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of rides per page (default 10)
 * @returns {Promise<{data: Array, error: Error|null, count: number}>}
 */
export async function fetchPassengerRides(
  userId,
  statusGroup,
  rideTypeFilter = 'ALL',
  page = 1,
  pageSize = 10
) {
  const startTime = performance.now();
  
  try {
    const offset = (page - 1) * pageSize;
    
    // Map to new feed category
    const feedCategory = STATUS_GROUP_TO_FEED_CATEGORY[statusGroup] || 'pending';
    
    // Map service type
    const serviceType = rideTypeFilter === 'ALL' ? null : RIDE_TYPE_TO_SERVICE_TYPE[rideTypeFilter];

    // Local ingest debug logging removed (was causing ERR_CONNECTION_REFUSED in dev)

    const { data, error } = await supabase.rpc('get_passenger_feed', {
      p_user_id: userId,
      p_feed_category: feedCategory,
      p_service_type: serviceType,
      p_limit: pageSize,
      p_offset: offset
    });

    const duration = performance.now() - startTime;

    if (error) {
      console.error('[Passenger Feed] Error fetching passenger rides:', {
        error,
        context: { userId, feedCategory, serviceType, page, pageSize },
        duration: `${duration.toFixed(2)}ms`
      });
      return { data: null, error, count: 0 };
    }

    // Log performance warning if slow
    if (duration > 500) {
      // Local ingest debug logging removed (was causing ERR_CONNECTION_REFUSED in dev)
    }

    // Get total count for pagination
    const count = data?.length || 0;

    // Local ingest debug logging removed (was causing ERR_CONNECTION_REFUSED in dev)

    return { data: data || [], error: null, count };
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error('[Passenger Feed] Exception in fetchPassengerRides:', {
      error: error.message,
      stack: error.stack,
      context: { userId, statusGroup, rideTypeFilter, page, pageSize },
      duration: `${duration.toFixed(2)}ms`
    });
    return { data: null, error, count: 0 };
  }
}

/**
 * Get ride counts for all tabs
 * 
 * @param {string} userId - UUID of the passenger
 * @returns {Promise<{pending: number, active: number, completed: number}>}
 */
export async function fetchRideCounts(userId) {
  try {
    // Fetch counts for each status group in parallel
    const [pendingRes, activeRes, completedRes] = await Promise.all([
      fetchPassengerRides(userId, 'PENDING', 'ALL', 1, 1),
      fetchPassengerRides(userId, 'ACTIVE', 'ALL', 1, 1),
      fetchPassengerRides(userId, 'COMPLETED', 'ALL', 1, 1)
    ]);

    return {
      pending: pendingRes.count || 0,
      active: activeRes.count || 0,
      completed: completedRes.count || 0
    };
  } catch (error) {
    console.error('Exception in fetchRideCounts:', error);
    return {
      pending: 0,
      active: 0,
      completed: 0
    };
  }
}

/**
 * Accept a driver offer using the canonical Edge Function (accept-offer)
 * 
 * @param {string} offerId - UUID of the offer
 * @param {string} passengerId - UUID of the passenger
 * @returns {Promise<{success: boolean, error: string|null, data: Object|null}>}
 */
export async function acceptDriverOffer(offerId, passengerId) {
  try {
    // Canonical flow: call Edge Function which calls the atomic DB RPC.
    // passengerId is ignored (kept for backwards-compatible signature); JWT determines passenger.
    const { data, error } = await supabase.functions.invoke('accept-offer', {
      body: { offer_id: offerId }
    });

    if (error) {
      console.error('Error accepting driver offer:', error);
      return { success: false, error: error.message, data: null };
    }

    if (data && typeof data === 'object') {
      return {
        success: data.success || false,
        error: data.error || null,
        data: data?.data || data
      };
    }

    return { success: false, error: 'Invalid response from server', data: null };
  } catch (error) {
    console.error('Exception in acceptDriverOffer:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Transition ride status using new transition_ride_status RPC
 * 
 * @param {string} rideId - UUID of the ride
 * @param {string} newState - New ride state
 * @param {string|null} newSubState - New execution sub-state
 * @param {string} actorType - PASSENGER | DRIVER | SYSTEM
 * @param {string} actorId - UUID of the actor
 * @returns {Promise<{success: boolean, error: string|null, data: Object|null}>}
 */
export async function transitionRideStatus(rideId, newState, newSubState = null, actorType = 'PASSENGER', actorId) {
  // Deprecated compatibility wrapper.
  // Use rideStateService as the single source of truth so ride_status stays in sync across deployments.
  try {
    const data = await transitionRideStatusRpc({
      rideId,
      newState,
      newSubState,
      actorType,
      actorId,
    });
    return { success: true, error: null, data };
  } catch (error) {
    console.error('Exception in passengerRidesApi.transitionRideStatus:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Complete a recurring ride instance using new complete_recurring_instance RPC
 * 
 * @param {string} rideId - UUID of the ride
 * @param {string} driverId - UUID of the driver
 * @returns {Promise<{success: boolean, error: string|null, data: Object|null}>}
 */
export async function completeRecurringInstance(rideId, driverId) {
  try {
    const { data, error } = await supabase.rpc('complete_recurring_instance', {
      p_ride_id: rideId,
      p_driver_id: driverId
    });

    if (error) {
      console.error('Error completing recurring instance:', error);
      return { success: false, error: error.message, data: null };
    }

    if (data && typeof data === 'object') {
      return {
        success: data.success || false,
        error: data.error || null,
        data: data
      };
    }

    return { success: false, error: 'Invalid response from server', data: null };
  } catch (error) {
    console.error('Exception in completeRecurringInstance:', error);
    return { success: false, error: error.message, data: null };
  }
}
