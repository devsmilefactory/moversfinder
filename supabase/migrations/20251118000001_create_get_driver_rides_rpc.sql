-- Migration: Create get_driver_rides RPC function
-- This function provides a unified interface for fetching driver rides with filtering and pagination

-- Drop existing function if it exists (in case of different return type)
DROP FUNCTION IF EXISTS get_driver_rides(UUID, TEXT, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION get_driver_rides(
  p_driver_id UUID,
  p_status_group TEXT,
  p_ride_type TEXT DEFAULT NULL,
  p_schedule_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  driver_id UUID,
  status_group TEXT,
  driver_state TEXT,
  ride_type TEXT,
  schedule_type TEXT,
  pickup_lat FLOAT,
  pickup_lng FLOAT,
  pickup_address TEXT,
  pickup_location TEXT,
  dropoff_lat FLOAT,
  dropoff_lng FLOAT,
  dropoff_address TEXT,
  dropoff_location TEXT,
  distance_km FLOAT,
  distance_to_driver_km FLOAT,
  created_at TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  total_trips INT,
  trips_done INT,
  trips_remaining INT,
  trips_cancelled INT,
  estimated_cost NUMERIC,
  has_unread_notifications BOOLEAN,
  passenger_name TEXT,
  passenger_phone TEXT,
  passenger_email TEXT,
  special_instructions TEXT,
  number_of_trips INT,
  number_of_tasks INT,
  package_size TEXT,
  booking_type TEXT,
  batch_id UUID,
  ride_status TEXT,
  ride_timing TEXT,
  service_type TEXT,
  acceptance_status TEXT,
  passengers INT,
  pickup_coordinates JSONB,
  dropoff_coordinates JSONB,
  scheduled_datetime TIMESTAMP WITH TIME ZONE,
  courier_package_details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  driver_location GEOMETRY;
BEGIN
  -- Get driver's current location
  SELECT coordinates INTO driver_location
  FROM driver_locations
  WHERE driver_locations.driver_id = p_driver_id;

  -- Return rides based on status_group
  RETURN QUERY
  WITH ride_data AS (
    SELECT
      r.id,
      r.user_id,
      r.driver_id,
      -- Map to status_group
      CASE
        WHEN p_status_group = 'AVAILABLE' THEN 'AVAILABLE'
        WHEN p_status_group = 'BID' THEN 'BID'
        WHEN p_status_group = 'ACTIVE' THEN 'ACTIVE'
        WHEN p_status_group = 'COMPLETED' THEN 'COMPLETED'
        ELSE 'UNKNOWN'
      END AS status_group,
      -- Map ride_status to driver_state
      CASE
        WHEN r.ride_status = 'accepted' THEN 'OFFER_ACCEPTED'
        WHEN r.ride_status = 'driver_on_way' THEN 'DRIVER_ON_THE_WAY'
        WHEN r.ride_status = 'driver_arrived' THEN 'DRIVER_ARRIVED'
        WHEN r.ride_status = 'trip_started' THEN 'TRIP_STARTED'
        WHEN r.ride_status = 'completed' THEN 'TRIP_COMPLETED'
        WHEN r.ride_status = 'cancelled' THEN 'TRIP_CANCELLED'
        ELSE 'NONE'
      END AS driver_state,
      -- Map service_type to ride_type (uppercase)
      UPPER(r.service_type) AS ride_type,
      -- Map ride_timing to schedule_type (uppercase)
      CASE
        WHEN r.ride_timing = 'instant' THEN 'INSTANT'
        WHEN r.ride_timing = 'scheduled_single' THEN 'SCHEDULED'
        WHEN r.ride_timing IN ('recurring', 'scheduled_recurring') THEN 'RECURRING'
        ELSE 'INSTANT'
      END AS schedule_type,
      -- Extract coordinates
      CASE
        WHEN r.pickup_coordinates IS NOT NULL AND r.pickup_coordinates->>'type' = 'Point' THEN
          (r.pickup_coordinates->'coordinates'->>1)::FLOAT
        ELSE NULL
      END AS pickup_lat,
      CASE
        WHEN r.pickup_coordinates IS NOT NULL AND r.pickup_coordinates->>'type' = 'Point' THEN
          (r.pickup_coordinates->'coordinates'->>0)::FLOAT
        ELSE NULL
      END AS pickup_lng,
      r.pickup_address,
      r.pickup_location,
      CASE
        WHEN r.dropoff_coordinates IS NOT NULL AND r.dropoff_coordinates->>'type' = 'Point' THEN
          (r.dropoff_coordinates->'coordinates'->>1)::FLOAT
        ELSE NULL
      END AS dropoff_lat,
      CASE
        WHEN r.dropoff_coordinates IS NOT NULL AND r.dropoff_coordinates->>'type' = 'Point' THEN
          (r.dropoff_coordinates->'coordinates'->>0)::FLOAT
        ELSE NULL
      END AS dropoff_lng,
      r.dropoff_address,
      r.dropoff_location,
      r.distance_km,
      -- Calculate distance to driver (in km)
      CASE
        WHEN driver_location IS NOT NULL AND r.pickup_coordinates IS NOT NULL THEN
          ST_Distance(
            driver_location::geography,
            ST_SetSRID(ST_GeomFromGeoJSON(r.pickup_coordinates::text), 4326)::geography
          ) / 1000.0
        ELSE NULL
      END AS distance_to_driver_km,
      r.created_at,
      r.scheduled_datetime AS start_time,
      -- Recurring trip info (will be joined later)
      NULL::INT AS total_trips,
      NULL::INT AS trips_done,
      NULL::INT AS trips_remaining,
      NULL::INT AS trips_cancelled,
      r.estimated_cost,
      -- Check for unread notifications (will be calculated later)
      FALSE AS has_unread_notifications,
      -- Passenger info (only if ride is accepted)
      CASE WHEN r.driver_id = p_driver_id THEN p.name ELSE NULL END AS passenger_name,
      CASE WHEN r.driver_id = p_driver_id THEN p.phone ELSE NULL END AS passenger_phone,
      CASE WHEN r.driver_id = p_driver_id THEN p.email ELSE NULL END AS passenger_email,
      r.special_instructions,
      COALESCE(r.number_of_trips, 1) AS number_of_trips,
      COALESCE(r.number_of_tasks, 0) AS number_of_tasks,
      r.package_size,
      NULL::TEXT AS booking_type, -- Column doesn't exist, return NULL
      NULL::UUID AS batch_id, -- Column doesn't exist, return NULL
      r.ride_status,
      r.ride_timing,
      r.service_type,
      r.acceptance_status,
      r.passengers,
      r.pickup_coordinates,
      r.dropoff_coordinates,
      r.scheduled_datetime,
      r.courier_package_details
    FROM rides r
    LEFT JOIN profiles p ON r.user_id = p.id
    WHERE
      -- Filter by status_group
      CASE
        -- AVAILABLE: pending rides, no driver assigned, no offer from this driver
        WHEN p_status_group = 'AVAILABLE' THEN
          r.ride_status = 'pending'
          AND r.acceptance_status = 'pending'
          AND r.driver_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM ride_offers ro
            WHERE ro.ride_id = r.id AND ro.driver_id = p_driver_id
          )
          -- Apply 5km radius filter for available rides
          AND (
            driver_location IS NULL
            OR ST_DWithin(
              driver_location::geography,
              ST_SetSRID(ST_GeomFromGeoJSON(r.pickup_coordinates::text), 4326)::geography,
              5000 -- 5km in meters
            )
          )
        -- BID: rides this driver has offered on (pending offers)
        WHEN p_status_group = 'BID' THEN
          EXISTS (
            SELECT 1 FROM ride_offers ro
            WHERE ro.ride_id = r.id
            AND ro.driver_id = p_driver_id
            AND ro.offer_status = 'pending'
          )
        -- ACTIVE: rides assigned to this driver that are in progress
        WHEN p_status_group = 'ACTIVE' THEN
          r.driver_id = p_driver_id
          AND r.ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')
        -- COMPLETED: rides completed by this driver
        WHEN p_status_group = 'COMPLETED' THEN
          r.driver_id = p_driver_id
          AND r.ride_status = 'completed'
        ELSE FALSE
      END
      -- Apply ride_type filter if provided
      AND (p_ride_type IS NULL OR UPPER(r.service_type) = p_ride_type)
      -- Apply schedule_type filter if provided
      AND (
        p_schedule_type IS NULL
        OR (p_schedule_type = 'INSTANT' AND r.ride_timing = 'instant')
        OR (p_schedule_type = 'SCHEDULED' AND r.ride_timing = 'scheduled_single')
        OR (p_schedule_type = 'RECURRING' AND r.ride_timing IN ('recurring', 'scheduled_recurring'))
      )
  )
  SELECT
    rd.id,
    rd.user_id,
    rd.driver_id,
    rd.status_group,
    rd.driver_state,
    rd.ride_type,
    rd.schedule_type,
    rd.pickup_lat,
    rd.pickup_lng,
    rd.pickup_address,
    rd.pickup_location,
    rd.dropoff_lat,
    rd.dropoff_lng,
    rd.dropoff_address,
    rd.dropoff_location,
    rd.distance_km,
    rd.distance_to_driver_km,
    rd.created_at,
    rd.start_time,
    COALESCE(rts.total_trips, 0) AS total_trips,
    COALESCE(rts.trips_completed, 0) AS trips_done,
    COALESCE(rts.total_trips - rts.trips_completed - rts.trips_cancelled, 0) AS trips_remaining,
    COALESCE(rts.trips_cancelled, 0) AS trips_cancelled,
    rd.estimated_cost,
    COALESCE((
      SELECT COUNT(*) > 0
      FROM notifications n
      WHERE n.user_id = p_driver_id
      AND n.action_url LIKE '%' || rd.id::text || '%'
      AND n.is_read = FALSE
    ), FALSE) AS has_unread_notifications,
    rd.passenger_name,
    rd.passenger_phone,
    rd.passenger_email,
    rd.special_instructions,
    rd.number_of_trips,
    rd.number_of_tasks,
    rd.package_size,
    rd.booking_type,
    rd.batch_id,
    rd.ride_status,
    rd.ride_timing,
    rd.service_type,
    rd.acceptance_status,
    rd.passengers,
    rd.pickup_coordinates,
    rd.dropoff_coordinates,
    rd.scheduled_datetime,
    rd.courier_package_details
  FROM ride_data rd
  LEFT JOIN recurring_trip_series rts ON rd.id = rts.ride_id
  ORDER BY
    -- Sort by urgency for active rides
    CASE
      WHEN rd.status_group = 'ACTIVE' THEN
        CASE rd.driver_state
          WHEN 'TRIP_STARTED' THEN 1
          WHEN 'DRIVER_ARRIVED' THEN 2
          WHEN 'DRIVER_ON_THE_WAY' THEN 3
          WHEN 'OFFER_ACCEPTED' THEN 4
          ELSE 5
        END
      ELSE 6
    END,
    -- Then by scheduled time (soonest first)
    rd.start_time ASC NULLS LAST,
    -- Then by creation time (newest first)
    rd.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_driver_rides TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_driver_rides IS 'Unified function to fetch driver rides with filtering, pagination, and distance calculations';
