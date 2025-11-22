-- Add missing columns to ride_offers table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_offers' AND column_name = 'accepted_at') THEN
    ALTER TABLE ride_offers ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_offers' AND column_name = 'rejected_at') THEN
    ALTER TABLE ride_offers ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create RPC function for atomic bid acceptance with driver availability check
-- This function ensures that drivers cannot accept multiple concurrent instant rides

CREATE OR REPLACE FUNCTION accept_driver_bid(
  p_ride_id UUID,
  p_offer_id UUID,
  p_driver_id UUID,
  p_passenger_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_instant_ride_count INTEGER;
  v_result JSON;
  v_ride_record RECORD;
BEGIN
  -- Log the bid acceptance attempt
  RAISE NOTICE 'Attempting to accept bid: ride_id=%, offer_id=%, driver_id=%, passenger_id=%', 
    p_ride_id, p_offer_id, p_driver_id, p_passenger_id;
  
  -- Check if driver has any active instant rides
  SELECT COUNT(*)
  INTO v_active_instant_ride_count
  FROM rides
  WHERE driver_id = p_driver_id
    AND ride_timing = 'instant'
    AND ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');
  
  RAISE NOTICE 'Driver has % active instant rides', v_active_instant_ride_count;
  
  -- If driver is engaged in an instant ride, reject the bid acceptance
  IF v_active_instant_ride_count > 0 THEN
    RAISE NOTICE 'Driver is engaged, rejecting bid acceptance';
    
    -- Create notification for driver
    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (
      p_driver_id,
      'Bid Rejected - Already Engaged',
      'A passenger tried to accept your bid, but you are currently engaged in an active trip',
      'info',
      NOW()
    );
    
    -- Return error response
    v_result := json_build_object(
      'success', false,
      'error', 'driver_unavailable',
      'message', 'Driver is already engaged in a trip'
    );
    
    RETURN v_result;
  END IF;
  
  -- Driver is available, proceed with bid acceptance in a transaction
  BEGIN
    -- Verify the ride exists and is still pending
    SELECT * INTO v_ride_record
    FROM rides
    WHERE id = p_ride_id
      AND user_id = p_passenger_id
      AND ride_status = 'pending'
    FOR UPDATE; -- Lock the row to prevent concurrent modifications
    
    IF NOT FOUND THEN
      RAISE NOTICE 'Ride not found or not in pending status';
      v_result := json_build_object(
        'success', false,
        'error', 'ride_not_available',
        'message', 'This ride is no longer available'
      );
      RETURN v_result;
    END IF;
    
    -- Update ride with driver assignment
    UPDATE rides
    SET 
      driver_id = p_driver_id,
      ride_status = 'accepted',
      acceptance_status = 'accepted',
      status_updated_at = NOW()
    WHERE id = p_ride_id;
    
    RAISE NOTICE 'Ride updated with driver assignment';
    
    -- Update accepted offer
    UPDATE ride_offers
    SET 
      offer_status = 'accepted',
      accepted_at = NOW()
    WHERE id = p_offer_id
      AND driver_id = p_driver_id
      AND ride_id = p_ride_id;
    
    RAISE NOTICE 'Offer marked as accepted';
    
    -- Reject all other pending offers for this ride
    UPDATE ride_offers
    SET 
      offer_status = 'rejected',
      rejected_at = NOW()
    WHERE ride_id = p_ride_id
      AND id != p_offer_id
      AND offer_status = 'pending';
    
    RAISE NOTICE 'Other offers rejected';
    
    -- Create notification for driver
    INSERT INTO notifications (user_id, title, message, type, action_url, created_at)
    VALUES (
      p_driver_id,
      '✅ Bid Accepted',
      'Your bid has been accepted! Start heading to the pickup location.',
      'success',
      '/driver/active-trips',
      NOW()
    );
    
    -- Create notification for passenger
    INSERT INTO notifications (user_id, title, message, type, action_url, created_at)
    VALUES (
      p_passenger_id,
      '🚗 Driver Assigned',
      'A driver has been assigned to your ride!',
      'success',
      '/user/active-rides',
      NOW()
    );
    
    RAISE NOTICE 'Notifications created';
    
    -- Return success response
    v_result := json_build_object(
      'success', true,
      'message', 'Bid accepted successfully',
      'ride_id', p_ride_id
    );
    
    RETURN v_result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically, just return error
    RAISE NOTICE 'Transaction failed: %', SQLERRM;
    
    v_result := json_build_object(
      'success', false,
      'error', 'transaction_failed',
      'message', SQLERRM
    );
    
    RETURN v_result;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_driver_bid(UUID, UUID, UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION accept_driver_bid IS 
'Atomically accepts a driver bid with availability check. Prevents drivers from accepting multiple concurrent instant rides.';
