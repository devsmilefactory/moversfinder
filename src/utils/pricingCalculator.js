/**
 * Pricing Calculator Utility
 * Centralized pricing calculation functions with detailed breakdowns
 *
 * Features:
 * - Service-specific fare calculations (taxi, courier, school run, errands, bulk)
 * - Detailed fare breakdowns for transparency
 * - Support for recurring trips and multiple dates
 * - Round trip and package size multipliers
 * - Currency formatting
 * - Fetches pricing from database with fallback to defaults
 */

import { getPricingConfig } from '../services/pricingConfigService';
import { estimateErrandTask } from './errandTasks';

/**
 * Default pricing constants (fallback if database is unavailable)
 * All prices in USD (can be converted to ZWL based on exchange rate)
 */
const DEFAULT_PRICING = {
  MIN_FARE_USD: 2.0,
  MIN_DISTANCE_KM: 3,
  RATE_PER_KM_AFTER_MIN: 0.5,
  VEHICLE_PRICES: {
    motorcycle: 5,
    sedan: 8,
    suv: 12,
    van: 15,
    truck: 20
  },
  SIZE_MULTIPLIERS: {
    small: 1,
    medium: 1.5,
    large: 2,
    extra_large: 3
  }
};

// Cache for pricing config
let pricingConfigCache = null;

/**
 * Get pricing configuration (from database or cache)
 * @returns {Promise<Object>} Pricing configuration
 */
async function getPricing() {
  if (pricingConfigCache) {
    return pricingConfigCache;
  }
  
  try {
    const config = await getPricingConfig();
    pricingConfigCache = {
      MIN_FARE_USD: config.min_fare || config.base_price || DEFAULT_PRICING.MIN_FARE_USD,
      MIN_DISTANCE_KM: config.min_distance_km || DEFAULT_PRICING.MIN_DISTANCE_KM,
      RATE_PER_KM_AFTER_MIN: config.price_per_km || DEFAULT_PRICING.RATE_PER_KM_AFTER_MIN,
      VEHICLE_PRICES: config.vehicle_prices || DEFAULT_PRICING.VEHICLE_PRICES,
      SIZE_MULTIPLIERS: config.size_multipliers || DEFAULT_PRICING.SIZE_MULTIPLIERS
    };
    return pricingConfigCache;
  } catch (error) {
    console.warn('Failed to fetch pricing config, using defaults:', error);
    return DEFAULT_PRICING;
  }
}

/**
 * Convert service pricing config to internal pricing format
 * @private
 * @param {Object} servicePricingConfig - Service-specific pricing config
 * @returns {Object} Internal pricing format
 */
function convertServicePricingToInternal(servicePricingConfig) {
  if (!servicePricingConfig) return null;
  
  return {
    MIN_FARE_USD: servicePricingConfig.min_fare || servicePricingConfig.base_fare || DEFAULT_PRICING.MIN_FARE_USD,
    MIN_DISTANCE_KM: servicePricingConfig.min_distance_km || DEFAULT_PRICING.MIN_DISTANCE_KM,
    RATE_PER_KM_AFTER_MIN: servicePricingConfig.price_per_km || DEFAULT_PRICING.RATE_PER_KM_AFTER_MIN,
    VEHICLE_PRICES: servicePricingConfig.multipliers?.vehicle_prices || DEFAULT_PRICING.VEHICLE_PRICES,
    SIZE_MULTIPLIERS: servicePricingConfig.multipliers?.size_multipliers || DEFAULT_PRICING.SIZE_MULTIPLIERS,
    PRICING_RULES: servicePricingConfig.pricing_rules || {}
  };
}

/**
 * Helper function to calculate base fare and distance charge
 * @param {number} distanceKm - Distance in kilometers
 * @param {Object} pricing - Pricing configuration (optional)
 * @param {Object} servicePricingConfig - Service-specific pricing config (optional)
 * @returns {Promise<Object>} Base fare and distance charge
 */
export async function calculateBaseFareAndDistance(distanceKm, pricing = null, servicePricingConfig = null) {
  // Use service-specific config if provided, otherwise use global pricing
  let PRICING;
  if (servicePricingConfig) {
    PRICING = convertServicePricingToInternal(servicePricingConfig);
  } else {
    PRICING = pricing || await getPricing();
  }
  
  let baseFare = PRICING.MIN_FARE_USD;
  let distanceCharge = 0;
  
  if (distanceKm >= PRICING.MIN_DISTANCE_KM) {
    distanceCharge = PRICING.RATE_PER_KM_AFTER_MIN * (distanceKm - PRICING.MIN_DISTANCE_KM);
  }
  
  return { baseFare, distanceCharge, pricing: PRICING };
};

/**
 * Format price for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted price string
 */
