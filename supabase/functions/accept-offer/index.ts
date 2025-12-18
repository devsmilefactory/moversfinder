// Supabase Edge Function: accept-offer
// Atomic acceptance of a driver offer with rejection of competing offers
// Input: { offer_id: string }

import { Client } from "https://deno.land/x/postgres@v0.17.1/mod.ts";

Deno.serve(async (req: Request) => {
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
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { offer_id } = await req.json().catch(() => ({}));
    if (!offer_id || typeof offer_id !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Missing or invalid offer_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const databaseUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL');
    if (!databaseUrl) {
      return new Response(JSON.stringify({ success: false, error: 'Database URL not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const client = new Client(databaseUrl);
    await client.connect();

    try {
      // Start transaction
      await client.queryArray('BEGIN');

      // Lock the offer and associated ride row for update to prevent race conditions
      const offerRes = await client.queryObject<{ id: string; ride_id: string; driver_id: string; offer_status: string; quoted_price: number }>(
        `SELECT id, ride_id, driver_id, offer_status, quoted_price FROM public.ride_offers WHERE id = $1 FOR UPDATE`,
        [offer_id]
      );
      if (offerRes.rows.length === 0) {
        await client.queryArray('ROLLBACK');
        return new Response(JSON.stringify({ success: false, error: 'Offer not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const offer = offerRes.rows[0];
      if (offer.offer_status !== 'pending') {
        await client.queryArray('ROLLBACK');
        return new Response(JSON.stringify({ success: false, error: 'Offer is not pending' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const rideRes = await client.queryObject<{ id: string; ride_status: string }>(
        `SELECT id, ride_status FROM public.rides WHERE id = $1 FOR UPDATE`,
        [offer.ride_id]
      );
      if (rideRes.rows.length === 0) {
        await client.queryArray('ROLLBACK');
        return new Response(JSON.stringify({ success: false, error: 'Ride not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const rideRow = rideRes.rows[0];
      if (rideRow.ride_status !== 'pending') {
        await client.queryArray('ROLLBACK');
        return new Response(JSON.stringify({ success: false, error: 'Ride is no longer pending' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check for driver concurrency: cannot have more than one active instant ride
      const activeRideCountRes = await client.queryObject<{ count: string }>(
        `SELECT COUNT(*) as count FROM public.rides 
         WHERE driver_id = $1 
         AND ride_timing = 'instant' 
         AND ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')`,
        [offer.driver_id]
      );
      const activeCount = parseInt(activeRideCountRes.rows[0].count, 10);
      if (activeCount > 0) {
        await client.queryArray('ROLLBACK');
        return new Response(JSON.stringify({ success: false, error: 'Driver already has an active instant ride' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Accept chosen offer
      const acceptedOfferRes = await client.queryObject(
        `UPDATE public.ride_offers SET offer_status = 'accepted', responded_at = NOW() WHERE id = $1 RETURNING *`,
        [offer.id]
      );
      const acceptedOffer = (acceptedOfferRes.rows as any[])[0];

      // Update ride
      const updatedRideRes = await client.queryObject(
        `UPDATE public.rides SET ride_status = 'accepted', driver_id = $1, fare = $2, status_updated_at = NOW() WHERE id = $3 RETURNING *`,
        [offer.driver_id, offer.quoted_price, offer.ride_id]
      );
      const updatedRide = (updatedRideRes.rows as any[])[0];

      // Reject competing pending offers
      await client.queryArray(
        `UPDATE public.ride_offers SET offer_status = 'rejected', responded_at = NOW() WHERE ride_id = $1 AND id <> $2 AND offer_status = 'pending'`,
        [offer.ride_id, offer.id]
      );

      // Prepare realtime notifications
      const pickupText = (updatedRide?.pickup_address as string) || (updatedRide?.pickup_location as string) || 'pickup location';
      const dropoffText = (updatedRide?.dropoff_address as string) || (updatedRide?.dropoff_location as string) || 'destination';

      // Collect rejected drivers to notify
      const rejectedDriversRes = await client.queryObject<{ driver_id: string }>(
        `SELECT driver_id FROM public.ride_offers WHERE ride_id = $1 AND id <> $2 AND offer_status = 'rejected'`,
        [offer.ride_id, offer.id]
      );

      const notifications: Array<{ user_id: string; title: string; message: string; type: string; notification_type: string; category: string; priority: string; action_url: string }> = [];

      // Notify other drivers who were not accepted
      for (const row of rejectedDriversRes.rows) {
        const driverId = (row as any).driver_id as string;
        if (driverId && driverId !== offer.driver_id) {
          notifications.push({
            user_id: driverId,
            title: 'Ride accepted by another driver',
            message: `The ride to ${dropoffText} has been accepted by another driver.`,
            type: 'ride',
            notification_type: 'OFFER_REJECTED',
            category: 'OFFERS',
            priority: 'NORMAL',
            action_url: `/driver/rides?tab=available`
          });
        }
      }

      if (notifications.length > 0) {
        await client.queryArray(
          `INSERT INTO public.notifications (user_id, title, message, type, notification_type, category, priority, action_url, created_at)
           SELECT 
             (j->>'user_id')::uuid, 
             j->>'title', 
             j->>'message', 
             j->>'type', 
             (j->>'notification_type')::notification_type,
             (j->>'category')::notification_category,
             (j->>'priority')::notification_priority,
             j->>'action_url',
             NOW()
           FROM json_array_elements($1::json) AS j`,
          [JSON.stringify(notifications)]
        );
      }

      await client.queryArray('COMMIT');

      return new Response(JSON.stringify({ success: true, ride: updatedRide, acceptedOffer }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      try { await client.queryArray('ROLLBACK'); } catch (_) {}
      return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } finally {
      await client.end();
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

