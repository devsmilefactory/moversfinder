-- Migration: Create schedule_trip_reminders function
-- Date: 2025-11-17
-- Purpose: Schedule reminders for recurring trips

-- Function to schedule standard reminders for a trip
CREATE OR REPLACE FUNCTION schedule_trip_reminders(
  p_series_id UUID,
  p_ride_id UUID DEFAULT NULL,
  p_trip_datetime TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_series RECORD;
  v_trip_datetime TIMESTAMP WITH TIME ZONE;
  v_reminders_created INTEGER := 0;
BEGIN
  -- Get series details
  SELECT * INTO v_series
  FROM recurring_trip_series
  WHERE id = p_series_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Series not found: %', p_series_id;
  END IF;
  
  -- Use provided datetime or next_trip_date from series
  v_trip_datetime := COALESCE(p_trip_datetime, v_series.next_trip_date);
  
  IF v_trip_datetime IS NULL THEN
    RAISE EXCEPTION 'No trip datetime available for series: %', p_series_id;
  END IF;
  
  -- Schedule 24-hour reminder for driver
  IF v_series.driver_id IS NOT NULL THEN
    INSERT INTO trip_reminders (
      series_id, ride_id, user_id, reminder_type, reminder_time,
      title, message, notification_data
    ) VALUES (
      p_series_id, p_ride_id, v_series.driver_id, '24_hours',
      v_trip_datetime - INTERVAL '24 hours',
      'Recurring Trip Reminder',
      format('You have a recurring trip tomorrow at %s. Pickup: %s', 
             to_char(v_trip_datetime, 'HH24:MI'), v_series.pickup_address),
      jsonb_build_object(
        'series_name', v_series.series_name,
        'pickup_address', v_series.pickup_address,
        'dropoff_address', v_series.dropoff_address,
        'trip_datetime', v_trip_datetime
      )
    ) ON CONFLICT DO NOTHING;
    v_reminders_created := v_reminders_created + 1;
    
    -- Schedule 1-hour reminder for driver
    INSERT INTO trip_reminders (
      series_id, ride_id, user_id, reminder_type, reminder_time,
      title, message, notification_data
    ) VALUES (
      p_series_id, p_ride_id, v_series.driver_id, '1_hour',
      v_trip_datetime - INTERVAL '1 hour',
      'Trip Starting Soon',
      format('Your recurring trip starts in 1 hour at %s. Pickup: %s',
             to_char(v_trip_datetime, 'HH24:MI'), v_series.pickup_address),
      jsonb_build_object(
        'series_name', v_series.series_name,
        'pickup_address', v_series.pickup_address,
        'dropoff_address', v_series.dropoff_address,
        'trip_datetime', v_trip_datetime
      )
    ) ON CONFLICT DO NOTHING;
    v_reminders_created := v_reminders_created + 1;
  END IF;
  
  -- Schedule 24-hour reminder for passenger
  INSERT INTO trip_reminders (
    series_id, ride_id, user_id, reminder_type, reminder_time,
    title, message, notification_data
  ) VALUES (
    p_series_id, p_ride_id, v_series.user_id, '24_hours',
    v_trip_datetime - INTERVAL '24 hours',
    'Recurring Trip Tomorrow',
    format('Your recurring trip is scheduled for tomorrow at %s. From: %s',
           to_char(v_trip_datetime, 'HH24:MI'), v_series.pickup_address),
    jsonb_build_object(
      'series_name', v_series.series_name,
      'pickup_address', v_series.pickup_address,
      'dropoff_address', v_series.dropoff_address,
      'trip_datetime', v_trip_datetime
    )
  ) ON CONFLICT DO NOTHING;
  v_reminders_created := v_reminders_created + 1;
  
  RETURN v_reminders_created;
END;
$$;

-- Function to get pending reminders that need to be sent
CREATE OR REPLACE FUNCTION get_pending_reminders(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  reminder_id UUID,
  series_id UUID,
  ride_id UUID,
  user_id UUID,
  reminder_type VARCHAR,
  title VARCHAR,
  message TEXT,
  notification_data JSONB,
  reminder_time TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.series_id,
    tr.ride_id,
    tr.user_id,
    tr.reminder_type,
    tr.title,
    tr.message,
    tr.notification_data,
    tr.reminder_time
  FROM trip_reminders tr
  WHERE tr.status = 'pending'
    AND tr.reminder_time <= NOW()
  ORDER BY tr.reminder_time ASC
  LIMIT p_limit;
END;
$$;

-- Function to mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(
  p_reminder_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE trip_reminders
  SET 
    status = 'sent',
    sent_at = NOW()
  WHERE id = p_reminder_id
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- Function to mark reminder as failed
CREATE OR REPLACE FUNCTION mark_reminder_failed(
  p_reminder_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE trip_reminders
  SET 
    status = 'failed',
    failed_reason = p_reason,
    retry_count = retry_count + 1
  WHERE id = p_reminder_id
    AND status IN ('pending', 'failed')
    AND retry_count < 5;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION schedule_trip_reminders IS 'Schedules 24h and 1h reminders for both driver and passenger';
COMMENT ON FUNCTION get_pending_reminders IS 'Returns pending reminders that need to be sent';
COMMENT ON FUNCTION mark_reminder_sent IS 'Marks a reminder as successfully sent';
COMMENT ON FUNCTION mark_reminder_failed IS 'Marks a reminder as failed with optional reason';
