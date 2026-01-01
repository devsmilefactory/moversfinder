-- Remove Service Type and Ride Timing CHECK Constraints
-- Date: 2025-01-28
-- Purpose: Phase 2 - Database Scalability
-- Remove hardcoded CHECK constraints to enable adding ride types without migrations
-- Validation is moved to application level (utils/rideValidation.js)

-- ============================================================================
-- REMOVE CHECK CONSTRAINTS FROM RIDES TABLE
-- ============================================================================

-- Remove service_type CHECK constraint
ALTER TABLE rides 
  DROP CONSTRAINT IF EXISTS rides_service_type_check;

-- Remove ride_timing CHECK constraint  
ALTER TABLE rides 
  DROP CONSTRAINT IF EXISTS rides_ride_timing_check;

-- Note: The columns remain as TEXT NOT NULL with defaults
-- service_type TEXT NOT NULL DEFAULT 'taxi'
-- ride_timing TEXT NOT NULL DEFAULT 'instant'
-- Validation is now handled at the application level

-- ============================================================================
-- REMOVE CHECK CONSTRAINT FROM RECURRING_TRIP_SERIES TABLE
-- ============================================================================

-- Remove service_type CHECK constraint from recurring_trip_series
ALTER TABLE recurring_trip_series 
  DROP CONSTRAINT IF EXISTS recurring_trip_series_service_type_check;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN rides.service_type IS 'Type of service: taxi, courier, school_run, errands, bulk, etc. (validated at application level)';
COMMENT ON COLUMN rides.ride_timing IS 'When ride occurs: instant, scheduled_single, scheduled_recurring (validated at application level)';
COMMENT ON COLUMN recurring_trip_series.service_type IS 'Type of service for recurring series (validated at application level)';







