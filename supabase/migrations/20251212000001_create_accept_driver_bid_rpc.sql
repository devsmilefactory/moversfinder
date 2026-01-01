-- Create accept_driver_bid RPC Function
-- Date: 2025-12-12
-- Purpose: Atomic bid acceptance with driver availability checks
-- This function ensures drivers cannot accept multiple concurrent instant rides

CREATE OR REPLACE FUNCTION public.accept_driver_bid(
    p_ride_id uuid,
    p_offer_id uuid,
    p_driver_id uuid,
    p_passenger_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer record;
    v_ride record;
    v_active_count integer;
    v_result jsonb;
BEGIN
    -- Start transaction (implicit in function)
    
    -- Lock and verify the offer exists and is pending
    SELECT * INTO v_offer
    FROM ride_offers
    WHERE id = p_offer_id
      AND ride_id = p_ride_id
      AND driver_id = p_driver_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'offer_not_found',
            'message', 'Offer not found or does not match the ride and driver'
        );
    END IF;
    
    IF v_offer.offer_status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'offer_not_pending',
            'message', 'This offer is no longer pending'
        );
    END IF;
    
    -- Lock and verify the ride exists and is pending
    SELECT * INTO v_ride
    FROM rides
    WHERE id = p_ride_id
      AND user_id = p_passenger_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ride_not_found',
            'message', 'Ride not found or does not belong to this passenger'
        );
    END IF;
    
    IF v_ride.ride_status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ride_not_available',
            'message', 'This ride is no longer available'
        );
    END IF;
    
    IF v_ride.driver_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ride_not_available',
            'message', 'This ride has already been assigned to another driver'
        );
    END IF;
    
    -- Check for driver concurrency: cannot have more than one active instant ride
    SELECT COUNT(*) INTO v_active_count
    FROM rides
    WHERE driver_id = p_driver_id
      AND ride_timing = 'instant'
      AND ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');
    
    IF v_active_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'driver_unavailable',
            'message', 'This driver is currently engaged in another instant trip'
        );
    END IF;
    
    -- Accept the offer
    UPDATE ride_offers
    SET offer_status = 'accepted',
        responded_at = NOW()
    WHERE id = p_offer_id;
    
    -- Reject all other pending offers for this ride
    UPDATE ride_offers
    SET offer_status = 'rejected',
        responded_at = NOW()
    WHERE ride_id = p_ride_id
      AND id != p_offer_id
      AND offer_status = 'pending';
    
    -- Update the ride with driver assignment
    UPDATE rides
    SET driver_id = p_driver_id,
        ride_status = 'accepted',
        fare = v_offer.quoted_price,
        status_updated_at = NOW(),
        acceptance_status = 'accepted'
    WHERE id = p_ride_id;
    
    -- Mark driver as engaged (set active_ride_id and is_available = false)
    -- Use UPSERT to handle case where driver_locations row doesn't exist
    INSERT INTO driver_locations (driver_id, active_ride_id, is_available, updated_at, coordinates)
    VALUES (p_driver_id, p_ride_id, false, NOW(), '{"lat": 0, "lng": 0}'::jsonb)
    ON CONFLICT (driver_id) 
    DO UPDATE SET 
      active_ride_id = p_ride_id,
      is_available = false,
      updated_at = NOW();
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Bid accepted successfully',
        'ride_id', p_ride_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback is automatic in function
        RETURN jsonb_build_object(
            'success', false,
            'error', 'transaction_failed',
            'message', 'Failed to accept bid: ' || SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_driver_bid(uuid, uuid, uuid, uuid) TO authenticated;






