/**
 * Round Trip Helper Utilities
 * 
 * Utilities for handling round trip leg display, scheduling, and validation.
 */

import { isRoundTripRide } from './rideCostDisplay';

/**
 * Get display information for a round trip leg
 * @param {Object} ride - Ride object
 * @returns {Object} Display information for the leg
 */
export function getRoundTripDisplay(ride) {
  if (!isRoundTripRide(ride)) {
    return null;
  }

  const legType = ride.trip_leg_type || 'outbound';
  const occurrenceNumber = parseInt(ride.round_trip_occurrence_number) || 1;
  const legNumber = parseInt(ride.round_trip_leg_number) || 1;
  const isRecurring = Boolean((ride.number_of_trips > 1) || ride.series_id);
  
  // Determine directional indicator
  const indicator = legType === 'outbound' ? '→' : '←';
  const legLabel = legType === 'outbound' ? 'Outbound' : 'Return';
  
  // Calculate total occurrences for recurring round trips
  const totalOccurrences = isRecurring ? Math.ceil((parseInt(ride.number_of_trips) || 2) / 2) : 1;
  
  return {
    legType,
    legNumber,
    occurrenceNumber,
    totalOccurrences,
    indicator,
    legLabel,
    isRecurring,
    // Display format: "Round Trip 1 of 5 - Outbound →"
    displayText: isRecurring 
      ? `Round Trip ${occurrenceNumber} of ${totalOccurrences} - ${legLabel} ${indicator}`
      : `Round Trip - ${legLabel} ${indicator}`,
    // Short format: "RT 1/5 - Out →"
    shortText: isRecurring
      ? `RT ${occurrenceNumber}/${totalOccurrences} - ${legType === 'outbound' ? 'Out' : 'Ret'} ${indicator}`
      : `RT - ${legType === 'outbound' ? 'Out' : 'Ret'} ${indicator}`
  };
}

/**
 * Calculate return leg time based on outbound leg
 * @param {Date|string} outboundTime - Scheduled time for outbound leg
 * @param {number} estimatedDuration - Estimated duration in minutes
 * @param {number} waitTime - Wait time at destination in minutes (default: 30)
 * @returns {Date} Calculated return time
 */
export function calculateReturnTime(outboundTime, estimatedDuration = 30, waitTime = 30) {
  const outbound = typeof outboundTime === 'string' ? new Date(outboundTime) : outboundTime;
  
  if (!outbound || isNaN(outbound.getTime())) {
    return null;
  }
  
  // Calculate return time: outbound time + trip duration + wait time
  const totalMinutes = (estimatedDuration || 30) + (waitTime || 30);
  const returnTime = new Date(outbound.getTime() + totalMinutes * 60 * 1000);
  
  return returnTime;
}

/**
 * Validate round trip leg data
 * @param {Object} ride - Ride object
 * @returns {Object} Validation result with isValid and errors array
 */
export function validateRoundTripLeg(ride) {
  const errors = [];
  
  if (!ride) {
    return { isValid: false, errors: ['Ride object is required'] };
  }
  
  if (!isRoundTripRide(ride)) {
    return { isValid: false, errors: ['Not a round trip ride'] };
  }
  
  // Validate trip_leg_type
  if (ride.trip_leg_type !== undefined && ride.trip_leg_type !== null && !['outbound', 'return'].includes(ride.trip_leg_type)) {
    errors.push(`Invalid trip_leg_type: ${ride.trip_leg_type}`);
  }
  
  // Validate round_trip_leg_number
  if (ride.round_trip_leg_number !== undefined && ride.round_trip_leg_number !== null && ![1, 2].includes(ride.round_trip_leg_number)) {
    errors.push(`Invalid round_trip_leg_number: ${ride.round_trip_leg_number}`);
  }
  
  // Validate consistency between leg_type and leg_number
  if (ride.trip_leg_type && ride.round_trip_leg_number) {
    const expectedLegNumber = ride.trip_leg_type === 'outbound' ? 1 : 2;
    if (ride.round_trip_leg_number !== expectedLegNumber) {
      errors.push(`Inconsistent leg data: ${ride.trip_leg_type} should have leg_number ${expectedLegNumber}, got ${ride.round_trip_leg_number}`);
    }
  }
  
  // Validate occurrence number for recurring trips
  if (ride.series_id && ride.round_trip_occurrence_number) {
    const totalOccurrences = Math.ceil((parseInt(ride.number_of_trips) || 2) / 2);
    if (ride.round_trip_occurrence_number < 1 || ride.round_trip_occurrence_number > totalOccurrences) {
      errors.push(`Invalid occurrence number: ${ride.round_trip_occurrence_number} (should be 1-${totalOccurrences})`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get the opposite leg type
 * @param {string} legType - Current leg type ('outbound' or 'return')
 * @returns {string} Opposite leg type
 */
export function getOppositeLeg(legType) {
  if (legType === 'outbound') return 'return';
  if (legType === 'return') return 'outbound';
  return null;
}

/**
 * Check if a round trip leg is completed
 * @param {Object} ride - Ride object
 * @param {string} legType - Leg type to check ('outbound' or 'return')
 * @returns {boolean}
 */
export function isLegCompleted(ride, legType) {
  if (!ride || !legType) return false;
  
  if (legType === 'outbound') {
    return !!ride.outbound_completed_at;
  }
  
  if (legType === 'return') {
    return !!ride.return_completed_at;
  }
  
  return false;
}

/**
 * Get the current active leg for a round trip
 * @param {Object} ride - Ride object
 * @returns {string|null} 'outbound', 'return', 'completed', or null
 */
export function getActiveLeg(ride) {
  if (!isRoundTripRide(ride)) {
    return null;
  }
  
  // Use explicit active_leg field if available
  if (ride.active_leg) {
    return ride.active_leg;
  }
  
  // Infer from completion timestamps
  if (ride.return_completed_at) {
    return 'completed';
  }
  
  if (ride.outbound_completed_at) {
    return 'return';
  }
  
  return 'outbound';
}

/**
 * Calculate round trip progress percentage
 * @param {Object} ride - Ride object
 * @returns {number} Progress percentage (0-100)
 */
export function getRoundTripProgress(ride) {
  if (!isRoundTripRide(ride)) {
    return 0;
  }
  
  const activeLeg = getActiveLeg(ride);
  
  if (activeLeg === 'completed') {
    return 100;
  }
  
  if (activeLeg === 'return') {
    return 50;
  }
  
  // Outbound leg in progress
  if (ride.ride_status === 'trip_started' || ride.ride_status === 'driver_arrived') {
    return 25;
  }
  
  return 0;
}
