-- Add number_of_trips column to rides table
-- This column stores the total number of trips for recurring bookings
-- For single trips, this will be 1
-- For recurring trips, this will be calculated based on the recurrence pattern

-- Add the column
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS number_of_trips INTEGER DEFAULT 1;

-- Add a check constraint to ensure number_of_trips is always positive
ALTER TABLE rides 
DROP CONSTRAINT IF EXISTS number_of_trips_positive;

ALTER TABLE rides 
ADD CONSTRAINT number_of_trips_positive 
CHECK (number_of_trips > 0);

-- Add a comment to document the column
COMMENT ON COLUMN rides.number_of_trips IS 'Total number of trips for this booking. 1 for single trips, calculated from recurrence pattern for recurring bookings.';

-- Update existing records to have number_of_trips = 1 if NULL
UPDATE rides 
SET number_of_trips = 1 
WHERE number_of_trips IS NULL;

-- For existing recurring rides, calculate number_of_trips from recurrence_pattern
-- This is a best-effort update for existing data
UPDATE rides 
SET number_of_trips = (
  CASE 
    -- For specific_dates pattern, count the dates array
    WHEN recurrence_pattern->>'type' = 'specific_dates' 
      THEN jsonb_array_length(recurrence_pattern->'dates')
    
    -- For weekdays pattern, estimate based on month (approximately 22 weekdays per month)
    WHEN recurrence_pattern->>'type' = 'weekdays' 
      THEN 22
    
    -- For weekends pattern, estimate based on month (approximately 8-10 weekend days per month)
    WHEN recurrence_pattern->>'type' = 'weekends' 
      THEN 8
    
    -- Default to 1 for any other case
    ELSE 1
  END
)
WHERE recurrence_pattern IS NOT NULL 
  AND number_of_trips = 1;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_rides_number_of_trips 
ON rides(number_of_trips);

-- Add a trigger to automatically set number_of_trips for new recurring rides
-- This will be calculated from the recurrence_pattern when a ride is inserted
CREATE OR REPLACE FUNCTION calculate_number_of_trips()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if recurrence_pattern is provided and number_of_trips is not explicitly set
  IF NEW.recurrence_pattern IS NOT NULL AND (NEW.number_of_trips IS NULL OR NEW.number_of_trips = 1) THEN
    NEW.number_of_trips := CASE 
      -- For specific_dates pattern, count the dates array
      WHEN NEW.recurrence_pattern->>'type' = 'specific_dates' 
        THEN jsonb_array_length(NEW.recurrence_pattern->'dates')
      
      -- For weekdays pattern, estimate based on month (approximately 22 weekdays per month)
      WHEN NEW.recurrence_pattern->>'type' = 'weekdays' 
        THEN 22
      
      -- For weekends pattern, estimate based on month (approximately 8-10 weekend days per month)
      WHEN NEW.recurrence_pattern->>'type' = 'weekends' 
        THEN 8
      
      -- Default to 1 for any other case
      ELSE 1
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and create it
DROP TRIGGER IF EXISTS set_number_of_trips ON rides;
CREATE TRIGGER set_number_of_trips
  BEFORE INSERT OR UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION calculate_number_of_trips();