export const formatPrice = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }

  const symbol = currency === 'USD' ? '$' : 'ZWL ';
  return `${symbol}${amount.toFixed(2)}`;
};

/**
 * Calculate driver earnings (after platform commission)
 * @param {number} totalFare - Total fare amount
 * @param {number} commissionRate - Platform commission rate (default: 0.15 = 15%)
 * @returns {Object} Earnings breakdown
 */
export const calculateDriverEarnings = (totalFare, commissionRate = 0.15) => {
  const commission = totalFare * commissionRate;
  const driverEarnings = totalFare - commission;

  return {
    totalFare,
    commission,
    driverEarnings: Math.round(driverEarnings * 100) / 100,
    commissionRate: commissionRate * 100
  };
};

/**
 * Simple fare calculation (legacy support)
 * @param {Object} params - Parameters object
 * @param {number} params.distanceKm - Distance in kilometers
 * @returns {Promise<number|null>} Fare or null if invalid
 */
export const calculateEstimatedFareV2 = async ({ distanceKm }) => {
  if (!distanceKm || distanceKm <= 0) return null;

  const { baseFare, distanceCharge } = await calculateBaseFareAndDistance(distanceKm);
  return Math.round(baseFare + distanceCharge);
};

/**
 * Calculate taxi fare with detailed breakdown
 * @param {Object} params - Parameters object
 * @param {number} params.distanceKm - Distance in kilometers
 * @param {boolean} params.isRoundTrip - Whether this is a round trip
 * @param {number} params.numberOfDates - Number of scheduled dates
 * @param {Object} params.servicePricingConfig - Service-specific pricing config (optional)
 * @returns {Promise<Object|null>} Fare breakdown or null if invalid
 */
export const calculateTaxiFare = async ({ distanceKm, isRoundTrip = false, numberOfDates = 1, servicePricingConfig = null }) => {
  if (import.meta.env.DEV) {
    console.log('🚕 Calculating taxi fare:', { distanceKm, isRoundTrip, numberOfDates });
  }
  
  if (!distanceKm || distanceKm <= 0) {
    if (import.meta.env.DEV) {
      console.warn('❌ Invalid distance for taxi fare:', distanceKm);
    }
    return null;
  }
  
  const { baseFare, distanceCharge, pricing: PRICING } = await calculateBaseFareAndDistance(distanceKm, null, servicePricingConfig);
  const singleTripFare = baseFare + distanceCharge;
  
  // Use pricing rules from service config if available
  const roundTripMultiplier = isRoundTrip 
    ? (servicePricingConfig?.pricing_rules?.round_trip_multiplier || 2.0)
    : 1;
  const fareAfterRoundTrip = singleTripFare * roundTripMultiplier;
  const totalFare = fareAfterRoundTrip * numberOfDates;
  
  const result = {
    baseFare: Math.round(baseFare * 100) / 100,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    singleTripFare: Math.round(singleTripFare * 100) / 100,
    roundTripMultiplier,
    numberOfDates,
    totalFare: Math.round(totalFare * 100) / 100,
    breakdown: {
      base: `Base fare: $${baseFare.toFixed(2)}`,
      distance: distanceCharge > 0 ? `Distance charge (${(distanceKm - PRICING.MIN_DISTANCE_KM).toFixed(1)}km × $${PRICING.RATE_PER_KM_AFTER_MIN}): $${distanceCharge.toFixed(2)}` : null,
      roundTrip: isRoundTrip ? `Round trip (×2): $${fareAfterRoundTrip.toFixed(2)}` : null,
      dates: numberOfDates > 1 ? `${numberOfDates} dates: $${totalFare.toFixed(2)}` : null,
    }
  };
  
  if (import.meta.env.DEV) {
    console.log('✅ Taxi fare calculated:', result);
  }
  
  return result;
};

/**
 * Calculate courier fare with detailed breakdown
 * @param {Object} params - Parameters object
 * @param {number} params.distanceKm - Distance in kilometers
 * @param {string} params.vehicleType - Vehicle type
 * @param {string} params.packageSize - Package size
 * @param {boolean} params.isRecurring - Whether this is recurring
 * @param {number} params.numberOfDates - Number of dates
 * @param {Object} params.servicePricingConfig - Service-specific pricing config (optional)
 * @returns {Promise<Object|null>} Fare breakdown or null if invalid
 */
