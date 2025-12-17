/**
 * Property-based tests for rideCostDisplay.js
 * 
 * These tests verify correctness properties that should hold for all valid inputs
 * using property-based testing patterns.
 * 
 * Note: fast-check library would be ideal for true property-based testing.
 * For now, using Jest with multiple test scenarios to simulate property testing.
 */

import { 
  getRideCostDisplay, 
  calculatePerTripCost, 
  isRoundTripRide, 
  getFormattedCost,
  getCostBreakdownText
} from '../rideCostDisplay';

describe('rideCostDisplay', () => {
  describe('Property 10: Round trip cost sum invariant', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 10: Round trip cost sum invariant**
     * **Validates: Requirements 2.5**
     * 
     * For any round trip ride, the total cost should equal outbound_cost + return_cost
     * within a rounding tolerance.
     */
    test('round trip total equals sum of leg costs within tolerance', () => {
      const testCases = [
        { outbound_cost: 15.00, return_cost: 15.00, estimated_cost: 30.00 },
        { outbound_cost: 12.50, return_cost: 17.50, estimated_cost: 30.00 },
        { outbound_cost: 25.75, return_cost: 24.25, estimated_cost: 50.00 },
        { outbound_cost: 8.33, return_cost: 8.34, estimated_cost: 16.67 },
        { outbound_cost: 100.00, return_cost: 50.00, estimated_cost: 150.00 },
      ];

      testCases.forEach(({ outbound_cost, return_cost, estimated_cost }) => {
        const ride = {
          is_round_trip: true,
          outbound_cost,
          return_cost,
          estimated_cost,
          trip_leg_type: 'outbound'
        };

        const display = getRideCostDisplay(ride);
        const tolerance = 0.01;
        const expectedSum = outbound_cost + return_cost;
        
        expect(Math.abs(display.total - expectedSum)).toBeLessThan(tolerance);
        expect(display.type).toBe('round_trip');
        expect(display.outboundCost).toBe(outbound_cost);
        expect(display.returnCost).toBe(return_cost);
      });
    });

    test('handles edge cases with zero costs', () => {
      const ride = {
        is_round_trip: true,
        outbound_cost: 0,
        return_cost: 0,
        estimated_cost: 0,
        trip_leg_type: 'outbound'
      };

      const display = getRideCostDisplay(ride);
      expect(display.total).toBe(0);
      expect(display.outboundCost).toBe(0);
      expect(display.returnCost).toBe(0);
    });

    test('handles missing leg costs by using estimated_cost/2', () => {
      const ride = {
        is_round_trip: true,
        estimated_cost: 40.00,
        trip_leg_type: 'outbound'
      };

      const display = getRideCostDisplay(ride);
      expect(display.outboundCost).toBe(20.00);
      expect(display.returnCost).toBe(20.00);
      expect(display.total).toBe(40.00);
    });
  });

  describe('Property 20: Remaining cost calculation', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 20: Remaining cost calculation**
     * **Validates: Requirements 4.5**
     * 
     * For any recurring trip, the remaining_cost should equal cost_per_trip × remaining_trips
     * within a rounding tolerance.
     */
    test('remaining cost equals cost_per_trip × remaining_trips within tolerance', () => {
      const testCases = [
        { 
          estimated_cost: 100.00, 
          number_of_trips: 5, 
          completed_rides_count: 2,
          cost_per_trip: 20.00,
          expected_remaining: 60.00
        },
        { 
          estimated_cost: 150.00, 
          number_of_trips: 10, 
          completed_rides_count: 7,
          cost_per_trip: 15.00,
          expected_remaining: 45.00
        },
        { 
          estimated_cost: 80.00, 
          number_of_trips: 4, 
          completed_rides_count: 0,
          cost_per_trip: 20.00,
          expected_remaining: 80.00
        },
        { 
          estimated_cost: 200.00, 
          number_of_trips: 8, 
          completed_rides_count: 8,
          cost_per_trip: 25.00,
          expected_remaining: 0.00
        }
      ];

      testCases.forEach(({ estimated_cost, number_of_trips, completed_rides_count, cost_per_trip, expected_remaining }) => {
        const ride = {
          estimated_cost,
          number_of_trips,
          completed_rides_count,
          cost_per_trip,
          series_id: 'test-series'
        };

        const display = getRideCostDisplay(ride);
        const tolerance = 0.01;
        
        expect(Math.abs(display.remainingCost - expected_remaining)).toBeLessThan(tolerance);
        expect(display.type).toBe('recurring');
        expect(display.remaining).toBe(number_of_trips - completed_rides_count);
      });
    });

    test('handles edge case with no remaining trips', () => {
      const ride = {
        estimated_cost: 100.00,
        number_of_trips: 5,
        completed_rides_count: 5,
        cost_per_trip: 20.00,
        series_id: 'test-series'
      };

      const display = getRideCostDisplay(ride);
      expect(display.remainingCost).toBe(0);
      expect(display.remaining).toBe(0);
    });

    test('calculates remaining cost when cost_per_trip is missing', () => {
      const ride = {
        estimated_cost: 120.00,
        number_of_trips: 6,
        completed_rides_count: 2,
        series_id: 'test-series'
      };

      const display = getRideCostDisplay(ride);
      const expectedPerTrip = 20.00;
      const expectedRemaining = expectedPerTrip * 4;
      const tolerance = 0.01;
      
      expect(Math.abs(display.remainingCost - expectedRemaining)).toBeLessThan(tolerance);
      expect(display.perTrip).toBe(expectedPerTrip);
    });

    test('uses database remaining_cost field when available', () => {
      const ride = {
        estimated_cost: 100.00,
        number_of_trips: 5,
        completed_rides_count: 2,
        cost_per_trip: 20.00,
        remaining_cost: 55.00,
        series_id: 'test-series'
      };

      const display = getRideCostDisplay(ride);
      expect(display.remainingCost).toBe(55.00);
    });
  });

  describe('Property 24: Errand total cost sum invariant', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 24: Errand total cost sum invariant**
     * **Validates: Requirements 5.4**
     * 
     * For any errand ride, the total cost should equal the sum of all task costs
     * within a rounding tolerance.
     */
    test('errand total equals sum of task costs within tolerance', () => {
      const testCases = [
        {
          tasks: [
            { id: '1', title: 'Task 1', cost: 10.00 },
            { id: '2', title: 'Task 2', cost: 15.00 },
            { id: '3', title: 'Task 3', cost: 5.00 }
          ],
          expected_total: 30.00
        },
        {
          tasks: [
            { id: '1', title: 'Pickup', cost: 12.50 },
            { id: '2', title: 'Delivery', cost: 17.50 }
          ],
          expected_total: 30.00
        },
        {
          tasks: [
            { id: '1', title: 'Single task', cost: 25.75 }
          ],
          expected_total: 25.75
        },
        {
          tasks: [
            { id: '1', title: 'Task A', cost: 8.33 },
            { id: '2', title: 'Task B', cost: 8.33 },
            { id: '3', title: 'Task C', cost: 8.34 }
          ],
          expected_total: 25.00
        }
      ];

      testCases.forEach(({ tasks, expected_total }) => {
        const ride = {
          service_type: 'errands',
          estimated_cost: expected_total,
          errand_tasks: tasks
        };

        const display = getRideCostDisplay(ride);
        const tolerance = 0.01;
        const actualTaskSum = display.tasks.reduce((sum, task) => sum + task.cost, 0);
        
        expect(Math.abs(display.total - actualTaskSum)).toBeLessThan(tolerance);
        expect(display.type).toBe('errand');
        expect(display.taskCount).toBe(tasks.length);
        expect(Math.abs(actualTaskSum - expected_total)).toBeLessThan(tolerance);
      });
    });

    test('handles errands with missing task costs by distributing evenly', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 60.00,
        errand_tasks: [
          { id: '1', title: 'Task 1' },
          { id: '2', title: 'Task 2' },
          { id: '3', title: 'Task 3' }
        ]
      };

      const display = getRideCostDisplay(ride);
      const expectedCostPerTask = 20.00;
      const tolerance = 0.01;
      
      display.tasks.forEach(task => {
        expect(Math.abs(task.cost - expectedCostPerTask)).toBeLessThan(tolerance);
      });
      
      const totalTaskCosts = display.tasks.reduce((sum, task) => sum + task.cost, 0);
      expect(Math.abs(totalTaskCosts - 60.00)).toBeLessThan(tolerance);
    });

    test('handles empty errand tasks array', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 30.00,
        errand_tasks: []
      };

      const display = getRideCostDisplay(ride);
      expect(display.type).toBe('errand');
      expect(display.taskCount).toBe(0);
      expect(display.tasks).toHaveLength(0);
      expect(display.total).toBe(30.00);
    });
  });

  describe('Property 30: Recurring errand cost multiplication', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 30: Recurring errand cost multiplication**
     * **Validates: Requirements 6.5**
     * 
     * For any recurring errand, the total cost should equal cost_per_occurrence × occurrence_count
     * within a rounding tolerance.
     */
    test('recurring errand total equals cost_per_occurrence × occurrence_count within tolerance', () => {
      const testCases = [
        {
          cost_per_occurrence: 25.00,
          occurrence_count: 4,
          expected_total: 100.00
        },
        {
          cost_per_occurrence: 15.50,
          occurrence_count: 6,
          expected_total: 93.00
        },
        {
          cost_per_occurrence: 33.33,
          occurrence_count: 3,
          expected_total: 99.99
        },
        {
          cost_per_occurrence: 50.00,
          occurrence_count: 1,
          expected_total: 50.00
        }
      ];

      testCases.forEach(({ cost_per_occurrence, occurrence_count, expected_total }) => {
        const ride = {
          service_type: 'errands',
          estimated_cost: expected_total,
          number_of_trips: occurrence_count,
          cost_per_trip: cost_per_occurrence,
          series_id: 'test-series',
          errand_tasks: [
            { id: '1', title: 'Task 1', cost: cost_per_occurrence / 2 },
            { id: '2', title: 'Task 2', cost: cost_per_occurrence / 2 }
          ]
        };

        const display = getRideCostDisplay(ride);
        const tolerance = 0.01;
        const calculatedTotal = display.perOccurrence * display.totalOccurrences;
        
        expect(Math.abs(display.total - calculatedTotal)).toBeLessThan(tolerance);
        expect(display.type).toBe('recurring_errand');
        expect(display.perOccurrence).toBe(cost_per_occurrence);
        expect(display.totalOccurrences).toBe(occurrence_count);
        expect(Math.abs(calculatedTotal - expected_total)).toBeLessThan(tolerance);
      });
    });

    test('calculates per-occurrence cost when cost_per_trip is missing', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 120.00,
        number_of_trips: 4,
        series_id: 'test-series',
        errand_tasks: [
          { id: '1', title: 'Task 1' },
          { id: '2', title: 'Task 2' },
          { id: '3', title: 'Task 3' }
        ]
      };

      const display = getRideCostDisplay(ride);
      const expectedPerOccurrence = 30.00;
      const expectedTotal = expectedPerOccurrence * 4;
      const tolerance = 0.01;
      
      expect(Math.abs(display.perOccurrence - expectedPerOccurrence)).toBeLessThan(tolerance);
      expect(Math.abs(display.total - expectedTotal)).toBeLessThan(tolerance);
      expect(display.costPerTask).toBe(10.00);
    });

    test('handles recurring errand with progress tracking', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 200.00,
        number_of_trips: 5,
        completed_rides_count: 2,
        cost_per_trip: 40.00,
        series_id: 'test-series',
        errand_tasks: [
          { id: '1', title: 'Task 1', cost: 20.00 },
          { id: '2', title: 'Task 2', cost: 20.00 }
        ]
      };

      const display = getRideCostDisplay(ride);
      const tolerance = 0.01;
      
      expect(display.totalOccurrences).toBe(5);
      expect(display.completed).toBe(2);
      expect(display.remaining).toBe(3);
      expect(Math.abs(display.remainingCost - (40.00 * 3))).toBeLessThan(tolerance);
      expect(display.perOccurrence).toBe(40.00);
      expect(display.costPerTask).toBe(20.00);
    });

    test('handles single occurrence recurring errand', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 45.00,
        number_of_trips: 1,
        cost_per_trip: 45.00,
        series_id: 'test-series',
        errand_tasks: [
          { id: '1', title: 'Only task', cost: 45.00 }
        ]
      };

      const display = getRideCostDisplay(ride);
      expect(display.type).toBe('recurring_errand');
      expect(display.totalOccurrences).toBe(1);
      expect(display.perOccurrence).toBe(45.00);
      expect(display.total).toBe(45.00);
      expect(display.costPerTask).toBe(45.00);
    });
  });

  describe('calculatePerTripCost', () => {
    test('uses explicit cost_per_trip when available', () => {
      const ride = {
        cost_per_trip: 25.00,
        estimated_cost: 100.00,
        number_of_trips: 5
      };

      expect(calculatePerTripCost(ride)).toBe(25.00);
    });

    test('calculates from total when cost_per_trip missing', () => {
      const ride = {
        estimated_cost: 100.00,
        number_of_trips: 4
      };

      expect(calculatePerTripCost(ride)).toBe(25.00);
    });

    test('returns estimated_cost for single trips', () => {
      const ride = {
        estimated_cost: 30.00,
        number_of_trips: 1
      };

      expect(calculatePerTripCost(ride)).toBe(30.00);
    });

    test('handles null/undefined ride', () => {
      expect(calculatePerTripCost(null)).toBe(0);
      expect(calculatePerTripCost(undefined)).toBe(0);
    });
  });

  describe('isRoundTripRide', () => {
    test('detects round trips by is_round_trip flag', () => {
      expect(isRoundTripRide({ is_round_trip: true })).toBe(true);
      expect(isRoundTripRide({ is_round_trip: false })).toBe(false);
    });

    test('detects round trips by trip_leg_type', () => {
      expect(isRoundTripRide({ trip_leg_type: 'outbound' })).toBe(true);
      expect(isRoundTripRide({ trip_leg_type: 'return' })).toBe(true);
      expect(isRoundTripRide({ trip_leg_type: 'single' })).toBe(false);
    });

    test('handles null/undefined input', () => {
      expect(isRoundTripRide(null)).toBe(false);
      expect(isRoundTripRide(undefined)).toBe(false);
      expect(isRoundTripRide({})).toBe(false);
    });
  });

  describe('getRideCostDisplay - comprehensive scenarios', () => {
    test('simple ride display', () => {
      const ride = {
        estimated_cost: 25.00
      };

      const display = getRideCostDisplay(ride);
      expect(display.type).toBe('simple');
      expect(display.total).toBe(25.00);
      expect(display.display).toContain('25.00');
    });

    test('recurring trip display', () => {
      const ride = {
        estimated_cost: 100.00,
        number_of_trips: 5,
        completed_rides_count: 2
      };

      const display = getRideCostDisplay(ride);
      expect(display.type).toBe('recurring');
      expect(display.total).toBe(100.00);
      expect(display.perTrip).toBe(20.00);
      expect(display.totalTrips).toBe(5);
      expect(display.completed).toBe(2);
      expect(display.remaining).toBe(3);
    });

    test('recurring round trip display', () => {
      const ride = {
        is_round_trip: true,
        estimated_cost: 200.00,
        number_of_trips: 10,
        completed_rides_count: 4,
        cost_per_trip: 20.00
      };

      const display = getRideCostDisplay(ride);
      expect(display.type).toBe('recurring_round_trip');
      expect(display.total).toBe(200.00);
      expect(display.perLeg).toBe(20.00);
      expect(display.perOccurrence).toBe(40.00);
      expect(display.totalOccurrences).toBe(5);
      expect(display.completedOccurrences).toBe(2);
    });

    test('errand display with task costs', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 45.00,
        errand_tasks: [
          { id: '1', title: 'Task 1', cost: 15.00 },
          { id: '2', title: 'Task 2', cost: 15.00 },
          { id: '3', title: 'Task 3', cost: 15.00 }
        ]
      };

      const display = getRideCostDisplay(ride);
      expect(display.type).toBe('errand');
      expect(display.total).toBe(45.00);
      expect(display.taskCount).toBe(3);
      expect(display.tasks).toHaveLength(3);
      expect(display.tasks[0].cost).toBe(15.00);
    });
  });

  describe('getFormattedCost', () => {
    test('returns formatted cost string', () => {
      const ride = { estimated_cost: 25.50 };
      const formatted = getFormattedCost(ride);
      expect(formatted).toContain('25.50');
    });
  });

  describe('getCostBreakdownText', () => {
    test('returns breakdown for round trip', () => {
      const ride = {
        is_round_trip: true,
        estimated_cost: 40.00,
        outbound_cost: 20.00,
        return_cost: 20.00
      };
      const breakdown = getCostBreakdownText(ride);
      expect(breakdown).toContain('Outbound');
      expect(breakdown).toContain('Return');
    });

    test('returns breakdown for recurring trip', () => {
      const ride = {
        estimated_cost: 100.00,
        number_of_trips: 5
      };
      const breakdown = getCostBreakdownText(ride);
      expect(breakdown).toContain('/trip');
      expect(breakdown).toContain('5 trips');
    });

    test('returns breakdown for errand', () => {
      const ride = {
        service_type: 'errands',
        estimated_cost: 45.00,
        errand_tasks: [
          { id: '1', title: 'Task 1' },
          { id: '2', title: 'Task 2' }
        ]
      };
      const breakdown = getCostBreakdownText(ride);
      expect(breakdown).toContain('2 tasks');
    });
  });
});
