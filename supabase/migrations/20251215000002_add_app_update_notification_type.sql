-- Add app_update notification type
-- Date: 2025-12-15
-- Purpose: Add app_update notification type for version update notifications

BEGIN;

-- Add app_update to notification_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'app_update' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'app_update';
    RAISE NOTICE 'Added app_update to notification_type enum';
  ELSE
    RAISE NOTICE 'app_update already exists in notification_type enum';
  END IF;
END $$;

-- Add 'system' category if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'system' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_category')
  ) THEN
    ALTER TYPE notification_category ADD VALUE IF NOT EXISTS 'system';
    RAISE NOTICE 'Added system to notification_category enum';
  ELSE
    RAISE NOTICE 'system already exists in notification_category enum';
  END IF;
END $$;

COMMIT;


