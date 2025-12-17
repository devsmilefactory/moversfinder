-- Notification System Triggers
-- Automatic notification creation for ride events

BEGIN;

-- ============================================================================
-- TRIGGER: New Offer Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride RECORD;
  v_driver RECORD;
BEGIN
  -- Get ride and driver details
  SELECT * INTO v_ride FROM rides WHERE id = NEW.ride_id;
  SELECT * INTO v_driver FROM profiles WHERE id = NEW.driver_id;
  
  -- Create notification for passenger
  PERFORM create_notification(
    v_ride.user_id,
    'new_offer'::notification_type,
    'offers'::notification_category,
    'normal'::notification_priority,
    format('New Offer from %s', v_driver.name),
    format('%s offered $%s for your %s', v_driver.name, NEW.quoted_price, v_ride.service_type),
    format('/rides/%s/offers', v_ride.id),
    v_ride.id,
    NULL,
    NULL,
    NEW.id,
    jsonb_build_object(
      'driver_name', v_driver.name,
      'quoted_price', NEW.quoted_price,
      'eta_minutes', NEW.estimated_arrival_minutes
    )
  );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_new_offer ON ride_offers;

CREATE TRIGGER trigger_notify_new_offer
AFTER INSERT ON ride_offers
FOR EACH ROW
EXECUTE FUNCTION notify_new_offer();

-- ============================================================================
-- TRIGGER: Enhanced Ride State Change Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_ride_state_change_enhanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_type notification_type;
  v_title TEXT;
  v_message TEXT;
  v_recipient_id UUID;
  v_priority notification_priority := 'normal'::notification_priority;
  v_category notification_category := 'ride_progress'::notification_category;
