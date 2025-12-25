/**
 * Ride Progress Tracking Utilities
 * 
 * Centralized progress calculation logic for all ride types:
 * - Simple rides
 * - Round trips
 * - Recurring trips
 * - Recurring round trips
 * - Errands
 * - Recurring errands
 */

import { isRoundTripRide } from './rideCostDisplay';
import { parseErrandTasks } from './errandTasks';
import { getRideTypeHandler } from './rideTypeHandlers';

/**
 * Get progress for simple (non-recurring, non-round-trip) rides
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getSimpleProgress(ride) {
  const isCompleted = ride.ride_status === 'trip_completed';
  
  return {
    type: 'simple',
    completed: isCompleted ? 1 : 0,
    total: 1,
    remaining: isCompleted ? 0 : 1,
    percentage: isCompleted ? 100 : 0,
    status: ride.ride_status || 'pending',
    label: 'trip'
  };
}

/**
 * Get progress for recurring trips (non-round-trip)
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getRecurringTripProgress(ride) {
  const totalTrips = parseInt(ride.number_of_trips) || 1;
  const completed = parseInt(ride.completed_rides_count) || 0;
  const remaining = totalTrips - completed;
  const percentage = totalTrips > 0 ? Math.round((completed / totalTrips) * 100) : 0;
  
  return {
    type: 'recurring',
    completed,
    total: totalTrips,
    remaining,
    percentage,
    inProgress: false,
    label: 'trips'
  };
}

/**
 * Get progress for recurring round trips
 * Shows progress in terms of round trip occurrences, not individual legs
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getRecurringRoundTripProgress(ride) {
  const totalLegs = parseInt(ride.number_of_trips) || 2;
  const totalOccurrences = Math.ceil(totalLegs / 2);
  const completedLegs = parseInt(ride.completed_rides_count) || 0;
  const completedOccurrences = Math.floor(completedLegs / 2);
  const inProgressOccurrence = completedLegs % 2 === 1;
  const remainingOccurrences = totalOccurrences - completedOccurrences - (inProgressOccurrence ? 1 : 0);
  const percentage = totalOccurrences > 0 ? Math.round((completedOccurrences / totalOccurrences) * 100) : 0;
  
  // Determine current occurrence and leg
  const currentOccurrence = completedOccurrences + (inProgressOccurrence ? 1 : 0);
  const currentLeg = inProgressOccurrence ? 'return' : (currentOccurrence < totalOccurrences ? 'outbound' : 'completed');
  
  return {
    type: 'recurring_round_trip',
    completed: completedOccurrences,
    total: totalOccurrences,
    remaining: remainingOccurrences,
    percentage,
    inProgress: inProgressOccurrence,
    currentOccurrence: currentOccurrence <= totalOccurrences ? currentOccurrence : null,
    currentLeg,
    totalLegs,
    completedLegs,
    label: 'round trips'
  };
}

/**
 * Get progress for errand rides
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getErrandProgress(ride) {
  const totalTasks = parseInt(ride.tasks_total) || 0;
  const completedTasks = parseInt(ride.tasks_done) || 0;
  const remainingTasks = parseInt(ride.tasks_left) || (totalTasks - completedTasks);
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeTaskIndex = parseInt(ride.active_errand_task_index) || 0;
  
  // Parse tasks to get detailed status
  const tasks = parseErrandTasks(ride.errand_tasks);
  const tasksWithStatus = tasks.map((task, index) => ({
    ...task,
    isCompleted: index < completedTasks,
    isActive: index === activeTaskIndex,
    isPending: index > activeTaskIndex
  }));
  
  return {
    type: 'errand',
    completed: completedTasks,
    total: totalTasks,
    remaining: remainingTasks,
    percentage,
    activeTaskIndex,
    tasks: tasksWithStatus,
    label: 'tasks'
  };
}

/**
 * Get progress for recurring errands
 * Shows both occurrence progress and task progress
 * @param {Object} ride - Ride object
 * @returns {Object}
 */
export function getRecurringErrandProgress(ride) {
  // Occurrence-level progress
  const totalOccurrences = parseInt(ride.number_of_trips) || 1;
  const completedOccurrences = parseInt(ride.completed_rides_count) || 0;
  const remainingOccurrences = totalOccurrences - completedOccurrences;
  const occurrencePercentage = totalOccurrences > 0 ? Math.round((completedOccurrences / totalOccurrences) * 100) : 0;
  
  // Task-level progress (for current occurrence)
  const totalTasks = parseInt(ride.tasks_total) || 0;
  const completedTasks = parseInt(ride.tasks_done) || 0;
  const remainingTasks = parseInt(ride.tasks_left) || (totalTasks - completedTasks);
  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeTaskIndex = parseInt(ride.active_errand_task_index) || 0;
  
  // Parse tasks for current occurrence
  const tasks = parseErrandTasks(ride.errand_tasks);
  const tasksWithStatus = tasks.map((task, index) => ({
    ...task,
    isCompleted: index < completedTasks,
    isActive: index === activeTaskIndex,
    isPending: index > activeTaskIndex
  }));
  
  return {
    type: 'recurring_errand',
    // Occurrence progress
    completed: completedOccurrences,
    total: totalOccurrences,
    remaining: remainingOccurrences,
    percentage: occurrencePercentage,
    // Task progress (current occurrence)
    taskProgress: {
      completed: completedTasks,
      total: totalTasks,
      remaining: remainingTasks,
      percentage: taskPercentage,
      activeTaskIndex,
      tasks: tasksWithStatus
    },
    label: 'errands'
  };
}

