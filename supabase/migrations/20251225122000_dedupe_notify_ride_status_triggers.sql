-- Remove duplicate ride status change triggers to avoid double notifications
-- Keep the more specific trigger: trigger_ride_status_notification (fires only on ride_status changes)

BEGIN;

DROP TRIGGER IF EXISTS trigger_notify_ride_status_change ON public.rides;

COMMIT;






