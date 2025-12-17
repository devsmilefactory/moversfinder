-- Notification System RPC Functions
-- Core functions for notification management

BEGIN;

-- ============================================================================
-- UPDATE FCM TOKEN
-- ============================================================================

CREATE OR REPLACE FUNCTION update_fcm_token(
  p_user_id UUID,
  p_fcm_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    fcm_token = p_fcm_token,
    fcm_token_updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- CREATE NOTIFICATION (with preference filtering)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_notification_type notification_type,
  p_category notification_category,
  p_priority notification_priority,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_ride_id UUID DEFAULT NULL,
  p_series_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_offer_id UUID DEFAULT NULL,
  p_context_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_prefs RECORD;
  v_should_send BOOLEAN := TRUE;
  v_language_code TEXT;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
  
  -- If no preferences exist, create default
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id) VALUES (p_user_id);
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
  END IF;
  
  -- Check category preferences
  v_should_send := CASE p_category
    WHEN 'offers' THEN v_prefs.offers_enabled
    WHEN 'ride_progress' THEN v_prefs.ride_progress_enabled
    WHEN 'task_progress' THEN v_prefs.task_progress_enabled
    WHEN 'payments' THEN v_prefs.payments_enabled
    WHEN 'cancellations' THEN v_prefs.cancellations_enabled
    WHEN 'series_updates' THEN v_prefs.series_updates_enabled
    ELSE TRUE
  END;
  
  -- Check Do Not Disturb (skip for critical notifications)
  IF v_prefs.dnd_enabled AND p_priority NOT IN ('high', 'urgent') THEN
    IF CURRENT_TIME BETWEEN v_prefs.dnd_start_time AND v_prefs.dnd_end_time THEN
      v_should_send := FALSE;
    END IF;
  END IF;
  
  -- If notification should not be sent, return NULL
  IF NOT v_should_send THEN
    RETURN NULL;
  END IF;
  
  -- Get user's language
  v_language_code := COALESCE(v_prefs.language_code, 'en');
  
  -- Create notification record
  INSERT INTO notifications (
    user_id,
    notification_type,
    category,
    priority,
    title,
    message,
    action_url,
    ride_id,
    series_id,
    task_id,
    offer_id,
    context_data,
    language_code,
    is_read,
    is_active,
    type  -- Legacy compatibility
  ) VALUES (
    p_user_id,
    p_notification_type,
    p_category,
    p_priority,
    p_title,
    p_message,
    p_action_url,
    p_ride_id,
    p_series_id,
    p_task_id,
    p_offer_id,
    p_context_data,
    v_language_code,
    FALSE,
    TRUE,
    'ride'  -- Legacy compatibility
  ) RETURNING id INTO v_notification_id;
  
  -- Queue for push notification delivery (if enabled)
  IF v_prefs.push_enabled THEN
    PERFORM pg_notify('notification_push_queue', v_notification_id::TEXT);
  END IF;
  
  -- Trigger realtime update for in-app display (if enabled)
  IF v_prefs.in_app_enabled THEN
    PERFORM pg_notify('notification_realtime', 
      jsonb_build_object(
        'notification_id', v_notification_id,
        'user_id', p_user_id,
        'type', p_notification_type,
        'priority', p_priority
      )::TEXT
    );
  END IF;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- MARK NOTIFICATION AS READ
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET 
    is_read = TRUE,
    is_active = FALSE,
    read_at = NOW()
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- GET UNREAD COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = p_user_id AND is_read = FALSE;
$$;

-- ============================================================================
-- GET NOTIFICATION HISTORY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_notification_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  notification_type notification_type,
  category notification_category,
  priority notification_priority,
  title TEXT,
  message TEXT,
  action_url TEXT,
  is_read BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  ride_id UUID,
  series_id UUID,
  task_id UUID,
  context_data JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    id,
    notification_type,
    category,
    priority,
    title,
    message,
    action_url,
    is_read,
    is_active,
    created_at,
    read_at,
    ride_id,
    series_id,
    task_id,
    context_data
  FROM notifications
  WHERE 
    user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND (NOT p_unread_only OR is_read = FALSE)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

COMMIT;
