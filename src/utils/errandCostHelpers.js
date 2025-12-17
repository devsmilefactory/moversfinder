/**
 * Errand Cost Helper Utilities
 * 
 * Utilities for distributing, calculating, and validating errand task costs.
 */

import { parseErrandTasks } from './errandTasks';

/**
 * Distribute total cost evenly across errand tasks
 * @param {number} totalCost - Total cost to distribute
 * @param {number} taskCount - Number of tasks
 * @returns {Array<number>} Array of costs for each task
 */
export function distributeErrandCosts(totalCost, taskCount) {
  if (!taskCount || taskCount <= 0) {
    return [];
  }
  
  const total = parseFloat(totalCost) || 0;
  const count = parseInt(taskCount);
  
  // Calculate base cost per task
  const baseCost = total / count;
  
  // Round to 2 decimal places
  const roundedCosts = Array(count).fill(0).map(() => 
    Math.round(baseCost * 100) / 100
  );
  
  // Handle rounding differences by adjusting the last task
  const sumOfRounded = roundedCosts.reduce((sum, cost) => sum + cost, 0);
  const difference = Math.round((total - sumOfRounded) * 100) / 100;
  
  if (difference !== 0 && count > 0) {
    roundedCosts[count - 1] += difference;
    roundedCosts[count - 1] = Math.round(roundedCosts[count - 1] * 100) / 100;
  }
  
  return roundedCosts;
}

/**
 * Calculate total cost from errand tasks or ride
 * @param {Array|Object} input - Array of task objects with cost property, or ride object with errand_tasks
 * @returns {number} Total cost
 */
export function calculateErrandTotalCost(input) {
  // Handle ride object input
  if (input && !Array.isArray(input) && input.errand_tasks) {
    const tasks = input.errand_tasks;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return parseFloat(input.estimated_cost) || 0;
    }
    
    // Check if tasks have cost properties
    const hasTaskCosts = tasks.some(task => task.cost !== undefined && task.cost !== null);
    if (!hasTaskCosts) {
      return parseFloat(input.estimated_cost) || 0;
    }
    
    const total = tasks.reduce((sum, task) => {
      const taskCost = parseFloat(task.cost) || 0;
      return sum + taskCost;
    }, 0);
    
    return Math.round(total * 100) / 100;
  }
  
  // Handle array input (legacy)
  if (!Array.isArray(input) || input.length === 0) {
    return 0;
  }
  
  const total = input.reduce((sum, task) => {
    const taskCost = parseFloat(task.cost) || 0;
    return sum + taskCost;
  }, 0);
  
  return Math.round(total * 100) / 100;
}

/**
 * Validate errand costs
 * @param {Array|Object} input - Array of task objects with cost property, or ride object
 * @param {number} expectedTotal - Expected total cost (optional if ride object provided)
 * @param {number} tolerance - Acceptable difference (default: 0.01)
 * @returns {Object} Validation result with isValid, actualTotal, difference, and errors
 */
export function validateErrandCosts(input, expectedTotal, tolerance = 0.01) {
  const errors = [];
  
  // Handle ride object input
  if (input && !Array.isArray(input)) {
    // Check if it's an errand ride
    if (input.service_type !== 'errands') {
      return {
        isValid: false,
        actualTotal: 0,
        difference: 0,
        errors: ['Not an errand ride']
      };
    }
    
    const tasks = input.errand_tasks;
    const rideExpectedTotal = parseFloat(input.estimated_cost) || 0;
    
    if (!Array.isArray(tasks)) {
      return {
        isValid: false,
        actualTotal: 0,
        difference: rideExpectedTotal,
        errors: ['Tasks must be an array']
      };
    }
    
    return validateErrandCosts(tasks, rideExpectedTotal, tolerance);
  }
  
  // Handle array input
  if (!Array.isArray(input)) {
    return {
      isValid: false,
      actualTotal: 0,
      difference: expectedTotal || 0,
      errors: ['Tasks must be an array']
    };
  }
  
  const tasks = input;
  
  if (tasks.length === 0) {
    return {
      isValid: expectedTotal === 0,
      actualTotal: 0,
      difference: expectedTotal,
      errors: expectedTotal === 0 ? [] : ['No tasks provided but expected cost is non-zero']
    };
  }
  
  // Check that all tasks have cost property
  const tasksWithoutCost = tasks.filter(task => 
    task.cost === null || task.cost === undefined || isNaN(parseFloat(task.cost))
  );
  
  if (tasksWithoutCost.length > 0) {
    errors.push(`${tasksWithoutCost.length} task(s) missing cost property`);
  }
  
  // Calculate actual total
  const actualTotal = calculateErrandTotalCost(tasks);
  const expected = parseFloat(expectedTotal) || 0;
  const difference = Math.abs(actualTotal - expected);
  
  // Check if total matches expected within tolerance
  if (difference > tolerance) {
    errors.push(`Total cost mismatch: expected ${expected.toFixed(2)}, got ${actualTotal.toFixed(2)} (difference: ${difference.toFixed(2)})`);
  }
  
  // Check for negative costs
  const negativeCosts = tasks.filter(task => parseFloat(task.cost) < 0);
  if (negativeCosts.length > 0) {
    errors.push(`${negativeCosts.length} task(s) have negative costs`);
  }
  
  return {
    isValid: errors.length === 0,
    actualTotal,
    difference,
    errors
  };
}

