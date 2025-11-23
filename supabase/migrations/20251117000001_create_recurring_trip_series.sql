-- Migration: Create recurring_trip_series table
-- Date: 2025-11-17
-- Purpose: Enable tracking of recurring trip series with progress monitoring

-- Create recurring_trip_series table
CREATE TABLE IF NOT EXISTS recurring_trip_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Series Configuration
  series_name VARCHAR(255),
  recurrence_pattern VARCHAR(50) NOT NULL CHECK (recurrence_pattern IN ('daily', 'weekly', 'weekdays', 'weekends', 'custom')),
  recurrence_days INTEGER[] DEFAULT NULL, -- Array of day numbers (0=Sunday, 6=Saturday) for custom patterns
  
  -- Trip Details
  pickup_address TEXT NOT NULL,
  pickup_coordinates JSONB,
  dropoff_address TEXT NOT NULL,
  dropoff_coordinates JSONB,
  service_type VARCHAR(50) DEFAULT 'standard',
  estimated_cost DECIMAL(10,2),
  
  -- Schedule Configuration
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  trip_time TIME NOT NULL, -- Time of day for trips (e.g., '08:30:00')
  
  -- Progress Tracking
  total_trips INTEGER NOT NULL CHECK (total_trips > 0),
  completed_trips INTEGER DEFAULT 0 CHECK (completed_trips >= 0),
  cancelled_trips INTEGER DEFAULT 0 CHECK (cancelled_trips >= 0),
  next_trip_date TIMESTAMP WITH TIME ZONE,
  
  -- Status Management
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_completed_trips CHECK (completed_trips <= total_trips),
  CONSTRAINT valid_cancelled_trips CHECK (cancelled_trips <= total_trips),
  CONSTRAINT valid_total_progress CHECK ((completed_trips + cancelled_trips) <= total_trips),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT valid_next_trip_date CHECK (next_trip_date IS NULL OR next_trip_date >= start_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_series_user ON recurring_trip_series(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_driver ON recurring_trip_series(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_series_status ON recurring_trip_series(status);
CREATE INDEX IF NOT EXISTS idx_recurring_series_next_trip ON recurring_trip_series(next_trip_date) WHERE status = 'active' AND next_trip_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_series_active ON recurring_trip_series(status, user_id) WHERE status IN ('active', 'paused');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_recurring_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recurring_series_updated_at
  BEFORE UPDATE ON recurring_trip_series
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_series_updated_at();

-- Add helpful comments
COMMENT ON TABLE recurring_trip_series IS 'Stores recurring trip series configuration and progress tracking';
COMMENT ON COLUMN recurring_trip_series.recurrence_pattern IS 'Pattern for trip recurrence: daily, weekly, weekdays, weekends, custom';
COMMENT ON COLUMN recurring_trip_series.recurrence_days IS 'Array of day numbers for custom patterns (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN recurring_trip_series.total_trips IS 'Total number of trips planned in this series';
COMMENT ON COLUMN recurring_trip_series.completed_trips IS 'Number of trips completed successfully';
COMMENT ON COLUMN recurring_trip_series.cancelled_trips IS 'Number of trips cancelled';
COMMENT ON COLUMN recurring_trip_series.next_trip_date IS 'Calculated date/time for the next trip in the series';
COMMENT ON COLUMN recurring_trip_series.status IS 'Series status: active, paused, completed, cancelled';
