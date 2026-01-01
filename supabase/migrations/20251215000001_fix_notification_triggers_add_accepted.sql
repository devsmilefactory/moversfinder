-- Fix Notification Triggers: Add accepted status and fix driver_on_way inconsistency
-- Date: 2025-12-15
-- Purpose: 
--   1. Add 'accepted' status to notification triggers
--   2. Fix inconsistency: Use 'driver_on_way' (canonical) instead of 'driver_on_the_way'
--   3. Support both 'trip_started' and 'in_progress' for trip started status

BEGIN;

-- ============================================================================
-- FUNCTION: Notify on ride status change (UPDATED)
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
    WHEN 'accepted' THEN
      -- Driver's bid was accepted
      v_notification_type := 'offer_accepted';
      v_category := 'ride_progress';
      v_priority := 'high';
      v_title := 'Ride Accepted';
      v_message := 'Your ride has been accepted! Start heading to the pickup location.';
      v_recipient_id := NEW.driver_id; -- Driver
      v_action_url := '/driver/rides?rideId=' || NEW.id::TEXT;

    WHEN 'driver_assigned' THEN
      v_notification_type := 'ride_activated';
      v_category := 'ride_progress';
      v_priority := 'high';
      v_title := 'Driver Assigned';
      v_message := 'A driver has been assigned to your ride';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'driver_on_way' THEN
      -- Canonical status: driver_on_way (without "the")
      v_notification_type := 'driver_on_the_way';
      v_category := 'ride_progress';
      v_priority := 'high';
      v_title := 'Driver On The Way';
      v_message := 'Your driver is heading to the pickup location';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'driver_on_the_way' THEN
      -- Backward compatibility: also handle driver_on_the_way
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

    WHEN 'trip_started' THEN
      v_notification_type := 'trip_started';
      v_category := 'ride_progress';
      v_priority := 'normal';
      v_title := 'Trip Started';
      v_message := 'Your trip has started';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'in_progress' THEN
      -- Also handle in_progress as trip_started
      v_notification_type := 'trip_started';
      v_category := 'ride_progress';
      v_priority := 'normal';
      v_title := 'Trip Started';
      v_message := 'Your trip has started';
      v_recipient_id := NEW.user_id; -- Passenger
      v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;

    WHEN 'trip_completed' THEN
      v_notification_type := 'trip_completed';
      v_category := 'ride_progress';
      v_priority := 'normal';
      v_title := 'Trip Completed';
      v_message := 'Your trip has been completed';
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
        v_action_url := '/user/dashboard?rideId=' || NEW.id::TEXT;
      ELSIF NEW.cancelled_by = 'passenger' THEN
        v_notification_type := 'ride_cancelled_by_passenger';
        v_recipient_id := NEW.driver_id; -- Driver
        v_action_url := '/driver/rides?rideId=' || NEW.id::TEXT;
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

COMMIT;