/**
 * Add costs to errand tasks
 * @param {Array} tasks - Array of task objects
 * @param {number} totalCost - Total cost to distribute
 * @returns {Array} Tasks with cost property added
 */
export function addCostsToTasks(tasks, totalCost) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }
  
  const costs = distributeErrandCosts(totalCost, tasks.length);
  
  return tasks.map((task, index) => ({
    ...task,
    cost: costs[index] || 0
  }));
}

/**
 * Calculate cost per task for recurring errands
 * @param {number} costPerOccurrence - Cost per errand occurrence
 * @param {number} taskCount - Number of tasks per occurrence
 * @returns {number} Cost per task
 */
export function calculateCostPerTask(costPerOccurrence, taskCount) {
  if (!taskCount || taskCount <= 0) {
    return 0;
  }
  
  const cost = parseFloat(costPerOccurrence) || 0;
  const count = parseInt(taskCount);
  
  return Math.round((cost / count) * 100) / 100;
}

/**
 * Get errand cost breakdown
 * @param {Object} ride - Ride object with errand tasks
 * @returns {Object} Cost breakdown with per-task and total costs
 */
export function getErrandCostBreakdown(ride) {
  if (!ride || ride.service_type !== 'errands') {
    return null;
  }
  
  const tasks = parseErrandTasks(ride.errand_tasks);
  const totalCost = parseFloat(ride.estimated_cost) || 0;
  const taskCount = tasks.length;
  
  // Calculate costs
  const tasksWithCosts = tasks.map(task => ({
    ...task,
    cost: parseFloat(task.cost) || (taskCount > 0 ? totalCost / taskCount : 0)
  }));
  
  const actualTotal = calculateErrandTotalCost(tasksWithCosts);
  const averageCostPerTask = taskCount > 0 ? actualTotal / taskCount : 0;
  
  return {
    totalCost: actualTotal,
    taskCount,
    averageCostPerTask: Math.round(averageCostPerTask * 100) / 100,
    tasks: tasksWithCosts.map(task => ({
      id: task.id,
      title: task.title,
      cost: Math.round((task.cost || 0) * 100) / 100
    })),
    isValid: Math.abs(actualTotal - totalCost) < 0.01
  };
}

/**
 * Calculate remaining cost for partially completed errands
 * @param {Object} ride - Ride object with errand tasks
 * @returns {number} Remaining cost for incomplete tasks
 */
export function calculateRemainingErrandCost(ride) {
  if (!ride || ride.service_type !== 'errands') {
    return 0;
  }
  
  const tasks = parseErrandTasks(ride.errand_tasks);
  const completedCount = parseInt(ride.tasks_done) || 0;
  const totalCost = parseFloat(ride.estimated_cost) || 0;
  const taskCount = tasks.length;
  
  if (taskCount === 0) {
    return 0;
  }
  
  // Calculate remaining cost based on incomplete tasks
  const remainingTasks = taskCount - completedCount;
  const costPerTask = totalCost / taskCount;
  const remainingCost = costPerTask * remainingTasks;
  
  return Math.round(remainingCost * 100) / 100;
}
