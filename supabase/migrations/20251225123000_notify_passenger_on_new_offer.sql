-- Notify passenger when a new driver offer is created (ride_offers INSERT)
-- Uses create_notification so push pipeline can deliver it.

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_passenger_on_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_ride RECORD;
  v_driver RECORD;
  v_title text;
  v_message text;
BEGIN
  SELECT user_id, service_type INTO v_ride
  FROM public.rides
  WHERE id = NEW.ride_id;

  IF v_ride.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_driver
  FROM public.profiles
  WHERE id = NEW.driver_id;

  v_title := 'New Driver Offer';
  v_message := format(
    '%s offered $%s for your %s ride',
    COALESCE(v_driver.name, 'A driver'),
    COALESCE(NEW.quoted_price::text, '?'),
    COALESCE(v_ride.service_type, 'ride')
  );

  PERFORM public.create_notification(
    v_ride.user_id,
    'new_offer'::notification_type,
    'OFFERS'::notification_category,
    'NORMAL'::notification_priority,
    v_title,
    v_message,
    '/rides?tab=pending',
    NEW.ride_id,
    NULL::uuid,
    NULL::uuid,
    NEW.id,
    jsonb_build_object(
      'offer_id', NEW.id,
      'driver_id', NEW.driver_id,
      'quoted_price', NEW.quoted_price
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_notify_passenger_on_new_offer ON public.ride_offers;

CREATE TRIGGER trigger_notify_passenger_on_new_offer
  AFTER INSERT ON public.ride_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_passenger_on_new_offer();

COMMIT;






