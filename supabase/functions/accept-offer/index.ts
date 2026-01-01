// Supabase Edge Function: accept-offer
// Canonical acceptance entrypoint:
// - Verifies passenger JWT
// - Calls the atomic DB RPC: public.accept_offer_atomic(p_offer_id, p_passenger_id)
// - Notifies passenger + rejected drivers (driver accepted notification is handled by ride_status triggers)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req: Request) => {
  // CORS headers for browser access (dynamic to support custom headers)
  const origin = req.headers.get('Origin') ?? '*';
  const requestACHeaders = req.headers.get('Access-Control-Request-Headers');
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': requestACHeaders ?? 'authorization, x-client-info, apikey, content-type, x-platform-id',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!jwt) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization Bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !authData?.user?.id) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const offer_id = body?.offer_id || body?.offerId;
    if (!offer_id || typeof offer_id !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Missing or invalid offer_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const passengerId = authData.user.id;

    // Call canonical atomic RPC
    const { data: acceptData, error: acceptError } = await supabaseAdmin.rpc('accept_offer_atomic', {
      p_offer_id: offer_id,
      p_passenger_id: passengerId,
    });

    if (acceptError) {
      console.error('accept_offer_atomic error:', acceptError);
      return new Response(JSON.stringify({ success: false, error: acceptError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!acceptData?.success) {
      return new Response(JSON.stringify({ success: false, error: acceptData?.error || 'Offer acceptance failed', data: acceptData }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rideId: string = acceptData.ride_id;
    const driverId: string = acceptData.driver_id;
    const rejectedDriverIds: string[] = Array.isArray(acceptData.rejected_driver_ids) ? acceptData.rejected_driver_ids : [];

    // Fetch ride snapshot to return to caller and for notification content
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('rides')
      .select('id, user_id, driver_id, service_type, pickup_address, pickup_location, dropoff_address, dropoff_location')
      .eq('id', rideId)
      .single();

    if (rideError) {
      console.warn('Could not fetch ride snapshot:', rideError);
    }

    const dropoffText = (ride?.dropoff_address as string) || (ride?.dropoff_location as string) || 'destination';

    // Notify passenger (explicit assignment notification)
    // NOTE: we do NOT notify the accepted driver here because ride_status triggers already do that on 'accepted'.
    try {
      await supabaseAdmin.rpc('create_notification', {
        p_user_id: passengerId,
        p_notification_type: 'ride_activated',
        p_category: 'RIDE_PROGRESS',
        p_priority: 'HIGH',
        p_title: 'Driver Assigned',
        p_message: 'A driver has been assigned to your ride!',
        p_action_url: '/rides?tab=active',
        p_ride_id: rideId,
        p_series_id: null,
        p_task_id: null,
        p_offer_id: offer_id,
        p_context_data: { driver_id: driverId },
      });
    } catch (e) {
      console.warn('Passenger notification failed:', e?.message || e);
    }

    // Notify rejected drivers (only those who actually had offers)
    if (rejectedDriverIds.length > 0) {
      await Promise.all(
        rejectedDriverIds
          .filter((id) => id && id !== driverId)
          .map(async (rejectedDriverId) => {
            try {
              await supabaseAdmin.rpc('create_notification', {
                p_user_id: rejectedDriverId,
                p_notification_type: 'offer_rejected',
                p_category: 'OFFERS',
                p_priority: 'NORMAL',
                p_title: 'Ride accepted by another driver',
                p_message: `The ride to ${dropoffText} has been accepted by another driver.`,
                p_action_url: '/driver/rides?tab=available',
                p_ride_id: rideId,
                p_series_id: null,
                p_task_id: null,
                p_offer_id: offer_id,
                p_context_data: { ride_id: rideId },
              });
            } catch (e) {
              console.warn('Rejected-driver notification failed:', { rejectedDriverId, error: e?.message || e });
            }
          })
      );
    }

    return new Response(JSON.stringify({ success: true, data: acceptData, ride }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('accept-offer error:', err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

