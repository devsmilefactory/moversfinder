/**
 * Unit tests for errandCostHelpers.js
 * 
 * Tests for errand cost distribution, calculation, and validation utilities.
 */

import {
  distributeErrandCosts,
  calculateErrandTotalCost,
  validateErrandCosts,
  addCostsToTasks,
  calculateCostPerTask,
  getErrandCostBreakdown,
  calculateRemainingErrandCost
} from '../errandCostHelpers';

describe('errandCostHelpers', () => {
  describe('distributeErrandCosts', () => {
    test('distributes costs evenly', () => {
      const costs = distributeErrandCosts(100, 4);
      expect(costs).toEqual([25, 25, 25, 25]);
    });

    test('handles rounding differences', () => {
      const costs = distributeErrandCosts(100, 3);
      expect(costs).toHaveLength(3);
      expect(costs.reduce((sum, cost) => sum + cost, 0)).toBeCloseTo(100, 2);
    });

    test('returns empty array for zero tasks', () => {
      expect(distributeErrandCosts(100, 0)).toEqual([]);
    });

    test('handles single task', () => {
      const costs = distributeErrandCosts(50, 1);
      expect(costs).toEqual([50]);
    });
  });

  describe('calculateErrandTotalCost', () => {
    test('calculates total from task costs', () => {
      const ride = {
        errand_tasks: [
          { cost: 10 },
          { cost: 20 },
          { cost: 30 }
        ]
      };
      expect(calculateErrandTotalCost(ride)).toBe(60);
    });

    test('uses estimated_cost when tasks have no costs', () => {
      const ride = {
        estimated_cost: 100,
        errand_tasks: [
          { title: 'Task 1' },
          { title: 'Task 2' }
        ]
      };
      expect(calculateErrandTotalCost(ride)).toBe(100);
    });

    test('returns 0 for rides without tasks or cost', () => {
      expect(calculateErrandTotalCost({})).toBe(0);
      expect(calculateErrandTotalCost({ errand_tasks: [] })).toBe(0);
    });
  });

  describe('validateErrandCosts', () => {
    test('validates correct errand costs', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 60,
        errand_tasks: [
          { cost: 20 },
          { cost: 20 },
          { cost: 20 }
        ]
      };
      const validation = validateErrandCosts(ride);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('detects cost mismatch', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 100,
        errand_tasks: [
          { cost: 20 },
          { cost: 20 }
        ]
      };
      const validation = validateErrandCosts(ride);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('mismatch');
    });

    test('validates non-errand rides', () => {
      const ride = {
        service_type: 'taxi',
        estimated_cost: 50
      };
      const validation = validateErrandCosts(ride);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Not an errand');
    });
  });

  describe('addCostsToTasks', () => {
    test('adds distributed costs to tasks', () => {
      const tasks = [
        { title: 'Task 1' },
        { title: 'Task 2' }
      ];
      const result = addCostsToTasks(tasks, 100);
      expect(result).toHaveLength(2);
      expect(result[0].cost).toBe(50);
      expect(result[1].cost).toBe(50);
    });

    test('preserves existing task properties', () => {
      const tasks = [
        { title: 'Task 1', description: 'Test' }
      ];
      const result = addCostsToTasks(tasks, 50);
      expect(result[0].title).toBe('Task 1');
      expect(result[0].description).toBe('Test');
      expect(result[0].cost).toBe(50);
    });
  });

  describe('getErrandCostBreakdown', () => {
    test('generates breakdown for errand ride', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 90,
        errand_tasks: [
          { title: 'Task 1', cost: 30 },
          { title: 'Task 2', cost: 30 },
          { title: 'Task 3', cost: 30 }
        ]
      };
      const breakdown = getErrandCostBreakdown(ride);
      expect(breakdown.taskCount).toBe(3);
      expect(breakdown.totalCost).toBe(90);
      expect(breakdown.averageCostPerTask).toBe(30);
      expect(breakdown.tasks).toHaveLength(3);
    });

    test('returns null for non-errand rides', () => {
      const ride = {
        service_type: 'taxi',
        estimated_cost: 50
      };
      expect(getErrandCostBreakdown(ride)).toBeNull();
    });
  });

  describe('calculateRemainingErrandCost', () => {
    test('calculates remaining cost based on completed tasks', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 90,
        errand_tasks: [
          { cost: 30 },
          { cost: 30 },
          { cost: 30 }
        ],
        tasks_done: 1
      };
      expect(calculateRemainingErrandCost(ride)).toBe(60);
    });

    test('returns 0 when all tasks completed', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 60,
        errand_tasks: [
          { cost: 30 },
          { cost: 30 }
        ],
        tasks_done: 2
      };
      expect(calculateRemainingErrandCost(ride)).toBe(0);
    });

    test('returns total cost when no tasks completed', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 60,
        errand_tasks: [
          { cost: 30 },
          { cost: 30 }
        ],
        tasks_done: 0
      };
      expect(calculateRemainingErrandCost(ride)).toBe(60);
    });
  });
});
