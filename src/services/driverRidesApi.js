/**
 * Driver Rides API Service
 * 
 * Centralized service for all driver ride data access using new platform ride logic.
 * This is the single source of truth for fetching driver rides.
 */

import { supabase } from '../lib/supabase';

/**
 * Map old status groups to new feed categories
 * AVAILABLE -> available
 * BID -> my_bids
 * ACTIVE -> in_progress
 * COMPLETED -> completed
 */
const STATUS_GROUP_TO_FEED_CATEGORY = {
  'AVAILABLE': 'available',
  'BID': 'my_bids',
  'ACTIVE': 'in_progress',
  'COMPLETED': 'completed',
  'CANCELLED': 'cancelled'
};

/**
 * Map old ride type filters to new service types
 */
const RIDE_TYPE_TO_SERVICE_TYPE = {
  'TAXI': 'taxi',
  'COURIER': 'courier',
  'ERRANDS': 'errands',
  'SCHOOL_RUN': 'school_run'
};

/**
 * Map old schedule filters to new ride timing
 * Note: SCHEDULED maps to scheduled_single (not 'scheduled')
 * RECURRING maps to scheduled_recurring (not 'recurring')
 */
const SCHEDULE_TO_TIMING = {
  'INSTANT': 'instant',
  'SCHEDULED': 'scheduled_single',
  'RECURRING': 'scheduled_recurring'
};

/**
 * Check if a ride entry is a recurring series
 * 
 * @param {Object} ride - Ride object from feed
 * @returns {boolean} True if this is a series entry
 */
export function isRecurringSeries(ride) {
  return ride && ride.is_series === true;
}

/**
 * Fetch driver rides with filtering and pagination using new get_driver_feed RPC
 * 
 * @param {string} driverId - UUID of the driver
 * @param {string} statusGroup - AVAILABLE | BID | ACTIVE | COMPLETED | CANCELLED
 * @param {string} rideTypeFilter - ALL | TAXI | COURIER | ERRANDS | SCHOOL_RUN
 * @param {string} scheduleFilter - ALL | INSTANT | SCHEDULED | RECURRING
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of rides per page (default 10)
 * @returns {Promise<{data: Array, error: Error|null, count: number}>}
 */
