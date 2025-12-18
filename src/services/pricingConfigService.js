/**
 * Pricing Configuration Service
 * Fetches pricing configuration from database with caching
 */

import { supabase } from '../lib/supabase';

// Cache for pricing config (refreshes every 5 minutes)
let pricingConfigCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Default pricing values (fallback if database is unavailable)
 */
const DEFAULT_PRICING = {
  base_price: 2.0,
  price_per_km: 0.5,
  min_fare: 2.0,
  min_distance_km: 3.0,
  vehicle_prices: {
    motorcycle: 5,
    sedan: 8,
    mpv: 10,
    'large-mpv': 12,
    suv: 12,
    van: 15,
    truck: 20
  },
  size_multipliers: {
    small: 1,
    medium: 1.5,
    large: 2,
    extra_large: 3
  }
};

/**
 * Fetch current active pricing configuration from database
 * Uses cache to avoid excessive database calls
 * @returns {Promise<Object>} Pricing configuration object
 */
export async function getPricingConfig() {
  // Check cache first
  const now = Date.now();
  if (pricingConfigCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return pricingConfigCache;
  }

  try {
    // Try to fetch from database view
    const { data, error } = await supabase
      .from('current_pricing_config')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.warn('Failed to fetch pricing config from database, using defaults:', error);
      // Use defaults if database fetch fails
      pricingConfigCache = DEFAULT_PRICING;
      cacheTimestamp = now;
      return DEFAULT_PRICING;
    }

    if (data) {
      // Parse JSONB fields if they're strings
      const config = {
        base_price: parseFloat(data.base_price) || DEFAULT_PRICING.base_price,
        price_per_km: parseFloat(data.price_per_km) || DEFAULT_PRICING.price_per_km,
        min_fare: parseFloat(data.min_fare) || DEFAULT_PRICING.min_fare,
        min_distance_km: parseFloat(data.min_distance_km) || DEFAULT_PRICING.min_distance_km,
        vehicle_prices: typeof data.vehicle_prices === 'string' 
          ? JSON.parse(data.vehicle_prices) 
          : (data.vehicle_prices || DEFAULT_PRICING.vehicle_prices),
        size_multipliers: typeof data.size_multipliers === 'string'
          ? JSON.parse(data.size_multipliers)
          : (data.size_multipliers || DEFAULT_PRICING.size_multipliers)
      };

      // Update cache
      pricingConfigCache = config;
      cacheTimestamp = now;
      return config;
    }

    // No active config found, use defaults
    pricingConfigCache = DEFAULT_PRICING;
    cacheTimestamp = now;
    return DEFAULT_PRICING;
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    // Use defaults on error
    pricingConfigCache = DEFAULT_PRICING;
    cacheTimestamp = now;
    return DEFAULT_PRICING;
  }
}

/**
 * Clear pricing config cache (useful after updates)
 */
export function clearPricingConfigCache() {
  pricingConfigCache = null;
  cacheTimestamp = null;
}

/**
 * Update pricing configuration (admin only)
 * @param {Object} updates - Pricing configuration updates
 * @returns {Promise<Object>} Updated configuration
 */
export async function updatePricingConfig(updates) {
  try {
    // Get current active config ID
    const { data: currentConfig, error: fetchError } = await supabase
      .from('pricing_config')
      .select('id')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Deactivate current config
    if (currentConfig) {
      await supabase
        .from('pricing_config')
        .update({ is_active: false })
        .eq('id', currentConfig.id);
    }

    // Create new active config
    const { data: newConfig, error: insertError } = await supabase
      .from('pricing_config')
      .insert({
        base_price: updates.base_price,
        price_per_km: updates.price_per_km,
        min_fare: updates.min_fare || updates.base_price,
        min_distance_km: updates.min_distance_km || 3.0,
        vehicle_prices: updates.vehicle_prices || DEFAULT_PRICING.vehicle_prices,
        size_multipliers: updates.size_multipliers || DEFAULT_PRICING.size_multipliers,
        is_active: true
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Clear cache
    clearPricingConfigCache();

    return newConfig;
  } catch (error) {
    console.error('Error updating pricing config:', error);
    throw error;
  }
}
