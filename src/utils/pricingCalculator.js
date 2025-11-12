/**
 * Pricing Calculator Utility
 * Centralized pricing calculation functions following DRY principles
 *
 * Features:
 * - Dynamic fare calculation based on distance
 * - Service type-specific pricing
 * - Time-based pricing (peak hours, night rates)
 * - Additional charges (stops, waiting time, etc.)
 * - Currency formatting
 */

/**
 * Pricing configuration
 * All prices in USD (can be converted to ZWL based on exchange rate)
 */













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
    commissionRate: commissionRate * 100 // Convert to percentage
  };
};



/**
 * Simple fare model (applies to all services):
 * - $2.00 flat fee for any journey < 3 km
 * - For journeys >= 3 km: $2.00 base + $0.50 per km for every km beyond 3 km
 */
export const calculateEstimatedFareV2 = ({ distanceKm }) => {
  if (distanceKm === null || distanceKm === undefined || !(distanceKm > 0)) return null;
  const MIN_FARE_USD = 2.0;
  const MIN_DISTANCE_KM = 3;
  const RATE_PER_KM_AFTER_MIN = 0.5;

  if (distanceKm < MIN_DISTANCE_KM) return MIN_FARE_USD;

  const variable = RATE_PER_KM_AFTER_MIN * (distanceKm - MIN_DISTANCE_KM);
  const total = MIN_FARE_USD + variable;
  return Math.round(total);
};

/**
 * Calculate round trip fare (doubles the single trip fare)
 * @param {Object} params - Parameters object
 * @param {number} params.distanceKm - Distance in kilometers
 * @returns {number|null} Round trip fare or null if invalid
 */
export const calculateRoundTripFare = ({ distanceKm }) => {
  const singleTripFare = calculateEstimatedFareV2({ distanceKm });
  if (singleTripFare === null) return null;
  return singleTripFare * 2;
};

/**
 * Calculate total fare for recurring bookings
 * @param {Object} params - Parameters object
 * @param {number} params.singleTripFare - Fare for a single trip
 * @param {number} params.numberOfTrips - Number of trips in the series
 * @returns {number|null} Total fare for all trips or null if invalid
 */
export const calculateRecurringTotalFare = ({ singleTripFare, numberOfTrips }) => {
  if (!singleTripFare || !numberOfTrips || numberOfTrips < 1) return null;
  return singleTripFare * numberOfTrips;
};

/**
 * Calculate price for a single courier package
 * @param {Object} pkg - Package object
 * @param {string} pkg.vehicleType - Vehicle type (motorcycle, sedan, suv, van, truck)
 * @param {string} pkg.packageSize - Package size (small, medium, large, extra_large)
 * @returns {number} Package price
 */
export const calculateCourierPackagePrice = (pkg) => {
  // Base price by vehicle type
  const vehiclePrices = {
    'motorcycle': 5,
    'sedan': 8,
    'suv': 12,
    'van': 15,
    'truck': 20
  };

  // Size multiplier
  const sizeMultipliers = {
    'small': 1,
    'medium': 1.5,
    'large': 2,
    'extra_large': 3
  };

  const basePrice = vehiclePrices[pkg.vehicleType] || 8;
  const sizeMultiplier = sizeMultipliers[pkg.packageSize] || 1.5;

  return basePrice * sizeMultiplier;
};

/**
 * Calculate total price for multiple courier packages
 * @param {Array} packages - Array of package objects
 * @returns {number} Total price for all packages
 */
export const calculateMultiPackageFare = (packages) => {
  if (!packages || packages.length === 0) return 0;

  return packages.reduce((total, pkg) => {
    return total + calculateCourierPackagePrice(pkg);
  }, 0);
};

/**
 * Calculate total price for errand tasks
 * @param {Array} tasks - Array of task objects with pickup and dropoff locations
 * @param {number} pricePerTask - Fixed price per task (default: $8.00)
 * @returns {number} Total price for all tasks
 */
export const calculateErrandTasksFare = (tasks, pricePerTask = 8) => {
  if (!tasks || tasks.length === 0) return 0;
  return tasks.length * pricePerTask;
};