export async function fetchDriverRides(
  driverId,
  statusGroup,
  rideTypeFilter = 'ALL',
  scheduleFilter = 'ALL',
  page = 1,
  pageSize = 10
) {
  const startTime = performance.now();
  
  try {
    const offset = (page - 1) * pageSize;
    
    // Map to new feed category
    const feedCategory = STATUS_GROUP_TO_FEED_CATEGORY[statusGroup] || 'available';
    
    // Map service type
    const serviceType = rideTypeFilter === 'ALL' ? null : RIDE_TYPE_TO_SERVICE_TYPE[rideTypeFilter];
    
    // Map ride timing
    const rideTiming = scheduleFilter === 'ALL' ? null : SCHEDULE_TO_TIMING[scheduleFilter];

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'driverRidesApi.js:90',message:'Calling get_driver_feed',data:{feedCategory,serviceType,rideTiming,page,pageSize},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const { data, error } = await supabase.rpc('get_driver_feed', {
      p_driver_id: driverId,
      p_feed_category: feedCategory,
      p_service_type: serviceType,
      p_ride_timing: rideTiming,
      p_limit: pageSize,
      p_offset: offset
    });

    const duration = performance.now() - startTime;

    if (error) {
      console.error('[Driver Feed] Error fetching driver rides:', {
        error,
        context: { driverId, feedCategory, serviceType, rideTiming, page, pageSize },
        duration: `${duration.toFixed(2)}ms`
      });
      return { data: null, error, count: 0 };
    }

    // Log performance warning if slow
    if (duration > 500) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'driverRidesApi.js:120',message:'Slow query detected',data:{feedCategory,duration:duration.toFixed(2),resultCount:data?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    // Defensive client-side deduping to enforce mutual exclusivity:
    // - Any ride with this driver's offer should be excluded from "available"
    // - Any ride with this driver's pending offer should appear only in "my_bids"
    // - Any ride assigned to this driver is treated as in_progress even if status is still pending
    let cleanedData = data || [];
    if (cleanedData.length > 0) {
      const rideIds = cleanedData.map((r) => r.id).filter(Boolean);
      if (rideIds.length > 0) {
        const { data: offerRows, error: offerError } = await supabase
          .from('ride_offers')
          .select('ride_id, driver_id, offer_status')
          .in('ride_id', rideIds)
          .eq('driver_id', driverId);

        if (!offerError) {
          const offersByRide = new Map();
          offerRows?.forEach((o) => {
            offersByRide.set(o.ride_id, o);
          });

          cleanedData = cleanedData.filter((ride) => {
            const offer = offersByRide.get(ride.id);
            const offerStatus = (offer?.offer_status || '').toLowerCase();
            const isAssignedToDriver = ride.driver_id === driverId;
            const isPending = ride.ride_status === 'pending';

            switch (feedCategory) {
              case 'available':
                // Keep only if no offer from this driver and no assignment
                return !offer && !isAssignedToDriver;
              case 'my_bids':
                // Only pending offers, and ride not yet assigned
                return offer && offerStatus === 'pending' && !isAssignedToDriver;
              case 'in_progress':
                // Include if assigned to this driver (even if status still pending)
                return isAssignedToDriver || (isPending && isAssignedToDriver);
              default:
                return true;
            }
          });
        }
      }
    }

    // Get total count for pagination (approximate based on returned data)
    const count = cleanedData?.length || 0;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'driverRidesApi.js:131',message:'Fetch success',data:{feedCategory,resultCount:count,duration:duration.toFixed(2)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return { data: cleanedData || [], error: null, count };
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error('[Driver Feed] Exception in fetchDriverRides:', {
      error: error.message,
      stack: error.stack,
      context: { driverId, statusGroup, rideTypeFilter, scheduleFilter, page, pageSize },
      duration: `${duration.toFixed(2)}ms`
    });
    return { data: null, error, count: 0 };
  }
}

/**
 * Fetch active instant ride for a driver using new get_driver_feed RPC
 * 
 * @param {string} driverId - UUID of the driver
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function fetchActiveInstantRide(driverId) {
  try {
    const { data, error } = await supabase.rpc('get_driver_feed', {
      p_driver_id: driverId,
      p_feed_category: 'in_progress',
      p_service_type: null,
      p_ride_timing: 'instant',
      p_limit: 1,
      p_offset: 0
    });

    if (error) {
      console.error('Error fetching active instant ride:', error);
      return { data: null, error };
    }

    // Get first active instant ride
    let ride = data && data.length > 0 ? data[0] : null;

    // If ride_status already shows a terminal state, treat as no active ride
    if (ride && ['trip_completed', 'completed', 'cancelled'].includes((ride.ride_status || '').toLowerCase())) {
      ride = null;
    }

    return { data: ride, error: null };
  } catch (error) {
    console.error('Exception in fetchActiveInstantRide:', error);
    return { data: null, error };
  }
}

/**
 * Ensure driver availability is reset when no active ride is tracked
 * Safe guard: only updates when active_ride_id IS NULL
 */
export async function ensureDriverAvailability(driverId) {
  if (!driverId) return { success: false, error: 'driverId required' };

  try {
    const { error } = await supabase
      .from('driver_locations')
      .update({ is_available: true })
      .eq('driver_id', driverId)
      .is('active_ride_id', null);

    if (error) {
      console.error('Error ensuring driver availability:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Exception ensuring driver availability:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch imminent scheduled rides for a driver using new get_driver_feed RPC
 * 
 * @param {string} driverId - UUID of the driver
 * @param {number} windowMinutes - Time window in minutes (default 30)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchImminentScheduledRides(driverId, windowMinutes = 30) {
  try {
    // Fetch all in-progress scheduled rides
    const { data, error } = await supabase.rpc('get_driver_feed', {
      p_driver_id: driverId,
      p_feed_category: 'in_progress',
      p_service_type: null,
      p_ride_timing: 'scheduled_single',
      p_limit: 50,
      p_offset: 0
    });

    if (error) {
      console.error('Error fetching imminent scheduled rides:', error);
      return { data: null, error };
    }

    // Filter for rides within the time window
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowMinutes * 60000);
    
    const imminentRides = (data || []).filter(ride => {
      if (!ride.scheduled_datetime) return false;
      const scheduledTime = new Date(ride.scheduled_datetime);
      return scheduledTime >= now && scheduledTime <= windowEnd;
    });

    return { data: imminentRides, error: null };
  } catch (error) {
    console.error('Exception in fetchImminentScheduledRides:', error);
    return { data: null, error };
  }
}

/**
 * Activate a scheduled ride using new activate_ride RPC
 * 
 * @param {string} rideId - UUID of the ride to activate
 * @param {string} driverId - UUID of the driver
 * @returns {Promise<{success: boolean, error: string|null, ride_id: string|null}>}
 */
export async function activateScheduledRide(rideId, driverId) {
  try {
    const { data, error } = await supabase.rpc('activate_ride', {
      p_ride_id: rideId,
      p_driver_id: driverId
    });

    if (error) {
      console.error('Error activating scheduled ride:', error);
      return { success: false, error: error.message, ride_id: null };
    }

    // RPC returns JSON object
    if (data && typeof data === 'object') {
      return {
        success: data.success || false,
        error: data.error || null,
        ride_id: data.ride_id || rideId
      };
    }

    return { success: false, error: 'Invalid response from server', ride_id: null };
  } catch (error) {
    console.error('Exception in activateScheduledRide:', error);
    return { success: false, error: error.message, ride_id: null };
  }
}

/**
 * Get ride counts for all tabs
 * 
 * @param {string} driverId - UUID of the driver
 * @returns {Promise<{available: number, bid: number, active: number, completed: number}>}
 */
export async function fetchRideCounts(driverId) {
  try {
    // Fetch counts for each status group in parallel
    const [availableRes, bidRes, activeRes, completedRes] = await Promise.all([
      fetchDriverRides(driverId, 'AVAILABLE', 'ALL', 'ALL', 1, 1),
      fetchDriverRides(driverId, 'BID', 'ALL', 'ALL', 1, 1),
      fetchDriverRides(driverId, 'ACTIVE', 'ALL', 'ALL', 1, 1),
      fetchDriverRides(driverId, 'COMPLETED', 'ALL', 'ALL', 1, 1)
    ]);

    return {
      available: availableRes.count || 0,
      bid: bidRes.count || 0,
      active: activeRes.count || 0,
      completed: completedRes.count || 0
    };
  } catch (error) {
    console.error('Exception in fetchRideCounts:', error);
    return {
      available: 0,
      bid: 0,
      active: 0,
      completed: 0
    };
  }
}

/**
 * Transition ride status using new transition_ride_status RPC
 * 
 * @param {string} rideId - UUID of the ride
 * @param {string} newState - New ride state (PENDING, ACTIVE_PRE_TRIP, ACTIVE_EXECUTION, COMPLETED_INSTANCE, COMPLETED_FINAL, CANCELLED)
 * @param {string|null} newSubState - New execution sub-state (DRIVER_ON_THE_WAY, DRIVER_ARRIVED, TRIP_STARTED, TRIP_COMPLETED)
 * @param {string} actorType - DRIVER | PASSENGER | SYSTEM
 * @param {string} actorId - UUID of the actor
 * @returns {Promise<{success: boolean, error: string|null, data: Object|null}>}
 */
export async function transitionRideStatus(rideId, newState, newSubState = null, actorType = 'DRIVER', actorId) {
  try {
    const { data, error } = await supabase.rpc('transition_ride_status', {
      p_ride_id: rideId,
      p_new_state: newState,
      p_new_sub_state: newSubState,
      p_actor_type: actorType,
      p_actor_id: actorId
    });

    if (error) {
      console.error('Error transitioning ride status:', error);
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
    console.error('Exception in transitionRideStatus:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Transition errand task status using new transition_errand_task RPC
 * 
 * @param {string} rideId - UUID of the ride
 * @param {number} taskIndex - Index of the task (0-based)
 * @param {string} newTaskStatus - New task status (ACTIVATE_TASK, DRIVER_ON_THE_WAY, DRIVER_ARRIVED, TASK_STARTED, TASK_COMPLETED)
 * @param {string} driverId - UUID of the driver
 * @returns {Promise<{success: boolean, error: string|null, data: Object|null}>}
 */
export async function transitionErrandTask(rideId, taskIndex, newTaskStatus, driverId) {
  try {
    const { data, error } = await supabase.rpc('transition_errand_task', {
      p_ride_id: rideId,
      p_task_index: taskIndex,
      p_new_task_status: newTaskStatus,
      p_driver_id: driverId
    });

    if (error) {
      console.error('Error transitioning errand task:', error);
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
    console.error('Exception in transitionErrandTask:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Accept a driver offer using new accept_driver_offer RPC
 * 
 * @param {string} offerId - UUID of the offer
 * @param {string} passengerId - UUID of the passenger
 * @returns {Promise<{success: boolean, error: string|null, data: Object|null}>}
 */
export async function acceptDriverOffer(offerId, passengerId) {
  try {
    const { data, error } = await supabase.rpc('accept_driver_offer', {
      p_offer_id: offerId,
      p_passenger_id: passengerId
    });

    if (error) {
      console.error('Error accepting driver offer:', error);
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
    console.error('Exception in acceptDriverOffer:', error);
    return { success: false, error: error.message, data: null };
  }
}
