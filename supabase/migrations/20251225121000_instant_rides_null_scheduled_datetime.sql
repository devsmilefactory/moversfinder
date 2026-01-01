-- Ensure instant rides never persist scheduled_datetime/recurrence_pattern
-- Keeps future scheduled/recurring functionality intact; only enforces consistency for ride_timing='instant'

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_instant_null_schedule_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.ride_timing = 'instant' THEN
    NEW.scheduled_datetime := NULL;
    NEW.recurrence_pattern := NULL;
    NEW.needs_activation := FALSE;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_enforce_instant_null_schedule_fields ON public.rides;

CREATE TRIGGER trigger_enforce_instant_null_schedule_fields
  BEFORE INSERT OR UPDATE OF ride_timing, scheduled_datetime, recurrence_pattern, needs_activation
  ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_instant_null_schedule_fields();

COMMIT;






