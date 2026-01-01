-- Ride Notification Triggers
-- Automatically sends notifications on ride status changes

BEGIN;

-- ============================================================================
-- FUNCTION: Notify on ride status change
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_ride_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_type notification_type;
  v_category notification_category;
  v_priority notification_priority;
  v_title TEXT;
  v_message TEXT;
  v_recipient_id UUID;
  v_action_url TEXT;
BEGIN
  -- Only process if status actually changed
  IF OLD.ride_status = NEW.ride_status THEN
    RETURN NEW;
  END IF;

  -- Determine notification details based on status change
  CASE NEW.ride_status
    WHEN 'driver_assigned' THEN
      v_notification_type := 'ride_activated';
      v_category := 'ride_progress';
      v_priority := 'high';
      v_title := 'Driver Assigned';
      v_message := 'A driver has been assigned to your ride';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'driver_on_the_way' THEN
      v_notification_type := 'driver_on_the_way';
      v_category := 'ride_progress';
      v_priority := 'high';
      v_title := 'Driver On The Way';
      v_message := 'Your driver is heading to the pickup location';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'driver_arrived' THEN
      v_notification_type := 'driver_arrived';
      v_category := 'ride_progress';
      v_priority := 'urgent';
      v_title := 'Driver Arrived';
      v_message := 'Your driver has arrived at the pickup location';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'in_progress' THEN
      v_notification_type := 'trip_started';
      v_category := 'ride_progress';
      v_priority := 'normal';
      v_title := 'Trip Started';
      v_message := 'Your trip has started';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'completed' THEN
      v_notification_type := 'trip_completed';
      v_category := 'ride_progress';
      v_priority := 'normal';
      v_title := 'Trip Completed';
      v_message := 'Your trip has been completed';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'cancelled' THEN
      -- Determine who cancelled
      IF NEW.cancelled_by = 'driver' THEN
        v_notification_type := 'ride_cancelled_by_driver';
        v_recipient_id := NEW.user_id; -- Passenger
      ELSIF NEW.cancelled_by = 'passenger' THEN
        v_notification_type := 'ride_cancelled_by_passenger';
        v_recipient_id := NEW.driver_id; -- Driver
      ELSE
        v_notification_type := 'ride_cancelled_by_system';
        -- Notify both if both exist
        IF NEW.user_id IS NOT NULL THEN
          PERFORM create_notification(
            NEW.user_id,
            v_notification_type,
            'cancellations',
            'high',
            'Ride Cancelled',
            'The ride has been cancelled',
            '/user/dashboard?rideId=' || NEW.id::TEXT,
            NEW.id,
            NULL, NULL, NULL,
            jsonb_build_object('cancelled_by', COALESCE(NEW.cancelled_by, 'system'))
          );
        END IF;
        IF NEW.driver_id IS NOT NULL THEN
          PERFORM create_notification(
            NEW.driver_id,
            v_notification_type,
            'cancellations',
            'high',
            'Ride Cancelled',
            'The ride has been cancelled',
            '/driver/rides?rideId=' || NEW.id::TEXT,
            NEW.id,
            NULL, NULL, NULL,
            jsonb_build_object('cancelled_by', COALESCE(NEW.cancelled_by, 'system'))
          );
        END IF;
        RETURN NEW;
      END IF;
      v_category := 'cancellations';
      v_priority := 'high';
      v_title := 'Ride Cancelled';
      v_message := 'The ride has been cancelled';
      v_action_url := CASE 
        WHEN NEW.cancelled_by = 'driver' THEN '/user/dashboard?rideId=' || NEW.id::TEXT
        ELSE '/driver/rides?rideId=' || NEW.id::TEXT
      END;

    ELSE
      -- Unknown status, skip notification
      RETURN NEW;
  END CASE;

  -- Create notification if recipient exists
  IF v_recipient_id IS NOT NULL THEN
    PERFORM create_notification(
      v_recipient_id,
      v_notification_type,
      v_category,
      v_priority,
      v_title,
      v_message,
      v_action_url,
      NEW.id,
      NULL, NULL, NULL,
      jsonb_build_object(
        'status', NEW.ride_status,
        'previous_status', OLD.ride_status,
        'service_type', NEW.service_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER: Ride status change notification
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_ride_status_notification ON rides;

CREATE TRIGGER trigger_ride_status_notification
  AFTER UPDATE OF ride_status ON rides
  FOR EACH ROW
  WHEN (OLD.ride_status IS DISTINCT FROM NEW.ride_status)
  EXECUTE FUNCTION notify_ride_status_change();

-- ============================================================================
-- FUNCTION: Broadcast new ride to nearby drivers
-- ============================================================================

CREATE OR REPLACE FUNCTION broadcast_new_ride_to_drivers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pickup_lat FLOAT;
  v_pickup_lng FLOAT;
  v_nearby_drivers RECORD;
  v_notification_id UUID;
BEGIN
  -- Only process instant rides
  IF NEW.ride_timing != 'instant' THEN
    RETURN NEW;
  END IF;

  -- Only process pending rides
  IF NEW.ride_status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Extract pickup coordinates
  IF NEW.pickup_coordinates IS NOT NULL THEN
    v_pickup_lat := (NEW.pickup_coordinates->>'lat')::FLOAT;
    v_pickup_lng := (NEW.pickup_coordinates->>'lng')::FLOAT;
  ELSIF NEW.pickup_lat IS NOT NULL AND NEW.pickup_lng IS NOT NULL THEN
    v_pickup_lat := NEW.pickup_lat;
    v_pickup_lng := NEW.pickup_lng;
  ELSE
    -- No coordinates, skip
    RETURN NEW;
  END IF;

  -- Find nearby drivers (within 5km, online, not engaged)
  FOR v_nearby_drivers IN
    SELECT 
      dl.driver_id,
      dl.coordinates->>'lat' as driver_lat,
      dl.coordinates->>'lng' as driver_lng
    FROM driver_locations dl
    WHERE 
      dl.is_online = TRUE
      AND dl.is_available = TRUE
      AND dl.active_ride_id IS NULL
      AND (
        6371 * acos(
          cos(radians(v_pickup_lat)) *
          cos(radians((dl.coordinates->>'lat')::FLOAT)) *
          cos(radians((dl.coordinates->>'lng')::FLOAT) - radians(v_pickup_lng)) +
          sin(radians(v_pickup_lat)) *
          sin(radians((dl.coordinates->>'lat')::FLOAT))
        )
      ) <= 5 -- 5km radius
  LOOP
    -- Create notification for each eligible driver
    PERFORM create_notification(
      v_nearby_drivers.driver_id,
      'new_offer',
      'offers',
      'high',
      'New Ride Request',
      COALESCE(NEW.pickup_location, 'New ride request nearby'),
      '/driver/rides?rideId=' || NEW.id::TEXT,
      NEW.id,
      NULL, NULL, NULL,
      jsonb_build_object(
        'service_type', NEW.service_type,
        'estimated_fare', NEW.estimated_fare,
        'pickup_location', NEW.pickup_location
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER: Broadcast new ride to drivers
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_broadcast_new_ride ON rides;

CREATE TRIGGER trigger_broadcast_new_ride
  AFTER INSERT ON rides
  FOR EACH ROW
  WHEN (NEW.ride_timing = 'instant' AND NEW.ride_status = 'pending')
  EXECUTE FUNCTION broadcast_new_ride_to_drivers();

COMMIT;






