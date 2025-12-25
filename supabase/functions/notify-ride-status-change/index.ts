/**
 * Notify Ride Status Change Edge Function
 * 
 * Central handler for ride status change notifications.
 * Called when a ride status is updated.
 * 
 * Flow:
 * 1. Receives ride status update event
 * 2. Determines notification recipient based on status
 * 3. Creates notification record
 * 4. Sends push notification via FCM
 * 5. Handles errors and retries
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isFcmV1Configured, sendFcmV1 } from '../_shared/fcm.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RideStatusChangeEvent {
  type: 'UPDATE';
  table: string;
  record: {
    id: string;
    ride_status: string;
    user_id: string;
    driver_id?: string;
    cancelled_by?: string;
    service_type?: string;
  };
  old_record: {
    ride_status: string;
  };
}

serve(async (req) => {
  try {
    const event: RideStatusChangeEvent = await req.json();
    const ride = event.record;
    const oldStatus = event.old_record?.ride_status;

    // Only process if status actually changed
    if (oldStatus === ride.ride_status) {
      return new Response(
        JSON.stringify({ success: true, message: 'Status unchanged, skipping' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine notification details based on status
    let notificationType: string;
    let category: string;
    let priority: string;
    let title: string;
    let message: string;
    let recipientId: string;
    let actionUrl: string;

    switch (ride.ride_status) {
      case 'accepted':
        // Driver's bid was accepted
        notificationType = 'offer_accepted';
        category = 'ride_progress';
        priority = 'high';
        title = 'Ride Accepted';
        message = 'Your ride has been accepted! Start heading to the pickup location.';
        recipientId = ride.driver_id || ''; // Driver
        actionUrl = `/driver/rides?rideId=${ride.id}`;
        break;

      case 'driver_assigned':
        notificationType = 'ride_activated';
        category = 'ride_progress';
        priority = 'high';
        title = 'Driver Assigned';
        message = 'A driver has been assigned to your ride';
        recipientId = ride.user_id; // Passenger
        actionUrl = `/user/dashboard?rideId=${ride.id}`;
        break;

      case 'driver_on_way':
        // Canonical status: driver_on_way (without "the")
        notificationType = 'driver_on_the_way';
        category = 'ride_progress';
        priority = 'high';
        title = 'Driver On The Way';
        message = 'Your driver is heading to the pickup location';
        recipientId = ride.user_id; // Passenger
        actionUrl = `/user/dashboard?rideId=${ride.id}`;
        break;

      case 'driver_on_the_way':
        // Backward compatibility: also handle driver_on_the_way
        notificationType = 'driver_on_the_way';
        category = 'ride_progress';
        priority = 'high';
        title = 'Driver On The Way';
        message = 'Your driver is heading to the pickup location';
        recipientId = ride.user_id; // Passenger
        actionUrl = `/user/dashboard?rideId=${ride.id}`;
        break;

      case 'driver_arrived':
        notificationType = 'driver_arrived';
        category = 'ride_progress';
        priority = 'urgent';
        title = 'Driver Arrived';
        message = 'Your driver has arrived at the pickup location';
        recipientId = ride.user_id; // Passenger
        actionUrl = `/user/dashboard?rideId=${ride.id}`;
        break;

      case 'trip_started':
        notificationType = 'trip_started';
        category = 'ride_progress';
        priority = 'normal';
        title = 'Trip Started';
        message = 'Your trip has started';
        recipientId = ride.user_id; // Passenger
        actionUrl = `/user/dashboard?rideId=${ride.id}`;
        break;

      case 'in_progress':
        // Also handle in_progress as trip_started
        notificationType = 'trip_started';
        category = 'ride_progress';
        priority = 'normal';
        title = 'Trip Started';
        message = 'Your trip has started';
        recipientId = ride.user_id; // Passenger
        actionUrl = `/user/dashboard?rideId=${ride.id}`;
        break;

      case 'trip_completed':
        notificationType = 'trip_completed';
        category = 'ride_progress';
        priority = 'normal';
        title = 'Trip Completed';
        message = 'Your trip has been completed';
        recipientId = ride.user_id; // Passenger
        actionUrl = `/user/dashboard?rideId=${ride.id}`;
        break;

      case 'completed':
        notificationType = 'trip_completed';
        category = 'ride_progress';
        priority = 'normal';
        title = 'Trip Completed';
        message = 'Your trip has been completed';
        recipientId = ride.user_id; // Passenger
        actionUrl = `/user/dashboard?rideId=${ride.id}`;
        break;

      case 'cancelled':
        // Determine who cancelled
        if (ride.cancelled_by === 'driver') {
          notificationType = 'ride_cancelled_by_driver';
          recipientId = ride.user_id; // Passenger
          actionUrl = `/user/dashboard?rideId=${ride.id}`;
        } else if (ride.cancelled_by === 'passenger') {
          notificationType = 'ride_cancelled_by_passenger';
          recipientId = ride.driver_id || ''; // Driver
          actionUrl = `/driver/rides?rideId=${ride.id}`;
        } else {
          notificationType = 'ride_cancelled_by_system';
          // Notify both if both exist
          if (ride.user_id && ride.driver_id) {
            // Send to passenger
            await sendNotification(
              ride.user_id,
              notificationType,
              'cancellations',
              'high',
              'Ride Cancelled',
              'The ride has been cancelled',
              `/user/dashboard?rideId=${ride.id}`,
              ride.id,
              { cancelled_by: ride.cancelled_by || 'system' }
            );
            // Send to driver
            await sendNotification(
              ride.driver_id,
              notificationType,
              'cancellations',
              'high',
              'Ride Cancelled',
              'The ride has been cancelled',
              `/driver/rides?rideId=${ride.id}`,
              ride.id,
              { cancelled_by: ride.cancelled_by || 'system' }
            );
            return new Response(
              JSON.stringify({ success: true, message: 'Notifications sent to both parties' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          } else {
            recipientId = ride.user_id || ride.driver_id || '';
            actionUrl = ride.user_id 
              ? `/user/dashboard?rideId=${ride.id}`
              : `/driver/rides?rideId=${ride.id}`;
          }
        }
        category = 'cancellations';
        priority = 'high';
        title = 'Ride Cancelled';
        message = 'The ride has been cancelled';
        break;

      default:
        return new Response(
          JSON.stringify({ success: true, message: 'Unknown status, skipping notification' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (!recipientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No recipient ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send notification
    const result = await sendNotification(
      recipientId,
      notificationType,
      category,
      priority,
      title,
      message,
      actionUrl,
      ride.id,
      {
        status: ride.ride_status,
        previous_status: oldStatus,
        service_type: ride.service_type,
      }
    );

    return new Response(
      JSON.stringify({
        success: result.success,
        notificationId: result.notificationId,
        message: result.message,
      }),
      { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notify ride status change error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Send notification (create record + push)
 */
