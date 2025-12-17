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
 */

/**
 * Pricing constants
 * All prices in USD (can be converted to ZWL based on exchange rate)
 */
const PRICING = {
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

/**
 * Helper function to calculate base fare and distance charge
 * @private
 */
const calculateBaseFareAndDistance = (distanceKm) => {
  let baseFare = PRICING.MIN_FARE_USD;
  let distanceCharge = 0;
  
  if (distanceKm >= PRICING.MIN_DISTANCE_KM) {
    distanceCharge = PRICING.RATE_PER_KM_AFTER_MIN * (distanceKm - PRICING.MIN_DISTANCE_KM);
  }
  
  return { baseFare, distanceCharge };
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
 * @returns {number|null} Fare or null if invalid
 */
export const calculateEstimatedFareV2 = ({ distanceKm }) => {
  if (!distanceKm || distanceKm <= 0) return null;

  const { baseFare, distanceCharge } = calculateBaseFareAndDistance(distanceKm);
  return Math.round(baseFare + distanceCharge);
};

/**
 * Calculate taxi fare with detailed breakdown
 * @param {Object} params - Parameters object
 * @param {number} params.distanceKm - Distance in kilometers
 * @param {boolean} params.isRoundTrip - Whether this is a round trip
 * @param {number} params.numberOfDates - Number of scheduled dates
 * @returns {Object|null} Fare breakdown or null if invalid
 */
export const calculateTaxiFare = ({ distanceKm, isRoundTrip = false, numberOfDates = 1 }) => {
  if (import.meta.env.DEV) {
    console.log('🚕 Calculating taxi fare:', { distanceKm, isRoundTrip, numberOfDates });
  }
  
  if (!distanceKm || distanceKm <= 0) {
    if (import.meta.env.DEV) {
      console.warn('❌ Invalid distance for taxi fare:', distanceKm);
    }
    return null;
  }
  
  const { baseFare, distanceCharge } = calculateBaseFareAndDistance(distanceKm);
  const singleTripFare = baseFare + distanceCharge;
  const roundTripMultiplier = isRoundTrip ? 2 : 1;
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
 * @returns {Object|null} Fare breakdown or null if invalid
 */
export const calculateCourierFare = ({ 
  distanceKm, 
  vehicleType = 'sedan', 
  packageSize = 'medium',
  isRecurring = false, 
  numberOfDates = 1 
}) => {
  if (!distanceKm || distanceKm <= 0) return null;
  
  const vehicleBase = PRICING.VEHICLE_PRICES[vehicleType] || PRICING.VEHICLE_PRICES.sedan;
  const sizeMultiplier = PRICING.SIZE_MULTIPLIERS[packageSize] || PRICING.SIZE_MULTIPLIERS.medium;
  
  const { baseFare, distanceCharge } = calculateBaseFareAndDistance(distanceKm);
  const totalDistanceFare = baseFare + distanceCharge;
  const singleDeliveryFare = vehicleBase * sizeMultiplier + totalDistanceFare;
  const recurringMultiplier = isRecurring ? 2 : 1;
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
 * @returns {Object|null} Fare breakdown or null if invalid
 */
export const calculateSchoolRunFare = ({ distanceKm, isRoundTrip = false, numberOfDates = 1 }) => {
  if (!distanceKm || distanceKm <= 0) return null;
  
  const { baseFare, distanceCharge } = calculateBaseFareAndDistance(distanceKm);
  const singleTripFare = baseFare + distanceCharge;
  const roundTripMultiplier = isRoundTrip ? 2 : 1;
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
 * @returns {Object|null} Fare breakdown or null if invalid
 */
export const calculateErrandsFare = ({ errands, numberOfDates = 1, calculateDistance }) => {
  if (!errands || errands.length === 0) return null;
  
  const errandCosts = [];
  let totalBaseFare = 0;
  
  for (let i = 0; i < errands.length; i++) {
    const errand = errands[i];
    let distanceKm = 0;
    
    if (i > 0 && calculateDistance) {
      const prevErrand = errands[i - 1];
      if (prevErrand.dropoff_coordinates && errand.pickup_coordinates) {
        distanceKm = calculateDistance(prevErrand.dropoff_coordinates, errand.pickup_coordinates);
      }
    }
    
    const { baseFare, distanceCharge } = calculateBaseFareAndDistance(distanceKm);
    const errandFare = baseFare + distanceCharge;
    
    errandCosts.push({
      index: i + 1,
      description: errand.description || `Errand ${i + 1}`,
      distanceKm: Math.round(distanceKm * 100) / 100,
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
      base: `Total for ${errands.length} errands: $${totalBaseFare.toFixed(2)}`,
      dates: numberOfDates > 1 ? `${numberOfDates} dates: $${totalFare.toFixed(2)}` : null,
    }
  };
};

/**
 * Calculate bulk trips fare with detailed breakdown
 * @param {Object} params - Parameters object
 * @param {number} params.distanceKm - Distance per trip
 * @param {number} params.numberOfTrips - Number of trips
 * @returns {Object|null} Fare breakdown or null if invalid
 */
export const calculateBulkTripsFare = ({ distanceKm, numberOfTrips }) => {
  if (!distanceKm || distanceKm <= 0 || !numberOfTrips || numberOfTrips < 1) return null;
  
  const { baseFare, distanceCharge } = calculateBaseFareAndDistance(distanceKm);
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
export const calculateRoundTripFare = ({ distanceKm }) => {
  const singleTripFare = calculateEstimatedFareV2({ distanceKm });
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
export const calculateCourierPackagePrice = (pkg) => {
  const basePrice = PRICING.VEHICLE_PRICES[pkg.vehicleType] || PRICING.VEHICLE_PRICES.sedan;
  const sizeMultiplier = PRICING.SIZE_MULTIPLIERS[pkg.packageSize] || PRICING.SIZE_MULTIPLIERS.medium;
  return basePrice * sizeMultiplier;
};

/**
 * @deprecated Use calculateCourierFare instead
 */
export const calculateMultiPackageFare = (packages) => {
  if (!packages || packages.length === 0) return 0;
  return packages.reduce((total, pkg) => total + calculateCourierPackagePrice(pkg), 0);
};

/**
 * @deprecated Use calculateErrandsFare instead
 */
export const calculateErrandTasksFare = (tasks, pricePerTask = 8) => {
  if (!tasks || tasks.length === 0) return 0;
  return tasks.length * pricePerTask;
};
