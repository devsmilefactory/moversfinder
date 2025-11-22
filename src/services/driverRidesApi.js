/**
 * Driver Rides API Service
 * 
 * Centralized service for all driver ride data access.
 * This is the single source of truth for fetching driver rides.
 */

import { supabase } from '../lib/supabase';

/**
 * Fetch driver rides with filtering and pagination
 * 
 * @param {string} driverId - UUID of the driver
 * @param {string} statusGroup - AVAILABLE | BID | ACTIVE | COMPLETED
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
  try {
    const offset = (page - 1) * pageSize;

    const { data, error } = await supabase.rpc('get_driver_rides', {
      p_driver_id: driverId,
      p_status_group: statusGroup,
      p_ride_type: rideTypeFilter === 'ALL' ? null : rideTypeFilter,
      p_schedule_type: scheduleFilter === 'ALL' ? null : scheduleFilter,
      p_limit: pageSize,
      p_offset: offset
    });

    if (error) {
      console.error('Error fetching driver rides:', error);
      return { data: null, error, count: 0 };
    }

    // Get total count for pagination (approximate based on returned data)
    // Note: For exact count, we'd need a separate count query
    const count = data?.length || 0;

    return { data: data || [], error: null, count };
  } catch (error) {
    console.error('Exception in fetchDriverRides:', error);
    return { data: null, error, count: 0 };
  }
}

/**
 * Fetch active instant ride for a driver
 * 
 * @param {string} driverId - UUID of the driver
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function fetchActiveInstantRide(driverId) {
  try {
    const { data, error } = await supabase.rpc('get_active_instant_ride', {
      p_driver_id: driverId
    });

    if (error) {
      console.error('Error fetching active instant ride:', error);
      return { data: null, error };
    }

    // RPC returns array, get first item
    const ride = data && data.length > 0 ? data[0] : null;

    return { data: ride, error: null };
  } catch (error) {
    console.error('Exception in fetchActiveInstantRide:', error);
    return { data: null, error };
  }
}

/**
 * Fetch imminent scheduled rides for a driver
 * 
 * @param {string} driverId - UUID of the driver
 * @param {number} windowMinutes - Time window in minutes (default 30)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchImminentScheduledRides(driverId, windowMinutes = 30) {
  try {
    const { data, error } = await supabase.rpc('get_imminent_scheduled_rides', {
      p_driver_id: driverId,
      p_window_minutes: windowMinutes
    });

    if (error) {
      console.error('Error fetching imminent scheduled rides:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception in fetchImminentScheduledRides:', error);
    return { data: null, error };
  }
}

/**
 * Activate a scheduled ride
 * 
 * @param {string} rideId - UUID of the ride to activate
 * @param {string} driverId - UUID of the driver
 * @returns {Promise<{success: boolean, error: string|null, ride_id: string|null}>}
 */
export async function activateScheduledRide(rideId, driverId) {
  try {
    const { data, error } = await supabase.rpc('activate_scheduled_ride', {
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
        ride_id: data.ride_id || null
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
