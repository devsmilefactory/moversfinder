-- Migration: Create update_series_progress trigger
-- Date: 2025-11-17
-- Purpose: Automatically update series progress when rides are completed

-- Function to update series progress when a ride is completed
CREATE OR REPLACE FUNCTION update_series_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_date TIMESTAMP WITH TIME ZONE;
  v_series RECORD;
  v_new_ride_id UUID;
BEGIN
  -- Only process if ride is part of a series and was just completed
  IF NEW.series_id IS NOT NULL AND NEW.ride_status = 'trip_completed' AND 
     (OLD.ride_status IS NULL OR OLD.ride_status != 'trip_completed') THEN
    
    -- Get series details
    SELECT * INTO v_series
    FROM recurring_trip_series
    WHERE id = NEW.series_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Increment completed trips
    UPDATE recurring_trip_series
    SET 
      completed_trips = completed_trips + 1,
      updated_at = NOW()
    WHERE id = NEW.series_id;
    
    -- Calculate next trip date
    v_next_date := calculate_next_trip_date(NEW.series_id);
    
    -- Update next trip date or mark as complete
    IF v_next_date IS NOT NULL THEN
      -- Update next trip date
      UPDATE recurring_trip_series
      SET next_trip_date = v_next_date
      WHERE id = NEW.series_id;
      
      -- Create next ride in series
      INSERT INTO rides (
        series_id,
        series_trip_number,
        user_id,
        driver_id,
        pickup_address,
        pickup_coordinates,
        dropoff_address,
        dropoff_coordinates,
        service_type,
        ride_timing,
        ride_status,
        scheduled_datetime,
        estimated_cost
      )
      VALUES (
        NEW.series_id,
        v_series.completed_trips + 2, -- Next trip number
        v_series.user_id,
        v_series.driver_id,
        v_series.pickup_address,
        v_series.pickup_coordinates,
        v_series.dropoff_address,
        v_series.dropoff_coordinates,
        v_series.service_type,
        'scheduled_recurring',
        'accepted',
        v_next_date,
        v_series.estimated_cost
      )
      RETURNING id INTO v_new_ride_id;
      
      -- Note: Reminders will be scheduled separately via schedule_trip_reminders function
      
    ELSE
      -- Mark series as complete (no more trips possible)
      UPDATE recurring_trip_series
      SET 
        status = 'completed',
        next_trip_date = NULL,
        updated_at = NOW()
      WHERE id = NEW.series_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on rides table
DROP TRIGGER IF EXISTS trigger_update_series_progress ON rides;
CREATE TRIGGER trigger_update_series_progress
  AFTER UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION update_series_progress();

COMMENT ON FUNCTION update_series_progress IS 'Automatically updates recurring series progress when rides are completed';
