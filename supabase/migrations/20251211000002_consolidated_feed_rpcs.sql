-- Consolidated Feed RPCs
-- Date: 2025-12-11
-- Purpose: Optimized RPCs for passenger and driver feeds with comprehensive data support

-- ============================================================================
-- PASSENGER FEED RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_passenger_feed(
    p_user_id uuid, 
    p_feed_category text, 
    p_service_type text DEFAULT NULL::text, 
    p_limit integer DEFAULT 10, 
    p_offset integer DEFAULT 0
)
 RETURNS TABLE(
    id uuid, 
    state text, 
    execution_sub_state text, 
    ride_status text, 
    status text, 
    service_type text, 
    ride_timing text, 
    pickup_address text, 
    pickup_coordinates jsonb, 
    dropoff_address text, 
    dropoff_coordinates jsonb, 
    estimated_cost numeric, 
    fare numeric, 
    scheduled_datetime timestamp with time zone, 
    created_at timestamp with time zone, 
    driver_name text, 
    driver_phone text, 
    driver_rating numeric, 
    vehicle_info jsonb, 
    offer_count integer, 
    tasks_total integer, 
    tasks_done integer, 
    tasks_left integer, 
    series_id uuid, 
    series_occurrence_index integer, 
    needs_activation boolean, 
    driver_id uuid, 
    number_of_passengers integer, 
    passenger_count integer, 
    special_requests text, 
    special_instructions text, 
    courier_packages text, 
    package_size text, 
    vehicle_type text, 
    errand_tasks jsonb, 
    fare_breakdown jsonb
)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH offer_counts AS (
    SELECT 
      ride_id,
      COUNT(*)::INT as count
    FROM ride_offers
    WHERE offer_status = 'pending'
    GROUP BY ride_id
  )
  SELECT 
    r.id,
    COALESCE(r.state::text, r.ride_status) as state,
    r.execution_sub_state::text,
    r.ride_status,
    r.status,
    r.service_type,
    r.ride_timing,
    r.pickup_address,
    r.pickup_coordinates,
    r.dropoff_address,
    r.dropoff_coordinates,
    r.estimated_cost,
    r.fare,
    r.scheduled_datetime,
    r.created_at,
    p.name AS driver_name,
    p.phone AS driver_phone,
    NULL::NUMERIC AS driver_rating,
    CASE 
      WHEN v.id IS NOT NULL THEN
        jsonb_build_object(
          'make', v.make,
          'model', v.model,
          'color', v.color,
          'plate_number', v.registration_number,
          'vehicle_type', v.vehicle_type
        )
      ELSE NULL
    END AS vehicle_info,
    COALESCE(oc.count, 0) AS offer_count,
    r.tasks_total,
    r.tasks_done,
    r.tasks_left,
    r.series_id,
    r.series_occurrence_index,
    r.needs_activation,
    r.driver_id,
    r.number_of_passengers,
    r.number_of_passengers AS passenger_count,
    r.special_requests,
    r.special_requests AS special_instructions,
    r.courier_packages,
    r.package_size,
    r.vehicle_type,
    r.errand_tasks,
    r.fare_breakdown
  FROM rides r
  LEFT JOIN profiles p ON r.driver_id = p.id
  LEFT JOIN vehicles v ON r.vehicle_id = v.id
  LEFT JOIN offer_counts oc ON oc.ride_id = r.id
  WHERE
    r.user_id = p_user_id
    AND (
      CASE 
        -- Pending: only rides with no driver assigned (mutually exclusive with active)
        WHEN p_feed_category = 'pending' THEN r.ride_status = 'pending' AND r.driver_id IS NULL
        -- Active: rides with accepted status OR rides with driver assigned (even if status is pending)
        WHEN p_feed_category = 'active' THEN 
          r.ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')
          OR (r.ride_status = 'pending' AND r.driver_id IS NOT NULL)
        WHEN p_feed_category = 'completed' THEN r.ride_status IN ('completed', 'trip_completed')
        WHEN p_feed_category = 'cancelled' THEN r.ride_status = 'cancelled'
        ELSE FALSE
      END
    )
    AND (p_service_type IS NULL OR r.service_type = p_service_type)
  ORDER BY
    CASE WHEN p_feed_category = 'active' THEN r.scheduled_datetime END ASC NULLS LAST,
    r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- ============================================================================
