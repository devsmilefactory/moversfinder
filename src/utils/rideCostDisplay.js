/**
 * Ride Cost Display Utilities
 * 
 * Centralized cost calculation and display logic for all ride types:
 * - Simple rides
 * - Round trips
 * - Recurring trips
 * - Recurring round trips
 * - Errands
 * - Recurring errands
 */

import { formatPrice } from './formatters';
import { parseErrandTasks } from './errandTasks';
import { getRideTypeHandler } from './rideTypeHandlers';

/**
 * Determine if ride is a round trip
 * @param {Object} ride - Ride object
 * @returns {boolean}
 */
export function isRoundTripRide(ride) {
  if (!ride) return false;
  return ride.is_round_trip === true || 
         ride.trip_leg_type === 'outbound' || 
         ride.trip_leg_type === 'return';
}

/**
 * Calculate per-trip cost for recurring rides
 * @param {Object} ride - Ride object
 * @returns {number}
 */
export function calculatePerTripCost(ride) {
  if (!ride) return 0;
  
  // Use explicit cost_per_trip if available
  if (ride.cost_per_trip !== null && ride.cost_per_trip !== undefined) {
    return parseFloat(ride.cost_per_trip) || 0;
  }
  
  // Calculate from total
  const totalCost = parseFloat(ride.estimated_cost) || 0;
  const tripCount = parseInt(ride.number_of_trips) || 1;
  
  if (tripCount > 0) {
    return totalCost / tripCount;
  }
  
  return totalCost;
}

/**
 * Get cost display for simple (non-recurring, non-round-trip) rides
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getSimpleCostDisplay(ride) {
  const total = parseFloat(ride.estimated_cost || ride.fare) || 0;
  
  return {
    type: 'simple',
    total,
    display: formatPrice(total),
    label: 'Total Cost'
  };
}

/**
 * Get cost display for round trip rides (single occurrence)
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getRoundTripCostDisplay(ride) {
  const total = parseFloat(ride.estimated_cost) || 0;
  const outboundCost = parseFloat(ride.outbound_cost) || (total / 2);
  const returnCost = parseFloat(ride.return_cost) || (total / 2);
  
  return {
    type: 'round_trip',
    total,
    outboundCost,
    returnCost,
    display: formatPrice(total),
    breakdown: {
      outbound: formatPrice(outboundCost),
      return: formatPrice(returnCost)
    },
    label: 'Round Trip Total'
  };
}

/**
 * Get cost display for recurring trips (non-round-trip)
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getRecurringTripCostDisplay(ride) {
  const total = parseFloat(ride.estimated_cost) || 0;
  const tripCount = parseInt(ride.number_of_trips) || 1;
  const completed = parseInt(ride.completed_rides_count) || 0;
  const perTrip = calculatePerTripCost(ride);
  const remaining = tripCount - completed;
  const remainingCost = parseFloat(ride.remaining_cost) || (perTrip * remaining);
  
  return {
    type: 'recurring',
    total,
    perTrip,
    totalTrips: tripCount,
    completed,
    remaining,
    remainingCost,
    display: formatPrice(total),
    perTripDisplay: formatPrice(perTrip),
    remainingCostDisplay: formatPrice(remainingCost),
    label: 'Series Total'
  };
}

/**
 * Get cost display for recurring round trips
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getRecurringRoundTripCostDisplay(ride) {
  const total = parseFloat(ride.estimated_cost) || 0;
  const totalLegs = parseInt(ride.number_of_trips) || 2;
  const totalOccurrences = Math.ceil(totalLegs / 2);
  const completedLegs = parseInt(ride.completed_rides_count) || 0;
  const completedOccurrences = Math.floor(completedLegs / 2);
  const perLeg = calculatePerTripCost(ride);
  const perOccurrence = perLeg * 2;
  const remainingOccurrences = totalOccurrences - completedOccurrences - (completedLegs % 2 === 1 ? 1 : 0);
  const remainingCost = parseFloat(ride.remaining_cost) || (perOccurrence * remainingOccurrences);
  
  return {
    type: 'recurring_round_trip',
    total,
    perLeg,
    perOccurrence,
    totalOccurrences,
    totalLegs,
    completedLegs,
    completedOccurrences,
    remainingOccurrences,
    remainingCost,
    display: formatPrice(total),
    perLegDisplay: formatPrice(perLeg),
    perOccurrenceDisplay: formatPrice(perOccurrence),
    remainingCostDisplay: formatPrice(remainingCost),
    label: 'Series Total'
  };
}

/**
 * Get cost display for errand rides
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getErrandCostDisplay(ride) {
  const total = parseFloat(ride.estimated_cost) || 0;
  const tasks = parseErrandTasks(ride.errand_tasks);
  const taskCount = tasks.length;
  
  // Calculate task costs
  const tasksWithCosts = tasks.map((task, index) => {
    const taskCost = parseFloat(task.cost) || (taskCount > 0 ? total / taskCount : 0);
    return {
      ...task,
      cost: taskCost,
      costDisplay: formatPrice(taskCost)
    };
  });
  
  return {
    type: 'errand',
    total,
    taskCount,
    tasks: tasksWithCosts,
    display: formatPrice(total),
    label: 'Total Cost'
  };
}

/**
 * Get cost display for recurring errands
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getRecurringErrandCostDisplay(ride) {
  const total = parseFloat(ride.estimated_cost) || 0;
  const occurrenceCount = parseInt(ride.number_of_trips) || 1;
  const completed = parseInt(ride.completed_rides_count) || 0;
  const perOccurrence = calculatePerTripCost(ride);
  const remaining = occurrenceCount - completed;
  const remainingCost = parseFloat(ride.remaining_cost) || (perOccurrence * remaining);
  
  // Parse tasks for current occurrence
  const tasks = parseErrandTasks(ride.errand_tasks);
  const taskCount = tasks.length;
  const costPerTask = taskCount > 0 ? perOccurrence / taskCount : 0;
  
  const tasksWithCosts = tasks.map((task, index) => {
    const taskCost = parseFloat(task.cost) || costPerTask;
    return {
      ...task,
      cost: taskCost,
      costDisplay: formatPrice(taskCost)
    };
  });
  
  return {
    type: 'recurring_errand',
    total,
    perOccurrence,
    totalOccurrences: occurrenceCount,
    completed,
    remaining,
    remainingCost,
    taskCount,
    costPerTask,
    tasks: tasksWithCosts,
    display: formatPrice(total),
    perOccurrenceDisplay: formatPrice(perOccurrence),
    costPerTaskDisplay: formatPrice(costPerTask),
    remainingCostDisplay: formatPrice(remainingCost),
    label: 'Series Total'
  };
}

/**
 * Get comprehensive cost display for any ride type
 * Main entry point for cost display logic
 * Now uses ride type handlers for modular, scalable cost calculation
 * 
 * @param {Object} ride - Ride object
 * @returns {Object} Cost display object with type-specific fields
 */
