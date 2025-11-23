// Supabase Edge Function: expire-rides
// Purpose: Expire stale pending rides for both instant and scheduled bookings
// Method: Safe to invoke via HTTP or schedule; no input body required

import { Client } from "https://deno.land/x/postgres@v0.17.1/mod.ts";

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

Deno.serve(async (req: Request) => {
  const json = (obj: Json, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405);
    }

    const INSTANT_TTL_MINUTES = Number(Deno.env.get('INSTANT_TTL_MINUTES') ?? '15');
    const SCHEDULED_LEEWAY_MINUTES = Number(Deno.env.get('SCHEDULED_LEEWAY_MINUTES') ?? '15');

    const now = Date.now();
    const instantCutoffISO = new Date(now - INSTANT_TTL_MINUTES * 60_000).toISOString();
    const scheduledCutoffISO = new Date(now - SCHEDULED_LEEWAY_MINUTES * 60_000).toISOString();

    const databaseUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL');
    if (!databaseUrl) return json({ success: false, error: 'Database URL not configured' }, 500);

    const client = new Client(databaseUrl);
    await client.connect();

    try {
      await client.queryArray('BEGIN');

      // Expire instant rides still pending after TTL
      const expireInstant = await client.queryObject<{ id: string }>(
        `UPDATE public.rides
         SET ride_status = 'expired', status_updated_at = NOW()
         WHERE ride_status = 'pending'
           AND ride_timing = 'instant'
           AND created_at < $1
         RETURNING id`,
        [instantCutoffISO],
      );

      // Expire scheduled rides (single/recurring) that are past scheduled time + leeway
      const expireScheduled = await client.queryObject<{ id: string }>(
        `UPDATE public.rides
         SET ride_status = 'expired', status_updated_at = NOW()
         WHERE ride_status = 'pending'
           AND ride_timing IN ('scheduled_single','scheduled_recurring')
           AND scheduled_datetime IS NOT NULL
           AND scheduled_datetime < $1
         RETURNING id`,
        [scheduledCutoffISO],
      );

      await client.queryArray('COMMIT');

      return json({
        success: true,
        expiredInstantCount: expireInstant.rows.length,
        expiredScheduledCount: expireScheduled.rows.length,
        instantCutoffISO,
        scheduledCutoffISO,
      });
    } catch (err) {
      try { await client.queryArray('ROLLBACK'); } catch { /* ignore */ }
      return json({ success: false, error: err?.message || String(err) }, 500);
    } finally {
      await client.end();
    }
  } catch (err) {
    return json({ success: false, error: err?.message || String(err) }, 500);
  }
});

