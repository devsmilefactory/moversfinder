export const RIDE_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DRIVER_ON_WAY: 'driver_on_way',
  DRIVER_ARRIVED: 'driver_arrived',
  TRIP_STARTED: 'trip_started',
  TRIP_COMPLETED: 'trip_completed',
  CANCELLED: 'cancelled',
};

export const ACTIVE_RIDE_STATUSES = [
  RIDE_STATUSES.ACCEPTED,
  RIDE_STATUSES.DRIVER_ON_WAY,
  RIDE_STATUSES.DRIVER_ARRIVED,
  RIDE_STATUSES.TRIP_STARTED,
];

export const STATUS_TRANSITIONS = {
  [RIDE_STATUSES.DRIVER_ON_WAY]: RIDE_STATUSES.ACCEPTED,
  [RIDE_STATUSES.DRIVER_ARRIVED]: RIDE_STATUSES.DRIVER_ON_WAY,
  [RIDE_STATUSES.TRIP_STARTED]: RIDE_STATUSES.DRIVER_ARRIVED,
  [RIDE_STATUSES.TRIP_COMPLETED]: RIDE_STATUSES.TRIP_STARTED,
};

export function useRideStatus() {
  const validateTransition = (from, to) => STATUS_TRANSITIONS[to] === from;

  const isActiveStatus = (status) => ACTIVE_RIDE_STATUSES.includes(status);

  const getStatusLabel = (status) => {
    const labels = {
      [RIDE_STATUSES.PENDING]: 'Pending',
      [RIDE_STATUSES.ACCEPTED]: 'Accepted',
      [RIDE_STATUSES.DRIVER_ON_WAY]: 'Driver On Way',
      [RIDE_STATUSES.DRIVER_ARRIVED]: 'Driver Arrived',
      [RIDE_STATUSES.TRIP_STARTED]: 'Trip Started',
      [RIDE_STATUSES.TRIP_COMPLETED]: 'Completed',
      [RIDE_STATUSES.CANCELLED]: 'Cancelled',
    };
    return labels[status] || status;
  };

  return {
    validateTransition,
    isActiveStatus,
    getStatusLabel,
    RIDE_STATUSES,
    ACTIVE_RIDE_STATUSES,
    STATUS_TRANSITIONS,
  };
}

