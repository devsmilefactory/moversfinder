// Supabase Edge Function: generate-recurring-rides
// Purpose: Generate upcoming instances for recurring ride series (scaffold)
// Notes:
// - Current app creates recurring instances client-side (see src/utils/recurringRides.js)
// - This function is a safe scaffold and NO-OP by default to avoid duplications
// - If a templates table exists in your DB, you can extend this function to generate instances

import { Client } from "https://deno.land/x/postgres@v0.17.1/mod.ts";

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

Deno.serve(async (req: Request) => {
  const json = (obj: Json, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405);
    }

    const databaseUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL');
    if (!databaseUrl) return json({ success: false, error: 'Database URL not configured' }, 500);

    const client = new Client(databaseUrl);
    await client.connect();

    try {
      // Detect if a template table exists to drive generation
      const exists = await client.queryObject<{ reg: string | null }>(
        `SELECT to_regclass('public.recurring_ride_templates') AS reg`
      );

      if (!exists.rows[0]?.reg) {
        // No templates table -> leave generation to client utilities
        return json({ success: true, generated: 0, message: 'No recurring_ride_templates table found; generation handled client-side.' });
      }

      // If you manage recurring templates server-side, implement generation here.
      // Example approach:
      // 1) Read active templates within horizon
      // 2) Compute next occurrences (e.g., next 30 days)
      // 3) Insert rides that do not yet exist for those occurrences
      // 4) Return counts

      return json({ success: true, generated: 0, message: 'Templates table present but generation logic not configured.' });
    } catch (err) {
      return json({ success: false, error: err?.message || String(err) }, 500);
    } finally {
      await client.end();
    }
  } catch (err) {
    return json({ success: false, error: err?.message || String(err) }, 500);
  }
});

