-- DB-driven broadcast for new instant rides:
-- - Inserts ride_acceptance_queue rows for eligible drivers
-- - Inserts notifications for eligible drivers (push delivered by existing pipeline)
-- This removes reliance on client-side broadcast for instant rides.

BEGIN;

CREATE OR REPLACE FUNCTION public.db_broadcast_new_instant_ride()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_lat numeric;
  v_lng numeric;
  v_driver record;
  v_title text;
  v_message text;
  v_action_url text;
  v_service_label text;
BEGIN
  -- Only instant pending unassigned rides
  IF NEW.ride_timing <> 'instant' OR NEW.ride_status <> 'pending' OR NEW.driver_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extract pickup coordinates from either {lat,lng} or GeoJSON Point
  IF NEW.pickup_coordinates ? 'lat' AND NEW.pickup_coordinates ? 'lng' THEN
    v_lat := (NEW.pickup_coordinates->>'lat')::numeric;
    v_lng := (NEW.pickup_coordinates->>'lng')::numeric;
  ELSIF NEW.pickup_coordinates ? 'coordinates' THEN
    -- GeoJSON Point: [lng, lat]
    v_lng := (NEW.pickup_coordinates->'coordinates'->>0)::numeric;
    v_lat := (NEW.pickup_coordinates->'coordinates'->>1)::numeric;
  ELSE
    -- No coordinates => cannot broadcast
    RETURN NEW;
  END IF;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RETURN NEW;
  END IF;

  v_service_label := CASE lower(coalesce(NEW.service_type, ''))
    WHEN 'taxi' THEN 'Taxi'
    WHEN 'courier' THEN 'Courier'
    WHEN 'errands' THEN 'Errands'
    WHEN 'school_run' THEN 'School Run'
    ELSE 'Ride'
  END;

  v_title := format('New %s Request', v_service_label);
  v_message := CASE
    WHEN NEW.pickup_address IS NOT NULL THEN format('Pickup: %s', NEW.pickup_address)
    WHEN NEW.pickup_location IS NOT NULL THEN format('Pickup: %s', NEW.pickup_location)
    ELSE 'New ride request nearby'
  END;

  v_action_url := '/driver/rides?rideId=' || NEW.id::text;

  FOR v_driver IN
    SELECT driver_id, distance_km
    FROM public.find_drivers_within_radius(v_lat, v_lng, 5)
  LOOP
    -- Queue entry (dedupe manually)
    INSERT INTO public.ride_acceptance_queue (ride_id, driver_id, status, created_at)
    SELECT NEW.id, v_driver.driver_id, 'viewing', now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ride_acceptance_queue q
      WHERE q.ride_id = NEW.id AND q.driver_id = v_driver.driver_id
    );

    -- Notification to driver
    PERFORM public.create_notification(
      v_driver.driver_id,
      'new_offer'::notification_type,
      'OFFERS'::notification_category,
      'HIGH'::notification_priority,
      v_title,
      v_message,
      v_action_url,
      NEW.id,
      NULL::uuid,
      NULL::uuid,
      NULL::uuid,
      jsonb_build_object(
        'service_type', NEW.service_type,
        'estimated_cost', NEW.estimated_cost,
        'pickup_location', coalesce(NEW.pickup_address, NEW.pickup_location),
        'distance_km', v_driver.distance_km
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_db_broadcast_new_instant_ride ON public.rides;

CREATE TRIGGER trigger_db_broadcast_new_instant_ride
  AFTER INSERT ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.db_broadcast_new_instant_ride();

COMMIT;