export const calculateCourierFare = async ({ 
  distanceKm, 
  vehicleType = 'sedan', 
  packageSize = 'medium',
  isRecurring = false, 
  numberOfDates = 1,
  servicePricingConfig = null
}) => {
  if (!distanceKm || distanceKm <= 0) return null;
  
  // Use service-specific config if available, otherwise fall back to global
  let PRICING;
  if (servicePricingConfig) {
    PRICING = convertServicePricingToInternal(servicePricingConfig);
  } else {
    PRICING = await getPricing();
  }
  
  const vehicleBase = PRICING.VEHICLE_PRICES[vehicleType] || PRICING.VEHICLE_PRICES.sedan;
  const sizeMultiplier = PRICING.SIZE_MULTIPLIERS[packageSize] || PRICING.SIZE_MULTIPLIERS.medium;
  
  const { baseFare, distanceCharge } = await calculateBaseFareAndDistance(distanceKm, PRICING, servicePricingConfig);
  const totalDistanceFare = baseFare + distanceCharge;
  const singleDeliveryFare = vehicleBase * sizeMultiplier + totalDistanceFare;
  
  // Use pricing rules from service config if available
  const recurringMultiplier = isRecurring 
    ? (servicePricingConfig?.pricing_rules?.recurring_multiplier || 2.0)
    : 1;
  const fareAfterRecurring = singleDeliveryFare * recurringMultiplier;
  const totalFare = fareAfterRecurring * numberOfDates;
  
  return {
    vehicleBase: Math.round(vehicleBase * 100) / 100,
    sizeMultiplier,
    distanceFare: Math.round(totalDistanceFare * 100) / 100,
    singleDeliveryFare: Math.round(singleDeliveryFare * 100) / 100,
    recurringMultiplier,
    numberOfDates,
    totalFare: Math.round(totalFare * 100) / 100,
    breakdown: {
      vehicle: `${vehicleType} base: $${vehicleBase.toFixed(2)}`,
      size: `${packageSize} size (×${sizeMultiplier}): $${(vehicleBase * sizeMultiplier).toFixed(2)}`,
      distance: `Distance (${distanceKm.toFixed(1)}km): $${totalDistanceFare.toFixed(2)}`,
      recurring: isRecurring ? `Recurring (×2): $${fareAfterRecurring.toFixed(2)}` : null,
      dates: numberOfDates > 1 ? `${numberOfDates} dates: $${totalFare.toFixed(2)}` : null,
    }
  };
};

/**
 * Calculate school/work run fare with detailed breakdown
 * @param {Object} params - Parameters object
 * @param {number} params.distanceKm - Distance in kilometers
 * @param {boolean} params.isRoundTrip - Whether this is a round trip
 * @param {number} params.numberOfDates - Number of scheduled dates
 * @param {Object} params.servicePricingConfig - Service-specific pricing config (optional)
 * @returns {Promise<Object|null>} Fare breakdown or null if invalid
 */
export const calculateSchoolRunFare = async ({ distanceKm, isRoundTrip = false, numberOfDates = 1, servicePricingConfig = null }) => {
  if (!distanceKm || distanceKm <= 0) return null;
  
  const { baseFare, distanceCharge, pricing: PRICING } = await calculateBaseFareAndDistance(distanceKm, null, servicePricingConfig);
  const singleTripFare = baseFare + distanceCharge;
  
  // Use pricing rules from service config if available
  const roundTripMultiplier = isRoundTrip 
    ? (servicePricingConfig?.pricing_rules?.round_trip_multiplier || 2.0)
    : 1;
  const fareAfterRoundTrip = singleTripFare * roundTripMultiplier;
  const totalFare = fareAfterRoundTrip * numberOfDates;
  
  return {
    baseFare: Math.round(baseFare * 100) / 100,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    singleTripFare: Math.round(singleTripFare * 100) / 100,
    roundTripMultiplier,
    numberOfDates,
    totalFare: Math.round(totalFare * 100) / 100,
    breakdown: {
      base: `Base fare: $${baseFare.toFixed(2)}`,
      distance: distanceCharge > 0 ? `Distance charge (${(distanceKm - PRICING.MIN_DISTANCE_KM).toFixed(1)}km × $${PRICING.RATE_PER_KM_AFTER_MIN}): $${distanceCharge.toFixed(2)}` : null,
      roundTrip: isRoundTrip ? `Round trip (×2): $${fareAfterRoundTrip.toFixed(2)}` : null,
      dates: numberOfDates > 1 ? `${numberOfDates} dates: $${totalFare.toFixed(2)}` : null,
    }
  };
};

/**
 * Calculate errands fare with detailed breakdown
 * @param {Object} params - Parameters object
 * @param {Array} params.errands - Array of errand objects
 * @param {number} params.numberOfDates - Number of scheduled dates
 * @param {Function} params.calculateDistance - Distance calculation function
 * @param {Object} params.servicePricingConfig - Service-specific pricing config (optional)
 * @returns {Promise<Object|null>} Fare breakdown or null if invalid
 */
