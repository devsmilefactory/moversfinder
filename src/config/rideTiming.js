/**
 * Ride Timing Configuration
 * 
 * Centralized configuration for all ride timing/schedule types.
 * This eliminates duplication and ensures consistent icons, colors, and labels.
 */

import { Zap, Calendar, Repeat } from 'lucide-react';

/**
 * Ride timing configuration mapping
 * Maps timing type keys to their display properties
 */
export const RIDE_TIMING_CONFIG = {
  instant: {
    icon: Zap,
    label: 'Instant',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200'
  },
  scheduled_single: {
    icon: Calendar,
    label: 'Scheduled',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200'
  },
  scheduled_recurring: {
    icon: Repeat,
    label: 'Recurring',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
  // Aliases for different naming conventions
  INSTANT: {
    icon: Zap,
    label: 'Instant',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200'
  },
  SCHEDULED: {
    icon: Calendar,
    label: 'Scheduled',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200'
  },
  RECURRING: {
    icon: Repeat,
    label: 'Recurring',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  }
};

/**
 * Get ride timing configuration
 * @param {string} rideTiming - The ride timing/schedule type
 * @returns {Object} Ride timing configuration object
 */
export function getRideTimingConfig(rideTiming) {
  if (!rideTiming) {
    return RIDE_TIMING_CONFIG.instant; // Default fallback
  }
  
  const key = String(rideTiming).trim();
  return RIDE_TIMING_CONFIG[key] || RIDE_TIMING_CONFIG.instant;
}

/**
 * Get all available ride timing types
 * @returns {Array<string>} Array of ride timing keys
 */
export function getAvailableRideTimings() {
  return ['instant', 'scheduled_single', 'scheduled_recurring'];
}