export function getRideCostDisplay(ride) {
  if (!ride) {
    return getSimpleCostDisplay({ estimated_cost: 0 });
  }
  
  // Use ride type handler for cost breakdown
  try {
    const handler = getRideTypeHandler(ride.service_type);
    return handler.getCostBreakdown(ride);
  } catch (error) {
    console.warn('Error using ride type handler for cost, falling back to legacy:', error);
  }
  
  // Legacy fallback logic (kept for backward compatibility)
  const isRoundTrip = isRoundTripRide(ride);
  const isRecurring = (ride.number_of_trips > 1) || ride.series_id;
  const handler = getRideTypeHandler(ride.service_type);
  const isErrand = handler.isServiceType(ride, 'errands');
  
  // Recurring round trip
  if (isRoundTrip && isRecurring) {
    return getRecurringRoundTripCostDisplay(ride);
  }
  
  // Round trip (single)
  if (isRoundTrip && !isRecurring) {
    return getRoundTripCostDisplay(ride);
  }
  
  // Recurring errand
  if (isErrand && isRecurring) {
    return getRecurringErrandCostDisplay(ride);
  }
  
  // Errand (single)
  if (isErrand && !isRecurring) {
    return getErrandCostDisplay(ride);
  }
  
  // Recurring trip (non-round-trip, non-errand)
  if (isRecurring) {
    return getRecurringTripCostDisplay(ride);
  }
  
  // Simple ride
  return getSimpleCostDisplay(ride);
}

/**
 * Get formatted cost string for quick display
 * @param {Object} ride - Ride object
 * @returns {string} Formatted cost string
 */
export function getFormattedCost(ride) {
  const costDisplay = getRideCostDisplay(ride);
  return costDisplay.display;
}

/**
 * Get cost breakdown text for detailed display
 * @param {Object} ride - Ride object
 * @returns {string} Cost breakdown text
 */
export function getCostBreakdownText(ride) {
  const costDisplay = getRideCostDisplay(ride);
  
  switch (costDisplay.type) {
    case 'round_trip':
      return `Outbound: ${costDisplay.breakdown.outbound} • Return: ${costDisplay.breakdown.return}`;
      
    case 'recurring':
      return `${costDisplay.perTripDisplay}/trip × ${costDisplay.totalTrips} trips`;
      
    case 'recurring_round_trip':
      return `${costDisplay.perOccurrenceDisplay}/round trip × ${costDisplay.totalOccurrences} occurrences`;
      
    case 'errand':
      return `${costDisplay.taskCount} task${costDisplay.taskCount !== 1 ? 's' : ''}`;
      
    case 'recurring_errand':
      return `${costDisplay.perOccurrenceDisplay}/occurrence × ${costDisplay.totalOccurrences} occurrences`;
      
    default:
      return costDisplay.display;
  }
}
