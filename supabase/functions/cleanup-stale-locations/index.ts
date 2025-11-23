// Supabase Edge Function: cleanup-stale-locations
// Purpose: Mark drivers offline (is_available = false) when their location is stale
// Method: Safe to invoke via HTTP or schedule; configurable via STALE_MINUTES env

import { Client } from "https://deno.land/x/postgres@v0.17.1/mod.ts";

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

Deno.serve(async (req: Request) => {
  const json = (obj: Json, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405);
    }

    const STALE_MINUTES = Number(Deno.env.get('STALE_MINUTES') ?? '10');
    const cutoffISO = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();

    const databaseUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL');
    if (!databaseUrl) return json({ success: false, error: 'Database URL not configured' }, 500);

    const client = new Client(databaseUrl);
    await client.connect();

    try {
      const res = await client.queryObject<{ driver_id: string }>(
        `UPDATE public.driver_locations
         SET is_available = FALSE
         WHERE is_available = TRUE
           AND updated_at < $1
         RETURNING driver_id`,
        [cutoffISO],
      );

      return json({ success: true, markedOfflineCount: res.rows.length, cutoffISO });
    } catch (err) {
      return json({ success: false, error: err?.message || String(err) }, 500);
    } finally {
      await client.end();
    }
  } catch (err) {
    return json({ success: false, error: err?.message || String(err) }, 500);
  }
});