async function sendNotification(
  userId: string,
  notificationType: string,
  category: string,
  priority: string,
  title: string,
  message: string,
  actionUrl: string,
  rideId: string,
  contextData: Record<string, any> = {}
) {
  try {
    // Create notification record
    const { data: notificationId, error: notifError } = await supabase.rpc(
      'create_notification',
      {
        p_user_id: userId,
        p_notification_type: notificationType,
        p_category: category,
        p_priority: priority,
        p_title: title,
        p_message: message,
        p_action_url: actionUrl,
        p_ride_id: rideId,
        p_context_data: contextData,
      }
    );

    if (notifError) {
      console.error(`Error creating notification for user ${userId}:`, notifError);
      return { success: false, error: notifError.message };
    }

    // Send push notification if FCM v1 is configured
    if (isFcmV1Configured() && notificationId) {
      await sendPushNotification(userId, notificationId, title, message, actionUrl, priority);
    }

    return { success: true, notificationId, message: 'Notification sent' };
  } catch (error) {
    console.error(`Error sending notification for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification via FCM
 */
async function sendPushNotification(
  userId: string,
  notificationId: string,
  title: string,
  message: string,
  actionUrl: string,
  priority: string = 'normal'
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

    const isUrgent = priority === 'urgent' || priority === 'high';
    const sound = isUrgent ? 'default' : 'notification_sound.mp3';

    const fcmResult = await sendFcmV1({
      token: profile.fcm_token,
      notification: { title, body: message },
      data: {
        notification_id: notificationId,
        action_url: actionUrl,
        priority,
        sound,
      },
      webpush: {
        headers: { Urgency: isUrgent ? 'high' : 'normal' },
        notification: {
          title,
          body: message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          vibrate: isUrgent ? [200, 100, 200] : [100],
          data: { url: actionUrl, action_url: actionUrl, notification_id: notificationId },
          actions: [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' },
          ],
        },
      },
      android: {
        priority: isUrgent ? 'HIGH' : 'NORMAL',
        notification: { sound, channel_id: 'default' },
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



