/**
 * Property-based tests for roundTripHelpers.js
 * 
 * These tests verify correctness properties for round trip helper functions.
 */

import {
  getRoundTripDisplay,
  calculateReturnTime,
  validateRoundTripLeg,
  getOppositeLeg,
  isLegCompleted,
  getActiveLeg,
  getRoundTripProgress
} from '../roundTripHelpers';

describe('roundTripHelpers', () => {
  describe('Property 3: Leg number consistency', () => {
    /**
     * **Feature: ride-cost-and-progress-tracking, Property 3: Leg number consistency**
     * **Validates: Requirements 1.3**
     * 
     * For any round trip ride, the leg number must be consistent with the leg type:
     * - Outbound leg must have leg_number = 1
     * - Return leg must have leg_number = 2
     */
    test('outbound legs always have leg_number = 1', () => {
      const testCases = [
        { trip_leg_type: 'outbound', round_trip_leg_number: 1 },
        { trip_leg_type: 'outbound', round_trip_leg_number: 1, series_id: 'test' },
        { trip_leg_type: 'outbound', round_trip_leg_number: 1, round_trip_occurrence_number: 5 }
      ];

      testCases.forEach(ride => {
        const validation = validateRoundTripLeg({ is_round_trip: true, ...ride });
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });

    test('return legs always have leg_number = 2', () => {
      const testCases = [
        { trip_leg_type: 'return', round_trip_leg_number: 2 },
        { trip_leg_type: 'return', round_trip_leg_number: 2, series_id: 'test' },
        { trip_leg_type: 'return', round_trip_leg_number: 2, round_trip_occurrence_number: 3 }
      ];

      testCases.forEach(ride => {
        const validation = validateRoundTripLeg({ is_round_trip: true, ...ride });
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });

    test('detects inconsistent leg data', () => {
      const invalidCases = [
        { trip_leg_type: 'outbound', round_trip_leg_number: 2 },
        { trip_leg_type: 'return', round_trip_leg_number: 1 },
        { trip_leg_type: 'outbound', round_trip_leg_number: 3 },
        { trip_leg_type: 'return', round_trip_leg_number: 0 }
      ];

      invalidCases.forEach(ride => {
        const validation = validateRoundTripLeg({ is_round_trip: true, ...ride });
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getRoundTripDisplay', () => {
    test('returns null for non-round-trip rides', () => {
      const ride = { is_round_trip: false };
      expect(getRoundTripDisplay(ride)).toBeNull();
    });

    test('generates correct display for single round trip', () => {
      const ride = {
        is_round_trip: true,
        trip_leg_type: 'outbound',
        round_trip_occurrence_number: 1,
        round_trip_leg_number: 1
      };

      const display = getRoundTripDisplay(ride);
      expect(display.legType).toBe('outbound');
      expect(display.legNumber).toBe(1);
      expect(display.occurrenceNumber).toBe(1);
      expect(display.totalOccurrences).toBe(1);
      expect(display.indicator).toBe('→');
      expect(display.legLabel).toBe('Outbound');
      expect(display.isRecurring).toBe(false);
      expect(display.displayText).toBe('Round Trip - Outbound →');
    });

    test('generates correct display for recurring round trip', () => {
      const ride = {
        is_round_trip: true,
        trip_leg_type: 'return',
        round_trip_occurrence_number: 2,
        round_trip_leg_number: 2,
        number_of_trips: 10,
        series_id: 'test-series'
      };

      const display = getRoundTripDisplay(ride);
      expect(display.legType).toBe('return');
      expect(display.legNumber).toBe(2);
      expect(display.occurrenceNumber).toBe(2);
      expect(display.totalOccurrences).toBe(5); // 10 trips / 2 = 5 occurrences
      expect(display.indicator).toBe('←');
      expect(display.legLabel).toBe('Return');
      expect(display.isRecurring).toBe(true);
      expect(display.displayText).toBe('Round Trip 2 of 5 - Return ←');
      expect(display.shortText).toBe('RT 2/5 - Ret ←');
    });

    test('handles missing leg information with defaults', () => {
      const ride = {
        is_round_trip: true
        // Missing trip_leg_type, occurrence_number, etc.
      };

      const display = getRoundTripDisplay(ride);
      expect(display.legType).toBe('outbound'); // Default
      expect(display.occurrenceNumber).toBe(1); // Default
      expect(display.totalOccurrences).toBe(1); // Default
    });
  });

  describe('calculateReturnTime', () => {
    test('calculates return time correctly', () => {
      const outboundTime = new Date('2024-01-01T10:00:00Z');
      const returnTime = calculateReturnTime(outboundTime, 30, 15);
      
      const expectedTime = new Date('2024-01-01T10:45:00Z'); // 30 + 15 minutes
      expect(returnTime).toEqual(expectedTime);
    });

    test('handles string input', () => {
      const outboundTime = '2024-01-01T10:00:00Z';
      const returnTime = calculateReturnTime(outboundTime, 60, 30);
      
      const expectedTime = new Date('2024-01-01T11:30:00Z'); // 60 + 30 minutes
      expect(returnTime).toEqual(expectedTime);
    });

    test('uses default values when not provided', () => {
      const outboundTime = new Date('2024-01-01T10:00:00Z');
      const returnTime = calculateReturnTime(outboundTime);
      
      const expectedTime = new Date('2024-01-01T11:00:00Z'); // 30 + 30 minutes (defaults)
      expect(returnTime).toEqual(expectedTime);
    });

    test('returns null for invalid input', () => {
      expect(calculateReturnTime(null)).toBeNull();
      expect(calculateReturnTime(undefined)).toBeNull();
      expect(calculateReturnTime('invalid-date')).toBeNull();
    });
  });

  describe('validateRoundTripLeg', () => {
    test('validates correct round trip leg data', () => {
      const ride = {
        is_round_trip: true,
        trip_leg_type: 'outbound',
        round_trip_leg_number: 1,
        round_trip_occurrence_number: 1,
        number_of_trips: 4,
        series_id: 'test-series'
      };

      const result = validateRoundTripLeg(ride);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects invalid trip_leg_type', () => {
      const ride = {
        is_round_trip: true,
        trip_leg_type: 'invalid'
      };

      const result = validateRoundTripLeg(ride);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid trip_leg_type: invalid');
    });

    test('detects invalid round_trip_leg_number', () => {
      const ride = {
        is_round_trip: true,
        round_trip_leg_number: 3
      };

      const result = validateRoundTripLeg(ride);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid round_trip_leg_number: 3');
    });

    test('detects invalid occurrence number', () => {
      const ride = {
        is_round_trip: true,
        series_id: 'test',
        number_of_trips: 4, // 2 occurrences
        round_trip_occurrence_number: 3 // Invalid - should be 1 or 2
      };

      const result = validateRoundTripLeg(ride);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid occurrence number');
    });

    test('returns error for non-round-trip ride', () => {
      const ride = { is_round_trip: false };
      
      const result = validateRoundTripLeg(ride);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Not a round trip ride');
    });

    test('returns error for null ride', () => {
      const result = validateRoundTripLeg(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ride object is required');
    });
  });

  describe('getOppositeLeg', () => {
    test('returns correct opposite legs', () => {
      expect(getOppositeLeg('outbound')).toBe('return');
      expect(getOppositeLeg('return')).toBe('outbound');
    });

    test('returns null for invalid input', () => {
      expect(getOppositeLeg('invalid')).toBeNull();
      expect(getOppositeLeg(null)).toBeNull();
      expect(getOppositeLeg(undefined)).toBeNull();
    });
  });

  describe('isLegCompleted', () => {
    test('detects completed outbound leg', () => {
      const ride = {
        outbound_completed_at: '2024-01-01T10:00:00Z'
      };
      
      expect(isLegCompleted(ride, 'outbound')).toBe(true);
      expect(isLegCompleted(ride, 'return')).toBe(false);
    });

    test('detects completed return leg', () => {
      const ride = {
        return_completed_at: '2024-01-01T11:00:00Z'
      };
      
      expect(isLegCompleted(ride, 'return')).toBe(true);
      expect(isLegCompleted(ride, 'outbound')).toBe(false);
    });

    test('handles missing completion timestamps', () => {
      const ride = {};
      
      expect(isLegCompleted(ride, 'outbound')).toBe(false);
      expect(isLegCompleted(ride, 'return')).toBe(false);
    });

    test('handles invalid input', () => {
      expect(isLegCompleted(null, 'outbound')).toBe(false);
      expect(isLegCompleted({}, null)).toBe(false);
      expect(isLegCompleted({}, 'invalid')).toBe(false);
    });
  });

  describe('getActiveLeg', () => {
    test('uses explicit active_leg field when available', () => {
      const ride = {
        is_round_trip: true,
        active_leg: 'return'
      };
      
      expect(getActiveLeg(ride)).toBe('return');
    });

    test('infers active leg from completion timestamps', () => {
      const testCases = [
        {
          ride: { is_round_trip: true },
          expected: 'outbound'
        },
        {
          ride: { 
            is_round_trip: true,
            outbound_completed_at: '2024-01-01T10:00:00Z'
          },
          expected: 'return'
        },
        {
          ride: { 
            is_round_trip: true,
            outbound_completed_at: '2024-01-01T10:00:00Z',
            return_completed_at: '2024-01-01T11:00:00Z'
          },
          expected: 'completed'
        }
      ];

      testCases.forEach(({ ride, expected }) => {
        expect(getActiveLeg(ride)).toBe(expected);
      });
    });

    test('returns null for non-round-trip rides', () => {
      const ride = { is_round_trip: false };
      expect(getActiveLeg(ride)).toBeNull();
    });
  });

  describe('getRoundTripProgress', () => {
    test('calculates progress for completed round trip', () => {
      const ride = {
        is_round_trip: true,
        active_leg: 'completed'
      };
      
      expect(getRoundTripProgress(ride)).toBe(100);
    });

    test('calculates progress for return leg', () => {
      const ride = {
        is_round_trip: true,
        active_leg: 'return'
      };
      
      expect(getRoundTripProgress(ride)).toBe(50);
    });

    test('calculates progress for outbound leg in progress', () => {
      const ride = {
        is_round_trip: true,
        active_leg: 'outbound',
        ride_status: 'trip_started'
      };
      
      expect(getRoundTripProgress(ride)).toBe(25);
    });

    test('returns 0 for pending outbound leg', () => {
      const ride = {
        is_round_trip: true,
        active_leg: 'outbound',
        ride_status: 'pending'
      };
      
      expect(getRoundTripProgress(ride)).toBe(0);
    });

    test('returns 0 for non-round-trip rides', () => {
      const ride = { is_round_trip: false };
      expect(getRoundTripProgress(ride)).toBe(0);
    });
  });

  describe('Edge cases and error handling', () => {
    test('handles undefined and null inputs gracefully', () => {
      expect(getRoundTripDisplay(null)).toBeNull();
      expect(getRoundTripDisplay(undefined)).toBeNull();
      expect(getActiveLeg(null)).toBeNull();
      expect(getRoundTripProgress(null)).toBe(0);
    });

    test('handles empty objects', () => {
      const emptyRide = {};
      expect(getRoundTripDisplay(emptyRide)).toBeNull();
      expect(getActiveLeg(emptyRide)).toBeNull();
      expect(getRoundTripProgress(emptyRide)).toBe(0);
    });

    test('handles malformed data gracefully', () => {
      const malformedRide = {
        is_round_trip: 'true', // String instead of boolean
        round_trip_occurrence_number: 'invalid',
        round_trip_leg_number: null
      };
      
      // Should not throw errors
      expect(() => getRoundTripDisplay(malformedRide)).not.toThrow();
      expect(() => validateRoundTripLeg(malformedRide)).not.toThrow();
    });
  });
});
