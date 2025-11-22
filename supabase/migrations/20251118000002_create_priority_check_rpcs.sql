-- Migration: Create priority check RPC functions
-- These functions check for active instant rides and imminent scheduled rides

-- Drop existing functions first (they have different return types)
DROP FUNCTION IF EXISTS get_active_instant_ride(UUID);
DROP FUNCTION IF EXISTS get_imminent_scheduled_rides(UUID, INT);
DROP FUNCTION IF EXISTS activate_scheduled_ride(UUID, UUID);

-- Function to get active instant ride for a driver
CREATE OR REPLACE FUNCTION get_active_instant_ride(p_driver_id UUID)
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
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.driver_id,
    'ACTIVE'::TEXT AS status_group,
    CASE
      WHEN r.ride_status = 'accepted' THEN 'OFFER_ACCEPTED'
      WHEN r.ride_status = 'driver_on_way' THEN 'DRIVER_ON_THE_WAY'
      WHEN r.ride_status = 'driver_arrived' THEN 'DRIVER_ARRIVED'
      WHEN r.ride_status = 'trip_started' THEN 'TRIP_STARTED'
      ELSE 'NONE'
    END::TEXT AS driver_state,
    UPPER(r.service_type)::TEXT AS ride_type,
    'INSTANT'::TEXT AS schedule_type,
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
    NULL::FLOAT AS distance_to_driver_km,
    r.created_at,
    r.scheduled_datetime AS start_time,
    NULL::INT AS total_trips,
    NULL::INT AS trips_done,
    NULL::INT AS trips_remaining,
    NULL::INT AS trips_cancelled,
    r.estimated_cost,
    FALSE AS has_unread_notifications,
    p.name AS passenger_name,
    p.phone AS passenger_phone,
    p.email AS passenger_email,
    r.special_instructions,
    COALESCE(r.number_of_trips, 1) AS number_of_trips,
    COALESCE(r.number_of_tasks, 0) AS number_of_tasks,
    r.package_size,
    NULL::TEXT AS booking_type, -- Column doesn't exist
    NULL::UUID AS batch_id, -- Column doesn't exist
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
  WHERE r.driver_id = p_driver_id
    AND r.ride_timing = 'instant'
    AND r.ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')
  ORDER BY
    CASE r.ride_status
      WHEN 'trip_started' THEN 1
      WHEN 'driver_arrived' THEN 2
      WHEN 'driver_on_way' THEN 3
      WHEN 'accepted' THEN 4
      ELSE 5
    END
  LIMIT 1;
END;
$$;

-- Function to get imminent scheduled rides
CREATE OR REPLACE FUNCTION get_imminent_scheduled_rides(
  p_driver_id UUID,
  p_window_minutes INT DEFAULT 30
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
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.driver_id,
    CASE
      WHEN r.ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started') THEN 'ACTIVE'
      ELSE 'AVAILABLE'
    END::TEXT AS status_group,
    CASE
      WHEN r.ride_status = 'accepted' THEN 'OFFER_ACCEPTED'
      WHEN r.ride_status = 'driver_on_way' THEN 'DRIVER_ON_THE_WAY'
      WHEN r.ride_status = 'driver_arrived' THEN 'DRIVER_ARRIVED'
      WHEN r.ride_status = 'trip_started' THEN 'TRIP_STARTED'
      ELSE 'NONE'
    END::TEXT AS driver_state,
    UPPER(r.service_type)::TEXT AS ride_type,
    CASE
      WHEN r.ride_timing = 'scheduled_single' THEN 'SCHEDULED'
      WHEN r.ride_timing IN ('recurring', 'scheduled_recurring') THEN 'RECURRING'
      ELSE 'SCHEDULED'
    END::TEXT AS schedule_type,
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
    NULL::FLOAT AS distance_to_driver_km,
    r.created_at,
    r.scheduled_datetime AS start_time,
    COALESCE(rts.total_trips, 0) AS total_trips,
    COALESCE(rts.trips_completed, 0) AS trips_done,
    COALESCE(rts.total_trips - rts.trips_completed - rts.trips_cancelled, 0) AS trips_remaining,
    COALESCE(rts.trips_cancelled, 0) AS trips_cancelled,
    r.estimated_cost,
    FALSE AS has_unread_notifications,
    p.name AS passenger_name,
    p.phone AS passenger_phone,
    p.email AS passenger_email,
    r.special_instructions,
    COALESCE(r.number_of_trips, 1) AS number_of_trips,
    COALESCE(r.number_of_tasks, 0) AS number_of_tasks,
    r.package_size,
    NULL::TEXT AS booking_type, -- Column doesn't exist
    NULL::UUID AS batch_id, -- Column doesn't exist
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
  LEFT JOIN recurring_trip_series rts ON r.id = rts.ride_id
  WHERE r.driver_id = p_driver_id
    AND r.ride_timing IN ('scheduled_single', 'recurring', 'scheduled_recurring')
    AND r.ride_status NOT IN ('completed', 'cancelled')
    AND r.scheduled_datetime IS NOT NULL
    AND r.scheduled_datetime BETWEEN NOW() AND (NOW() + (p_window_minutes || ' minutes')::INTERVAL)
  ORDER BY r.scheduled_datetime ASC;
END;
$$;

-- Function to activate a scheduled ride
CREATE OR REPLACE FUNCTION activate_scheduled_ride(
  p_ride_id UUID,
  p_driver_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_ride_count INT;
  v_ride_exists BOOLEAN;
BEGIN
  -- Check if ride exists and belongs to this driver
  SELECT EXISTS(
    SELECT 1 FROM rides
    WHERE id = p_ride_id AND driver_id = p_driver_id
  ) INTO v_ride_exists;

  IF NOT v_ride_exists THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Ride not found or does not belong to this driver'
    );
  END IF;

  -- Check if driver has any active rides
  SELECT COUNT(*) INTO v_active_ride_count
  FROM rides
  WHERE driver_id = p_driver_id
    AND ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');

  IF v_active_ride_count > 0 THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'You have an active ride. Please complete it before activating another ride.'
    );
  END IF;

  -- Activate the ride
  UPDATE rides
  SET
    ride_status = 'accepted',
    updated_at = NOW()
  WHERE id = p_ride_id AND driver_id = p_driver_id;

  -- Return success
  RETURN json_build_object(
    'success', TRUE,
    'ride_id', p_ride_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_instant_ride TO authenticated;
GRANT EXECUTE ON FUNCTION get_imminent_scheduled_rides TO authenticated;
GRANT EXECUTE ON FUNCTION activate_scheduled_ride TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_active_instant_ride IS 'Get the current active instant ride for a driver';
COMMENT ON FUNCTION get_imminent_scheduled_rides IS 'Get scheduled/recurring rides starting within specified window';
COMMENT ON FUNCTION activate_scheduled_ride IS 'Activate a scheduled ride if no other active rides exist';
