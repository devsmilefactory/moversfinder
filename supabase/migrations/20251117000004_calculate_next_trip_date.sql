-- Migration: Create calculate_next_trip_date function
-- Date: 2025-11-17
-- Purpose: Calculate next trip date for recurring series based on recurrence patterns

-- Function to calculate the next trip date for a recurring series
CREATE OR REPLACE FUNCTION calculate_next_trip_date(
  p_series_id UUID,
  p_from_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  v_series RECORD;
  v_base_date DATE;
  v_next_date DATE;
  v_next_datetime TIMESTAMP WITH TIME ZONE;
  v_days_to_add INTEGER;
  v_current_dow INTEGER; -- Day of week (0=Sunday, 6=Saturday)
  v_loop_count INTEGER := 0;
  v_max_loops INTEGER := 14; -- Prevent infinite loops
BEGIN
  -- Get series details
  SELECT * INTO v_series
  FROM recurring_trip_series
  WHERE id = p_series_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Series not found: %', p_series_id;
  END IF;
  
  -- Determine base date (either provided date or last completed trip date or start date)
  IF p_from_date IS NOT NULL THEN
    v_base_date := p_from_date::DATE;
  ELSE
    -- Get the date of the last completed trip, or use start date
    SELECT COALESCE(
      MAX(r.scheduled_datetime::DATE),
      v_series.start_date::DATE
    ) INTO v_base_date
    FROM rides r
    WHERE r.series_id = p_series_id
      AND r.ride_status = 'completed';
    
    -- If no completed trips, use start date
    IF v_base_date IS NULL THEN
      v_base_date := v_series.start_date::DATE;
    END IF;
  END IF;
  
  -- Calculate next date based on recurrence pattern
  CASE v_series.recurrence_pattern
    WHEN 'daily' THEN
      -- Add one day
      v_next_date := v_base_date + INTERVAL '1 day';
    
    WHEN 'weekly' THEN
      -- Add 7 days
      v_next_date := v_base_date + INTERVAL '7 days';
    
    WHEN 'weekdays' THEN
      -- Find next weekday (Mon-Fri)
      v_days_to_add := 1;
      LOOP
        v_next_date := v_base_date + (v_days_to_add || ' days')::INTERVAL;
        v_current_dow := EXTRACT(DOW FROM v_next_date)::INTEGER;
        EXIT WHEN v_current_dow BETWEEN 1 AND 5;
        v_days_to_add := v_days_to_add + 1;
        v_loop_count := v_loop_count + 1;
        IF v_loop_count > v_max_loops THEN
          RAISE EXCEPTION 'Loop limit exceeded calculating weekday';
        END IF;
      END LOOP;
    
    WHEN 'weekends' THEN
      -- Find next weekend (Sat-Sun)
      v_days_to_add := 1;
      v_loop_count := 0;
      LOOP
        v_next_date := v_base_date + (v_days_to_add || ' days')::INTERVAL;
        v_current_dow := EXTRACT(DOW FROM v_next_date)::INTEGER;
        EXIT WHEN v_current_dow IN (0, 6);
        v_days_to_add := v_days_to_add + 1;
        v_loop_count := v_loop_count + 1;
        IF v_loop_count > v_max_loops THEN
          RAISE EXCEPTION 'Loop limit exceeded calculating weekend';
        END IF;
      END LOOP;
    
    WHEN 'custom' THEN
      -- Use custom recurrence_days array
      IF v_series.recurrence_days IS NULL OR array_length(v_series.recurrence_days, 1) = 0 THEN
        RAISE EXCEPTION 'Custom recurrence pattern requires recurrence_days array';
      END IF;
      
      v_days_to_add := 1;
      v_loop_count := 0;
      LOOP
        v_next_date := v_base_date + (v_days_to_add || ' days')::INTERVAL;
        v_current_dow := EXTRACT(DOW FROM v_next_date)::INTEGER;
        EXIT WHEN v_current_dow = ANY(v_series.recurrence_days);
        v_days_to_add := v_days_to_add + 1;
        v_loop_count := v_loop_count + 1;
        IF v_loop_count > v_max_loops THEN
          RAISE EXCEPTION 'Loop limit exceeded calculating custom pattern';
        END IF;
      END LOOP;
    
    ELSE
      RAISE EXCEPTION 'Unknown recurrence pattern: %', v_series.recurrence_pattern;
  END CASE;
  
  -- Combine date with trip time
  v_next_datetime := v_next_date::DATE + v_series.trip_time;
  
  -- Check if within end date
  IF v_series.end_date IS NOT NULL AND v_next_datetime > v_series.end_date THEN
    RETURN NULL;
  END IF;
  
  -- Check if we've reached total trips limit
  IF v_series.completed_trips >= v_series.total_trips THEN
    RETURN NULL;
  END IF;
  
  RETURN v_next_datetime;
END;
$$;

COMMENT ON FUNCTION calculate_next_trip_date IS 'Calculates the next trip date for a recurring series based on recurrence pattern';
