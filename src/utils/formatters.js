/**
 * Formatters Utility
 * 
 * Centralized formatting functions for consistent display across the application.
 * All functions are pure and deterministic for the same input.
 */

import { formatDistanceToNow } from 'date-fns';

/**
 * Format price for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted price string
 */
export function formatPrice(amount, currency = 'USD') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  const numAmount = Number(amount);
  const symbol = currency === 'USD' ? '$' : 'ZWL ';
  return `${symbol}${numAmount.toFixed(2)}`;
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return 'N/A';
  }

  const numDistance = Number(distanceKm);
  
  if (numDistance < 1) {
    return `${Math.round(numDistance * 1000)} m`;
  }

  return `${numDistance.toFixed(1)} km`;
}

/**
 * Format relative time (e.g., "2 mins ago", "1 hour ago")
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted relative time string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    // Use date-fns for consistent relative time formatting
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'N/A';
  }
}

/**
 * Format date and time for display
 * @param {string|Date} timestamp - Timestamp to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(timestamp, options = {}) {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    const defaultOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };

    return date.toLocaleString(undefined, defaultOptions);
  } catch (error) {
    console.error('Error formatting date/time:', error);
    return 'N/A';
  }
}

/**
 * Format date only (no time)
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
}

/**
 * Format time only (no date)
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted time string
 */
export function formatTime(timestamp) {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'N/A';
  }
}

/**
 * Format duration in minutes to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return 'N/A';
  }

  const numMinutes = Number(minutes);

  if (numMinutes < 60) {
    return `${Math.round(numMinutes)} min`;
  }

  const hours = Math.floor(numMinutes / 60);
  const remainingMinutes = Math.round(numMinutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}
