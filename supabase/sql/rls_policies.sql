-- RLS Policies for TaxiCab core tables (Draft)
-- NOTE: Apply with caution in non-production or via migration review.
-- This file outlines recommended Row Level Security (RLS) policies.

-- RIDES ----------------------------------------------------------------------
ALTER TABLE IF EXISTS public.rides ENABLE ROW LEVEL SECURITY;

-- Passengers can insert their own rides
DROP POLICY IF EXISTS rides_insert_own ON public.rides;
CREATE POLICY rides_insert_own ON public.rides
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Passengers can select their rides; Drivers can select rides assigned to them
DROP POLICY IF EXISTS rides_select_own_or_assigned ON public.rides;
CREATE POLICY rides_select_own_or_assigned ON public.rides
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = driver_id);

-- Passengers may update their own rides while pending (e.g., cancel)
DROP POLICY IF EXISTS rides_update_passenger_pending ON public.rides;
CREATE POLICY rides_update_passenger_pending ON public.rides
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND ride_status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Drivers may update rides assigned to them (status transitions enforced in app/edge)
DROP POLICY IF EXISTS rides_update_assigned_driver ON public.rides;
CREATE POLICY rides_update_assigned_driver ON public.rides
  FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- RIDE_OFFERS ----------------------------------------------------------------
ALTER TABLE IF EXISTS public.ride_offers ENABLE ROW LEVEL SECURITY;

-- Drivers can create offers for themselves
DROP POLICY IF EXISTS offers_insert_own ON public.ride_offers;
CREATE POLICY offers_insert_own ON public.ride_offers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_id);

-- Drivers can view their offers; Passengers can view offers for their rides
DROP POLICY IF EXISTS offers_select_scoped ON public.ride_offers;
CREATE POLICY offers_select_scoped ON public.ride_offers
  FOR SELECT TO authenticated
  USING (
    auth.uid() = driver_id
    OR ride_id IN (SELECT id FROM public.rides WHERE user_id = auth.uid())
  );

-- Drivers can update their own offers (e.g., withdraw)
DROP POLICY IF EXISTS offers_update_own ON public.ride_offers;
CREATE POLICY offers_update_own ON public.ride_offers
  FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- DRIVER_LOCATIONS ------------------------------------------------------------
ALTER TABLE IF EXISTS public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drivers can upsert their own location
DROP POLICY IF EXISTS locations_upsert_own ON public.driver_locations;
CREATE POLICY locations_upsert_own ON public.driver_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS locations_update_own ON public.driver_locations;
CREATE POLICY locations_update_own ON public.driver_locations
  FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Anyone authenticated can read online drivers (adjust as needed)
DROP POLICY IF EXISTS locations_select_any ON public.driver_locations;
CREATE POLICY locations_select_any ON public.driver_locations
  FOR SELECT TO authenticated
  USING (true);

-- NOTES ----------------------------------------------------------------------
-- 1) Edge Functions use the service role and bypass RLS automatically.
-- 2) Application code should continue to enforce state transition rules.
-- 3) For stricter data exposure, narrow SELECT on driver_locations and rides as required.

