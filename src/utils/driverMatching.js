/**
 * Driver Matching Utilities
 * 
 * Functions for finding and matching drivers to ride requests
 * using geospatial queries and business logic
 */

import { supabase } from '../lib/supabase';

/**
 * Find nearby drivers within a specified radius
 * 
 * @param {Object} pickupCoordinates - Pickup location { lat, lng }
 * @param {number} radiusKm - Search radius in kilometers (default: 5)
 * @returns {Promise<Array>} Array of nearby drivers with distance
 */
export const findNearbyDrivers = async (pickupCoordinates, radiusKm = 5) => {
  try {
    if (!pickupCoordinates || !pickupCoordinates.lat || !pickupCoordinates.lng) {
      console.error('Invalid pickup coordinates:', pickupCoordinates);
      return { success: false, error: 'Invalid pickup coordinates', data: [] };
    }

    const { data: nearbyDrivers, error } = await supabase
      .rpc('find_drivers_within_radius', {
        pickup_lat: pickupCoordinates.lat,
        pickup_lng: pickupCoordinates.lng,
        radius_km: radiusKm
      });

    if (error) {
      console.error('Error finding nearby drivers:', error);
      return { success: false, error: error.message, data: [] };
    }

    console.log(`✅ Found ${nearbyDrivers?.length || 0} drivers within ${radiusKm}km`);
    return { success: true, data: nearbyDrivers || [], count: nearbyDrivers?.length || 0 };

  } catch (error) {
    console.error('Exception in findNearbyDrivers:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Broadcast ride to nearby drivers
 * Creates entries in ride_acceptance_queue for each nearby driver
 * 
 * @param {string} rideId - The ride ID
 * @param {Object} pickupCoordinates - Pickup location { lat, lng }
 * @param {number} radiusKm - Search radius in kilometers (default: 5)
 * @returns {Promise<Object>} Result with count of drivers notified
 */
export const broadcastRideToDrivers = async (rideId, pickupCoordinates, radiusKm = 5) => {
  try {
    // Gradually expand search radius if no drivers found in the initial radius.
    const searchRadii = [...new Set([
      radiusKm,
      Math.max(radiusKm * 2, radiusKm + 5),
      20
    ])];

    const uniqueDrivers = new Map();
    let searchRadiusUsed = radiusKm;

    for (const radius of searchRadii) {
      const { success, data: nearbyDrivers, error } = await findNearbyDrivers(pickupCoordinates, radius);

      if (!success) {
        return { success: false, error, driversNotified: 0 };
      }

      (nearbyDrivers || []).forEach((driver) => {
        if (driver?.driver_id && !uniqueDrivers.has(driver.driver_id)) {
          uniqueDrivers.set(driver.driver_id, driver);
        }
      });

      if (uniqueDrivers.size > 0) {
        searchRadiusUsed = radius;
        break;
      }
    }

    if (uniqueDrivers.size === 0) {
      console.log('No nearby drivers found even after expanding radius');
      return {
        success: true,
        driversNotified: 0,
        message: 'No nearby drivers available'
      };
    }

    // Create queue entries for each driver
    const queueEntries = Array.from(uniqueDrivers.values()).map(driver => ({
      ride_id: rideId,
      driver_id: driver.driver_id,
      status: 'viewing',
      created_at: new Date().toISOString()
    }));

    const { data: insertedEntries, error: insertError } = await supabase
      .from('ride_acceptance_queue')
      .insert(queueEntries)
      .select();

    if (insertError) {
      console.error('Error creating queue entries:', insertError);
      return { success: false, error: insertError.message, driversNotified: 0 };
    }

    console.log(`✅ Ride broadcast to ${insertedEntries.length} drivers (radius used: ${searchRadiusUsed}km)`);
    return { 
      success: true, 
      driversNotified: insertedEntries.length,
      drivers: Array.from(uniqueDrivers.values()),
      radiusUsed: searchRadiusUsed,
      message: `Ride broadcast to ${insertedEntries.length} driver(s) within ${searchRadiusUsed}km`
    };

  } catch (error) {
    console.error('Exception in broadcastRideToDrivers:', error);
    return { success: false, error: error.message, driversNotified: 0 };
  }
};

/**
 * Get the closest available driver
 * 
 * @param {Object} pickupCoordinates - Pickup location { lat, lng }
 * @param {number} radiusKm - Search radius in kilometers (default: 5)
 * @returns {Promise<Object>} Closest driver or null
 */
export const getClosestDriver = async (pickupCoordinates, radiusKm = 5) => {
  try {
    const { success, data: nearbyDrivers } = await findNearbyDrivers(pickupCoordinates, radiusKm);

    if (!success || !nearbyDrivers || nearbyDrivers.length === 0) {
      return { success: true, driver: null, message: 'No drivers available' };
    }

    // Drivers are already sorted by distance (from the database function)
    const closestDriver = nearbyDrivers[0];

    console.log(`✅ Closest driver: ${closestDriver.driver_name} (${closestDriver.distance_km}km away)`);
    return { success: true, driver: closestDriver };

  } catch (error) {
    console.error('Exception in getClosestDriver:', error);
    return { success: false, error: error.message, driver: null };
  }
};

/**
 * Update driver availability status
 * 
 * @param {string} driverId - Driver's user ID
 * @param {boolean} isAvailable - Availability status
 * @returns {Promise<Object>} Update result
 */
export const updateDriverAvailability = async (driverId, isAvailable) => {
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .update({ 
        is_available: isAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', driverId)
      .select()
      .single();

    if (error) {
      console.error('Error updating driver availability:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Driver availability updated: ${isAvailable ? 'Available' : 'Busy'}`);
    return { success: true, data };

  } catch (error) {
    console.error('Exception in updateDriverAvailability:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update driver online status
 * 
 * @param {string} driverId - Driver's user ID
 * @param {boolean} isOnline - Online status
 * @returns {Promise<Object>} Update result
 */
export const updateDriverOnlineStatus = async (driverId, isOnline) => {
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .update({ 
        is_online: isOnline,
        is_available: isOnline, // When going offline, also set unavailable
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', driverId)
      .select()
      .single();

    if (error) {
      console.error('Error updating driver online status:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Driver online status updated: ${isOnline ? 'Online' : 'Offline'}`);
    return { success: true, data };

  } catch (error) {
    console.error('Exception in updateDriverOnlineStatus:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get driver's current location
 * 
 * @param {string} driverId - Driver's user ID
 * @returns {Promise<Object>} Driver location data
 */
export const getDriverLocation = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .single();

    if (error) {
      console.error('Error getting driver location:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data };

  } catch (error) {
    console.error('Exception in getDriverLocation:', error);
    return { success: false, error: error.message, data: null };
  }
};

