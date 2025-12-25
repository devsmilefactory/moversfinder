/**
 * Ride Validation Utilities
 * 
 * Application-level validation for ride-related data.
 * This replaces database-level CHECK constraints to enable
 * adding new ride types without database migrations.
 * 
 * Part of Phase 2: Database Scalability
 */

/**
 * Valid service types
 * Add new service types here without requiring database migrations
 */
export const VALID_SERVICE_TYPES = [
  'taxi',
  'courier',
  'school_run',
  'errands',
  'bulk'
];

/**
 * Valid ride timing types
 */
export const VALID_RIDE_TIMING_TYPES = [
  'instant',
  'scheduled_single',
  'scheduled_recurring'
];

/**
 * Valid ride status types
 */
export const VALID_RIDE_STATUS_TYPES = [
  'pending',
  'accepted',
  'driver_on_way',
  'driver_arrived',
  'trip_started',
  'trip_completed',
  'completed',
  'cancelled'
];

/**
 * Validate service type
 * 
 * @param {string} serviceType - Service type to validate
 * @returns {boolean} - True if valid
 */
export function validateServiceType(serviceType) {
  if (!serviceType || typeof serviceType !== 'string') {
    return false;
  }
  
  const normalized = serviceType.trim().toLowerCase();
  return VALID_SERVICE_TYPES.includes(normalized);
}

/**
 * Validate ride timing type
 * 
 * @param {string} rideTiming - Ride timing to validate
 * @returns {boolean} - True if valid
 */
export function validateRideTiming(rideTiming) {
  if (!rideTiming || typeof rideTiming !== 'string') {
    return false;
  }
  
  const normalized = rideTiming.trim().toLowerCase();
  return VALID_RIDE_TIMING_TYPES.includes(normalized);
}

/**
 * Validate ride status
 * 
 * @param {string} rideStatus - Ride status to validate
 * @returns {boolean} - True if valid
 */
export function validateRideStatus(rideStatus) {
  if (!rideStatus || typeof rideStatus !== 'string') {
    return false;
  }
  
  const normalized = rideStatus.trim().toLowerCase();
  return VALID_RIDE_STATUS_TYPES.includes(normalized);
}

/**
 * Validate service type and throw error if invalid
 * 
 * @param {string} serviceType - Service type to validate
 * @throws {Error} - If service type is invalid
 * @returns {void}
 */
export function assertValidServiceType(serviceType) {
  if (!validateServiceType(serviceType)) {
    throw new Error(
      `Invalid service type: ${serviceType}. Valid types: ${VALID_SERVICE_TYPES.join(', ')}`
    );
  }
}

/**
 * Validate ride timing and throw error if invalid
 * 
 * @param {string} rideTiming - Ride timing to validate
 * @throws {Error} - If ride timing is invalid
 * @returns {void}
 */
export function assertValidRideTiming(rideTiming) {
  if (!validateRideTiming(rideTiming)) {
    throw new Error(
      `Invalid ride timing: ${rideTiming}. Valid types: ${VALID_RIDE_TIMING_TYPES.join(', ')}`
    );
  }
}

/**
 * Validate ride status and throw error if invalid
 * 
 * @param {string} rideStatus - Ride status to validate
 * @throws {Error} - If ride status is invalid
 * @returns {void}
 */
export function assertValidRideStatus(rideStatus) {
  if (!validateRideStatus(rideStatus)) {
    throw new Error(
      `Invalid ride status: ${rideStatus}. Valid types: ${VALID_RIDE_STATUS_TYPES.join(', ')}`
    );
  }
}

/**
 * Get all valid service types
 * 
 * @returns {string[]} - Array of valid service types
 */
export function getValidServiceTypes() {
  return [...VALID_SERVICE_TYPES];
}

/**
 * Get all valid ride timing types
 * 
 * @returns {string[]} - Array of valid ride timing types
 */
export function getValidRideTimingTypes() {
  return [...VALID_RIDE_TIMING_TYPES];
}

/**
 * Get all valid ride status types
 * 
 * @returns {string[]} - Array of valid ride status types
 */
export function getValidRideStatusTypes() {
  return [...VALID_RIDE_STATUS_TYPES];
}



