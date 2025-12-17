/**
 * Shared helpers for grouping ride series and presenting recurring metadata.
 * Centralizing the logic prevents the user and driver surfaces from drifting.
 */

const safeJsonParse = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('rideSeries: unable to parse recurrence pattern', error);
    return null;
  }
};

export const isRecurringRide = (ride = {}) => {
  if (!ride) return false;
  return (
    ride.ride_timing === 'scheduled_recurring' ||
    (ride.number_of_trips && ride.number_of_trips > 1) ||
    (ride.total_rides_in_series && ride.total_rides_in_series > 1)
  );
};

export const parseRecurrencePattern = (pattern) => safeJsonParse(pattern);

export const getRecurringSeriesKey = (ride = {}) => {
  if (!ride) return '';
  if (ride.series_id) return `series:${ride.series_id}`;
  if (ride.recurring_series_id) return `series:${ride.recurring_series_id}`;
  const pattern = parseRecurrencePattern(ride.recurrence_pattern);
  if (pattern?.series_id) return `series:${pattern.series_id}`;
  if (pattern) return `pattern:${JSON.stringify(pattern)}`;
  return `recurring:${ride.id}`;
};

/**
 * Groups rides to avoid rendering duplicate cards for bulk and recurring trips.
 */
export const groupRidesForDisplay = (rides = []) => {
  const seen = new Set();
  const items = [];

  rides.forEach((ride) => {
    if (!ride) return;

    if (isRecurringRide(ride)) {
      const seriesKey = getRecurringSeriesKey(ride);
      if (seen.has(seriesKey)) return;
      seen.add(seriesKey);

      const seriesRides = rides.filter(
        (candidate) => isRecurringRide(candidate) && getRecurringSeriesKey(candidate) === seriesKey
      );

      items.push({ type: 'recurring_series', seriesKey, rides: seriesRides });
      return;
    }

    const isBulk = ride.booking_type === 'bulk' && ride.batch_id;
    const key = isBulk ? `bulk:${ride.batch_id}` : `single:${ride.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    if (isBulk) {
      const groupRides = rides.filter(
        (candidate) => candidate?.booking_type === 'bulk' && candidate?.batch_id === ride.batch_id
      );
      if (groupRides.length > 1) {
        items.push({ type: 'bulk_group', batch_id: ride.batch_id, rides: groupRides });
        return;
      }
    }

    items.push({ type: 'single', ride });
  });

  return items;
};

const formatRecurringDate = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const date = timeStr ? new Date(`${dateStr}T${timeStr}`) : new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Returns user-facing metadata for recurring rides so cards/modal can stay consistent.
 */
export const getRecurringMeta = (ride = {}) => {
  if (!isRecurringRide(ride)) return null;

  const pattern = parseRecurrencePattern(ride.recurrence_pattern);
  const totalTrips = ride.total_rides_in_series || ride.number_of_trips || 0;
  const completed =
    ride.completed_rides_count ??
    (ride.series_trip_number ? Math.max(ride.series_trip_number - 1, 0) : 0);
  const remaining = ride.remaining_rides_count ?? Math.max(totalTrips - completed, 0);
  const sequenceLabel =
    ride.series_trip_number && totalTrips
      ? `Trip ${ride.series_trip_number} of ${totalTrips}`
      : totalTrips
        ? `${totalTrips} trips`
        : null;

  const totalCost = ride.estimated_cost ? parseFloat(ride.estimated_cost) : null;
  const perTripCost = totalCost && totalTrips > 0 ? (totalCost / totalTrips).toFixed(2) : null;

  let patternLabel = 'Recurring series';
  if (pattern?.type === 'specific_dates') {
    patternLabel = 'Specific dates';
  } else if (pattern?.type === 'weekdays') {
    patternLabel = pattern.month ? `Weekdays • ${pattern.month}` : 'Weekdays';
  } else if (pattern?.type === 'weekends') {
    patternLabel = pattern.month ? `Weekends • ${pattern.month}` : 'Weekends';
  }

  const upcomingDates = [];
  let hasMoreDates = false;

  if (pattern?.type === 'specific_dates' && Array.isArray(pattern.dates)) {
    pattern.dates.slice(0, 3).forEach((dateStr) => {
      const formatted = formatRecurringDate(dateStr, pattern.time);
      if (formatted) {
        upcomingDates.push(formatted);
      }
    });
    hasMoreDates = pattern.dates.length > upcomingDates.length;
  } else if (ride.scheduled_datetime) {
    const formatted = formatRecurringDate(ride.scheduled_datetime);
    if (formatted) {
      upcomingDates.push(formatted);
    }
  }

  return {
    totalTrips,
    completed,
    remaining,
    sequenceLabel,
    patternLabel,
    perTripCost,
    upcomingDates,
    hasMoreDates
  };
};







