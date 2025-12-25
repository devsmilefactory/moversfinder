/**
 * Feature Flags Configuration
 * 
 * Centralized feature flags to enable/disable features without code changes.
 * This allows us to simplify the implementation by disabling complex features
 * while preserving all the code for future re-enablement.
 * 
 * Usage:
 *   import { FEATURE_FLAGS } from '@/config/featureFlags';
 *   if (FEATURE_FLAGS.SCHEDULED_RIDES_ENABLED) { ... }
 */

export const FEATURE_FLAGS = {
  /**
   * Enable/disable scheduled rides (single scheduled rides)
   * When false, all rides are forced to be instant
   */
  SCHEDULED_RIDES_ENABLED: false,

  /**
   * Enable/disable recurring rides
   * When false, recurring ride functionality is hidden and disabled
   */
  RECURRING_RIDES_ENABLED: false,

  /**
   * Enable/disable round trips
   * When false, round trip option is hidden and forced off
   */
  ROUND_TRIPS_ENABLED: false,
};

/**
 * Check if instant-only mode is active
 * @returns {boolean} True if only instant rides are allowed
 */
export function isInstantOnlyMode() {
  return !FEATURE_FLAGS.SCHEDULED_RIDES_ENABLED && !FEATURE_FLAGS.RECURRING_RIDES_ENABLED;
}

/**
 * Get allowed ride timing types based on feature flags
 * @returns {Array<string>} Array of allowed ride timing types
 */
export function getAllowedRideTimings() {
  const allowed = ['instant'];
  
  if (FEATURE_FLAGS.SCHEDULED_RIDES_ENABLED) {
    allowed.push('scheduled_single');
  }
  
  if (FEATURE_FLAGS.RECURRING_RIDES_ENABLED) {
    allowed.push('scheduled_recurring');
  }
  
  return allowed;
}

/**
 * Validate if a ride timing is allowed
 * @param {string} rideTiming - The ride timing to validate
 * @returns {boolean} True if the timing is allowed
 */
export function isRideTimingAllowed(rideTiming) {
  const allowed = getAllowedRideTimings();
  return allowed.includes(rideTiming);
}

/**
 * Force a ride timing to instant if scheduled/recurring are disabled
 * @param {string} rideTiming - The original ride timing
 * @returns {string} 'instant' if scheduled/recurring disabled, otherwise original
 */
export function enforceInstantOnly(rideTiming) {
  if (isInstantOnlyMode()) {
    return 'instant';
  }
  return rideTiming;
}

/**
 * Check if round trips are allowed
 * @returns {boolean} True when the round-trip option should be available
 */
export function isRoundTripEnabled() {
  return Boolean(FEATURE_FLAGS.ROUND_TRIPS_ENABLED);
}

/**
 * Normalize any round-trip selection based on the feature flag
 * @param {boolean} isRoundTrip - Raw round-trip toggle value
 * @returns {boolean} False when round trips are disabled; otherwise the provided value
 */
export function normalizeRoundTripSelection(isRoundTrip) {
  return isRoundTripEnabled() ? Boolean(isRoundTrip) : false;
}





