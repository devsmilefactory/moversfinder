-- Create pricing configuration table
-- Allows admins to control base price and price per km from dashboard

CREATE TABLE IF NOT EXISTS pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Pricing Configuration
    base_price NUMERIC(10,2) NOT NULL DEFAULT 2.0,
    price_per_km NUMERIC(10,2) NOT NULL DEFAULT 0.5,
    min_fare NUMERIC(10,2) NOT NULL DEFAULT 2.0,
    min_distance_km NUMERIC(5,2) NOT NULL DEFAULT 3.0,
    
    -- Vehicle Type Pricing (optional, for future use)
    vehicle_prices JSONB DEFAULT '{
        "motorcycle": 5,
        "sedan": 8,
        "mpv": 10,
        "large-mpv": 12,
        "suv": 12,
        "van": 15,
        "truck": 20
    }'::jsonb,
    
    -- Package Size Multipliers (optional, for future use)
    size_multipliers JSONB DEFAULT '{
        "small": 1,
        "medium": 1.5,
        "large": 2,
        "extra_large": 3
    }'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_base_price CHECK (base_price >= 0),
    CONSTRAINT valid_price_per_km CHECK (price_per_km >= 0),
    CONSTRAINT valid_min_fare CHECK (min_fare >= 0),
    CONSTRAINT valid_min_distance CHECK (min_distance_km >= 0)
);

-- Create index for active config
CREATE INDEX IF NOT EXISTS idx_pricing_config_active ON pricing_config(is_active) WHERE is_active = TRUE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pricing_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_pricing_config_updated_at
    BEFORE UPDATE ON pricing_config
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_config_updated_at();

-- Insert default pricing configuration
INSERT INTO pricing_config (base_price, price_per_km, min_fare, min_distance_km, is_active)
VALUES (2.0, 0.5, 2.0, 3.0, TRUE)
ON CONFLICT DO NOTHING;

-- Add RLS policies (if needed)
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active pricing config
CREATE POLICY "Anyone can read active pricing config"
    ON pricing_config FOR SELECT
    USING (is_active = TRUE);

-- Policy: Only admins can insert/update/delete (adjust based on your auth setup)
-- Note: You may need to adjust these policies based on your admin role setup
CREATE POLICY "Admins can manage pricing config"
    ON pricing_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'admin'
        )
    );

-- Create view for easy access to current active pricing
CREATE OR REPLACE VIEW current_pricing_config AS
SELECT 
    base_price,
    price_per_km,
    min_fare,
    min_distance_km,
    vehicle_prices,
    size_multipliers,
    updated_at
FROM pricing_config
WHERE is_active = TRUE
ORDER BY updated_at DESC
LIMIT 1;
