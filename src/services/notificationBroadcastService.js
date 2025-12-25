/**
 * Notification Broadcast Service
 * Handles broadcasting notifications to drivers when rides are created
 * and sending status change notifications
 */

import { supabase } from '../lib/supabase';

/**
 * Broadcast ride notification to nearby drivers
 * Finds drivers within radius, checks if they're online and available,
 * then sends push notifications
 * 
 * @param {string} rideId - Ride ID
 * @param {Object} pickupCoordinates - Pickup location { lat, lng }
 * @param {number} radiusKm - Search radius in kilometers (default: 5)
 * @returns {Promise<Object>} Result with count of drivers notified
 */
export const broadcastRideToDrivers = async (rideId, pickupCoordinates, radiusKm = 5) => {
  try {
    if (!pickupCoordinates || !pickupCoordinates.lat || !pickupCoordinates.lng) {
      console.error('Invalid pickup coordinates');
      return { success: false, error: 'Invalid pickup coordinates', driversNotified: 0 };
    }

    // Get ride details for notification
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, service_type, pickup_location, estimated_fare, ride_timing')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) {
      console.error('Error fetching ride:', rideError);
      return { success: false, error: 'Ride not found', driversNotified: 0 };
    }

    // Find nearby drivers using RPC function
    const { data: nearbyDrivers, error: driversError } = await supabase.rpc(
      'find_drivers_within_radius',
      {
        pickup_lat: pickupCoordinates.lat,
        pickup_lng: pickupCoordinates.lng,
        radius_km: radiusKm,
      }
    );

    if (driversError) {
      console.error('Error finding nearby drivers:', driversError);
      return { success: false, error: driversError.message, driversNotified: 0 };
    }

    if (!nearbyDrivers || nearbyDrivers.length === 0) {
      console.log('No nearby drivers found');
      return { success: true, driversNotified: 0, message: 'No nearby drivers available' };
    }

    // Filter drivers: must be online and not engaged in active ride
    const eligibleDrivers = nearbyDrivers.filter((driver) => {
      // Check if driver is online
      if (!driver.is_online) return false;

      // Check if driver has an active ride
      if (driver.active_ride_id) return false;

      // Check if driver is available
      if (driver.is_available === false) return false;

      return true;
    });

    if (eligibleDrivers.length === 0) {
      console.log('No eligible drivers (online and available)');
      return { success: true, driversNotified: 0, message: 'No eligible drivers available' };
    }

    // Prepare notification content
    const serviceTypeDisplay = {
      taxi: 'Taxi',
      courier: 'Courier',
      errands: 'Errands',
      school_run: 'School Run',
    }[ride.service_type] || 'Ride';

    const title = `New ${serviceTypeDisplay} Request`;
    const message = ride.pickup_location
      ? `Pickup: ${ride.pickup_location.substring(0, 50)}${ride.pickup_location.length > 50 ? '...' : ''}`
      : 'New ride request nearby';

    // Create notifications for each eligible driver
    const notificationPromises = eligibleDrivers.map(async (driver) => {
      const actionUrl = `/driver/rides?rideId=${rideId}`;
      
      // Insert notification directly to avoid RPC enum issues
      const { data: notificationData, error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: driver.driver_id,
          notification_type: 'new_offer',
          category: 'OFFERS',
          priority: 'HIGH',
          title,
          message,
          action_url: actionUrl,
          ride_id: rideId,
          metadata: {
            service_type: ride.service_type,
            estimated_fare: ride.estimated_fare,
            pickup_location: ride.pickup_location,
            distance_km: driver.distance_km,
          },
        }])
        .select('id')
        .single();

      const notificationId = notificationData?.id;

      if (notifError) {
        console.error(`Error creating notification for driver ${driver.driver_id}:`, notifError);
        return null;
      }

      return notificationId;
    });

    const notificationIds = (await Promise.all(notificationPromises)).filter(Boolean);

    console.log(`✅ Notified ${notificationIds.length} eligible drivers (${eligibleDrivers.length} eligible out of ${nearbyDrivers.length} nearby)`);

    return {
      success: true,
      driversNotified: notificationIds.length,
      eligibleDrivers: eligibleDrivers.length,
      totalNearby: nearbyDrivers.length,
      message: `Notified ${notificationIds.length} eligible drivers`,
    };
  } catch (error) {
    console.error('Exception in broadcastRideToDrivers:', error);
    return { success: false, error: error.message, driversNotified: 0 };
  }
};

/**
 * Send ride status change notification
 * 
 * @param {string} rideId - Ride ID
 * @param {string} newStatus - New ride status
 * @param {string} userId - User ID (passenger or driver)
 * @param {Object} contextData - Additional context data
 * @returns {Promise<Object>} Result
 */
