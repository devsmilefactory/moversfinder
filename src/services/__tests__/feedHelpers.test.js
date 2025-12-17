/**
 * Unit Tests for Feed Helper Functions
 * 
 * These tests validate the core feed filtering logic.
 * Run with: node src/services/__tests__/feedHelpers.test.js
 * 
 * Note: This is a minimal test implementation without a test framework.
 * For production, consider adding Jest or Vitest.
 */

import {
  getSortTimestampForFeed,
  getPassengerFeed,
  getDriverFeed,
  sortRidesByFeed,
  sortErrandTasks,
  getTaskStatePriority,
  calculateDistance,
  filterRidesByDistance,
  isRecurringRide,
  isErrandRide,
  FilterError,
  FilterErrorType,
  validateFeedCategory,
  validateRideType,
  validateScheduleType
} from '../feedHelpers.js';

// Simple test runner
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`✓ ${message}`);
  } else {
    failedTests++;
    console.error(`✗ ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (passed) {
    passedTests++;
    console.log(`✓ ${message}`);
  } else {
    failedTests++;
    console.error(`✗ ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual: ${JSON.stringify(actual)}`);
  }
}

console.log('\n=== Testing getSortTimestampForFeed ===\n');

// Test passenger_pending feed
{
  const ride = {
    scheduled_start_time: '2024-01-15T10:00:00Z',
    requested_at: '2024-01-14T08:00:00Z'
  };
  const result = getSortTimestampForFeed(ride, 'passenger_pending');
  assertEquals(result, '2024-01-15T10:00:00Z', 'passenger_pending: returns scheduled_start_time');
}

{
  const ride = {
    scheduled_start_time: null,
    requested_at: '2024-01-14T08:00:00Z'
  };
  const result = getSortTimestampForFeed(ride, 'passenger_pending');
  assertEquals(result, '2024-01-14T08:00:00Z', 'passenger_pending: falls back to requested_at');
}

// Test driver_available feed
{
  const ride = {
    requested_at: '2024-01-14T08:00:00Z',
    scheduled_start_time: '2024-01-15T10:00:00Z'
  };
  const result = getSortTimestampForFeed(ride, 'driver_available');
  assertEquals(result, '2024-01-14T08:00:00Z', 'driver_available: returns requested_at');
}

// Test driver_my_bids feed
{
  const ride = {
    offer_created_at: '2024-01-14T09:00:00Z',
    requested_at: '2024-01-14T08:00:00Z'
  };
  const result = getSortTimestampForFeed(ride, 'driver_my_bids');
  assertEquals(result, '2024-01-14T09:00:00Z', 'driver_my_bids: returns offer_created_at');
}

console.log('\n=== Testing getPassengerFeed ===\n');

// Test PENDING state
{
  const ride = { passenger_id: 'user-1', state: 'PENDING' };
  const result = getPassengerFeed(ride, 'user-1');
  assertEquals(result, 'pending', 'PENDING state returns pending feed');
}

// Test ACTIVE_PRE_TRIP state
{
  const ride = { passenger_id: 'user-1', state: 'ACTIVE_PRE_TRIP' };
  const result = getPassengerFeed(ride, 'user-1');
  assertEquals(result, 'active', 'ACTIVE_PRE_TRIP state returns active feed');
}

// Test ACTIVE_EXECUTION state
{
  const ride = { passenger_id: 'user-1', state: 'ACTIVE_EXECUTION' };
  const result = getPassengerFeed(ride, 'user-1');
  assertEquals(result, 'active', 'ACTIVE_EXECUTION state returns active feed');
}

// Test COMPLETED_FINAL state
{
  const ride = { passenger_id: 'user-1', state: 'COMPLETED_FINAL' };
  const result = getPassengerFeed(ride, 'user-1');
  assertEquals(result, 'completed', 'COMPLETED_FINAL state returns completed feed');
}

// Test CANCELLED state
{
  const ride = { passenger_id: 'user-1', state: 'CANCELLED' };
  const result = getPassengerFeed(ride, 'user-1');
  assertEquals(result, 'cancelled', 'CANCELLED state returns cancelled feed');
}

// Test different passenger
{
  const ride = { passenger_id: 'user-1', state: 'PENDING' };
  const result = getPassengerFeed(ride, 'user-2');
  assertEquals(result, null, 'Different passenger returns null');
}

console.log('\n=== Testing getDriverFeed ===\n');

// Test available feed (no offer)
{
  const ride = { id: 'ride-1', state: 'PENDING', driver_id: null };
  const offers = [];
  const result = getDriverFeed(ride, 'driver-1', offers);
  assertEquals(result, 'available', 'PENDING ride without offer returns available');
}

// Test my_bids feed (pending offer)
{
  const ride = { id: 'ride-1', state: 'PENDING', driver_id: null };
  const offers = [{ ride_id: 'ride-1', driver_id: 'driver-1', status: 'PENDING' }];
  const result = getDriverFeed(ride, 'driver-1', offers);
  assertEquals(result, 'my_bids', 'PENDING ride with pending offer returns my_bids');
}

// Test in_progress feed (assigned)
{
  const ride = { id: 'ride-1', state: 'ACTIVE_EXECUTION', driver_id: 'driver-1' };
  const offers = [];
  const result = getDriverFeed(ride, 'driver-1', offers);
  assertEquals(result, 'in_progress', 'ACTIVE_EXECUTION assigned ride returns in_progress');
}

// Test completed feed
{
  const ride = { id: 'ride-1', state: 'COMPLETED_FINAL', driver_id: 'driver-1' };
  const offers = [];
  const result = getDriverFeed(ride, 'driver-1', offers);
  assertEquals(result, 'completed', 'COMPLETED_FINAL assigned ride returns completed');
}

// Test cancelled feed (was assigned)
{
  const ride = { id: 'ride-1', state: 'CANCELLED', driver_id: 'driver-1' };
  const offers = [];
  const result = getDriverFeed(ride, 'driver-1', offers);
  assertEquals(result, 'cancelled', 'CANCELLED assigned ride returns cancelled');
}

// Test cancelled feed (had offer)
{
  const ride = { id: 'ride-1', state: 'CANCELLED', driver_id: 'driver-2' };
  const offers = [{ ride_id: 'ride-1', driver_id: 'driver-1', status: 'PENDING' }];
  const result = getDriverFeed(ride, 'driver-1', offers);
  assertEquals(result, 'cancelled', 'CANCELLED ride with offer returns cancelled');
}

console.log('\n=== Testing sortRidesByFeed ===\n');

{
  const rides = [
    { id: 'ride-1', requested_at: '2024-01-14T08:00:00Z' },
    { id: 'ride-2', requested_at: '2024-01-14T10:00:00Z' },
    { id: 'ride-3', requested_at: '2024-01-14T09:00:00Z' }
  ];
  const sorted = sortRidesByFeed(rides, 'driver_available');
  assertEquals(sorted[0].id, 'ride-2', 'Sorts by timestamp DESC (latest first)');
  assertEquals(sorted[1].id, 'ride-3', 'Second ride is middle timestamp');
  assertEquals(sorted[2].id, 'ride-1', 'Third ride is earliest timestamp');
}

console.log('\n=== Testing getTaskStatePriority ===\n');

assertEquals(getTaskStatePriority('TASK_STARTED'), 1, 'Active task has priority 1');
assertEquals(getTaskStatePriority('NOT_STARTED'), 2, 'Not started task has priority 2');
assertEquals(getTaskStatePriority('COMPLETED'), 3, 'Completed task has priority 3');

console.log('\n=== Testing sortErrandTasks ===\n');

{
  const tasks = [
    { state: 'COMPLETED', order_index: 1 },
    { state: 'TASK_STARTED', order_index: 2 },
    { state: 'NOT_STARTED', order_index: 3 }
  ];
  const sorted = sortErrandTasks(tasks);
  assertEquals(sorted[0].state, 'TASK_STARTED', 'Active task first');
  assertEquals(sorted[1].state, 'NOT_STARTED', 'Not started task second');
  assertEquals(sorted[2].state, 'COMPLETED', 'Completed task last');
}

{
  const tasks = [
    { state: 'NOT_STARTED', order_index: 2 },
    { state: 'NOT_STARTED', order_index: 1 }
  ];
  const sorted = sortErrandTasks(tasks);
  assertEquals(sorted[0].order_index, 1, 'Same priority sorts by order_index ASC');
  assertEquals(sorted[1].order_index, 2, 'Second task has higher order_index');
}

console.log('\n=== Testing calculateDistance ===\n');

{
  const distance = calculateDistance(
    { lat: 40.7128, lng: -74.0060 }, // New York
    { lat: 40.7128, lng: -74.0060 }  // Same location
  );
  assert(distance < 0.1, 'Same location has distance ~0');
}

{
  const distance = calculateDistance(
    { lat: 40.7128, lng: -74.0060 }, // New York
    { lat: 34.0522, lng: -118.2437 }  // Los Angeles
  );
  assert(distance > 3900 && distance < 4000, 'NY to LA is ~3936 km');
}

{
  const distance = calculateDistance(
    { lat: 40.7128, lng: -74.0060 },
    null
  );
  assertEquals(distance, Infinity, 'Invalid coordinates return Infinity');
}

console.log('\n=== Testing filterRidesByDistance ===\n');

{
  const rides = [
    { id: 'ride-1', pickup_coordinates: { lat: 40.7128, lng: -74.0060 } },
    { id: 'ride-2', pickup_coordinates: { lat: 40.7200, lng: -74.0100 } },
    { id: 'ride-3', pickup_coordinates: { lat: 50.0000, lng: -80.0000 } }
  ];
  const driverLocation = { lat: 40.7128, lng: -74.0060 };
  const filtered = filterRidesByDistance(rides, driverLocation, 5);
  
  assert(filtered.length === 2, 'Filters rides within 5km');
  assert(filtered[0].distance_to_driver_km !== undefined, 'Adds distance_to_driver_km field');
}

{
  const rides = [
    { id: 'ride-1', pickup_coordinates: { lat: 40.7128, lng: -74.0060 } }
  ];
  const filtered = filterRidesByDistance(rides, null, 5);
  assertEquals(filtered.length, 1, 'No driver location returns all rides');
}

console.log('\n=== Testing isRecurringRide ===\n');

{
  const ride = { schedule_type: 'RECURRING', series_id: 'abc-123' };
  assert(isRecurringRide(ride), 'Recurring ride with series_id returns true');
}

{
  const ride = { schedule_type: 'INSTANT', series_id: null };
  assert(!isRecurringRide(ride), 'Non-recurring ride returns false');
}

console.log('\n=== Testing isErrandRide ===\n');

{
  const ride = { ride_type: 'ERRAND', tasks_total: 3 };
  assert(isErrandRide(ride), 'Errand with tasks returns true');
}

{
  const ride = { ride_type: 'TAXI', tasks_total: 0 };
  assert(!isErrandRide(ride), 'Non-errand ride returns false');
}

console.log('\n=== Testing FilterError ===\n');

{
  try {
    throw new FilterError(
      FilterErrorType.INVALID_FEED_CATEGORY,
      'Test error',
      { test: 'context' }
    );
  } catch (error) {
    assert(error instanceof FilterError, 'FilterError is instance of FilterError');
    assertEquals(error.type, FilterErrorType.INVALID_FEED_CATEGORY, 'Error has correct type');
    assertEquals(error.message, 'Test error', 'Error has correct message');
    assert(error.context.test === 'context', 'Error has context');
  }
}

console.log('\n=== Testing Validation Functions ===\n');

{
  try {
    validateFeedCategory('pending', 'passenger');
    passedTests++;
    console.log('✓ validateFeedCategory accepts valid passenger category');
  } catch (error) {
    failedTests++;
    console.error('✗ validateFeedCategory should accept valid passenger category');
  }
}

{
  try {
    validateFeedCategory('invalid', 'passenger');
    failedTests++;
    console.error('✗ validateFeedCategory should reject invalid category');
  } catch (error) {
    if (error instanceof FilterError) {
      passedTests++;
      console.log('✓ validateFeedCategory rejects invalid category');
    } else {
      failedTests++;
      console.error('✗ validateFeedCategory should throw FilterError');
    }
  }
}

{
  try {
    validateRideType('TAXI');
    passedTests++;
    console.log('✓ validateRideType accepts valid ride type');
  } catch (error) {
    failedTests++;
    console.error('✗ validateRideType should accept valid ride type');
  }
}

{
  try {
    validateScheduleType('INSTANT');
    passedTests++;
    console.log('✓ validateScheduleType accepts valid schedule type');
  } catch (error) {
    failedTests++;
    console.error('✗ validateScheduleType should accept valid schedule type');
  }
}

// Summary
console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);

if (failedTests === 0) {
  console.log('\n✓ All tests passed!\n');
} else {
  console.log(`\n✗ ${failedTests} test(s) failed\n`);
}
