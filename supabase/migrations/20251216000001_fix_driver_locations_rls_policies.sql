-- Migration: Fix driver_locations RLS policies
-- Date: 2025-12-16
-- Purpose: Allow drivers to insert/update their own location records
-- Fixes error: "new row violates row-level security policy for table driver_locations"

BEGIN;

-- Ensure RLS is enabled on driver_locations table
ALTER TABLE IF EXISTS public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Drivers can insert their own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can update their own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can read their own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Anyone can read online driver locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can manage their own location" ON public.driver_locations;

-- Policy: Drivers can insert their own location record
CREATE POLICY "Drivers can insert their own location"
    ON public.driver_locations
    FOR INSERT
    TO authenticated
    WITH CHECK (driver_id = auth.uid());

-- Policy: Drivers can update their own location record
CREATE POLICY "Drivers can update their own location"
    ON public.driver_locations
    FOR UPDATE
    TO authenticated
    USING (driver_id = auth.uid())
    WITH CHECK (driver_id = auth.uid());

-- Policy: Drivers can read their own location
CREATE POLICY "Drivers can read their own location"
    ON public.driver_locations
    FOR SELECT
    TO authenticated
    USING (driver_id = auth.uid());

-- Policy: Anyone authenticated can read online/available driver locations (for matching)
-- This allows the system to find nearby drivers for ride matching
CREATE POLICY "Anyone can read online driver locations"
    ON public.driver_locations
    FOR SELECT
    TO authenticated
    USING (
        is_online = TRUE 
        AND is_available = TRUE
    );

COMMIT;







