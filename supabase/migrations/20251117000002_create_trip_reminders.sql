-- Migration: Create trip_reminders table
-- Date: 2025-11-17
-- Purpose: Enable scheduling and tracking of trip reminders for recurring series

-- Create trip_reminders table
CREATE TABLE IF NOT EXISTS trip_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES recurring_trip_series(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Reminder Configuration
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('24_hours', '1_hour', 'series_ending', 'series_complete', 'custom')),
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Reminder Content
  title VARCHAR(255),
  message TEXT,
  notification_data JSONB DEFAULT '{}',
  
  -- Delivery Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= 5),
  CONSTRAINT valid_sent_at CHECK (sent_at IS NULL OR status = 'sent'),
  CONSTRAINT valid_failed_reason CHECK (failed_reason IS NULL OR status = 'failed')
);

-- Create indexes for efficient reminder processing
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON trip_reminders(reminder_time, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_series ON trip_reminders(series_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON trip_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_ride ON trip_reminders(ride_id) WHERE ride_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_type ON trip_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_processing ON trip_reminders(status, reminder_time) WHERE status IN ('pending', 'failed');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_trip_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trip_reminders_updated_at
  BEFORE UPDATE ON trip_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_reminders_updated_at();

-- Add helpful comments
COMMENT ON TABLE trip_reminders IS 'Stores scheduled reminders for recurring trip series';
COMMENT ON COLUMN trip_reminders.reminder_type IS 'Type of reminder: 24_hours, 1_hour, series_ending, series_complete, custom';
COMMENT ON COLUMN trip_reminders.reminder_time IS 'When the reminder should be sent';
COMMENT ON COLUMN trip_reminders.notification_data IS 'Additional data for the notification (JSON)';
COMMENT ON COLUMN trip_reminders.status IS 'Reminder status: pending, sent, failed, cancelled';
COMMENT ON COLUMN trip_reminders.retry_count IS 'Number of retry attempts (max 5)';
