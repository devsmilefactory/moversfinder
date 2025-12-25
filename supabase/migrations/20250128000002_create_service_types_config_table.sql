-- Create Service Types Configuration Table
-- Date: 2025-01-28
-- Purpose: Phase 2 - Database Scalability (Optional)
-- Enable dynamic service type configuration without code changes

-- ============================================================================
-- SERVICE TYPES CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_types (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_types_enabled ON service_types(enabled) WHERE enabled = TRUE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_service_types_updated_at ON service_types;
CREATE TRIGGER trigger_service_types_updated_at
    BEFORE UPDATE ON service_types
    FOR EACH ROW
    EXECUTE FUNCTION update_service_types_updated_at();

-- ============================================================================
-- INITIAL DATA - Insert current service types
-- ============================================================================

INSERT INTO service_types (id, display_name, enabled, config) VALUES
  ('taxi', 'Taxi', TRUE, '{"icon": "Car", "color": "blue"}'::jsonb),
  ('courier', 'Courier', TRUE, '{"icon": "Package", "color": "purple"}'::jsonb),
  ('school_run', 'School Run', TRUE, '{"icon": "GraduationCap", "color": "indigo"}'::jsonb),
  ('errands', 'Errands', TRUE, '{"icon": "ShoppingBag", "color": "green"}'::jsonb),
  ('bulk', 'Bulk Transport', TRUE, '{"icon": "Truck", "color": "orange"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE service_types IS 'Configuration table for service types. Enables adding/removing service types without code changes.';
COMMENT ON COLUMN service_types.id IS 'Service type identifier (e.g., taxi, courier, school_run)';
COMMENT ON COLUMN service_types.display_name IS 'Human-readable display name';
COMMENT ON COLUMN service_types.enabled IS 'Whether this service type is currently enabled';
COMMENT ON COLUMN service_types.config IS 'JSONB configuration for service-specific settings (icons, colors, etc.)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON service_types TO authenticated;



