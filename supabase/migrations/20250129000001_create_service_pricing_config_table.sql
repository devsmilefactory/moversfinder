-- Create service-specific pricing configuration table
-- Allows service-specific pricing rules and multipliers without code changes

CREATE TABLE IF NOT EXISTS service_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  base_fare NUMERIC(10,2) NOT NULL DEFAULT 2.0,
  price_per_km NUMERIC(10,2) NOT NULL DEFAULT 0.5,
  min_fare NUMERIC(10,2) NOT NULL DEFAULT 2.0,
  min_distance_km NUMERIC(5,2) NOT NULL DEFAULT 3.0,
  
  -- Service-specific pricing rules
  pricing_rules JSONB DEFAULT '{
    "round_trip_multiplier": 2.0,
    "recurring_multiplier": 1.0,
    "peak_hours_multiplier": 1.2,
    "weekend_multiplier": 1.15
  }'::jsonb,
  
  -- Service-specific multipliers (vehicle types, package sizes, etc.)
  multipliers JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_base_fare CHECK (base_fare >= 0),
  CONSTRAINT valid_price_per_km CHECK (price_per_km >= 0),
  CONSTRAINT valid_min_fare CHECK (min_fare >= 0),
  CONSTRAINT valid_min_distance CHECK (min_distance_km >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_pricing_config_service_type ON service_pricing_config(service_type);
CREATE INDEX IF NOT EXISTS idx_service_pricing_config_active ON service_pricing_config(service_type, is_active) WHERE is_active = TRUE;

-- Trigger for updated_at (reuse existing function from pricing_config table)
CREATE TRIGGER trigger_update_service_pricing_config_updated_at
    BEFORE UPDATE ON service_pricing_config
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_config_updated_at();

-- RLS Policies
ALTER TABLE service_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active service pricing config"
    ON service_pricing_config FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins can manage service pricing config"
    ON service_pricing_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'admin'
        )
    );

-- Insert initial service pricing configs
INSERT INTO service_pricing_config (service_type, base_fare, price_per_km, min_fare, min_distance_km, multipliers, is_active)
VALUES
  ('taxi', 2.0, 0.5, 2.0, 3.0, '{}'::jsonb, TRUE),
  ('courier', 2.0, 0.5, 2.0, 3.0, '{
    "vehicle_prices": {"motorcycle": 5, "sedan": 8, "suv": 12, "van": 15, "truck": 20},
    "size_multipliers": {"small": 1, "medium": 1.5, "large": 2, "extra_large": 3}
  }'::jsonb, TRUE),
  ('school_run', 2.0, 0.5, 2.0, 3.0, '{}'::jsonb, TRUE),
  ('errands', 2.0, 0.5, 2.0, 3.0, '{}'::jsonb, TRUE),
  ('bulk', 2.0, 0.5, 2.0, 3.0, '{}'::jsonb, TRUE)
ON CONFLICT DO NOTHING;



