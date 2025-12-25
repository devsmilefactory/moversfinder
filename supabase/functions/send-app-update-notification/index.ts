/**
 * Send App Update Notification Edge Function
 * 
 * Sends push notifications when app updates are detected
 * 
 * Flow:
 * 1. Receives app update event (version change)
 * 2. Creates notification record
 * 3. Sends push notification via FCM
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isFcmV1Configured, sendFcmV1 } from '../_shared/fcm.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface AppUpdateEvent {
  user_id: string;
  new_version: string;
  current_version: string;
}

serve(async (req) => {
  try {
    const event: AppUpdateEvent = await req.json();
    
    if (!event.user_id || !event.new_version) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id and new_version required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const title = 'New Version Available';
    const message = `TaxiCab v${event.new_version} is ready! Update now for the latest features and improvements.`;
    const actionUrl = '/?update=true';

    // Create notification record
    const { data: notificationId, error: notifError } = await supabase.rpc(
      'create_notification',
      {
        p_user_id: event.user_id,
        p_notification_type: 'app_update',
        p_category: 'system',
        p_priority: 'high',
        p_title: title,
        p_message: message,
        p_action_url: actionUrl,
        p_ride_id: null,
        p_series_id: null,
        p_task_id: null,
        p_offer_id: null,
        p_context_data: {
          new_version: event.new_version,
          current_version: event.current_version || 'unknown',
          update_type: 'app_update',
        },
      }
    );

    if (notifError) {
      console.error('Error creating app update notification:', notifError);
      return new Response(
        JSON.stringify({ success: false, error: notifError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification if FCM v1 is configured
    if (isFcmV1Configured() && notificationId) {
      await sendPushNotification(event.user_id, notificationId, title, message, actionUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationId,
        message: 'App update notification sent',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send app update notification error:', error);
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
        notification_type: 'app_update',
        update_type: 'app_update',
        action_url: actionUrl,
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          title,
          body: message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          vibrate: [200, 100, 200],
          data: { url: actionUrl, action_url: actionUrl, notification_id: notificationId },
          actions: [
            { action: 'open', title: 'Update Now' },
            { action: 'close', title: 'Later' },
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

    console.log(`Push notification sent for app update ${notificationId}`, fcmResult?.name ? `(${fcmResult.name})` : '');
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



