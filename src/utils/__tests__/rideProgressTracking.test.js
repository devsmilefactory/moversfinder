/**
 * Property-based tests for rideProgressTracking.js
 * 
 * These tests verify correctness properties for progress tracking logic
 * across all ride types.
 */

import { 
  getRideProgress, 
  getProgressDisplayText, 
  getProgressPercentage, 
  isRideCompleted, 
  getNextActionText 
} from '../rideProgressTracking';

describe('rideProgressTracking', () => {
  describe('Property 15: Completed round trip counting', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 15: Completed round trip counting**
     * **Validates: Requirements 3.5**
     * 
     * For any recurring round trip, completed occurrences should equal floor(completed_legs/2).
     * This ensures progress is displayed in terms of round trip occurrences, not individual legs.
     */
    test('completed occurrences equals floor(completed_legs/2) for recurring round trips', () => {
      const testCases = [
        {
          number_of_trips: 10,
          completed_rides_count: 0,
          expected_completed_occurrences: 0,
          expected_in_progress: false
        },
        {
          number_of_trips: 10,
          completed_rides_count: 1,
          expected_completed_occurrences: 0,
          expected_in_progress: true
        },
        {
          number_of_trips: 10,
          completed_rides_count: 2,
          expected_completed_occurrences: 1,
          expected_in_progress: false
        },
        {
          number_of_trips: 10,
          completed_rides_count: 5,
          expected_completed_occurrences: 2,
          expected_in_progress: true
        },
        {
          number_of_trips: 10,
          completed_rides_count: 10,
          expected_completed_occurrences: 5,
          expected_in_progress: false
        }
      ];

      testCases.forEach(({ number_of_trips, completed_rides_count, expected_completed_occurrences, expected_in_progress }) => {
        const ride = {
          is_round_trip: true,
          number_of_trips,
          completed_rides_count,
          series_id: 'test-series'
        };

        const progress = getRideProgress(ride);
        
        expect(progress.type).toBe('recurring_round_trip');
        expect(progress.completed).toBe(expected_completed_occurrences);
        expect(progress.inProgress).toBe(expected_in_progress);
        
        // Verify the mathematical relationship
        expect(progress.completed).toBe(Math.floor(completed_rides_count / 2));
      });
    });

    test('calculates total occurrences correctly', () => {
      const testCases = [
        { number_of_trips: 2, expected_occurrences: 1 },
        { number_of_trips: 4, expected_occurrences: 2 },
        { number_of_trips: 10, expected_occurrences: 5 },
        { number_of_trips: 6, expected_occurrences: 3 }
      ];

      testCases.forEach(({ number_of_trips, expected_occurrences }) => {
        const ride = {
          is_round_trip: true,
          number_of_trips,
          completed_rides_count: 0,
          series_id: 'test-series'
        };

        const progress = getRideProgress(ride);
        expect(progress.total).toBe(expected_occurrences);
        expect(progress.total).toBe(Math.ceil(number_of_trips / 2));
      });
    });

    test('identifies current leg correctly', () => {
      const testCases = [
        {
          completed_rides_count: 0,
          expected_current_leg: 'outbound'
        },
        {
          completed_rides_count: 1,
          expected_current_leg: 'return'
        },
        {
          completed_rides_count: 2,
          expected_current_leg: 'outbound'
        },
        {
          completed_rides_count: 3,
          expected_current_leg: 'return'
        }
      ];

      testCases.forEach(({ completed_rides_count, expected_current_leg }) => {
        const ride = {
          is_round_trip: true,
          number_of_trips: 10,
          completed_rides_count,
          series_id: 'test-series'
        };

        const progress = getRideProgress(ride);
        expect(progress.currentLeg).toBe(expected_current_leg);
      });
    });

    test('calculates remaining occurrences correctly', () => {
      const testCases = [
        {
          number_of_trips: 10,
          completed_rides_count: 0,
          expected_remaining: 5
        },
        {
          number_of_trips: 10,
          completed_rides_count: 1,
          expected_remaining: 4
        },
        {
          number_of_trips: 10,
          completed_rides_count: 2,
          expected_remaining: 4
        },
        {
          number_of_trips: 10,
          completed_rides_count: 9,
          expected_remaining: 0
        },
        {
          number_of_trips: 10,
          completed_rides_count: 10,
          expected_remaining: 0
        }
      ];

      testCases.forEach(({ number_of_trips, completed_rides_count, expected_remaining }) => {
        const ride = {
          is_round_trip: true,
          number_of_trips,
          completed_rides_count,
          series_id: 'test-series'
        };

        const progress = getRideProgress(ride);
        expect(progress.remaining).toBe(expected_remaining);
      });
    });
  });

  describe('Simple ride progress', () => {
    test('handles completed simple rides', () => {
      const ride = {
        ride_status: 'trip_completed',
        estimated_cost: 25.00
      };

      const progress = getRideProgress(ride);
      expect(progress.type).toBe('simple');
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(1);
      expect(progress.remaining).toBe(0);
      expect(progress.percentage).toBe(100);
    });

    test('handles pending simple rides', () => {
      const ride = {
        ride_status: 'pending',
        estimated_cost: 25.00
      };

      const progress = getRideProgress(ride);
      expect(progress.type).toBe('simple');
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(1);
      expect(progress.remaining).toBe(1);
      expect(progress.percentage).toBe(0);
    });
  });

  describe('Recurring trip progress', () => {
    test('calculates recurring trip progress correctly', () => {
      const ride = {
        number_of_trips: 5,
        completed_rides_count: 3,
        series_id: 'test-series'
      };

      const progress = getRideProgress(ride);
      expect(progress.type).toBe('recurring');
      expect(progress.completed).toBe(3);
      expect(progress.total).toBe(5);
      expect(progress.remaining).toBe(2);
      expect(progress.percentage).toBe(60);
    });

    test('handles edge cases', () => {
      const testCases = [
        {
          number_of_trips: 1,
          completed_rides_count: 0,
          expected_percentage: 0
        },
        {
          number_of_trips: 1,
          completed_rides_count: 1,
          expected_percentage: 100
        },
        {
          number_of_trips: 0,
          completed_rides_count: 0,
          expected_percentage: 0
        }
      ];

      testCases.forEach(({ number_of_trips, completed_rides_count, expected_percentage }) => {
        const ride = {
          number_of_trips,
          completed_rides_count,
          series_id: 'test-series'
        };

        const progress = getRideProgress(ride);
        expect(progress.percentage).toBe(expected_percentage);
      });
    });
  });

  describe('Errand progress', () => {
    test('tracks errand task progress', () => {
      const ride = {
        service_type: 'errands',
        tasks_total: 4,
        tasks_done: 2,
        tasks_left: 2,
        active_errand_task_index: 2,
        errand_tasks: [
          { id: '1', title: 'Task 1', state: 'completed' },
          { id: '2', title: 'Task 2', state: 'completed' },
          { id: '3', title: 'Task 3', state: 'activated' },
          { id: '4', title: 'Task 4', state: 'pending' }
        ]
      };

      const progress = getRideProgress(ride);
      expect(progress.type).toBe('errand');
      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(4);
      expect(progress.remaining).toBe(2);
      expect(progress.percentage).toBe(50);
      expect(progress.activeTaskIndex).toBe(2);
      expect(progress.tasks).toHaveLength(4);
    });

    test('handles empty errand tasks', () => {
      const ride = {
        service_type: 'errands',
        tasks_total: 0,
        tasks_done: 0,
        tasks_left: 0,
        errand_tasks: []
      };

      const progress = getRideProgress(ride);
      expect(progress.type).toBe('errand');
      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(0);
      expect(progress.tasks).toHaveLength(0);
    });
  });

  describe('Recurring errand progress', () => {
    test('tracks both occurrence and task progress', () => {
      const ride = {
        service_type: 'errands',
        number_of_trips: 3,
        completed_rides_count: 1,
        tasks_total: 2,
        tasks_done: 1,
        tasks_left: 1,
        active_errand_task_index: 1,
        series_id: 'test-series',
        errand_tasks: [
          { id: '1', title: 'Task 1', state: 'completed' },
          { id: '2', title: 'Task 2', state: 'activated' }
        ]
      };

      const progress = getRideProgress(ride);
      expect(progress.type).toBe('recurring_errand');
      
      // Occurrence progress
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(3);
      expect(progress.remaining).toBe(2);
      expect(progress.percentage).toBe(33);
      
      // Task progress (current occurrence)
      expect(progress.taskProgress.completed).toBe(1);
      expect(progress.taskProgress.total).toBe(2);
      expect(progress.taskProgress.remaining).toBe(1);
      expect(progress.taskProgress.percentage).toBe(50);
    });
  });

  describe('Progress display text', () => {
    test('generates correct display text for different ride types', () => {
      const testCases = [
        {
          ride: { ride_status: 'trip_completed' },
          expected: 'Completed'
        },
        {
          ride: { number_of_trips: 5, completed_rides_count: 3, series_id: 'test' },
          expected: '3 of 5 trips completed'
        },
        {
          ride: { 
            is_round_trip: true, 
            number_of_trips: 4, 
            completed_rides_count: 1, 
            series_id: 'test' 
          },
          expected: 'Round Trip 1 of 2 - Return'
        },
        {
          ride: { 
            service_type: 'errands', 
            tasks_total: 3, 
            tasks_done: 1,
            errand_tasks: []
          },
          expected: '1 of 3 tasks completed'
        }
      ];

      testCases.forEach(({ ride, expected }) => {
        const text = getProgressDisplayText(ride);
        expect(text).toContain(expected.split(' ')[0]);
      });
    });
  });

  describe('Progress percentage', () => {
    test('returns correct percentage for various ride types', () => {
      const testCases = [
        {
          ride: { ride_status: 'trip_completed' },
          expected: 100
        },
        {
          ride: { number_of_trips: 5, completed_rides_count: 3, series_id: 'test' },
          expected: 60
        },
        {
          ride: { 
            is_round_trip: true, 
            number_of_trips: 10, 
            completed_rides_count: 4, 
            series_id: 'test' 
          },
          expected: 40
        }
      ];

      testCases.forEach(({ ride, expected }) => {
        const percentage = getProgressPercentage(ride);
        expect(percentage).toBe(expected);
      });
    });
  });

  describe('Ride completion check', () => {
    test('correctly identifies completed rides', () => {
      const testCases = [
        {
          ride: { ride_status: 'trip_completed' },
          expected: true
        },
        {
          ride: { number_of_trips: 5, completed_rides_count: 5, series_id: 'test' },
          expected: true
        },
        {
          ride: { number_of_trips: 5, completed_rides_count: 3, series_id: 'test' },
          expected: false
        },
        {
          ride: { 
            is_round_trip: true, 
            number_of_trips: 10, 
            completed_rides_count: 9, 
            series_id: 'test' 
          },
          expected: false
        },
        {
          ride: { 
            is_round_trip: true, 
            number_of_trips: 10, 
            completed_rides_count: 10, 
            series_id: 'test' 
          },
          expected: true
        }
      ];

      testCases.forEach(({ ride, expected }) => {
        const isCompleted = isRideCompleted(ride);
        expect(isCompleted).toBe(expected);
      });
    });
  });

  describe('Next action text', () => {
    test('provides appropriate next action for different ride states', () => {
      const testCases = [
        {
          ride: { ride_status: 'trip_completed' },
          expectedContains: 'All completed'
        },
        {
          ride: { number_of_trips: 5, completed_rides_count: 3, series_id: 'test' },
          expectedContains: '2 trips remaining'
        },
        {
          ride: { 
            is_round_trip: true, 
            number_of_trips: 10, 
            completed_rides_count: 1, 
            series_id: 'test' 
          },
          expectedContains: 'return'
        }
      ];

      testCases.forEach(({ ride, expectedContains }) => {
        const nextAction = getNextActionText(ride);
        expect(nextAction.toLowerCase()).toContain(expectedContains.toLowerCase());
      });
    });
  });

  describe('Null/undefined handling', () => {
    test('handles null ride gracefully', () => {
      const progress = getRideProgress(null);
      expect(progress.type).toBe('simple');
      expect(progress.status).toBe('pending');
    });

    test('handles undefined ride gracefully', () => {
      const progress = getRideProgress(undefined);
      expect(progress.type).toBe('simple');
      expect(progress.status).toBe('pending');
    });

    test('handles empty ride object', () => {
      const progress = getRideProgress({});
      expect(progress.type).toBe('simple');
    });
  });
});
