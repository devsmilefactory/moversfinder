-- Reset Rides and Driver Status
-- Date: 2025-12-13
-- Purpose: Clear all rides and reset driver availability status for fresh start

-- ============================================================================
-- STEP 1: Reset driver availability status
-- ============================================================================

-- Mark all drivers as available and online
UPDATE driver_locations
SET 
  is_available = true,
  is_online = true
WHERE is_available = false OR is_online = false;

-- ============================================================================
-- STEP 2: Clear all ride-related data
-- ============================================================================

-- Delete all ride offers
DELETE FROM ride_offers;

-- Delete all notifications related to rides
DELETE FROM notifications 
WHERE type = 'ride' OR notification_type IN (
  'NEW_OFFER', 
  'OFFER_ACCEPTED', 
  'OFFER_REJECTED', 
  'DRIVER_ON_THE_WAY', 
  'DRIVER_ARRIVED', 
  'TRIP_STARTED', 
  'TRIP_COMPLETED', 
  'PAYMENT_CONFIRMED', 
  'RIDE_CANCELLED_BY_PASSENGER', 
  'RIDE_CANCELLED_BY_DRIVER',
  'ERRAND_TASK_UPDATED',
  'RECURRING_SERIES_COMPLETED'
);

-- Delete all rides (cascade will handle related data)
DELETE FROM rides;

-- ============================================================================
-- STEP 3: Reset recurring trip series (optional - uncomment if needed)
-- ============================================================================

-- Uncomment the following if you also want to clear recurring trip series:
-- DELETE FROM recurring_trip_series;

-- ============================================================================
-- VERIFICATION QUERIES (for manual checking)
-- ============================================================================

-- Check remaining rides count (should be 0)
-- SELECT COUNT(*) as remaining_rides FROM rides;

-- Check driver availability (all should be available)
-- SELECT driver_id, is_online, is_available FROM driver_locations;

-- Check remaining offers (should be 0)
-- SELECT COUNT(*) as remaining_offers FROM ride_offers;


