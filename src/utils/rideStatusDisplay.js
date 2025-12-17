/**
 * Ride Status Display Utility
 * 
 * Centralized utility for ride status badge display and status determination.
 * Consolidates status logic from multiple files into a single source of truth.
 */

import { CheckCircle, Navigation, MapPin, Car, Clock, XCircle } from 'lucide-react';
import { RIDE_STATUSES } from '../hooks/useRideStatus';

/**
 * Get status badge configuration for a ride
 * @param {Object} ride - Ride object with status_group and ride_status
 * @returns {Object|null} Status badge configuration with label and classes
 */
export function getStatusBadge(ride) {
  if (!ride) return null;

  const group = ride.status_group;
  const status = ride.ride_status || ride.status;

  // ACTIVE status group
  if (group === 'ACTIVE') {
    switch (status) {
      case RIDE_STATUSES.DRIVER_ON_WAY:
      case RIDE_STATUSES.DRIVER_EN_ROUTE:
      case RIDE_STATUSES.DRIVER_ENROUTE:
      case 'driver_en_route':
        return {
          label: 'On the way to pickup',
          classes: 'bg-blue-100 text-blue-700',
          icon: Navigation
        };
      
      case RIDE_STATUSES.DRIVER_ARRIVED:
      case RIDE_STATUSES.DRIVER_AT_PICKUP:
      case 'driver_at_pickup':
        return {
          label: 'Arrived at pickup',
          classes: 'bg-purple-100 text-purple-700',
          icon: MapPin
        };
      
      case RIDE_STATUSES.TRIP_STARTED:
      case RIDE_STATUSES.JOURNEY_STARTED:
      case RIDE_STATUSES.IN_PROGRESS:
      case RIDE_STATUSES.RIDE_IN_PROGRESS:
      case 'journey_started':
      case 'in_progress':
        return {
          label: 'Trip in progress',
          classes: 'bg-orange-100 text-orange-700',
          icon: Car
        };
      
      case RIDE_STATUSES.ACCEPTED:
      case RIDE_STATUSES.DRIVER_ASSIGNED:
      case RIDE_STATUSES.DRIVER_CONFIRMED:
      case RIDE_STATUSES.OFFER_ACCEPTED:
      case 'driver_assigned':
      case 'offer_accepted':
        return {
          label: 'Ride accepted',
          classes: 'bg-emerald-100 text-emerald-700',
          icon: CheckCircle
        };
      
      default:
        return {
          label: 'Active',
          classes: 'bg-blue-100 text-blue-700',
          icon: Car
        };
    }
  }

  // AVAILABLE status group
  if (group === 'AVAILABLE') {
    return {
      label: 'Available',
      classes: 'bg-gray-100 text-gray-700',
      icon: Clock
    };
  }

  // BID status group
  if (group === 'BID') {
    return {
      label: 'Bid placed',
      classes: 'bg-yellow-100 text-yellow-700',
      icon: Clock
    };
  }

  // COMPLETED status group
  if (group === 'COMPLETED') {
    return {
      label: 'Completed',
      classes: 'bg-green-100 text-green-700',
      icon: CheckCircle
    };
  }

  // CANCELLED status group
  if (group === 'CANCELLED') {
    return {
      label: 'Cancelled',
      classes: 'bg-red-100 text-red-700',
      icon: XCircle
    };
  }

  // PENDING status group (fallback)
  return {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-700',
    icon: Clock
  };
}

/**
 * Get detailed status information for active rides
 * Provides more context than just the badge
 * @param {Object} ride - Ride object
 * @returns {Object} Detailed status information
 */
export function getDetailedStatusInfo(ride) {
  if (!ride) return null;

  const status = ride.ride_status || ride.status;

  const statusMap = {
    [RIDE_STATUSES.DRIVER_ASSIGNED]: {
      label: 'Driver Assigned',
      color: 'bg-blue-100 text-blue-700',
      message: 'Waiting for driver to start navigation',
      icon: CheckCircle
    },
    [RIDE_STATUSES.OFFER_ACCEPTED]: {
      label: 'Driver Assigned',
      color: 'bg-blue-100 text-blue-700',
      message: 'Waiting for driver to start navigation',
      icon: CheckCircle
    },
    [RIDE_STATUSES.DRIVER_EN_ROUTE]: {
      label: 'Driver En Route',
      color: 'bg-purple-100 text-purple-700',
      message: 'Driver is on the way to pickup',
      icon: Navigation
    },
    [RIDE_STATUSES.DRIVER_ON_WAY]: {
      label: 'Driver En Route',
      color: 'bg-purple-100 text-purple-700',
      message: 'Driver is on the way to pickup',
      icon: Navigation
    },
    [RIDE_STATUSES.DRIVER_ARRIVED]: {
      label: 'Driver Arrived',
      color: 'bg-green-100 text-green-700',
      message: 'Driver is waiting at pickup location',
      icon: MapPin
    },
    [RIDE_STATUSES.IN_PROGRESS]: {
      label: 'Journey in Progress',
      color: 'bg-indigo-100 text-indigo-700',
      message: 'On the way to destination',
      icon: Car
    },
    [RIDE_STATUSES.JOURNEY_STARTED]: {
      label: 'Journey in Progress',
      color: 'bg-indigo-100 text-indigo-700',
      message: 'On the way to destination',
      icon: Car
    },
    [RIDE_STATUSES.TRIP_STARTED]: {
      label: 'Trip Started',
      color: 'bg-indigo-100 text-indigo-700',
      message: 'On the way to destination',
      icon: Car
    }
  };

  return statusMap[status] || {
    label: 'Active',
    color: 'bg-blue-100 text-blue-700',
    message: 'Ride is active',
    icon: Car
  };
}

/**
 * Get status icon component
 * @param {string} status - Ride status
 * @returns {Component} Lucide React icon component
 */
export function getStatusIcon(status) {
  const iconMap = {
    [RIDE_STATUSES.DRIVER_ON_WAY]: Navigation,
    [RIDE_STATUSES.DRIVER_EN_ROUTE]: Navigation,
    [RIDE_STATUSES.DRIVER_ARRIVED]: MapPin,
    [RIDE_STATUSES.TRIP_STARTED]: Car,
    [RIDE_STATUSES.JOURNEY_STARTED]: Car,
    [RIDE_STATUSES.IN_PROGRESS]: Car,
    [RIDE_STATUSES.ACCEPTED]: CheckCircle,
    [RIDE_STATUSES.DRIVER_ASSIGNED]: CheckCircle,
    [RIDE_STATUSES.COMPLETED]: CheckCircle,
    [RIDE_STATUSES.TRIP_COMPLETED]: CheckCircle,
    [RIDE_STATUSES.CANCELLED]: XCircle,
    [RIDE_STATUSES.PENDING]: Clock,
    [RIDE_STATUSES.AWAITING_OFFERS]: Clock
  };

  return iconMap[status] || Car;
}

/**
 * Check if a ride is in an active state
 * @param {Object} ride - Ride object
 * @returns {boolean} True if ride is active
 */
export function isRideActive(ride) {
  if (!ride) return false;
  return ride.status_group === 'ACTIVE';
}

/**
 * Check if a ride is completed
 * @param {Object} ride - Ride object
 * @returns {boolean} True if ride is completed
 */
export function isRideCompleted(ride) {
  if (!ride) return false;
  return ride.status_group === 'COMPLETED';
}

/**
 * Check if a ride is cancelled
 * @param {Object} ride - Ride object
 * @returns {boolean} True if ride is cancelled
 */
export function isRideCancelled(ride) {
  if (!ride) return false;
  return ride.status_group === 'CANCELLED';
}
