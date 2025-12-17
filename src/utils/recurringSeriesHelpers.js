/**
 * Recurring Series Helper Utilities
 * 
 * Helper functions for recurring series operations including
 * recurrence pattern calculations, trip counting, and display formatting.
 */

/**
 * Calculate recurrence days array from pattern
 * 
 * @param {Object} recurrencePattern - Pattern object with type and dates/month
 * @returns {Array<number>|null} Array of day numbers (0=Sunday, 6=Saturday) or null
 */
export function calculateRecurrenceDays(recurrencePattern) {
  if (!recurrencePattern || !recurrencePattern.type) {
    return null;
  }

  switch (recurrencePattern.type) {
    case 'weekdays':
      return [1, 2, 3, 4, 5]; // Mon-Fri
    
    case 'weekends':
      return [0, 6]; // Sun, Sat
    
    case 'specific_dates':
      // Extract unique day-of-week from dates
      if (!recurrencePattern.dates || recurrencePattern.dates.length === 0) {
        return null;
      }
      const days = new Set();
      recurrencePattern.dates.forEach(dateStr => {
        const date = new Date(dateStr);
        days.add(date.getDay());
      });
      return Array.from(days).sort((a, b) => a - b);
    
    default:
      return null;
  }
}

/**
 * Calculate total trips from recurrence pattern
 * 
 * @param {Object} recurrencePattern - Pattern object with type and dates/month
 * @returns {number} Total number of trips
 */
export function calculateTotalTrips(recurrencePattern) {
  if (!recurrencePattern || !recurrencePattern.type) {
    return 0;
  }

  switch (recurrencePattern.type) {
    case 'specific_dates':
      return recurrencePattern.dates ? recurrencePattern.dates.length : 0;
    
    case 'weekdays':
      return countWeekdaysInMonth(recurrencePattern.month);
    
    case 'weekends':
      return countWeekendsInMonth(recurrencePattern.month);
    
    default:
      return 0;
  }
}

/**
 * Calculate start date from recurrence pattern
 * 
 * @param {Object} recurrencePattern - Pattern object with type and dates/month
 * @returns {string} ISO date string for start date
 */
export function calculateStartDate(recurrencePattern) {
  if (!recurrencePattern || !recurrencePattern.type) {
    return new Date().toISOString();
  }

  switch (recurrencePattern.type) {
    case 'specific_dates':
      if (recurrencePattern.dates && recurrencePattern.dates.length > 0) {
        // Sort dates and return earliest
        const sortedDates = [...recurrencePattern.dates].sort();
        return new Date(sortedDates[0]).toISOString();
      }
      return new Date().toISOString();
    
    case 'weekdays':
    case 'weekends':
      // Start from first day of specified month
      if (recurrencePattern.month) {
        return new Date(recurrencePattern.month + '-01').toISOString();
      }
      return new Date().toISOString();
    
    default:
      return new Date().toISOString();
  }
}

/**
 * Calculate end date from recurrence pattern
 * 
 * @param {Object} recurrencePattern - Pattern object with type and dates/month
 * @returns {string|null} ISO date string for end date or null
 */
export function calculateEndDate(recurrencePattern) {
  if (!recurrencePattern || !recurrencePattern.type) {
    return null;
  }

  switch (recurrencePattern.type) {
    case 'specific_dates':
      if (recurrencePattern.dates && recurrencePattern.dates.length > 0) {
        // Sort dates and return latest
        const sortedDates = [...recurrencePattern.dates].sort();
        return new Date(sortedDates[sortedDates.length - 1]).toISOString();
      }
      return null;
    
    case 'weekdays':
    case 'weekends':
      // End at last day of specified month
      if (recurrencePattern.month) {
        const [year, month] = recurrencePattern.month.split('-');
        const lastDay = new Date(parseInt(year), parseInt(month), 0);
        return lastDay.toISOString();
      }
      return null;
    
    default:
      return null;
  }
}

/**
 * Format series display text
 * 
 * @param {Object} series - Series object with trip and cost information
 * @returns {Object} Formatted display strings
 */
export function formatSeriesDisplay(series) {
  const costPerTrip = series.estimated_cost || 0;
  const totalCost = series.total_cost || (costPerTrip * (series.total_trips || 0));
  const completedTrips = series.completed_trips || 0;
  const totalTrips = series.total_trips || 0;

  return {
    tripsText: `${totalTrips} trip${totalTrips !== 1 ? 's' : ''}`,
    costText: `$${costPerTrip.toFixed(2)} per trip`,
    totalText: `$${totalCost.toFixed(2)} total`,
    progressText: `${completedTrips}/${totalTrips} completed`,
    remainingText: `${totalTrips - completedTrips} remaining`
  };
}

/**
 * Count weekdays in a given month
 * 
 * @param {string} monthStr - Month string in YYYY-MM format
 * @returns {number} Number of weekdays
 */
function countWeekdaysInMonth(monthStr) {
  if (!monthStr) return 0;

  const [year, month] = monthStr.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let count = 0;
  for (let day = firstDay; day <= lastDay; day.setDate(day.getDate() + 1)) {
    const dayOfWeek = day.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Mon-Fri
      count++;
    }
  }
  
  return count;
}

/**
 * Count weekends in a given month
 * 
 * @param {string} monthStr - Month string in YYYY-MM format
 * @returns {number} Number of weekend days
 */
function countWeekendsInMonth(monthStr) {
  if (!monthStr) return 0;

  const [year, month] = monthStr.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let count = 0;
  for (let day = firstDay; day <= lastDay; day.setDate(day.getDate() + 1)) {
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sun or Sat
      count++;
    }
  }
  
  return count;
}
