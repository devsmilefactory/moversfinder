-- Consolidated Ride Management System Schema
-- Date: 2025-12-11
-- Purpose: Establish complete, clean schema for comprehensive ride management
-- This migration consolidates all previous ride system improvements into a single, authoritative schema

-- ============================================================================
-- ENUMS AND TYPES
-- ============================================================================

-- Service types
DO $$ BEGIN
    CREATE TYPE service_type_enum AS ENUM ('taxi', 'courier', 'school_run', 'errands');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ride timing types
DO $$ BEGIN
    CREATE TYPE ride_timing_enum AS ENUM ('instant', 'scheduled_single', 'scheduled_recurring');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ride status types
DO $$ BEGIN
    CREATE TYPE ride_status_enum AS ENUM (
        'pending',              -- Awaiting driver assignment
        'accepted',             -- Driver assigned, awaiting activation
        'driver_on_way',        -- Driver en route to pickup
        'driver_arrived',       -- Driver at pickup location
        'trip_started',         -- Trip in progress
        'trip_completed',       -- Trip finished, awaiting payment/rating
        'completed',            -- Fully processed (paid/rated)
        'cancelled'             -- Cancelled by user or system
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Execution sub-states
DO $$ BEGIN
    CREATE TYPE execution_sub_state_enum AS ENUM (
        'driver_on_the_way',
        'driver_arrived', 
        'trip_started',
        'trip_completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trip leg types for round trips
DO $$ BEGIN
    CREATE TYPE trip_leg_type_enum AS ENUM ('outbound', 'return', 'single');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Package sizes for courier
DO $$ BEGIN
    CREATE TYPE package_size_enum AS ENUM ('small', 'medium', 'large', 'extra_large');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Rides table (main entity)
CREATE TABLE IF NOT EXISTS rides (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership and Assignment
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    company_id UUID REFERENCES corporate_profiles(user_id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Ride Classification
    service_type TEXT NOT NULL DEFAULT 'taxi' CHECK (service_type IN ('taxi', 'courier', 'school_run', 'errands')),
    ride_timing TEXT NOT NULL DEFAULT 'instant' CHECK (ride_timing IN ('instant', 'scheduled_single', 'scheduled_recurring')),
    booking_source TEXT DEFAULT 'individual' CHECK (booking_source IN ('individual', 'corporate')),
    
    -- State Management (Single Source of Truth)
    ride_status TEXT NOT NULL DEFAULT 'pending' CHECK (ride_status IN (
        'pending', 'accepted', 'driver_on_way', 'driver_arrived', 
        'trip_started', 'trip_completed', 'completed', 'cancelled'
    )),
    acceptance_status TEXT DEFAULT 'pending' CHECK (acceptance_status IN ('pending', 'accepted', 'rejected')),
    execution_sub_state TEXT CHECK (execution_sub_state IN (
        'driver_on_the_way', 'driver_arrived', 'trip_started', 'trip_completed'
    )),
    
    -- Location and Route
    pickup_address TEXT NOT NULL,
    pickup_coordinates JSONB,
    dropoff_address TEXT NOT NULL,
    dropoff_coordinates JSONB,
    distance_km FLOAT,
    
    -- Scheduling
    scheduled_datetime TIMESTAMPTZ,
    needs_activation BOOLEAN DEFAULT FALSE,
    
    -- Pricing and Costs
    estimated_cost NUMERIC(10,2),
    fare NUMERIC(10,2),
    quoted_price NUMERIC(10,2),
    cost_per_trip NUMERIC(10,2),
    
    -- Multi-Session Support (Universal Progress Tracking)
    total_rides_in_series INTEGER DEFAULT 1 CHECK (total_rides_in_series > 0),
    number_of_trips INTEGER DEFAULT 1 CHECK (number_of_trips > 0),
    completed_rides_count INTEGER DEFAULT 0 CHECK (completed_rides_count >= 0),
    remaining_rides_count INTEGER DEFAULT 0 CHECK (remaining_rides_count >= 0),
    series_trip_number INTEGER DEFAULT 1 CHECK (series_trip_number > 0),
    sequence_number INTEGER GENERATED ALWAYS AS (COALESCE(series_trip_number, 1)) STORED,
    
    -- Recurring Series Support
    series_id UUID REFERENCES recurring_trip_series(id) ON DELETE SET NULL,
    
    -- Round Trip Support
    is_round_trip BOOLEAN DEFAULT FALSE,
    trip_leg_type TEXT CHECK (trip_leg_type IN ('outbound', 'return', 'single')),
    round_trip_occurrence_number INTEGER CHECK (round_trip_occurrence_number > 0),
    round_trip_leg_number INTEGER CHECK (round_trip_leg_number IN (1, 2)),
    outbound_cost NUMERIC(10,2),
    return_cost NUMERIC(10,2),
    active_leg TEXT CHECK (active_leg IN ('outbound', 'return', 'completed')),
    outbound_completed_at TIMESTAMPTZ,
    return_completed_at TIMESTAMPTZ,
    
    -- Errand Support
    errand_tasks JSONB,
    number_of_tasks INTEGER DEFAULT 0 CHECK (number_of_tasks >= 0),
    completed_tasks_count INTEGER DEFAULT 0 CHECK (completed_tasks_count >= 0),
    remaining_tasks_count INTEGER DEFAULT 0 CHECK (remaining_tasks_count >= 0),
    active_errand_task_index INTEGER DEFAULT 0 CHECK (active_errand_task_index >= 0),
    tasks_total INTEGER GENERATED ALWAYS AS (COALESCE(number_of_tasks, 0)) STORED,
    tasks_done INTEGER GENERATED ALWAYS AS (COALESCE(completed_tasks_count, 0)) STORED,
    tasks_left INTEGER GENERATED ALWAYS AS (COALESCE(remaining_tasks_count, 0)) STORED,
    
    -- Service-Specific Fields
    -- Taxi/School Run
    passenger_name TEXT,
    contact_number TEXT,
    number_of_passengers INTEGER DEFAULT 1 CHECK (number_of_passengers > 0),
    
    -- Courier
    package_size TEXT CHECK (package_size IN ('small', 'medium', 'large', 'extra_large')),
    courier_package_details TEXT,
    package_details TEXT, -- Legacy compatibility
    recipient_name TEXT,
    recipient_phone TEXT,
    recipient_email TEXT,
    
    -- General
    special_requests TEXT,
    special_instructions TEXT,
    
    -- Ratings and Reviews
    passenger_rating INTEGER CHECK (passenger_rating >= 1 AND passenger_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    passenger_review TEXT,
    driver_review TEXT,
    
    -- Computed Cost Field
    remaining_cost NUMERIC(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN number_of_trips > 0 AND completed_rides_count IS NOT NULL 
            THEN estimated_cost * (number_of_trips - completed_rides_count) / number_of_trips
            ELSE estimated_cost
        END
    ) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_completed_rides CHECK (completed_rides_count <= total_rides_in_series),
    CONSTRAINT valid_remaining_rides CHECK (remaining_rides_count <= total_rides_in_series),
    CONSTRAINT valid_completed_tasks CHECK (completed_tasks_count <= number_of_tasks),
    CONSTRAINT valid_remaining_tasks CHECK (remaining_tasks_count <= number_of_tasks),
    CONSTRAINT valid_round_trip_leg CHECK (
        (is_round_trip = FALSE) OR 
        (is_round_trip = TRUE AND trip_leg_type IN ('outbound', 'return') AND round_trip_leg_number IN (1, 2))
    ),
    CONSTRAINT valid_errand_tasks CHECK (
        (service_type != 'errands') OR 
        (service_type = 'errands' AND number_of_tasks > 0)
    )
);

-- Recurring trip series table
CREATE TABLE IF NOT EXISTS recurring_trip_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Series Configuration
    series_name TEXT,
    service_type TEXT NOT NULL CHECK (service_type IN ('taxi', 'courier', 'school_run', 'errands')),
    recurrence_pattern TEXT NOT NULL CHECK (recurrence_pattern IN ('daily', 'weekly', 'weekdays', 'weekends', 'custom')),
    recurrence_days INTEGER[] DEFAULT NULL,
    
    -- Trip Template
    pickup_address TEXT NOT NULL,
    pickup_coordinates JSONB,
    dropoff_address TEXT NOT NULL,
    dropoff_coordinates JSONB,
    estimated_cost NUMERIC(10,2),
    
    -- Schedule Configuration
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    trip_time TIME NOT NULL,
    
    -- Progress Tracking
    rides_total INTEGER NOT NULL CHECK (rides_total > 0),
    rides_done INTEGER DEFAULT 0 CHECK (rides_done >= 0),
    rides_cancelled INTEGER DEFAULT 0 CHECK (rides_cancelled >= 0),
    next_trip_date TIMESTAMPTZ,
    
    -- Round Trip Support
    is_round_trip BOOLEAN DEFAULT FALSE,
    
    -- Errand Template
    errand_tasks_template JSONB,
    
    -- Status Management
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_completed_trips CHECK (rides_done <= rides_total),
    CONSTRAINT valid_cancelled_trips CHECK (rides_cancelled <= rides_total),
    CONSTRAINT valid_total_progress CHECK ((rides_done + rides_cancelled) <= rides_total),
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_next_trip_date CHECK (next_trip_date IS NULL OR next_trip_date >= start_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core ride indexes
CREATE INDEX IF NOT EXISTS idx_rides_user_status ON rides(user_id, ride_status);
CREATE INDEX IF NOT EXISTS idx_rides_driver_status ON rides(driver_id, ride_status) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rides_service_timing ON rides(service_type, ride_timing);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_scheduled_datetime ON rides(scheduled_datetime) WHERE scheduled_datetime IS NOT NULL;

-- Feed-specific indexes
CREATE INDEX IF NOT EXISTS idx_rides_pending_instant ON rides(ride_status, ride_timing, pickup_coordinates) 
    WHERE ride_status = 'pending' AND ride_timing = 'instant';
CREATE INDEX IF NOT EXISTS idx_rides_active_driver ON rides(driver_id, ride_status) 
    WHERE ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');
CREATE INDEX IF NOT EXISTS idx_rides_series_id ON rides(series_id) WHERE series_id IS NOT NULL;

-- Recurring series indexes
CREATE INDEX IF NOT EXISTS idx_recurring_series_user ON recurring_trip_series(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_driver ON recurring_trip_series(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_series_status ON recurring_trip_series(status);
CREATE INDEX IF NOT EXISTS idx_recurring_series_next_trip ON recurring_trip_series(next_trip_date) 
    WHERE status = 'active' AND next_trip_date IS NOT NULL;

-- Geospatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_rides_pickup_location ON rides USING GIST (
    ST_GeomFromGeoJSON(pickup_coordinates::text)
) WHERE pickup_coordinates IS NOT NULL;

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to maintain ride progress automatically
CREATE OR REPLACE FUNCTION maintain_ride_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_total INTEGER;
    v_sequence INTEGER;
BEGIN
    -- Normalize total trips
    v_total := GREATEST(COALESCE(NEW.total_rides_in_series, NEW.number_of_trips, 1), 1);
    v_sequence := COALESCE(NULLIF(NEW.series_trip_number, 0), 1);
    
    -- Set normalized values
    NEW.total_rides_in_series := v_total;
    NEW.number_of_trips := COALESCE(NEW.number_of_trips, v_total);
    NEW.series_trip_number := v_sequence;
    
    -- Calculate progress
    IF NEW.ride_status IN ('trip_completed', 'completed') THEN
        NEW.completed_rides_count := LEAST(v_total, v_sequence);
    ELSE
        NEW.completed_rides_count := GREATEST(v_sequence - 1, 0);
    END IF;
    
    NEW.remaining_rides_count := GREATEST(v_total - v_sequence, 0);
    
    -- Handle errand task progress
    IF NEW.service_type = 'errands' AND NEW.number_of_tasks > 0 THEN
        NEW.remaining_tasks_count := GREATEST(
            NEW.number_of_tasks - COALESCE(NEW.completed_tasks_count, 0), 
            0
        );
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_maintain_ride_progress ON rides;
CREATE TRIGGER trigger_maintain_ride_progress
    BEFORE INSERT OR UPDATE ON rides
    FOR EACH ROW
    EXECUTE FUNCTION maintain_ride_progress();

-- Function to update recurring series updated_at
CREATE OR REPLACE FUNCTION update_recurring_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_recurring_series_updated_at ON recurring_trip_series;
CREATE TRIGGER trigger_recurring_series_updated_at
    BEFORE UPDATE ON recurring_trip_series
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_series_updated_at();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE rides IS 'Main rides table supporting all service types and scheduling patterns';
COMMENT ON TABLE recurring_trip_series IS 'Recurring trip series configuration and progress tracking';

-- Key column comments
COMMENT ON COLUMN rides.service_type IS 'Type of service: taxi, courier, school_run, errands';
COMMENT ON COLUMN rides.ride_timing IS 'When ride occurs: instant, scheduled_single, scheduled_recurring';
COMMENT ON COLUMN rides.ride_status IS 'Current ride state in the lifecycle';
COMMENT ON COLUMN rides.series_id IS 'Links to recurring_trip_series for recurring rides';
COMMENT ON COLUMN rides.trip_leg_type IS 'For round trips: outbound, return, or single';
COMMENT ON COLUMN rides.errand_tasks IS 'JSON array of tasks for errand rides';
COMMENT ON COLUMN rides.sequence_number IS 'Legacy compatibility column (mirrors series_trip_number)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_trip_series TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;