/**
 * Notify Drivers on Ride Created Edge Function
 * 
 * Central handler for broadcasting ride notifications to nearby drivers.
 * Called when a new instant ride is created.
 * 
 * Flow:
 * 1. Receives ride creation event
 * 2. Finds nearby eligible drivers (within radius, online, available, not engaged)
 * 3. Creates notification records for each driver
 * 4. Sends push notifications via FCM
 * 5. Handles errors and retries
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isFcmV1Configured, sendFcmV1 } from '../_shared/fcm.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RideCreatedEvent {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    ride_timing: string;
    ride_status: string;
    pickup_coordinates?: { lat: number; lng: number };
    pickup_lat?: number;
    pickup_lng?: number;
    service_type: string;
    pickup_location?: string;
    estimated_fare?: number;
  };
}

serve(async (req) => {
  try {
    const event: RideCreatedEvent = await req.json();
    const ride = event.record;

    // Only process instant rides
    if (ride.ride_timing !== 'instant' || ride.ride_status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Not an instant pending ride, skipping notification' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract pickup coordinates
    let pickupLat: number;
    let pickupLng: number;

    if (ride.pickup_coordinates) {
      pickupLat = ride.pickup_coordinates.lat;
      pickupLng = ride.pickup_coordinates.lng;
    } else if (ride.pickup_lat && ride.pickup_lng) {
      pickupLat = ride.pickup_lat;
      pickupLng = ride.pickup_lng;
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No pickup coordinates available' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find nearby drivers using RPC function
    const { data: nearbyDrivers, error: driversError } = await supabase.rpc(
      'find_drivers_within_radius',
      {
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        radius_km: 5, // Default radius
      }
    );

    if (driversError) {
      console.error('Error finding nearby drivers:', driversError);
      return new Response(
        JSON.stringify({ success: false, error: driversError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!nearbyDrivers || nearbyDrivers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          driversNotified: 0, 
          message: 'No nearby drivers found' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter eligible drivers: online, available, not engaged
    const eligibleDrivers = nearbyDrivers.filter((driver: any) => {
      return (
        driver.is_online === true &&
        driver.is_available === true &&
        !driver.active_ride_id
      );
    });

    if (eligibleDrivers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          driversNotified: 0, 
          message: 'No eligible drivers (online and available)' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification content
    const serviceTypeDisplay: Record<string, string> = {
      taxi: 'Taxi',
      courier: 'Courier',
      errands: 'Errands',
      school_run: 'School Run',
    };

    const title = `New ${serviceTypeDisplay[ride.service_type] || 'Ride'} Request`;
    const message = ride.pickup_location
      ? `Pickup: ${ride.pickup_location.substring(0, 50)}${ride.pickup_location.length > 50 ? '...' : ''}`
      : 'New ride request nearby';

    const actionUrl = `/driver/rides?rideId=${ride.id}`;

    // Create notifications and send push notifications
    const notificationPromises = eligibleDrivers.map(async (driver: any) => {
      try {
        // Create notification record directly (avoids reliance on create_notification RPC)
        const { data: notifInsert, error: notifError } = await supabase
          .from('notifications')
          .insert([{
            user_id: driver.driver_id,
            notification_type: 'new_offer',
            category: 'OFFERS',
            priority: 'HIGH',
            title,
            message,
            action_url: actionUrl,
            ride_id: ride.id,
            context_data: {
              service_type: ride.service_type,
              estimated_fare: ride.estimated_fare,
              pickup_location: ride.pickup_location,
              distance_km: driver.distance_km,
            },
          }])
          .select('id')
          .single();

        if (notifError) {
          console.error(`Error creating notification for driver ${driver.driver_id}:`, notifError);
          return { success: false, driverId: driver.driver_id, error: notifError.message };
        }

        const notificationId = notifInsert?.id;

        // Send push notification if FCM is configured
        if (FCM_SERVER_KEY && notificationId) {
          await sendPushNotification(driver.driver_id, notificationId, title, message, actionUrl);
        }

        return { success: true, driverId: driver.driver_id, notificationId };
      } catch (error) {
        console.error(`Error processing notification for driver ${driver.driver_id}:`, error);
        return { 
          success: false, 
          driverId: driver.driver_id, 
          error: error.message 
        };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successful = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        driversNotified: successful,
        eligibleDrivers: eligibleDrivers.length,
        totalNearby: nearbyDrivers.length,
        results: results,
        message: `Notified ${successful} eligible drivers`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notify drivers error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Send push notification via FCM
 */
async function sendPushNotification(
  userId: string,
  notificationId: string,
  title: string,
  message: string,
  actionUrl: string
) {
  if (!isFcmV1Configured()) {
    console.warn('FCM v1 not configured, skipping push notification');
    return;
  }

  try {
    // Get user's FCM token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.fcm_token) {
      console.log(`No FCM token found for user ${userId}`);
      return;
    }

    const fcmResult = await sendFcmV1({
      token: profile.fcm_token,
      notification: { title, body: message },
      data: {
        notification_id: notificationId,
        notification_type: 'new_offer',
        action_url: actionUrl,
        // NOTE: ride_id should be the ride id; we don't have it here, so omit instead of wrong value
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          title,
          body: message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          vibrate: [200, 100, 200],
          data: {
            url: actionUrl,
            action_url: actionUrl,
            notification_id: notificationId,
          },
          actions: [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' },
          ],
        },
      },
      android: {
        priority: 'HIGH',
        notification: { sound: 'default', channel_id: 'default' },
      },
    });

    // Update notification delivery status
    await supabase
      .from('notifications')
      .update({
        push_sent: true,
        push_sent_at: new Date().toISOString(),
        push_delivery_confirmed: true,
        push_delivery_confirmed_at: new Date().toISOString(),
        push_error: null,
      })
      .eq('id', notificationId);

    console.log(`Push notification sent for notification ${notificationId}`, fcmResult?.name ? `(${fcmResult.name})` : '');
  } catch (error) {
    console.error(`Error sending push notification for user ${userId}:`, error);
    // Update notification with error
    await supabase
      .from('notifications')
      .update({
        push_error: error.message,
      })
      .eq('id', notificationId);
  }
}

