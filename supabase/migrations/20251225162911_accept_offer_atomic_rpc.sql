-- Create canonical accept_offer_atomic RPC
-- Purpose:
-- - Single atomic acceptance flow (Edge Function -> this RPC)
-- - Assign driver, reject competing offers, set driver engagement in driver_locations
-- - Use state machine columns (state/execution_sub_state); ride_status is derived by sync triggers
-- - Instant-only compatible (scheduled/recurring preserved but not enabled)

BEGIN;

CREATE OR REPLACE FUNCTION public.accept_offer_atomic(
  p_offer_id uuid,
  p_passenger_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_offer RECORD;
  v_ride RECORD;
  v_active_instant_count integer;
  v_updated_ride RECORD;
  v_rejected_driver_ids uuid[];
BEGIN
  -- Lock offer
  SELECT * INTO v_offer
  FROM public.ride_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_not_found');
  END IF;

  IF lower(coalesce(v_offer.offer_status, '')) <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'offer_not_pending',
      'message', format('Offer is no longer pending (status: %s)', v_offer.offer_status)
    );
  END IF;

  -- Lock ride
  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = v_offer.ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  IF v_ride.user_id <> p_passenger_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Must still be pending + unassigned
  IF v_ride.driver_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_already_assigned');
  END IF;

  IF v_ride.state IS DISTINCT FROM 'PENDING'::ride_state THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ride_not_pending',
      'message', format('Ride is no longer pending (state: %s)', v_ride.state)
    );
  END IF;

  -- Driver concurrency: cannot have more than one active instant ride
  IF v_ride.ride_timing = 'instant' THEN
    SELECT count(*) INTO v_active_instant_count
    FROM public.rides
    WHERE driver_id = v_offer.driver_id
      AND ride_timing = 'instant'
      AND state IN ('ACTIVE_PRE_TRIP'::ride_state, 'ACTIVE_EXECUTION'::ride_state)
      AND id <> v_ride.id;

    IF v_active_instant_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'driver_unavailable');
    END IF;
  END IF;

  -- Accept offer
  UPDATE public.ride_offers
  SET offer_status = 'accepted',
      responded_at = now()
  WHERE id = p_offer_id;

  -- Reject competing pending offers
  UPDATE public.ride_offers
  SET offer_status = 'rejected',
      responded_at = now()
  WHERE ride_id = v_offer.ride_id
    AND id <> p_offer_id
    AND lower(coalesce(offer_status, '')) = 'pending';

  -- Capture rejected drivers for notifications
  SELECT array_agg(distinct driver_id) INTO v_rejected_driver_ids
  FROM public.ride_offers
  WHERE ride_id = v_offer.ride_id
    AND id <> p_offer_id
    AND lower(coalesce(offer_status, '')) = 'rejected';

  -- Update ride using state machine fields (ride_status derived by triggers)
  UPDATE public.rides
  SET
    driver_id = v_offer.driver_id,
    state = 'ACTIVE_PRE_TRIP'::ride_state,
    execution_sub_state = NULL,
    acceptance_status = 'accepted',
    accepted_at = now(),
    fare = v_offer.quoted_price,
    updated_at = now()
  WHERE id = v_offer.ride_id
  RETURNING * INTO v_updated_ride;

  -- Mark driver engaged
  INSERT INTO public.driver_locations (driver_id, active_ride_id, is_available, updated_at)
  VALUES (v_offer.driver_id, v_offer.ride_id, false, now())
  ON CONFLICT (driver_id)
  DO UPDATE SET
    active_ride_id = excluded.active_ride_id,
    is_available = false,
    updated_at = now();

  -- Errands: activate first task row if errand_tasks table is used
  IF v_ride.service_type = 'errands' THEN
    UPDATE public.errand_tasks
    SET task_status = 'ACTIVATE_TASK'::task_state,
        activated_at = now(),
        updated_at = now()
    WHERE ride_id = v_offer.ride_id
      AND task_index = 0
      AND task_status = 'NOT_STARTED'::task_state;
  END IF;

  -- Event log (best-effort; do not fail acceptance if logging fails)
  BEGIN
    PERFORM public.log_ride_event(
      v_offer.ride_id,
      'PASSENGER',
      p_passenger_id,
      'OFFER_ACCEPTED',
      v_ride.state,
      v_updated_ride.state,
      v_ride.execution_sub_state,
      v_updated_ride.execution_sub_state,
      jsonb_build_object(
        'offer_id', p_offer_id,
        'driver_id', v_offer.driver_id,
        'quoted_price', v_offer.quoted_price,
        'rejected_driver_ids', coalesce(v_rejected_driver_ids, '{}'::uuid[])
      )
    );
  EXCEPTION WHEN undefined_function THEN
    NULL;
  WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'ride_id', v_offer.ride_id,
    'driver_id', v_offer.driver_id,
    'new_state', v_updated_ride.state,
    'new_sub_state', v_updated_ride.execution_sub_state,
    'rejected_driver_ids', coalesce(v_rejected_driver_ids, '{}'::uuid[])
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_offer_atomic(uuid, uuid) TO authenticated;

COMMIT;






