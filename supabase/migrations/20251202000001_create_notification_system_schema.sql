-- Notification System Schema Migration
-- Creates comprehensive notification system with FCM support, preferences, and delivery tracking

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Notification Type Enum
CREATE TYPE notification_type AS ENUM (
  -- Offer Lifecycle
  'new_offer',
  'offer_accepted',
  'offer_rejected',
  
  -- Ride Activation
  'ride_needs_activation',
  'ride_activated',
  'errand_activated',
  
  -- Ride Progress (Taxi, Courier, School/Work Run)
  'driver_on_the_way',
  'driver_arrived',
  'trip_started',
  'trip_completed',
  
  -- Errand Task Progress
  'task_activated',
  'task_driver_on_the_way',
  'task_driver_arrived',
  'task_started',
  'task_completed',
  
  -- Payment
  'payment_confirmed',
  
  -- Cancellation
  'ride_cancelled_by_passenger',
  'ride_cancelled_by_driver',
  'ride_cancelled_by_system',
  
  -- Recurring Series
  'recurring_instance_completed',
  'recurring_series_completed',
  'recurring_series_cancelled'
);

-- Notification Category Enum (for user preferences)
CREATE TYPE notification_category AS ENUM (
  'offers',
  'ride_progress',
  'task_progress',
  'payments',
  'cancellations',
  'series_updates'
);

-- Notification Priority Enum
CREATE TYPE notification_priority AS ENUM (
  'low',        -- Informational (series progress)
  'normal',     -- Standard updates (progress)
  'high',       -- Critical (cancellation, arrival)
  'urgent'      -- Immediate action required (activation needed)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification Type & Category
  notification_type notification_type NOT NULL,
  category notification_category NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Context Data (for deep linking and display)
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  series_id UUID REFERENCES recurring_trip_series(id) ON DELETE SET NULL,
  task_id UUID,  -- References errand_tasks if that table exists
  offer_id UUID,  -- References ride_offers if that table exists
  
  -- Additional context as JSON
  context_data JSONB DEFAULT '{}',
  
  -- Deep Link
  action_url TEXT,
  
  -- Status Tracking
  is_read BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  read_at TIMESTAMPTZ,
  
  -- Delivery Tracking
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  push_delivery_confirmed BOOLEAN DEFAULT FALSE,
  push_delivery_confirmed_at TIMESTAMPTZ,
  push_error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Localization
  language_code TEXT DEFAULT 'en',
  
  -- Batching (for rate limiting)
  batch_id UUID,
  is_batched BOOLEAN DEFAULT FALSE,
  
  -- Legacy compatibility (for existing trigger)
  type TEXT  -- Keep for backward compatibility
);

-- Indexes for fast queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX idx_notifications_user_active ON notifications(user_id, is_active, created_at DESC)
  WHERE is_active = TRUE;

CREATE INDEX idx_notifications_ride ON notifications(ride_id, created_at DESC)
  WHERE ride_id IS NOT NULL;

CREATE INDEX idx_notifications_pending_push ON notifications(push_sent, created_at)
  WHERE push_sent = FALSE AND retry_count < 3;

CREATE INDEX idx_notifications_expires ON notifications(expires_at)
  WHERE expires_at < NOW();

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Category Toggles
  offers_enabled BOOLEAN DEFAULT TRUE,
  ride_progress_enabled BOOLEAN DEFAULT TRUE,
  task_progress_enabled BOOLEAN DEFAULT TRUE,
  payments_enabled BOOLEAN DEFAULT TRUE,
  cancellations_enabled BOOLEAN DEFAULT TRUE,
  series_updates_enabled BOOLEAN DEFAULT TRUE,
  
  -- Delivery Method Toggles
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  
  -- Sound & Vibration
  sound_enabled BOOLEAN DEFAULT TRUE,
  vibration_enabled BOOLEAN DEFAULT TRUE,
  
  -- Do Not Disturb
  dnd_enabled BOOLEAN DEFAULT FALSE,
  dnd_start_time TIME,
  dnd_end_time TIME,
  
  -- Language
  language_code TEXT DEFAULT 'en',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure one preference record per user
CREATE UNIQUE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- ============================================================================
-- NOTIFICATION DELIVERY LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery attempt details
  attempt_number INTEGER NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('push', 'in_app')),
  
  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Timestamps
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_delivery_log_notification ON notification_delivery_log(notification_id, attempted_at DESC);

-- ============================================================================
-- ADD FCM TOKEN TO PROFILES
-- ============================================================================

-- Add FCM token column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'fcm_token'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN fcm_token TEXT,
    ADD COLUMN fcm_token_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON profiles(fcm_token) 
WHERE fcm_token IS NOT NULL;

COMMIT;
