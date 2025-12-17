/**
 * Feed Helper Functions
 * 
 * Core helper functions for ride filtering and feed categorization.
 * These functions implement the comprehensive filtering logic from the design spec.
 */

/**
 * Error types for feed filtering operations
 */
export const FilterErrorType = {
  INVALID_FEED_CATEGORY: 'INVALID_FEED_CATEGORY',
  INVALID_RIDE_TYPE: 'INVALID_RIDE_TYPE',
  INVALID_SCHEDULE_TYPE: 'INVALID_SCHEDULE_TYPE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MISSING_LOCATION: 'MISSING_LOCATION',
  INVALID_INPUT: 'INVALID_INPUT'
};

/**
 * Custom error class for feed filtering operations
 * 
 * Provides structured error information with type, message, and context.
 * 
 * @example
 * throw new FilterError(
 *   FilterErrorType.INVALID_FEED_CATEGORY,
 *   'Invalid feed category: unknown',
 *   { feedCategory: 'unknown', userId: 'user-123' }
 * )
 */
export class FilterError extends Error {
  /**
   * @param {string} type - Error type from FilterErrorType enum
   * @param {string} message - Human-readable error message
   * @param {Object} context - Additional context about the error
   */
  constructor(type, message, context = {}) {
    super(message);
    this.name = 'FilterError';
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Validate feed category
 * 
 * @param {string} feedCategory - Feed category to validate
 * @param {string} userType - 'passenger' or 'driver'
 * @returns {boolean} - True if valid
 * @throws {FilterError} - If invalid
 */
export function validateFeedCategory(feedCategory, userType) {
  const validPassengerCategories = ['pending', 'active', 'completed', 'cancelled'];
  const validDriverCategories = ['available', 'my_bids', 'in_progress', 'completed', 'cancelled'];
  
  const validCategories = userType === 'passenger' ? validPassengerCategories : validDriverCategories;
  
  if (!validCategories.includes(feedCategory)) {
    throw new FilterError(
      FilterErrorType.INVALID_FEED_CATEGORY,
      `Invalid feed category '${feedCategory}' for ${userType}`,
      { feedCategory, userType, validCategories }
    );
  }
  
  return true;
}

/**
 * Validate ride type
 * 
 * @param {string} rideType - Ride type to validate
 * @returns {boolean} - True if valid
 * @throws {FilterError} - If invalid
 */
export function validateRideType(rideType) {
  const validRideTypes = ['TAXI', 'COURIER', 'SCHOOL_RUN', 'ERRAND', 'ALL'];
  
  if (!validRideTypes.includes(rideType)) {
    throw new FilterError(
      FilterErrorType.INVALID_RIDE_TYPE,
      `Invalid ride type '${rideType}'`,
      { rideType, validRideTypes }
    );
  }
  
  return true;
}

/**
 * Validate schedule type
 * 
 * @param {string} scheduleType - Schedule type to validate
 * @returns {boolean} - True if valid
 * @throws {FilterError} - If invalid
 */
export function validateScheduleType(scheduleType) {
  const validScheduleTypes = ['INSTANT', 'SCHEDULED', 'RECURRING', 'ALL'];
  
  if (!validScheduleTypes.includes(scheduleType)) {
    throw new FilterError(
      FilterErrorType.INVALID_SCHEDULE_TYPE,
      `Invalid schedule type '${scheduleType}'`,
      { scheduleType, validScheduleTypes }
    );
  }
  
  return true;
}

/**
 * Get the sort timestamp for a ride based on the feed type
 * 
 * This function implements the sort timestamp strategy from the design spec.
 * Each feed type uses specific timestamp fields with fallbacks to ensure
 * consistent ordering even when optional fields are missing.
 * 
 * @param {Object} ride - The ride object with timestamp fields
 * @param {string} feedName - The feed name (e.g., 'passenger_pending', 'driver_available')
 * @returns {string} - ISO timestamp string for sorting (DESC order)
 * 
 * @example
 * // Passenger pending feed prioritizes scheduled time
 * getSortTimestampForFeed(ride, 'passenger_pending')
 * // Returns: ride.scheduled_start_time || ride.requested_at
 * 
 * @see Design Doc: Sort Timestamp Strategy section
 */
export function getSortTimestampForFeed(ride, feedName) {
  if (!ride) return new Date().toISOString();

  switch (feedName) {
    // Passenger Feeds
    case 'passenger_pending':
      // Show newest requests first; scheduled ones by their scheduled time
      return ride.scheduled_start_time || ride.scheduled_datetime || ride.requested_at || ride.created_at;
      
    case 'passenger_active':
      // Show nearest upcoming or most recently started first
      return ride.scheduled_start_time || ride.scheduled_datetime || ride.started_at || ride.requested_at || ride.created_at;
      
    case 'passenger_completed':
      return ride.completed_at || ride.requested_at || ride.created_at;
      
    case 'passenger_cancelled':
      return ride.cancelled_at || ride.requested_at || ride.created_at;
      
    // Driver Feeds
    case 'driver_available':
      // Show newest jobs first
      return ride.requested_at || ride.created_at;
      
    case 'driver_my_bids':
      // When this driver offered (requires offer.created_at from join)
      return ride.offer_created_at || ride.requested_at || ride.created_at;
      
    case 'driver_in_progress':
      // Show soonest scheduled or most recently started
      return ride.scheduled_start_time || ride.scheduled_datetime || ride.started_at || ride.requested_at || ride.created_at;
      
    case 'driver_completed':
      return ride.completed_at || ride.requested_at || ride.created_at;
      
    case 'driver_cancelled':
      return ride.cancelled_at || ride.requested_at || ride.created_at;
      
    default:
      return ride.requested_at || ride.created_at || new Date().toISOString();
  }
}

/**
 * Get the passenger feed category for a ride
 * 
 * Determines which feed a ride belongs to from the passenger's perspective.
 * Feed membership is mutually exclusive - each ride appears in exactly one feed.
 * 
 * Feed Categories:
 * - pending: Awaiting driver assignment (may have offers, but no accepted driver)
 * - active: Driver assigned or ride in progress (PRE_TRIP, EXECUTION, COMPLETED_INSTANCE)
 * - completed: Fully completed and paid (COMPLETED_FINAL)
 * - cancelled: Cancelled from any state
 * 
 * @param {Object} ride - The ride object with state and passenger_id
 * @param {string} passengerId - The passenger's user ID
 * @returns {string|null} - Feed category ('pending', 'active', 'completed', 'cancelled') or null if not for this passenger
 * 
 * @example
 * // Pending ride
 * getPassengerFeed({ state: 'PENDING', passenger_id: 'user-1' }, 'user-1')
 * // Returns: 'pending'
 * 
 * // Active ride
 * getPassengerFeed({ state: 'ACTIVE_EXECUTION', passenger_id: 'user-1' }, 'user-1')
 * // Returns: 'active'
 * 
 * @see Design Doc: Passenger Feed Categories section
 * @see Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.5
 */
export function getPassengerFeed(ride, passengerId) {
  if (!ride) return null;
  
  // Only include rides for this passenger
  if (ride.passenger_id !== passengerId && ride.user_id !== passengerId) {
    return null;
  }
  
  // State-based feed determination (mutually exclusive)
  switch (ride.state) {
    case 'PENDING':
      return 'pending';
      
    case 'ACTIVE_PRE_TRIP':
    case 'ACTIVE_EXECUTION':
    case 'COMPLETED_INSTANCE':
      return 'active';
      
    case 'COMPLETED_FINAL':
      return 'completed';
      
    case 'CANCELLED':
      return 'cancelled';
      
    default:
      return null;
  }
}

/**
 * Get the driver feed category for a ride
 * 
 * Determines which feed a ride belongs to from the driver's perspective.
 * Feed membership is mutually exclusive - each ride appears in exactly one feed per driver.
 * 
 * Feed Categories:
 * - available: PENDING rides without driver's active offer (can bid)
 * - my_bids: PENDING rides where driver has PENDING offer (awaiting acceptance)
 * - in_progress: Assigned rides (PRE_TRIP, EXECUTION, COMPLETED_INSTANCE)
 * - completed: Fully completed rides assigned to this driver
 * - cancelled: Cancelled rides where driver was involved (assigned or had offer)
 * 
 * @param {Object} ride - The ride object with state and driver_id
 * @param {string} driverId - The driver's user ID
 * @param {Array} driverOffers - Array of offer objects from this driver with {ride_id, driver_id, status}
 * @returns {string|null} - Feed category ('available', 'my_bids', 'in_progress', 'completed', 'cancelled') or null
 * 
 * @example
 * // Available ride (no offer yet)
 * getDriverFeed({ state: 'PENDING', driver_id: null }, 'driver-1', [])
 * // Returns: 'available'
 * 
 * // My bids (pending offer)
 * const offers = [{ ride_id: 'ride-1', driver_id: 'driver-1', status: 'PENDING' }]
 * getDriverFeed({ id: 'ride-1', state: 'PENDING', driver_id: null }, 'driver-1', offers)
 * // Returns: 'my_bids'
 * 
 * // In progress (assigned)
 * getDriverFeed({ state: 'ACTIVE_EXECUTION', driver_id: 'driver-1' }, 'driver-1', [])
 * // Returns: 'in_progress'
 * 
 * @see Design Doc: Driver Feed Categories section
 * @see Requirements: 6.1-6.5, 7.1-7.5, 8.1-8.5, 9.1-9.5, 10.1-10.5
 */
export function getDriverFeed(ride, driverId, driverOffers = []) {
  if (!ride) return null;
  
  // Check if driver has an offer on this ride
  const driverOffer = driverOffers.find(o => 
    o.ride_id === ride.id && 
    o.driver_id === driverId
  );
  
  // State-based feed determination
  switch (ride.state) {
    case 'PENDING':
      // Available: Can bid (no existing PENDING/ACCEPTED offer)
      if (!driverOffer || 
          !['PENDING', 'ACCEPTED', 'pending', 'accepted'].includes(driverOffer.status || driverOffer.offer_status)) {
        return 'available';
      }
      // My Bids: Has pending offer, ride not yet assigned
      if ((driverOffer.status === 'PENDING' || driverOffer.offer_status === 'pending') && !ride.driver_id) {
        return 'my_bids';
      }
      return null;
      
    case 'ACTIVE_PRE_TRIP':
    case 'ACTIVE_EXECUTION':
    case 'COMPLETED_INSTANCE':
      // In Progress: This driver is assigned
      if (ride.driver_id === driverId) {
        return 'in_progress';
      }
      return null;
      
    case 'COMPLETED_FINAL':
      // Completed: This driver completed it
      if (ride.driver_id === driverId) {
        return 'completed';
      }
      return null;
      
    case 'CANCELLED':
      // Cancelled: This driver was assigned OR had an offer
      if (ride.driver_id === driverId || driverOffer) {
        return 'cancelled';
      }
      return null;
      
    default:
      return null;
  }
}

/**
 * Sort rides by timestamp descending (latest first)
 * 
 * Implements the ordering strategy from the design spec:
 * ORDER BY sortTimestamp DESC, ride.id DESC
 * 
 * This ensures:
 * 1. Latest/nearest rides appear first
 * 2. Deterministic ordering (id as tiebreaker)
 * 3. Consistent pagination
 * 
 * @param {Array} rides - Array of ride objects
 * @param {string} feedName - The feed name for timestamp selection
 * @returns {Array} - Sorted array of rides (new array, does not mutate input)
 * 
 * @example
 * const sorted = sortRidesByFeed(rides, 'passenger_pending')
 * // Returns rides ordered by scheduled_start_time DESC, then id DESC
 * 
 * @see Design Doc: Ordering Rules section
 * @see Requirements: 5.1-5.5, 11.1-11.5
 */
export function sortRidesByFeed(rides, feedName) {
  if (!Array.isArray(rides)) return [];
  
  return [...rides].sort((a, b) => {
    const timestampA = getSortTimestampForFeed(a, feedName);
    const timestampB = getSortTimestampForFeed(b, feedName);
    
    // Sort DESC (latest first)
    const dateA = new Date(timestampA);
    const dateB = new Date(timestampB);
    
    if (dateB - dateA !== 0) {
      return dateB - dateA;
    }
    
    // Tiebreaker: use ride ID DESC
    return (b.id || '').localeCompare(a.id || '');
  });
}

/**
 * Get task state priority for errand task ordering
 * 
 * Implements the task ordering strategy from the design spec:
 * 1. Active tasks (in progress) - Priority 1
 * 2. Not started tasks (queued) - Priority 2
 * 3. Completed/cancelled tasks (done) - Priority 3
 * 
 * @param {string} taskState - The task state (e.g., 'TASK_STARTED', 'NOT_STARTED', 'COMPLETED')
 * @returns {number} - Priority number (1 = highest priority, shown first)
 * 
 * @example
 * getTaskStatePriority('TASK_STARTED') // Returns: 1 (active)
 * getTaskStatePriority('NOT_STARTED')  // Returns: 2 (queued)
 * getTaskStatePriority('COMPLETED')    // Returns: 3 (done)
 * 
 * @see Design Doc: Errand Task Ordering section
 * @see Requirements: 14.1-14.5
 */
export function getTaskStatePriority(taskState) {
  // Active tasks first
  if (['ACTIVATE_TASK', 'DRIVER_ON_THE_WAY', 'DRIVER_ARRIVED', 'TASK_STARTED'].includes(taskState)) {
    return 1;
  }
  // Not started tasks second
  if (taskState === 'NOT_STARTED') {
    return 2;
  }
  // Completed/cancelled tasks last
  if (['TASK_COMPLETED', 'TASK_CANCELLED', 'COMPLETED', 'CANCELLED'].includes(taskState)) {
    return 3;
  }
  return 4;
}

/**
 * Sort errand tasks by state priority then order_index
 * 
 * Implements the task ordering strategy:
 * 1. Sort by state priority (active → not_started → completed/cancelled)
 * 2. Within same priority, sort by order_index ASC
 * 
 * This ensures drivers see the current active task at the top,
 * followed by upcoming tasks, with completed tasks at the bottom.
 * 
 * @param {Array} tasks - Array of task objects with {state, order_index}
 * @returns {Array} - Sorted array of tasks (new array, does not mutate input)
 * 
 * @example
 * const tasks = [
 *   { state: 'COMPLETED', order_index: 1 },
 *   { state: 'TASK_STARTED', order_index: 2 },
 *   { state: 'NOT_STARTED', order_index: 3 }
 * ]
 * sortErrandTasks(tasks)
 * // Returns: [TASK_STARTED, NOT_STARTED, COMPLETED]
 * 
 * @see Design Doc: Errand Task Ordering section
 * @see Requirements: 14.1-14.5
 */
export function sortErrandTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  
  return [...tasks].sort((a, b) => {
    const priorityA = getTaskStatePriority(a.task_status || a.state);
    const priorityB = getTaskStatePriority(b.task_status || b.state);
    
    // Sort by priority first
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Then by order_index ASC
    return (a.order_index || a.task_index || 0) - (b.order_index || b.task_index || 0);
  });
}

/**
 * Calculate distance between two geographic points using Haversine formula
 * 
 * The Haversine formula calculates the great-circle distance between two points
 * on a sphere given their longitudes and latitudes. This is used for geospatial
 * filtering of available rides based on driver location.
 * 
 * @param {Object} point1 - First point with {lat, lng} properties
 * @param {Object} point2 - Second point with {lat, lng} properties
 * @returns {number} - Distance in kilometers, or Infinity if coordinates are invalid
 * 
 * @example
 * const distance = calculateDistance(
 *   { lat: 40.7128, lng: -74.0060 }, // New York
 *   { lat: 34.0522, lng: -118.2437 }  // Los Angeles
 * )
 * // Returns: ~3936 km
 * 
 * @see Design Doc: Geospatial Distance Filtering section
 * @see Requirements: 19.1-19.5
 */
export function calculateDistance(point1, point2) {
  if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
    return Infinity;
  }
  
