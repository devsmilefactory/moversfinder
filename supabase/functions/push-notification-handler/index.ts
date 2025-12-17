import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    user_id: string;
    notification_type: string;
    priority: string;
    title: string;
    message: string;
    action_url: string | null;
    context_data: Record<string, any>;
    retry_count: number;
  };
  schema: 'public';
}

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json();
    const notification = payload.record;
    
    console.log('Processing notification:', notification.id);
    
    // Get user's FCM token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', notification.user_id)
      .single();
    
    if (profileError || !profile?.fcm_token) {
      console.log('No FCM token found for user:', notification.user_id);
      return new Response(
        JSON.stringify({ success: false, error: 'No FCM token' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Determine notification priority and sound
    const androidPriority = notification.priority === 'urgent' || notification.priority === 'high' 
      ? 'high' 
      : 'normal';
    
    const sound = notification.priority === 'urgent' || notification.priority === 'high'
      ? 'default'
      : 'notification_sound.mp3';
    
    // Build FCM message
    const fcmMessage = {
      to: profile.fcm_token,
      priority: androidPriority,
      notification: {
        title: notification.title,
        body: notification.message,
        sound: sound,
        badge: '1',
        click_action: notification.action_url || '/',
        icon: '/icon-192x192.png',
        tag: notification.notification_type,
      },
      data: {
        notification_id: notification.id,
        notification_type: notification.notification_type,
        action_url: notification.action_url || '/',
        ...notification.context_data,
      },
      webpush: {
        headers: {
          Urgency: notification.priority === 'urgent' ? 'high' : 'normal',
        },
        notification: {
          title: notification.title,
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          vibrate: notification.priority === 'urgent' || notification.priority === 'high' 
            ? [200, 100, 200] 
            : [100],
          data: {
            url: notification.action_url || '/',
          },
          actions: notification.action_url ? [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' }
          ] : [],
        },
      },
    };
    
    console.log('Sending to FCM...');
    
    // Send to FCM
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(fcmMessage),
    });
    
    const fcmResult = await fcmResponse.json();
    
    console.log('FCM Response:', fcmResult);
    
    // Update notification delivery status
    await supabase
      .from('notifications')
      .update({
        push_sent: fcmResult.success === 1,
        push_sent_at: new Date().toISOString(),
        push_delivery_confirmed: fcmResult.success === 1,
        push_delivery_confirmed_at: fcmResult.success === 1 ? new Date().toISOString() : null,
        push_error: fcmResult.failure === 1 ? JSON.stringify(fcmResult.results) : null,
        retry_count: notification.retry_count || 0,
      })
      .eq('id', notification.id);
    
    // Log delivery attempt
    await supabase
      .from('notification_delivery_log')
      .insert({
        notification_id: notification.id,
        attempt_number: (notification.retry_count || 0) + 1,
        delivery_method: 'push',
        success: fcmResult.success === 1,
        error_message: fcmResult.failure === 1 ? JSON.stringify(fcmResult.results) : null,
      });
    
    return new Response(
      JSON.stringify({ success: true, fcm_result: fcmResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