/**
 * Calculate progress for any ride type
 * Main entry point for progress tracking logic
 * Now uses ride type handlers for modular, scalable progress calculation
 * 
 * @param {Object} ride - Ride object
 * @returns {Object} Progress object with completion status, percentages, and labels
 */
export function getRideProgress(ride) {
  if (!ride) {
    return getSimpleProgress({ ride_status: 'pending' });
  }
  
  // Use ride type handler for progress info
  try {
    const handler = getRideTypeHandler(ride.service_type);
    const progressInfo = handler.getProgressInfo(ride);
    
    // Convert handler format to legacy format for backward compatibility
    // Handler returns: { percentage, label, description }
    // Legacy format needs: { type, completed, total, remaining, percentage, status, label }
    const isErrand = handler.isServiceType(ride, 'errands');
    const isRecurring = (ride.number_of_trips > 1) || ride.series_id;
    
    if (isErrand && isRecurring) {
      // For recurring errands, use the detailed progress from legacy function
      const detailedProgress = getRecurringErrandProgress(ride);
      return {
        ...detailedProgress,
        label: progressInfo.label || detailedProgress.label,
        description: progressInfo.description || detailedProgress.description
      };
    }
    
    if (isErrand && !isRecurring) {
      const detailedProgress = getErrandProgress(ride);
      return {
        ...detailedProgress,
        label: progressInfo.label || detailedProgress.label,
        description: progressInfo.description || detailedProgress.description
      };
    }
    
    // For non-errand rides, use handler's progress info
    return {
      type: isRecurring ? 'recurring' : 'simple',
      completed: progressInfo.percentage >= 100 ? 1 : 0,
      total: 1,
      remaining: progressInfo.percentage >= 100 ? 0 : 1,
      percentage: progressInfo.percentage,
      status: ride.ride_status || 'pending',
      label: progressInfo.label || 'trip',
      description: progressInfo.description
    };
  } catch (error) {
    console.warn('Error using ride type handler for progress, falling back to legacy:', error);
  }
  
  // Legacy fallback logic (kept for backward compatibility)
  const isRoundTrip = isRoundTripRide(ride);
  const isRecurring = (ride.number_of_trips > 1) || ride.series_id;
  const handler = getRideTypeHandler(ride.service_type);
  const isErrand = handler.isServiceType(ride, 'errands');
  
  // Recurring round trip
  if (isRoundTrip && isRecurring) {
    return getRecurringRoundTripProgress(ride);
  }
  
  // Recurring errand
  if (isErrand && isRecurring) {
    return getRecurringErrandProgress(ride);
  }
  
  // Errand (single)
  if (isErrand && !isRecurring) {
    return getErrandProgress(ride);
  }
  
  // Recurring trip (non-round-trip, non-errand)
  if (isRecurring) {
    return getRecurringTripProgress(ride);
  }
  
  // Simple ride
  return getSimpleProgress(ride);
}

/**
 * Get progress display text for any ride type
 * @param {Object} ride - Ride object
 * @returns {string} Human-readable progress text
 */
export function getProgressDisplayText(ride) {
  const progress = getRideProgress(ride);
  
  switch (progress.type) {
    case 'simple':
      return progress.completed ? 'Completed' : 'In Progress';
      
    case 'recurring':
      return `${progress.completed} of ${progress.total} ${progress.label} completed`;
      
    case 'recurring_round_trip':
      if (progress.inProgress) {
        return `Round Trip ${progress.currentOccurrence} of ${progress.total} - ${progress.currentLeg === 'return' ? 'Return' : 'Outbound'}`;
      }
      return `${progress.completed} of ${progress.total} ${progress.label} completed`;
      
    case 'errand':
      return `${progress.completed} of ${progress.total} ${progress.label} completed`;
      
    case 'recurring_errand':
      const occurrenceText = `${progress.completed} of ${progress.total} ${progress.label} completed`;
      const taskText = `${progress.taskProgress.completed} of ${progress.taskProgress.total} tasks done`;
      return `${occurrenceText} • ${taskText}`;
      
    default:
      return 'Unknown progress';
  }
}

/**
 * Get progress percentage for display
 * @param {Object} ride - Ride object
 * @returns {number} Progress percentage (0-100)
 */
export function getProgressPercentage(ride) {
  const progress = getRideProgress(ride);
  return progress.percentage || 0;
}

/**
 * Check if ride/series is completed
 * @param {Object} ride - Ride object
 * @returns {boolean}
 */
export function isRideCompleted(ride) {
  const progress = getRideProgress(ride);
  return progress.remaining === 0 && !progress.inProgress;
}

/**
 * Get next action text for ride progress
 * @param {Object} ride - Ride object
 * @returns {string} Next action description
 */
export function getNextActionText(ride) {
  const progress = getRideProgress(ride);
  
  if (isRideCompleted(ride)) {
    return 'All completed';
  }
  
  switch (progress.type) {
    case 'simple':
      return 'Complete trip';
      
    case 'recurring':
      return `${progress.remaining} trips remaining`;
      
    case 'recurring_round_trip':
      if (progress.inProgress) {
        return `Complete ${progress.currentLeg} leg`;
      }
      return `${progress.remaining} round trips remaining`;
      
    case 'errand':
      if (progress.activeTaskIndex < progress.total) {
        const activeTask = progress.tasks[progress.activeTaskIndex];
        return `Next: ${activeTask?.title || 'Unknown task'}`;
      }
      return 'Complete remaining tasks';
      
    case 'recurring_errand':
      if (progress.taskProgress.remaining > 0) {
        const activeTask = progress.taskProgress.tasks[progress.taskProgress.activeTaskIndex];
        return `Next: ${activeTask?.title || 'Unknown task'}`;
      }
      return `${progress.remaining} errands remaining`;
      
    default:
      return 'Continue';
  }
}