-- DRIVER FEED RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_driver_feed(
    p_driver_id uuid, 
    p_feed_category text, 
    p_service_type text DEFAULT NULL::text, 
    p_ride_timing text DEFAULT NULL::text, 
    p_limit integer DEFAULT 10, 
    p_offset integer DEFAULT 0
)
 RETURNS TABLE(
    id uuid, 
    series_id uuid, 
    user_id uuid, 
    driver_id uuid, 
    service_type text, 
    ride_timing text, 
    pickup_address text, 
    pickup_coordinates jsonb, 
    dropoff_address text, 
    dropoff_coordinates jsonb, 
    distance_km numeric, 
    estimated_cost numeric, 
    scheduled_datetime timestamp with time zone, 
    created_at timestamp with time zone, 
    ride_status text, 
    state text, 
    execution_sub_state text, 
    acceptance_status text, 
    special_instructions text, 
    needs_activation boolean, 
    passenger_name text, 
    passenger_phone text, 
    passenger_count integer, 
    pickup_time timestamp with time zone, 
    distance_to_driver_km double precision, 
    is_series boolean, 
    total_trips integer, 
    completed_trips integer, 
    remaining_trips integer, 
    cancelled_trips integer, 
    next_trip_date timestamp with time zone, 
    series_status text, 
    total_cost numeric, 
    quoted_price numeric, 
    courier_packages text, 
    package_size text, 
    vehicle_type text, 
    errand_tasks jsonb, 
    fare_breakdown jsonb
)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  driver_location GEOMETRY;
BEGIN
  -- Get driver's current location from driver_locations if it exists
  BEGIN
    SELECT coordinates INTO driver_location
    FROM driver_locations
    WHERE driver_locations.driver_id = p_driver_id;
  EXCEPTION WHEN OTHERS THEN
    driver_location := NULL;
  END;
  
  RETURN QUERY
  WITH 
  matching_rides AS (
    SELECT
      r.id,
      r.series_id,
      r.user_id,
      r.driver_id,
      r.service_type::text,
      r.ride_timing::text,
      r.pickup_address,
      r.pickup_coordinates,
      r.dropoff_address,
      r.dropoff_coordinates,
      r.distance_km,
      r.estimated_cost,
      r.scheduled_datetime,
      r.created_at,
      r.ride_status,
      COALESCE(r.state::text, r.ride_status) as state,
      r.execution_sub_state::text as execution_sub_state,
      r.acceptance_status,
      r.special_requests as special_instructions,
      r.needs_activation,
      COALESCE(p.name, r.passenger_name) as profile_passenger_name,
      COALESCE(p.phone, r.contact_number) as profile_passenger_phone,
      r.number_of_passengers as passenger_count,
      r.scheduled_datetime as pickup_time,
      r.courier_packages,
      r.package_size,
      r.vehicle_type,
      r.errand_tasks,
      r.fare_breakdown
    FROM rides r
    LEFT JOIN profiles p ON r.user_id = p.id
    WHERE
      CASE
        WHEN p_feed_category = 'available' THEN
          r.ride_status = 'pending'
          AND r.acceptance_status = 'pending'
          AND r.driver_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM ride_offers ro
            WHERE ro.ride_id = r.id AND ro.driver_id = p_driver_id
          )
          AND (
            driver_location IS NULL
            OR ST_DWithin(
              driver_location::geography,
              ST_SetSRID(ST_GeomFromGeoJSON(r.pickup_coordinates::text), 4326)::geography,
              5000 
            )
          )
        WHEN p_feed_category = 'my_bids' THEN
          EXISTS (
            SELECT 1 FROM ride_offers ro
            WHERE ro.ride_id = r.id
            AND ro.driver_id = p_driver_id
            AND ro.offer_status = 'pending'
          )
        WHEN p_feed_category = 'in_progress' THEN
          r.driver_id = p_driver_id
          AND r.ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')
        WHEN p_feed_category = 'completed' THEN
          r.driver_id = p_driver_id
          AND r.ride_status IN ('completed', 'trip_completed')
        WHEN p_feed_category = 'cancelled' THEN
          r.driver_id = p_driver_id
          AND r.ride_status = 'cancelled'
        ELSE FALSE
      END
      AND (p_service_type IS NULL OR r.service_type = p_service_type)
      AND (p_ride_timing IS NULL OR r.ride_timing = p_ride_timing)
  ),
  
  series_entries AS (
    SELECT DISTINCT ON (rts.id)
      NULL::uuid as id,
      rts.id as series_id,
      rts.user_id,
      rts.driver_id,
      rts.service_type::text,
      'scheduled_recurring'::text as ride_timing,
      rts.pickup_address,
      rts.pickup_coordinates,
      rts.dropoff_address,
      rts.dropoff_coordinates,
      NULL::numeric as distance_km,
      rts.estimated_cost,
      rts.next_trip_date as scheduled_datetime,
      rts.created_at,
      NULL::text as ride_status,
      NULL::text as state,
      NULL::text as execution_sub_state,
      NULL::text as acceptance_status,
      NULL::text as special_instructions,
      FALSE as needs_activation,
      p.name as passenger_name,
      p.phone as passenger_phone,
      1 as passenger_count,
      rts.next_trip_date as pickup_time,
      CASE
        WHEN driver_location IS NOT NULL AND rts.pickup_coordinates IS NOT NULL THEN
          ST_Distance(
            driver_location::geography,
            ST_SetSRID(ST_GeomFromGeoJSON(rts.pickup_coordinates::text), 4326)::geography
          ) / 1000.0
        ELSE NULL
      END as distance_to_driver_km,
      TRUE as is_series,
      rts.total_trips,
      rts.completed_trips,
      (rts.total_trips - rts.completed_trips - rts.cancelled_trips) as remaining_trips,
      rts.cancelled_trips,
      rts.next_trip_date,
      rts.status::text as series_status,
      (rts.estimated_cost * rts.total_trips) as total_cost,
      NULL::numeric as quoted_price,
      NULL::text as courier_packages,
      NULL::text as package_size,
      NULL::text as vehicle_type,
      NULL::jsonb as errand_tasks,
      NULL::jsonb as fare_breakdown
    FROM recurring_trip_series rts
    LEFT JOIN profiles p ON rts.user_id = p.id
    WHERE rts.id IN (
      SELECT DISTINCT mr.series_id 
      FROM matching_rides mr
      WHERE mr.series_id IS NOT NULL
    )
    AND NOT (
      p_feed_category = 'available' 
      AND (rts.total_trips - rts.completed_trips - rts.cancelled_trips) <= 0
    )
  ),
  
  regular_rides AS (
    SELECT
      mr.id,
      mr.series_id,
      mr.user_id,
      mr.driver_id,
      mr.service_type,
      mr.ride_timing,
      mr.pickup_address,
      mr.pickup_coordinates,
      mr.dropoff_address,
      mr.dropoff_coordinates,
      mr.distance_km,
      mr.estimated_cost,
      mr.scheduled_datetime,
      mr.created_at,
      mr.ride_status,
      mr.state,
      mr.execution_sub_state,
      mr.acceptance_status,
      mr.special_instructions,
      mr.needs_activation,
      mr.profile_passenger_name as passenger_name,
      mr.profile_passenger_phone as passenger_phone,
      mr.passenger_count,
      mr.pickup_time,
      CASE
        WHEN driver_location IS NOT NULL AND mr.pickup_coordinates IS NOT NULL THEN
          ST_Distance(
            driver_location::geography,
            ST_SetSRID(ST_GeomFromGeoJSON(mr.pickup_coordinates::text), 4326)::geography
          ) / 1000.0
        ELSE NULL
      END as distance_to_driver_km,
      FALSE as is_series,
      NULL::int as total_trips,
      NULL::int as completed_trips,
      NULL::int as remaining_trips,
      NULL::int as cancelled_trips,
      NULL::timestamp with time zone as next_trip_date,
      NULL::text as series_status,
      mr.estimated_cost as total_cost,
      (
        SELECT ro.quoted_price
        FROM ride_offers ro
        WHERE ro.ride_id = mr.id AND ro.driver_id = p_driver_id
        LIMIT 1
      ) as quoted_price,
      mr.courier_packages,
      mr.package_size,
      mr.vehicle_type,
      mr.errand_tasks,
      mr.fare_breakdown
    FROM matching_rides mr
    WHERE mr.series_id IS NULL
  )
  
  SELECT * FROM (
    SELECT * FROM series_entries
    UNION ALL
    SELECT * FROM regular_rides
  ) combined
  ORDER BY
    CASE
      WHEN p_feed_category = 'in_progress' THEN
        CASE combined.execution_sub_state
          WHEN 'TRIP_STARTED' THEN 1
          WHEN 'DRIVER_ARRIVED' THEN 2
          WHEN 'DRIVER_ON_THE_WAY' THEN 3
          ELSE 4
        END
      ELSE 5
    END,
    combined.scheduled_datetime ASC NULLS LAST,
    combined.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;



