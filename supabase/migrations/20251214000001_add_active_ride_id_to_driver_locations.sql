-- Migration: Add active_ride_id to driver_locations
-- Date: 2025-12-14
-- Purpose: Track which ride a driver is currently engaged with for availability checks

-- Add active_ride_id column to driver_locations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'active_ride_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.driver_locations
        ADD COLUMN active_ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_driver_locations_active_ride_id 
        ON public.driver_locations(active_ride_id) 
        WHERE active_ride_id IS NOT NULL;
        
        -- Add comment
        COMMENT ON COLUMN public.driver_locations.active_ride_id IS 
        'The currently active ride ID for this driver. NULL when driver is available.';
    END IF;
END $$;






