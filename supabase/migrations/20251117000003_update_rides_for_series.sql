-- Migration: Update rides table for recurring series support
-- Date: 2025-11-17
-- Purpose: Add series_id and series_trip_number columns to link rides to recurring series

-- Add series support columns to rides table
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES recurring_trip_series(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS series_trip_number INTEGER;

-- Create indexes for series queries
CREATE INDEX IF NOT EXISTS idx_rides_series ON rides(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rides_series_number ON rides(series_id, series_trip_number) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rides_series_status ON rides(series_id, ride_status) WHERE series_id IS NOT NULL;

-- Add constraints (only if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_series_trip_number'
  ) THEN
    ALTER TABLE rides 
    ADD CONSTRAINT valid_series_trip_number 
    CHECK (series_trip_number IS NULL OR series_trip_number > 0);
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN rides.series_id IS 'Links ride to a recurring trip series (NULL for non-recurring rides)';
COMMENT ON COLUMN rides.series_trip_number IS 'Sequential number of this trip within the series (1, 2, 3, etc.)';