export const calculateErrandsFare = async ({ errands, numberOfDates = 1, servicePricingConfig = null }) => {
  if (!errands || errands.length === 0) return null;
  
  const errandCosts = [];
  let totalBaseFare = 0;
  
  for (let i = 0; i < errands.length; i++) {
    const errand = errands[i];
    
    // Use estimateErrandTask for consistent pricing per task
    // It handles distance calculation between startPoint and destinationPoint
    const estimate = await estimateErrandTask({
      startPoint: errand.startPoint || errand.pickup_coordinates || errand.pickup_location || errand.pickup,
      destinationPoint: errand.destinationPoint || errand.dropoff_coordinates || errand.dropoff_location || errand.dropoff,
      servicePricingConfig
    });
    
    const errandFare = estimate.cost;
    
    errandCosts.push({
      index: i + 1,
      description: errand.description || `Errand ${i + 1}`,
      distanceKm: estimate.distanceKm,
      fare: Math.round(errandFare * 100) / 100
    });
    
    totalBaseFare += errandFare;
  }
  
  const totalFare = totalBaseFare * numberOfDates;
  
  return {
    errandCosts,
    totalBaseFare: Math.round(totalBaseFare * 100) / 100,
    numberOfDates,
    totalFare: Math.round(totalFare * 100) / 100,
    breakdown: {
      errands: errandCosts.map(e => `${e.description} (${e.distanceKm}km): $${e.fare.toFixed(2)}`),
      base: `Total for ${errands.length} errand task${errands.length !== 1 ? 's' : ''}: $${totalBaseFare.toFixed(2)}`,
      dates: numberOfDates > 1 ? `${numberOfDates} dates: $${totalFare.toFixed(2)}` : null,
    }
  };
};

/**
 * Calculate bulk trips fare with detailed breakdown
 * @param {Object} params - Parameters object
 * @param {number} params.distanceKm - Distance per trip
 * @param {number} params.numberOfTrips - Number of trips
 * @param {Object} params.servicePricingConfig - Service-specific pricing config (optional)
 * @returns {Promise<Object|null>} Fare breakdown or null if invalid
 */
export const calculateBulkTripsFare = async ({ distanceKm, numberOfTrips, servicePricingConfig = null }) => {
  if (!distanceKm || distanceKm <= 0 || !numberOfTrips || numberOfTrips < 1) return null;
  
  const { baseFare, distanceCharge, pricing: PRICING } = await calculateBaseFareAndDistance(distanceKm, null, servicePricingConfig);
  const perTripFare = baseFare + distanceCharge;
  const totalFare = perTripFare * numberOfTrips;
  
  return {
    baseFare: Math.round(baseFare * 100) / 100,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    perTripFare: Math.round(perTripFare * 100) / 100,
    numberOfTrips,
    totalFare: Math.round(totalFare * 100) / 100,
    breakdown: {
      base: `Base fare per trip: $${baseFare.toFixed(2)}`,
      distance: distanceCharge > 0 ? `Distance charge per trip (${(distanceKm - PRICING.MIN_DISTANCE_KM).toFixed(1)}km × $${PRICING.RATE_PER_KM_AFTER_MIN}): $${distanceCharge.toFixed(2)}` : null,
      perTrip: `Per trip fare: $${perTripFare.toFixed(2)}`,
      total: `${numberOfTrips} trips: $${totalFare.toFixed(2)}`,
    }
  };
};

// Legacy support functions - kept for backward compatibility

/**
 * @deprecated Use calculateTaxiFare or calculateSchoolRunFare instead
 */
export const calculateRoundTripFare = async ({ distanceKm }) => {
  const singleTripFare = await calculateEstimatedFareV2({ distanceKm });
  if (singleTripFare === null) return null;
  return singleTripFare * 2;
};

/**
 * @deprecated Use service-specific fare functions instead
 */
export const calculateRecurringTotalFare = ({ singleTripFare, numberOfTrips }) => {
  if (!singleTripFare || !numberOfTrips || numberOfTrips < 1) return null;
  return singleTripFare * numberOfTrips;
};

/**
 * @deprecated Use calculateCourierFare instead
 */
export const calculateCourierPackagePrice = async (pkg) => {
  const PRICING = await getPricing();
  const basePrice = PRICING.VEHICLE_PRICES[pkg.vehicleType] || PRICING.VEHICLE_PRICES.sedan;
  const sizeMultiplier = PRICING.SIZE_MULTIPLIERS[pkg.packageSize] || PRICING.SIZE_MULTIPLIERS.medium;
  return basePrice * sizeMultiplier;
};

/**
 * @deprecated Use calculateCourierFare instead
 */
export const calculateMultiPackageFare = async (packages) => {
  if (!packages || packages.length === 0) return 0;
  let total = 0;
  for (const pkg of packages) {
    total += await calculateCourierPackagePrice(pkg);
  }
  return total;
};

/**
 * @deprecated Use calculateErrandsFare instead
 */
export const calculateErrandTasksFare = (tasks, pricePerTask = 8) => {
  if (!tasks || tasks.length === 0) return 0;
  return tasks.length * pricePerTask;
};