export const sendRideStatusNotification = async (
  rideId,
  newStatus,
  userId,
  contextData = {}
) => {
  try {
    // Get ride details
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, service_type, pickup_location, driver_id, user_id')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) {
      console.error('Error fetching ride:', rideError);
      return { success: false, error: 'Ride not found' };
    }

    // Determine notification type and recipient
    let notificationType;
    let notificationCategory = 'ride_progress';
    let priority = 'normal';
    let title;
    let message;
    let recipientId;

    switch (newStatus) {
      case 'driver_assigned':
        notificationType = 'ride_activated';
        priority = 'high';
        title = 'Driver Assigned';
        message = 'A driver has been assigned to your ride';
        recipientId = ride.user_id; // Passenger
        break;

      case 'driver_on_the_way':
        notificationType = 'driver_on_the_way';
        priority = 'high';
        title = 'Driver On The Way';
        message = 'Your driver is heading to the pickup location';
        recipientId = ride.user_id; // Passenger
        break;

      case 'driver_arrived':
        notificationType = 'driver_arrived';
        priority = 'urgent';
        title = 'Driver Arrived';
        message = 'Your driver has arrived at the pickup location';
        recipientId = ride.user_id; // Passenger
        break;

      case 'in_progress':
      case 'trip_started':
        notificationType = 'trip_started';
        priority = 'normal';
        title = 'Trip Started';
        message = 'Your trip has started';
        recipientId = ride.user_id; // Passenger
        break;

      case 'completed':
        notificationType = 'trip_completed';
        priority = 'normal';
        title = 'Trip Completed';
        message = 'Your trip has been completed';
        recipientId = ride.user_id; // Passenger
        break;

      case 'cancelled':
        notificationType = 'ride_cancelled_by_passenger';
        priority = 'high';
        title = 'Ride Cancelled';
        message = 'The ride has been cancelled';
        recipientId = ride.driver_id; // Driver
        break;

      default:
        // Unknown status, skip notification
        return { success: false, error: 'Unknown status' };
    }

    if (!recipientId) {
      return { success: false, error: 'No recipient ID' };
    }

    const actionUrl = `/user/dashboard?rideId=${rideId}`;

    // Create notification
    const { data: notificationId, error: notifError } = await supabase.rpc(
      'create_notification',
      {
        p_user_id: recipientId,
        p_notification_type: notificationType,
        p_category: notificationCategory,
        p_priority: priority,
        p_title: title,
        p_message: message,
        p_action_url: actionUrl,
        p_ride_id: rideId,
        p_context_data: {
          status: newStatus,
          ...contextData,
        },
      }
    );

    if (notifError) {
      console.error('Error creating status notification:', notifError);
      return { success: false, error: notifError.message };
    }

    return { success: true, notificationId };
  } catch (error) {
    console.error('Exception in sendRideStatusNotification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send active ride update notification
 * 
 * @param {string} rideId - Ride ID
 * @param {string} updateType - Type of update (e.g., 'location_update', 'eta_update')
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Result
 */
export const sendActiveRideNotification = async (
  rideId,
  updateType,
  userId,
  updateData = {}
) => {
  try {
    // Get ride details
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, service_type, ride_status, driver_id, user_id')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) {
      console.error('Error fetching ride:', rideError);
      return { success: false, error: 'Ride not found' };
    }

    // Only send notifications for active rides
    const activeStatuses = [
      'driver_assigned', 
      'driver_on_way',        // Canonical status
      'driver_on_the_way',    // Backward compatibility
      'driver_arrived', 
      'trip_started',
      'in_progress'
    ];
    if (!activeStatuses.includes(ride.ride_status)) {
      return { success: false, error: 'Ride is not active' };
    }

    let title;
    let message;
    let priority = 'normal';
    let recipientId;

    switch (updateType) {
      case 'eta_update':
        title = 'ETA Updated';
        message = updateData.eta
          ? `Updated ETA: ${updateData.eta} minutes`
          : 'Your driver\'s ETA has been updated';
        recipientId = ride.user_id; // Passenger
        break;

      case 'location_update':
        // Usually silent, but can send if significant
        title = 'Location Update';
        message = 'Your driver\'s location has been updated';
        recipientId = ride.user_id; // Passenger
        priority = 'low';
        break;

      default:
        return { success: false, error: 'Unknown update type' };
    }

    if (!recipientId) {
      return { success: false, error: 'No recipient ID' };
    }

    const actionUrl = `/user/dashboard?rideId=${rideId}`;

    // Create notification
    const { data: notificationId, error: notifError } = await supabase.rpc(
      'create_notification',
      {
        p_user_id: recipientId,
        p_notification_type: 'ride_progress',
        p_category: 'ride_progress',
        p_priority: priority,
        p_title: title,
        p_message: message,
        p_action_url: actionUrl,
        p_ride_id: rideId,
        p_context_data: {
          update_type: updateType,
          ...updateData,
        },
      }
    );

    if (notifError) {
      console.error('Error creating active ride notification:', notifError);
      return { success: false, error: notifError.message };
    }

    return { success: true, notificationId };
  } catch (error) {
    console.error('Exception in sendActiveRideNotification:', error);
    return { success: false, error: error.message };
  }
};