  const R = 6371; // Earth radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 * 
 * Helper function for Haversine formula calculations.
 * 
 * @param {number} degrees - Angle in degrees
 * @returns {number} - Angle in radians
 * @private
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Filter rides by distance from driver location
 * 
 * Implements geospatial distance filtering for the driver available feed.
 * Calculates distance from driver to each ride's pickup location and filters
 * to only include rides within the specified radius.
 * 
 * Returns rides sorted by distance (nearest first) with distance_to_driver_km added.
 * 
 * @param {Array} rides - Array of ride objects with pickup coordinates
 * @param {Object} driverLocation - Driver's current location {lat, lng}
 * @param {number} maxDistanceKm - Maximum distance in kilometers (default 5km per spec)
 * @returns {Array} - Filtered and sorted rides with distance_to_driver_km field added
 * 
 * @example
 * const driverLoc = { lat: 40.7128, lng: -74.0060 }
 * const nearbyRides = filterRidesByDistance(allRides, driverLoc, 5)
 * // Returns only rides within 5km, sorted by distance
 * 
 * @example
 * // No driver location: returns all rides unfiltered
 * const allRides = filterRidesByDistance(rides, null, 5)
 * 
 * @see Design Doc: Geospatial Distance Filtering section
 * @see Requirements: 19.1-19.5
 */
export function filterRidesByDistance(rides, driverLocation, maxDistanceKm = 5) {
  if (!Array.isArray(rides)) return [];
  if (!driverLocation) return rides; // No location: return all rides
  
  return rides
    .map(ride => {
      // Extract pickup coordinates (handle multiple field name variations)
      const pickupCoords = ride.pickup_coordinates || 
                          (ride.pickup_lat && ride.pickup_lng ? 
                            { lat: ride.pickup_lat, lng: ride.pickup_lng } : 
                            null);
      
      const distance = calculateDistance(driverLocation, pickupCoords);
      
      return {
        ...ride,
        distance_to_driver_km: distance
      };
    })
    .filter(ride => ride.distance_to_driver_km <= maxDistanceKm)
    .sort((a, b) => a.distance_to_driver_km - b.distance_to_driver_km);
}

/**
 * Check if a ride is a recurring instance
 * 
 * Recurring rides have schedule_type='RECURRING' and a non-null series_id.
 * Each instance is treated as an independent ride with series metadata.
 * 
 * @param {Object} ride - The ride object
 * @returns {boolean} - True if ride is a recurring instance
 * 
 * @example
 * isRecurringRide({ schedule_type: 'RECURRING', series_id: 'abc-123' })
 * // Returns: true
 * 
 * @see Design Doc: Recurring Rides Handling section
 * @see Requirements: 12.1-12.5
 */
export function isRecurringRide(ride) {
  return ride && 
         (ride.schedule_type === 'RECURRING' || ride.ride_timing === 'scheduled_recurring') && 
         ride.series_id != null;
}

/**
 * Check if a ride is an errand
 * 
 * Errands have ride_type='ERRAND' and contain multiple tasks.
 * Only the parent ride appears in feeds; tasks appear in detail screens.
 * 
 * @param {Object} ride - The ride object
 * @returns {boolean} - True if ride is an errand
 * 
 * @example
 * isErrandRide({ ride_type: 'ERRAND', tasks_total: 3 })
 * // Returns: true
 * 
 * @see Design Doc: Errand Handling section
 * @see Requirements: 13.1-13.5
 */
export function isErrandRide(ride) {
  return ride && 
         (ride.ride_type === 'ERRAND' || ride.service_type === 'errands') &&
         (ride.tasks_total > 0 || ride.number_of_tasks > 0);
}

/**
 * Get display-friendly feed category name
 * 
 * Converts internal feed category identifiers to user-friendly display names.
 * 
 * @param {string} feedCategory - Internal feed category identifier
 * @returns {string} - Display-friendly name
 * 
 * @example
 * getFeedDisplayName('my_bids') // Returns: 'My Bids'
 * getFeedDisplayName('in_progress') // Returns: 'In Progress'
 */
export function getFeedDisplayName(feedCategory) {
  const displayNames = {
    'available': 'Available',
    'my_bids': 'My Bids',
    'in_progress': 'In Progress',
    'pending': 'Pending',
    'active': 'Active',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  
  return displayNames[feedCategory] || feedCategory;
}