BEGIN
  -- Determine notification type and recipient based on state change
  IF NEW.ride_status = 'active_execution' AND OLD.ride_status = 'active_pre_trip' THEN
    -- Ride activated
    v_notification_type := 'ride_activated'::notification_type;
    v_recipient_id := NEW.user_id;  -- Notify passenger
    v_title := 'Ride Started';
    v_message := 'Your driver is on the way!';
    v_priority := 'high'::notification_priority;
    
  ELSIF NEW.execution_sub_state = 'driver_on_the_way' AND OLD.execution_sub_state IS DISTINCT FROM 'driver_on_the_way' THEN
    v_notification_type := 'driver_on_the_way'::notification_type;
    v_recipient_id := NEW.user_id;
    v_title := 'Driver On The Way';
    v_message := format('Your driver is heading to pickup. ETA: %s minutes', 
      COALESCE((NEW.context_data->>'eta_minutes')::TEXT, '5'));
    v_priority := 'high'::notification_priority;
    
  ELSIF NEW.execution_sub_state = 'driver_arrived' AND OLD.execution_sub_state != 'driver_arrived' THEN
    v_notification_type := 'driver_arrived'::notification_type;
    v_recipient_id := NEW.user_id;
    v_title := 'Driver Arrived';
    v_message := 'Your driver has arrived at the pickup location';
    v_priority := 'high'::notification_priority;
    
  ELSIF NEW.execution_sub_state = 'trip_started' AND OLD.execution_sub_state != 'trip_started' THEN
    v_notification_type := 'trip_started'::notification_type;
    v_recipient_id := NEW.user_id;
    v_title := 'Trip Started';
    v_message := 'Your trip has begun';
    v_priority := 'normal'::notification_priority;
    
  ELSIF NEW.execution_sub_state = 'trip_completed' AND OLD.execution_sub_state != 'trip_completed' THEN
    v_notification_type := 'trip_completed'::notification_type;
    v_recipient_id := NEW.user_id;
    v_title := 'Trip Completed';
    v_message := 'Please complete payment and rating';
    v_priority := 'normal'::notification_priority;
    
  ELSIF NEW.ride_status = 'cancelled' AND OLD.ride_status != 'cancelled' THEN
    -- Handle cancellation notifications
    v_category := 'cancellations'::notification_category;
    v_priority := 'high'::notification_priority;
    
    IF NEW.cancelled_by = 'passenger' THEN
      v_notification_type := 'ride_cancelled_by_passenger'::notification_type;
      v_recipient_id := NEW.driver_id;
      v_title := 'Ride Cancelled';
      v_message := 'The passenger has cancelled this ride';
    ELSIF NEW.cancelled_by = 'driver' THEN
      v_notification_type := 'ride_cancelled_by_driver'::notification_type;
      v_recipient_id := NEW.user_id;
      v_title := 'Ride Cancelled';
      v_message := format('The driver has cancelled this ride. Reason: %s', 
        COALESCE(NEW.cancellation_reason, 'Not specified'));
    ELSE
      v_notification_type := 'ride_cancelled_by_system'::notification_type;
      -- Notify both parties
      PERFORM create_notification(
        NEW.user_id, v_notification_type, v_category, v_priority,
        'Ride Cancelled', 'This ride was cancelled by the system', 
        format('/rides/%s', NEW.id), NEW.id, NULL, NULL, NULL, '{}'
      );
      PERFORM create_notification(
        NEW.driver_id, v_notification_type, v_category, v_priority,
        'Ride Cancelled', 'This ride was cancelled by the system',
        format('/driver/rides/%s', NEW.id), NEW.id, NULL, NULL, NULL, '{}'
      );
      RETURN NEW;
    END IF;
  ELSE
    -- No notification needed for this state change
    RETURN NEW;
  END IF;
  
  -- Create the notification
  IF v_recipient_id IS NOT NULL THEN
    PERFORM create_notification(
      v_recipient_id,
      v_notification_type,
      v_category,
      v_priority,
      v_title,
      v_message,
      format('/rides/%s', NEW.id),
      NEW.id,
      NULL,
      NULL,
      NULL,
      '{}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Replace existing trigger
DROP TRIGGER IF EXISTS trigger_notify_ride_status_change ON rides;

CREATE TRIGGER trigger_notify_ride_status_change_enhanced
AFTER UPDATE ON rides
FOR EACH ROW
WHEN (OLD.ride_status IS DISTINCT FROM NEW.ride_status 
      OR OLD.execution_sub_state IS DISTINCT FROM NEW.execution_sub_state)
EXECUTE FUNCTION notify_ride_state_change_enhanced();

-- ============================================================================
-- TRIGGER: Errand Task State Change Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_task_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride RECORD;
  v_notification_type notification_type;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Get ride details
  SELECT * INTO v_ride FROM rides WHERE id = NEW.ride_id;
  
  -- Determine notification based on task state
  IF NEW.task_status = 'activate_task' AND OLD.task_status != 'activate_task' THEN
    v_notification_type := 'task_activated'::notification_type;
    v_title := format('Task %s Activated', NEW.task_index + 1);
    v_message := format('Driver is starting task: %s', NEW.description);
    
  ELSIF NEW.task_status = 'driver_on_the_way' AND OLD.task_status != 'driver_on_the_way' THEN
    v_notification_type := 'task_driver_on_the_way'::notification_type;
    v_title := format('Driver Heading to Task %s', NEW.task_index + 1);
    v_message := format('Driver is on the way to: %s', NEW.address);
    
  ELSIF NEW.task_status = 'driver_arrived' AND OLD.task_status != 'driver_arrived' THEN
    v_notification_type := 'task_driver_arrived'::notification_type;
    v_title := format('Driver Arrived at Task %s', NEW.task_index + 1);
    v_message := format('Driver has arrived at: %s', NEW.address);
    
  ELSIF NEW.task_status = 'task_started' AND OLD.task_status != 'task_started' THEN
    v_notification_type := 'task_started'::notification_type;
    v_title := format('Task %s Started', NEW.task_index + 1);
    v_message := format('Driver is working on: %s', NEW.description);
    
  ELSIF NEW.task_status = 'task_completed' AND OLD.task_status != 'task_completed' THEN
    v_notification_type := 'task_completed'::notification_type;
    v_title := format('Task %s Completed', NEW.task_index + 1);
    v_message := format('%s completed. %s tasks remaining', 
      NEW.description, v_ride.tasks_left);
  ELSE
    RETURN NEW;
  END IF;
  
  -- Create notification for passenger
  PERFORM create_notification(
    v_ride.user_id,
    v_notification_type,
    'task_progress'::notification_category,
    CASE WHEN NEW.task_status = 'driver_arrived' THEN 'high'::notification_priority ELSE 'normal'::notification_priority END,
    v_title,
    v_message,
    format('/rides/%s/tasks', v_ride.id),
    v_ride.id,
    NULL,
    NEW.id,
    NULL,
    jsonb_build_object(
      'task_index', NEW.task_index,
      'task_description', NEW.description,
      'tasks_remaining', v_ride.tasks_left
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for errand tasks (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'errand_tasks') THEN
    DROP TRIGGER IF EXISTS trigger_notify_task_state_change ON errand_tasks;
    
    CREATE TRIGGER trigger_notify_task_state_change
    AFTER UPDATE ON errand_tasks
    FOR EACH ROW
    WHEN (OLD.task_status IS DISTINCT FROM NEW.task_status)
    EXECUTE FUNCTION notify_task_state_change();
  END IF;
END $$;

-- ============================================================================
-- TRIGGER: Recurring Series Progress Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_series_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_series RECORD;
BEGIN
  -- Only trigger when ride completes and is part of a series
  IF NEW.ride_status = 'completed_final' AND NEW.series_id IS NOT NULL THEN
    SELECT * INTO v_series FROM recurring_trip_series WHERE id = NEW.series_id;
    
    -- Notify passenger
    PERFORM create_notification(
      NEW.user_id,
      'recurring_instance_completed'::notification_type,
      'series_updates'::notification_category,
      'low'::notification_priority,
      format('Trip %s of %s Completed', v_series.rides_done, v_series.rides_total),
      format('Your recurring %s is complete. %s trips remaining', 
        v_series.service_type, v_series.rides_left),
      format('/series/%s', v_series.id),
      NEW.id,
      v_series.id,
      NULL,
      NULL,
      jsonb_build_object(
        'rides_done', v_series.rides_done,
        'rides_total', v_series.rides_total,
        'rides_left', v_series.rides_left
      )
    );
    
    -- Notify driver
    PERFORM create_notification(
      NEW.driver_id,
      'recurring_instance_completed'::notification_type,
      'series_updates'::notification_category,
      'low'::notification_priority,
      format('Trip %s of %s Completed', v_series.rides_done, v_series.rides_total),
      format('Recurring %s complete. %s trips remaining', 
        v_series.service_type, v_series.rides_left),
      format('/driver/series/%s', v_series.id),
      NEW.id,
      v_series.id,
      NULL,
      NULL,
      jsonb_build_object(
        'rides_done', v_series.rides_done,
        'rides_total', v_series.rides_total,
        'rides_left', v_series.rides_left
      )
    );
    
    -- If series completed, send completion notification
    IF v_series.rides_done >= v_series.rides_total THEN
      PERFORM create_notification(
        NEW.user_id,
        'recurring_series_completed'::notification_type,
        'series_updates'::notification_category,
        'normal'::notification_priority,
        'Recurring Series Completed',
        format('All %s trips in your recurring series have been completed!', v_series.rides_total),
        format('/series/%s', v_series.id),
        NULL,
        v_series.id,
        NULL,
        NULL,
        '{}'::jsonb
      );
      
      PERFORM create_notification(
        NEW.driver_id,
        'recurring_series_completed'::notification_type,
        'series_updates'::notification_category,
        'normal'::notification_priority,
        'Recurring Series Completed',
        format('All %s trips in this recurring series have been completed!', v_series.rides_total),
        format('/driver/series/%s', v_series.id),
        NULL,
        v_series.id,
        NULL,
        NULL,
        '{}'::jsonb
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for series progress
DROP TRIGGER IF EXISTS trigger_notify_series_progress ON rides;

CREATE TRIGGER trigger_notify_series_progress
AFTER UPDATE ON rides
FOR EACH ROW
WHEN (NEW.series_id IS NOT NULL AND NEW.ride_status = 'completed_final')
EXECUTE FUNCTION notify_series_progress();

COMMIT;
