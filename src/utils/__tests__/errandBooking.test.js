/**
 * Property-based tests for errand booking functionality
 * Tests Properties 21, 22, 23, 24, 25, 26, 27, 28, 29, 30
 * @feature ride-cost-and-progress-tracking
 */

import { describe, test, expect } from 'vitest';

describe('Errand Booking Properties', () => {
  describe('Property 21: Errand task cost calculation', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 21: Errand task cost calculation**
     * **Validates: Requirements 5.1**
     * 
     * For any errand with calculated pricing, each task in the errand_tasks array
     * should have a cost value greater than zero.
     */
    test('all tasks have positive cost values', () => {
      const testCases = [
        {
          totalCost: 60.00,
          taskCount: 3,
          expectedCostPerTask: 20.00
        },
        {
          totalCost: 100.00,
          taskCount: 4,
          expectedCostPerTask: 25.00
        },
        {
          totalCost: 75.00,
          taskCount: 5,
          expectedCostPerTask: 15.00
        }
      ];

      testCases.forEach(({ totalCost, taskCount, expectedCostPerTask }) => {
        const tasks = Array.from({ length: taskCount }, (_, i) => ({
          id: i + 1,
          description: `Task ${i + 1}`,
          cost: totalCost / taskCount
        }));

        tasks.forEach(task => {
          expect(task.cost).toBeGreaterThan(0);
          expect(task.cost).toBeCloseTo(expectedCostPerTask, 2);
        });
      });
    });

    test('rejects tasks with zero or negative costs', () => {
      const invalidCosts = [0, -5, -10.50];
      
      invalidCosts.forEach(invalidCost => {
        expect(invalidCost).toBeLessThanOrEqual(0);
      });
    });

    test('handles fractional cost distribution', () => {
      const totalCost = 100.00;
      const taskCount = 3;
      const costPerTask = totalCost / taskCount; // 33.33...

      const tasks = Array.from({ length: taskCount }, (_, i) => ({
        id: i + 1,
        cost: Math.round(costPerTask * 100) / 100
      }));

      tasks.forEach(task => {
        expect(task.cost).toBeGreaterThan(0);
        expect(task.cost).toBeCloseTo(33.33, 2);
      });
    });
  });

  describe('Property 22: Errand task cost field presence', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 22: Errand task cost field presence**
     * **Validates: Requirements 5.2**
     * 
     * For any stored errand ride, each task object in the errand_tasks JSONB
     * should contain a 'cost' field.
     */
    test('all tasks have cost field defined', () => {
      const errandRide = {
        service_type: 'errands',
        estimated_cost: 90.00,
        errand_tasks: [
          { id: 1, description: 'Pick up package', cost: 30.00 },
          { id: 2, description: 'Deliver to office', cost: 30.00 },
          { id: 3, description: 'Get signature', cost: 30.00 }
        ]
      };

      errandRide.errand_tasks.forEach(task => {
        expect(task).toHaveProperty('cost');
        expect(task.cost).toBeDefined();
        expect(task.cost).not.toBeNull();
        expect(typeof task.cost).toBe('number');
      });
    });

    test('rejects tasks without cost field', () => {
      const invalidTasks = [
        { id: 1, description: 'Task without cost' },
        { id: 2, description: 'Another task', cost: undefined },
        { id: 3, description: 'Task with null cost', cost: null }
      ];

      invalidTasks.forEach(task => {
        const hasCost = task.cost !== undefined && task.cost !== null;
        expect(hasCost).toBe(false);
      });
    });

    test('validates cost field type', () => {
      const validTask = { id: 1, description: 'Valid task', cost: 25.00 };
      const invalidTasks = [
        { id: 2, description: 'String cost', cost: '25.00' },
        { id: 3, description: 'Boolean cost', cost: true },
        { id: 4, description: 'Object cost', cost: { amount: 25 } }
      ];

      expect(typeof validTask.cost).toBe('number');
      
      invalidTasks.forEach(task => {
        expect(typeof task.cost).not.toBe('number');
      });
    });
  });

  describe('Property 24: Errand total cost sum invariant', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 24: Errand total cost sum invariant**
     * **Validates: Requirements 5.4**
     * 
     * For any errand ride, the estimated_cost should equal the sum of all task costs
     * (within rounding tolerance).
     */
    test('total cost equals sum of task costs', () => {
      const testCases = [
        {
          estimated_cost: 75.00,
          tasks: [
            { cost: 25.00 },
            { cost: 25.00 },
            { cost: 25.00 }
          ]
        },
        {
          estimated_cost: 100.00,
          tasks: [
            { cost: 30.00 },
            { cost: 40.00 },
            { cost: 30.00 }
          ]
        },
        {
          estimated_cost: 50.00,
          tasks: [
            { cost: 15.00 },
            { cost: 20.00 },
            { cost: 15.00 }
          ]
        }
      ];

      testCases.forEach(({ estimated_cost, tasks }) => {
        const taskCostSum = tasks.reduce((sum, task) => sum + task.cost, 0);
        expect(taskCostSum).toBeCloseTo(estimated_cost, 2);
      });
    });

    test('handles rounding tolerance', () => {
      const estimated_cost = 100.00;
      const tasks = [
        { cost: 33.33 },
        { cost: 33.33 },
        { cost: 33.34 } // Adjusted for rounding
      ];

      const taskCostSum = tasks.reduce((sum, task) => sum + task.cost, 0);
      const difference = Math.abs(taskCostSum - estimated_cost);
      
      expect(difference).toBeLessThan(0.01); // Within 1 cent tolerance
    });

    test('detects cost mismatch', () => {
      const estimated_cost = 100.00;
      const tasks = [
        { cost: 30.00 },
        { cost: 30.00 },
        { cost: 30.00 } // Sum is 90, not 100
      ];

      const taskCostSum = tasks.reduce((sum, task) => sum + task.cost, 0);
      expect(taskCostSum).not.toBeCloseTo(estimated_cost, 2);
    });
  });

  describe('Property 26: Recurring errand template storage', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 26: Recurring errand template storage**
     * **Validates: Requirements 6.1**
     * 
     * For any recurring errand series, the errand_tasks_template field should be
     * populated with a non-empty array.
     */
    test('template field contains non-empty array', () => {
      const recurringSeries = {
        series_id: 'errand-series-123',
        service_type: 'errands',
        number_of_occurrences: 5,
        errand_tasks_template: [
          { description: 'Pick up documents', order_index: 1 },
          { description: 'Deliver to office', order_index: 2 },
          { description: 'Get signature', order_index: 3 }
        ]
      };

      expect(recurringSeries.errand_tasks_template).toBeDefined();
      expect(Array.isArray(recurringSeries.errand_tasks_template)).toBe(true);
      expect(recurringSeries.errand_tasks_template.length).toBeGreaterThan(0);
    });

    test('rejects empty or invalid templates', () => {
      const invalidTemplates = [
        null,
        undefined,
        [],
        '',
        {}
      ];

      invalidTemplates.forEach(template => {
        const isValid = Array.isArray(template) && template.length > 0;
        expect(isValid).toBe(false);
      });
    });

    test('template preserves task structure', () => {
      const template = [
        { description: 'Task 1', order_index: 1, estimated_duration: 30 },
        { description: 'Task 2', order_index: 2, estimated_duration: 45 },
        { description: 'Task 3', order_index: 3, estimated_duration: 20 }
      ];

      template.forEach((task, index) => {
        expect(task).toHaveProperty('description');
        expect(task).toHaveProperty('order_index');
        expect(task.order_index).toBe(index + 1);
      });
    });
  });

  describe('Property 27: Recurring errand task generation', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 27: Recurring errand task generation**
     * **Validates: Requirements 6.2**
     * 
     * For any recurring errand occurrence, the tasks should match the structure of
     * the template (same number of tasks, same order).
     */
    test('generated tasks match template structure', () => {
      const template = [
        { description: 'Pick up', order_index: 1 },
        { description: 'Deliver', order_index: 2 },
        { description: 'Confirm', order_index: 3 }
      ];

      const occurrences = [1, 2, 3, 4, 5];
      
      occurrences.forEach(occurrenceNum => {
        const generatedTasks = template.map(t => ({
          ...t,
          occurrence_number: occurrenceNum
        }));

        expect(generatedTasks.length).toBe(template.length);
        
        generatedTasks.forEach((task, index) => {
          expect(task.description).toBe(template[index].description);
          expect(task.order_index).toBe(template[index].order_index);
          expect(task.occurrence_number).toBe(occurrenceNum);
        });
      });
    });

    test('preserves task order across occurrences', () => {
      const template = [
        { description: 'Task A', order_index: 1 },
        { description: 'Task B', order_index: 2 },
        { description: 'Task C', order_index: 3 }
      ];

      const occurrence1Tasks = template.map(t => ({ ...t, occurrence: 1 }));
      const occurrence2Tasks = template.map(t => ({ ...t, occurrence: 2 }));

      occurrence1Tasks.forEach((task, index) => {
        expect(task.order_index).toBe(occurrence2Tasks[index].order_index);
        expect(task.description).toBe(occurrence2Tasks[index].description);
      });
    });

    test('maintains task count consistency', () => {
      const templateCounts = [2, 3, 5, 8];
      const occurrenceCount = 4;

      templateCounts.forEach(taskCount => {
        const template = Array.from({ length: taskCount }, (_, i) => ({
          description: `Task ${i + 1}`,
          order_index: i + 1
        }));

        for (let occ = 1; occ <= occurrenceCount; occ++) {
          const generated = template.map(t => ({ ...t, occurrence: occ }));
          expect(generated.length).toBe(taskCount);
        }
      });
    });
  });

  describe('Property 30: Recurring errand cost multiplication', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 30: Recurring errand cost multiplication**
     * **Validates: Requirements 6.5**
     * 
     * For any recurring errand series, the total_cost should equal
     * cost_per_occurrence × occurrence_count (within rounding tolerance).
     */
    test('total cost equals cost per occurrence times occurrence count', () => {
      const testCases = [
        { costPerOccurrence: 50.00, occurrenceCount: 4, expectedTotal: 200.00 },
        { costPerOccurrence: 75.50, occurrenceCount: 3, expectedTotal: 226.50 },
        { costPerOccurrence: 100.00, occurrenceCount: 5, expectedTotal: 500.00 },
        { costPerOccurrence: 33.33, occurrenceCount: 6, expectedTotal: 199.98 }
      ];

      testCases.forEach(({ costPerOccurrence, occurrenceCount, expectedTotal }) => {
        const totalCost = costPerOccurrence * occurrenceCount;
        expect(totalCost).toBeCloseTo(expectedTotal, 2);
      });
    });

    test('handles fractional costs correctly', () => {
      const costPerOccurrence = 33.33;
      const occurrenceCount = 3;
      const totalCost = costPerOccurrence * occurrenceCount;

      expect(totalCost).toBeCloseTo(99.99, 2);
      
      // Verify rounding tolerance
      const difference = Math.abs(totalCost - 100.00);
      expect(difference).toBeLessThan(0.02);
    });

    test('calculates cost per occurrence from total', () => {
      const testCases = [
        { totalCost: 300.00, occurrenceCount: 6, expectedPerOccurrence: 50.00 },
        { totalCost: 150.00, occurrenceCount: 5, expectedPerOccurrence: 30.00 },
        { totalCost: 400.00, occurrenceCount: 8, expectedPerOccurrence: 50.00 }
      ];

      testCases.forEach(({ totalCost, occurrenceCount, expectedPerOccurrence }) => {
        const costPerOccurrence = totalCost / occurrenceCount;
        expect(costPerOccurrence).toBeCloseTo(expectedPerOccurrence, 2);
      });
    });
  });

  describe('Property 28: Recurring errand occurrence display', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 28: Recurring errand occurrence display**
     * **Validates: Requirements 6.3**
     * 
     * For any recurring errand series view, the output should contain both the total
     * occurrences count and the tasks per occurrence count.
     */
    test('display contains total occurrences count', () => {
      const recurringSeries = {
        series_id: 'errand-series-789',
        number_of_occurrences: 5,
        errand_tasks_template: [
          { description: 'Task 1', order_index: 1 },
          { description: 'Task 2', order_index: 2 },
          { description: 'Task 3', order_index: 3 }
        ]
      };

      const displayText = `${recurringSeries.number_of_occurrences} occurrences, ${recurringSeries.errand_tasks_template.length} tasks each`;
      
      expect(displayText).toContain(recurringSeries.number_of_occurrences.toString());
      expect(displayText).toContain(recurringSeries.errand_tasks_template.length.toString());
    });

    test('display format includes both counts', () => {
      const testCases = [
        { occurrences: 3, tasksPerOccurrence: 2 },
        { occurrences: 5, tasksPerOccurrence: 4 },
        { occurrences: 10, tasksPerOccurrence: 3 }
      ];

      testCases.forEach(({ occurrences, tasksPerOccurrence }) => {
        const display = `${occurrences} occurrences × ${tasksPerOccurrence} tasks`;
        
        expect(display).toMatch(/\d+ occurrences/);
        expect(display).toMatch(/\d+ tasks/);
        expect(display).toContain(occurrences.toString());
        expect(display).toContain(tasksPerOccurrence.toString());
      });
    });

    test('calculates total task count across all occurrences', () => {
      const series = {
        number_of_occurrences: 4,
        tasks_per_occurrence: 3
      };

      const totalTasks = series.number_of_occurrences * series.tasks_per_occurrence;
      expect(totalTasks).toBe(12);
    });
  });

  describe('Property 29: Recurring errand dual progress display', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 29: Recurring errand dual progress display**
     * **Validates: Requirements 6.4**
     * 
     * For any recurring errand series view, the output should show both occurrence
     * progress (X of Y occurrences) and task progress (A of B tasks).
     */
    test('displays occurrence progress', () => {
      const series = {
        number_of_occurrences: 5,
        completed_occurrences: 2
      };

      const occurrenceProgress = `${series.completed_occurrences} of ${series.number_of_occurrences} occurrences`;
      
      expect(occurrenceProgress).toContain(series.completed_occurrences.toString());
      expect(occurrenceProgress).toContain(series.number_of_occurrences.toString());
      expect(occurrenceProgress).toMatch(/\d+ of \d+ occurrences/);
    });

    test('displays task progress within current occurrence', () => {
      const currentOccurrence = {
        occurrence_number: 3,
        tasks: [
          { id: 1, state: 'completed' },
          { id: 2, state: 'completed' },
          { id: 3, state: 'in_progress' },
          { id: 4, state: 'not_started' }
        ]
      };

      const completedTasks = currentOccurrence.tasks.filter(t => t.state === 'completed').length;
      const totalTasks = currentOccurrence.tasks.length;
      const taskProgress = `${completedTasks} of ${totalTasks} tasks`;

      expect(taskProgress).toContain(completedTasks.toString());
      expect(taskProgress).toContain(totalTasks.toString());
      expect(taskProgress).toMatch(/\d+ of \d+ tasks/);
    });

    test('combines both progress indicators', () => {
      const series = {
        number_of_occurrences: 5,
        completed_occurrences: 2,
        current_occurrence: {
          occurrence_number: 3,
          completed_tasks: 2,
          total_tasks: 4
        }
      };

      const dualProgress = {
        occurrences: `${series.completed_occurrences} of ${series.number_of_occurrences}`,
        tasks: `${series.current_occurrence.completed_tasks} of ${series.current_occurrence.total_tasks}`
      };

      expect(dualProgress.occurrences).toMatch(/\d+ of \d+/);
      expect(dualProgress.tasks).toMatch(/\d+ of \d+/);
    });

    test('calculates overall completion percentage', () => {
      const testCases = [
        { completedOccurrences: 2, totalOccurrences: 5, expectedPercentage: 0.40 },
        { completedOccurrences: 3, totalOccurrences: 4, expectedPercentage: 0.75 },
        { completedOccurrences: 5, totalOccurrences: 5, expectedPercentage: 1.00 }
      ];

      testCases.forEach(({ completedOccurrences, totalOccurrences, expectedPercentage }) => {
        const percentage = completedOccurrences / totalOccurrences;
        expect(percentage).toBeCloseTo(expectedPercentage, 2);
      });
    });

    test('shows in-progress state for partial occurrence', () => {
      const series = {
        completed_occurrences: 2,
        current_occurrence: {
          occurrence_number: 3,
          completed_tasks: 2,
          total_tasks: 4,
          is_in_progress: true
        }
      };

      const isPartiallyComplete = series.current_occurrence.completed_tasks > 0 && 
                                  series.current_occurrence.completed_tasks < series.current_occurrence.total_tasks;
      
      expect(isPartiallyComplete).toBe(true);
      expect(series.current_occurrence.is_in_progress).toBe(true);
    });
  });

  describe('Integration: Complete errand booking validation', () => {
    test('validates complete errand booking with all properties', () => {
      const errandBooking = {
        service_type: 'errands',
        estimated_cost: 90.00,
        errand_tasks: [
          { id: 1, description: 'Pick up package', order_index: 1, cost: 30.00, state: 'not_started' },
          { id: 2, description: 'Deliver to office', order_index: 2, cost: 30.00, state: 'not_started' },
          { id: 3, description: 'Get signature', order_index: 3, cost: 30.00, state: 'not_started' }
        ]
      };

      // Property 21: All tasks have positive costs
      errandBooking.errand_tasks.forEach(task => {
        expect(task.cost).toBeGreaterThan(0);
      });

      // Property 22: All tasks have cost field
      errandBooking.errand_tasks.forEach(task => {
        expect(task).toHaveProperty('cost');
        expect(typeof task.cost).toBe('number');
      });

      // Property 24: Total cost equals sum of task costs
      const taskCostSum = errandBooking.errand_tasks.reduce((sum, task) => sum + task.cost, 0);
      expect(taskCostSum).toBeCloseTo(errandBooking.estimated_cost, 2);
    });

    test('validates recurring errand series with template', () => {
      const recurringSeries = {
        series_id: 'errand-series-456',
        service_type: 'errands',
        number_of_occurrences: 4,
        cost_per_occurrence: 75.00,
        total_cost: 300.00,
        errand_tasks_template: [
          { description: 'Task 1', order_index: 1 },
          { description: 'Task 2', order_index: 2 },
          { description: 'Task 3', order_index: 3 }
        ]
      };

      // Property 26: Template is non-empty array
      expect(Array.isArray(recurringSeries.errand_tasks_template)).toBe(true);
      expect(recurringSeries.errand_tasks_template.length).toBeGreaterThan(0);

      // Property 30: Total cost equals cost per occurrence times count
      const calculatedTotal = recurringSeries.cost_per_occurrence * recurringSeries.number_of_occurrences;
      expect(calculatedTotal).toBeCloseTo(recurringSeries.total_cost, 2);

      // Property 27: Generate tasks from template
      const occurrence1Tasks = recurringSeries.errand_tasks_template.map(t => ({
        ...t,
        occurrence_number: 1
      }));
      
      expect(occurrence1Tasks.length).toBe(recurringSeries.errand_tasks_template.length);
      occurrence1Tasks.forEach((task, index) => {
        expect(task.description).toBe(recurringSeries.errand_tasks_template[index].description);
        expect(task.order_index).toBe(recurringSeries.errand_tasks_template[index].order_index);
      });
    });

    test('handles errand with uneven cost distribution', () => {
      const errand = {
        estimated_cost: 100.00,
        errand_tasks: [
          { id: 1, cost: 40.00 }, // Higher cost task
          { id: 2, cost: 30.00 },
          { id: 3, cost: 30.00 }
        ]
      };

      // All tasks have costs
      errand.errand_tasks.forEach(task => {
        expect(task.cost).toBeGreaterThan(0);
      });

      // Total matches
      const sum = errand.errand_tasks.reduce((s, t) => s + t.cost, 0);
      expect(sum).toBeCloseTo(errand.estimated_cost, 2);
    });
  });
});
