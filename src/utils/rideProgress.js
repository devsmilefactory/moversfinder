import { generateWeekendDates, generateWeekdayDates } from './recurringRides';

const toPositiveInteger = (value, fallback = null) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const normalized = Math.floor(num);
  return normalized > 0 ? normalized : fallback;
};

const getPatternTripCount = (pattern) => {
  if (!pattern) return null;

  switch (pattern.type) {
    case 'specific_dates':
      return pattern.dates?.length || 0;
    case 'weekdays':
      return pattern.month ? generateWeekdayDates(pattern.month).length : 0;
    case 'weekends':
      return pattern.month ? generateWeekendDates(pattern.month).length : 0;
    case 'custom':
      return pattern.dates?.length || pattern.recurrenceDays?.length || null;
    default:
      return null;
  }
};

export const getRecurrenceSummary = (ride = {}) => {
  const pattern = ride.recurrence_pattern;
  if (!pattern) {
    if (ride.is_round_trip) return 'Round trip';
    if (ride.ride_timing === 'scheduled_recurring') return 'Recurring schedule';
    return null;
  }

  switch (pattern.type) {
    case 'specific_dates':
      return `${pattern.dates?.length || 0} specific date${(pattern.dates?.length || 0) === 1 ? '' : 's'}`;
    case 'weekdays':
      return 'Weekday pattern';
    case 'weekends':
      return 'Weekend pattern';
    case 'custom':
      return 'Custom recurrence';
    default:
      return 'Recurring schedule';
  }
};

export const getRideProgressDetails = (ride = {}) => {
  const patternCount = getPatternTripCount(ride.recurrence_pattern);
  const totalCandidates = [
    toPositiveInteger(ride.total_rides_in_series),
    toPositiveInteger(ride.number_of_trips),
    patternCount,
    1,
  ];

  let totalTrips = totalCandidates.find((val) => Number.isFinite(val)) ?? 1;
  if (ride.is_round_trip) {
    totalTrips = totalTrips * 2;
  }

  const seriesTripNumber = toPositiveInteger(ride.series_trip_number, 1);
  const rideStatus = ride.ride_status || ride.status;
  const completedFromField = toPositiveInteger(ride.completed_rides_count, null);

  const completedTrips = (() => {
    if (Number.isInteger(completedFromField)) {
      return Math.min(completedFromField, totalTrips);
    }
    if (rideStatus === 'trip_completed' || rideStatus === 'completed') {
      return Math.min(seriesTripNumber, totalTrips);
    }
    return Math.max(Math.min(seriesTripNumber, totalTrips) - 1, 0);
  })();

  const currentTripNumber = Math.min(seriesTripNumber, totalTrips);
  const remainingTrips = Math.max(totalTrips - currentTripNumber, 0);

  return {
    totalTrips,
    currentTripNumber,
    completedTrips,
    remainingTrips,
    isMultiTrip: totalTrips > 1,
    isRoundTrip: Boolean(ride.is_round_trip),
    recurrenceSummary: getRecurrenceSummary(ride),
  };
};












