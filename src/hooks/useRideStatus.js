const unique = (values = []) => Array.from(new Set(values));
const normalizeStatus = (status) => (status || '').toLowerCase();
const containsAny = (status, tokens = []) => tokens.some((token) => status.includes(token));

export const RIDE_STATUSES = {
  PENDING: 'pending',
  AWAITING_OFFERS: 'awaiting_offers',
  ACCEPTED: 'accepted',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_CONFIRMED: 'driver_confirmed',
  OFFER_ACCEPTED: 'offer_accepted',
  DRIVER_ON_WAY: 'driver_on_way',
  DRIVER_EN_ROUTE: 'driver_en_route',
  DRIVER_ENROUTE: 'driver_enroute',
  DRIVER_ARRIVED: 'driver_arrived',
  DRIVER_AT_PICKUP: 'driver_at_pickup',
  TRIP_STARTED: 'trip_started',
  JOURNEY_STARTED: 'journey_started',
  IN_PROGRESS: 'in_progress',
  RIDE_IN_PROGRESS: 'ride_in_progress',
  TRIP_COMPLETED: 'trip_completed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const PENDING_STATUS_LIST = unique([
  RIDE_STATUSES.PENDING,
  RIDE_STATUSES.AWAITING_OFFERS,
  'awaiting_driver',
  'awaiting_assignment',
  'awaiting_dispatch',
  'awaiting_confirmation',
  'searching_driver',
  'receiving_offers',
  'looking_for_driver',
  'request_submitted',
  'request_received',
  'new',
]);

const ACTIVE_STATUS_LIST = unique([
  RIDE_STATUSES.ACCEPTED,
  RIDE_STATUSES.OFFER_ACCEPTED,
  RIDE_STATUSES.DRIVER_ASSIGNED,
  RIDE_STATUSES.DRIVER_CONFIRMED,
  RIDE_STATUSES.DRIVER_ON_WAY,
  RIDE_STATUSES.DRIVER_EN_ROUTE,
  RIDE_STATUSES.DRIVER_ENROUTE,
  'driver_to_pickup',
  RIDE_STATUSES.DRIVER_ARRIVED,
  RIDE_STATUSES.DRIVER_AT_PICKUP,
  'pickup_in_progress',
  RIDE_STATUSES.TRIP_STARTED,
  RIDE_STATUSES.JOURNEY_STARTED,
  RIDE_STATUSES.IN_PROGRESS,
  RIDE_STATUSES.RIDE_IN_PROGRESS,
  'driver_to_dropoff',
  'dropoff_in_progress',
  'driver_departed_pickup',
  'driver_departed_dropoff',
]);

const COMPLETED_STATUS_LIST = unique([
  RIDE_STATUSES.TRIP_COMPLETED,
  RIDE_STATUSES.COMPLETED,
  'ride_completed',
  'awaiting_rating',
  'awaiting_review',
  'payment_pending',
  'payment_processing',
]);

const CANCELLED_STATUS_LIST = unique([
  RIDE_STATUSES.CANCELLED,
  'canceled',
  'cancelled_by_driver',
  'cancelled_by_client',
  'cancelled_by_passenger',
  'driver_cancelled',
  'passenger_cancelled',
  'rider_cancelled',
  'no_driver_available',
  'expired',
  'ride_expired',
  'declined',
  'rejected',
  'failed',
]);

const PENDING_STATUS_SET = new Set(PENDING_STATUS_LIST);
const ACTIVE_STATUS_SET = new Set(ACTIVE_STATUS_LIST);
const COMPLETED_STATUS_SET = new Set(COMPLETED_STATUS_LIST);
const CANCELLED_STATUS_SET = new Set(CANCELLED_STATUS_LIST);

export const PENDING_RIDE_STATUSES = PENDING_STATUS_LIST;
export const ACTIVE_RIDE_STATUSES = ACTIVE_STATUS_LIST;
export const COMPLETED_RIDE_STATUSES = COMPLETED_STATUS_LIST;
export const CANCELLED_RIDE_STATUSES = CANCELLED_STATUS_LIST;

export const STATUS_TRANSITIONS = {
  [RIDE_STATUSES.DRIVER_ON_WAY]: RIDE_STATUSES.ACCEPTED,
  [RIDE_STATUSES.DRIVER_ARRIVED]: RIDE_STATUSES.DRIVER_ON_WAY,
  [RIDE_STATUSES.TRIP_STARTED]: RIDE_STATUSES.DRIVER_ARRIVED,
  [RIDE_STATUSES.JOURNEY_STARTED]: RIDE_STATUSES.TRIP_STARTED,
  [RIDE_STATUSES.TRIP_COMPLETED]: RIDE_STATUSES.TRIP_STARTED,
};

export const getRideStatusCategory = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return 'pending';

  if (
    CANCELLED_STATUS_SET.has(normalized) ||
    containsAny(normalized, ['cancel', 'expired', 'decline', 'reject', 'fail', 'no_driver'])
  ) {
    return 'cancelled';
  }

  if (
    COMPLETED_STATUS_SET.has(normalized) ||
    containsAny(normalized, ['complete', 'settled', 'finished'])
  ) {
    return 'completed';
  }

  if (
    ACTIVE_STATUS_SET.has(normalized) ||
    containsAny(normalized, ['driver_', 'trip_', 'journey', 'in_progress', 'enroute', 'en_route'])
  ) {
    return 'active';
  }

  return 'pending';
};

export const isPendingRideStatus = (status) => getRideStatusCategory(status) === 'pending';
export const isActiveRideStatus = (status) => getRideStatusCategory(status) === 'active';
export const isCompletedRideStatus = (status) => getRideStatusCategory(status) === 'completed';
export const isCancelledRideStatus = (status) => getRideStatusCategory(status) === 'cancelled';

export function useRideStatus() {
  const validateTransition = (from, to) => STATUS_TRANSITIONS[to] === from;

  const isActiveStatus = (status) => isActiveRideStatus(status);

  const getStatusLabel = (status) => {
    const labels = {
      [RIDE_STATUSES.PENDING]: 'Pending',
      [RIDE_STATUSES.AWAITING_OFFERS]: 'Awaiting Offers',
      [RIDE_STATUSES.ACCEPTED]: 'Accepted',
      [RIDE_STATUSES.DRIVER_ASSIGNED]: 'Driver Assigned',
      [RIDE_STATUSES.DRIVER_ON_WAY]: 'Driver On Way',
      [RIDE_STATUSES.DRIVER_ARRIVED]: 'Driver Arrived',
      [RIDE_STATUSES.TRIP_STARTED]: 'Trip Started',
      [RIDE_STATUSES.JOURNEY_STARTED]: 'Journey Started',
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
    getRideStatusCategory,
    isPendingRideStatus,
    isCompletedRideStatus,
    isCancelledRideStatus,
  };
}

