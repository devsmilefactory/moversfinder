/**
 * Service Pricing Configuration Service
 * Fetches service-specific pricing configuration from database with caching
 */

import { supabase } from '../lib/supabase';

let servicePricingCache = {};
let cacheTimestamps = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get default pricing configuration for a service type
 * @param {string} serviceType - Service type
 * @returns {Object} Default pricing configuration
 */
function getDefaultPricingConfig(serviceType) {
  const defaults = {
    base_fare: 2.0,
    price_per_km: 0.5,
    min_fare: 2.0,
    min_distance_km: 3.0,
    pricing_rules: {
      round_trip_multiplier: 2.0,
      recurring_multiplier: 1.0,
      peak_hours_multiplier: 1.2,
      weekend_multiplier: 1.15
    },
    multipliers: {}
  };

  // Service-specific defaults
  if (serviceType === 'courier') {
    defaults.multipliers = {
      vehicle_prices: { motorcycle: 5, sedan: 8, suv: 12, van: 15, truck: 20 },
      size_multipliers: { small: 1, medium: 1.5, large: 2, extra_large: 3 }
    };
  }

  return defaults;
}

/**
 * Fetch service-specific pricing configuration from database
 * Uses cache to avoid excessive database calls
 * @param {string} serviceType - Service type (taxi, courier, school_run, errands, bulk)
 * @returns {Promise<Object>} Service pricing configuration object
 */
export async function getServicePricingConfig(serviceType) {
  if (!serviceType) {
    console.warn('getServicePricingConfig called without serviceType, using defaults');
    return getDefaultPricingConfig('taxi');
  }

  // Normalize service type
  const normalizedType = serviceType.toLowerCase().replace('_', '');

  // Check cache
  const now = Date.now();
  if (servicePricingCache[normalizedType] && 
      cacheTimestamps[normalizedType] && 
      (now - cacheTimestamps[normalizedType]) < CACHE_DURATION) {
    return servicePricingCache[normalizedType];
  }

  try {
    const { data, error } = await supabase
      .from('service_pricing_config')
      .select('*')
      .eq('service_type', normalizedType)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn(`Failed to fetch pricing for ${normalizedType}, using defaults:`, error);
      const defaultConfig = getDefaultPricingConfig(normalizedType);
      servicePricingCache[normalizedType] = defaultConfig;
      cacheTimestamps[normalizedType] = now;
      return defaultConfig;
    }

    if (data) {
      const config = {
        base_fare: parseFloat(data.base_fare) || 2.0,
        price_per_km: parseFloat(data.price_per_km) || 0.5,
        min_fare: parseFloat(data.min_fare) || 2.0,
        min_distance_km: parseFloat(data.min_distance_km) || 3.0,
        pricing_rules: typeof data.pricing_rules === 'string' 
          ? JSON.parse(data.pricing_rules) 
          : (data.pricing_rules || {}),
        multipliers: typeof data.multipliers === 'string'
          ? JSON.parse(data.multipliers)
          : (data.multipliers || {})
      };

      servicePricingCache[normalizedType] = config;
      cacheTimestamps[normalizedType] = now;
      return config;
    }

    // No config found, use defaults
    const defaultConfig = getDefaultPricingConfig(normalizedType);
    servicePricingCache[normalizedType] = defaultConfig;
    cacheTimestamps[normalizedType] = now;
    return defaultConfig;
  } catch (error) {
    console.error(`Error fetching pricing for ${normalizedType}:`, error);
    const defaultConfig = getDefaultPricingConfig(normalizedType);
    servicePricingCache[normalizedType] = defaultConfig;
    cacheTimestamps[normalizedType] = now;
    return defaultConfig;
  }
}

/**
 * Clear service pricing cache
 * @param {string|null} serviceType - Service type to clear, or null to clear all
 */
export function clearServicePricingCache(serviceType = null) {
  if (serviceType) {
    const normalizedType = serviceType.toLowerCase().replace('_', '');
    delete servicePricingCache[normalizedType];
    delete cacheTimestamps[normalizedType];
  } else {
    servicePricingCache = {};
    cacheTimestamps = {};
  }
}



