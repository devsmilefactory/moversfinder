-- Add indexes for ride management performance optimization

-- Index for faster active instant ride queries (driver availability check)
CREATE INDEX IF NOT EXISTS idx_rides_active_instant 
ON rides (driver_id, ride_timing, ride_status) 
WHERE ride_timing = 'instant' 
  AND ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');

-- Index for passenger active rides queries
CREATE INDEX IF NOT EXISTS idx_rides_active_passenger 
ON rides (user_id, ride_status) 
WHERE ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');

-- Index for scheduled rides activation queries
CREATE INDEX IF NOT EXISTS idx_rides_scheduled_activation 
ON rides (driver_id, ride_status, scheduled_datetime) 
WHERE ride_status = 'accepted' 
  AND ride_timing IN ('scheduled_single', 'scheduled_recurring');

-- Index for ride offers by driver (for pending bids view)
CREATE INDEX IF NOT EXISTS idx_ride_offers_driver_status
ON ride_offers (driver_id, offer_status, created_at DESC);

-- Index for ride offers by ride (for passenger offers panel)
CREATE INDEX IF NOT EXISTS idx_ride_offers_ride_status
ON ride_offers (ride_id, offer_status, created_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_rides_active_instant IS 
'Optimizes driver availability checks for instant rides';

COMMENT ON INDEX idx_rides_active_passenger IS 
'Optimizes active ride queries for passengers';

COMMENT ON INDEX idx_rides_scheduled_activation IS 
'Optimizes scheduled ride activation queries for drivers';

COMMENT ON INDEX idx_ride_offers_driver_status IS 
'Optimizes pending bids view for drivers';

COMMENT ON INDEX idx_ride_offers_ride_status IS 
'Optimizes offers panel for passengers';
