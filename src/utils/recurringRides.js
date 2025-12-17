/**
 * Recurring Rides Utilities
 * 
 * @deprecated This file contains legacy recurring ride code that creates multiple unlinked ride records.
 * New code should use src/services/recurringTripService.js which implements the series-based approach.
 * 
 * Functions for generating and managing recurring ride bookings
 * Supports: specific dates, weekdays, weekends patterns
 * 
 * MIGRATION NOTE: The new system creates a recurring_trip_series record and generates ride instances
 * on-demand, rather than creating all rides upfront. This provides better performance and cleaner data.
 */

import { supabase } from '../lib/supabase';

/**
 * Ensure ride records always satisfy Supabase RLS policies.
 * Explicitly stamps the authenticated user's ID on every record so the
 * `auth.uid() = user_id` check always passes, even if the caller provided
 * a mismatched or stale user id.
 */
const stampUserIdOnRides = (rides, userId) =>
  rides.map((ride) => ({
    ...ride,
    user_id: userId,
  }));

/**
 * Generate dates for weekdays in a given month
 * 
 * @param {string} monthStr - Month in YYYY-MM format
 * @returns {Array<string>} Array of date strings (YYYY-MM-DD)
 */
export const generateWeekdayDates = (monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  const dates = [];
  
  // Get first and last day of month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // Iterate through all days in month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // 1-5 are Monday-Friday (0 is Sunday, 6 is Saturday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      dates.push(date.toISOString().split('T')[0]);
    }
  }
  
  return dates;
};

/**
 * Generate dates for weekends in a given month
 * 
 * @param {string} monthStr - Month in YYYY-MM format
 * @returns {Array<string>} Array of date strings (YYYY-MM-DD)
 */
export const generateWeekendDates = (monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  const dates = [];
  
  // Get first and last day of month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // Iterate through all days in month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dates.push(date.toISOString().split('T')[0]);
    }
  }
  
  return dates;
};

/**
 * Combine date and time into ISO datetime string
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time in HH:MM format
 * @returns {string} ISO datetime string
 */
export const combineDateAndTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);

  return date.toISOString();
};

/**
 * Calculate the number of trips from a recurrence pattern
 *
 * @param {Object} recurrencePattern - Recurrence pattern object
 * @returns {number} Number of trips
 */
export const calculateNumberOfTrips = (recurrencePattern) => {
  if (!recurrencePattern) return 1;

  switch (recurrencePattern.type) {
    case 'specific_dates':
      return recurrencePattern.dates ? recurrencePattern.dates.length : 1;

    case 'weekdays':
      return recurrencePattern.month ? generateWeekdayDates(recurrencePattern.month).length : 1;

    case 'weekends':
      return recurrencePattern.month ? generateWeekendDates(recurrencePattern.month).length : 1;

    default:
      return 1;
  }
};

/**
 * Generate ride records for recurring bookings
 * 
 * @param {Object} baseRideData - Base ride data (without scheduled_datetime)
 * @param {Object} recurrencePattern - Recurrence pattern from form
 * @returns {Array<Object>} Array of ride records to insert
 */
export const generateRecurringRides = (baseRideData, recurrencePattern) => {
  const rides = [];
  let dates = [];
  
  // Generate dates based on pattern type
  switch (recurrencePattern.type) {
    case 'specific_dates':
      dates = recurrencePattern.dates || [];
      break;
      
    case 'weekdays':
      dates = generateWeekdayDates(recurrencePattern.month);
      break;
      
    case 'weekends':
      dates = generateWeekendDates(recurrencePattern.month);
      break;
      
    default:
      console.error('Unknown recurrence pattern type:', recurrencePattern.type);
      return [];
  }
  
  // Create a ride record for each date
  dates.forEach((dateStr, index) => {
    const scheduledDatetime = combineDateAndTime(dateStr, recurrencePattern.time);

    rides.push({
      ...baseRideData,
      scheduled_datetime: scheduledDatetime,
      ride_timing: 'scheduled_recurring',
      total_rides_in_series: dates.length,
      completed_rides_count: 0,
      remaining_rides_count: dates.length - index,
      recurrence_pattern: recurrencePattern,
      number_of_trips: dates.length, // Total number of trips in this recurring series
      // Track sequence using series_trip_number in the rides table
      series_trip_number: index + 1
    });
  });

  return rides;
};

/**
 * Create recurring rides in database
 * 
 * @deprecated Use createRecurringSeries from src/services/recurringTripService.js instead.
 * This function creates multiple unlinked ride records. The new approach creates a series
 * record and generates instances on-demand for better performance and data management.
 * 
 * @param {Object} baseRideData - Base ride data
 * @param {Object} recurrencePattern - Recurrence pattern
 * @returns {Promise<Object>} Result with created rides
 */
export const createRecurringRides = async (baseRideData, recurrencePattern) => {
  try {
    // Ensure we have a valid authenticated user (required for RLS insert policy)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn('Recurring rides: failed to fetch session, falling back to booking data', sessionError);
    }

    const sessionUserId = session?.user?.id;

    // Generate ride records
    const rideRecords = generateRecurringRides(baseRideData, recurrencePattern);
    
    if (rideRecords.length === 0) {
      return {
        success: false,
        error: 'No ride records generated',
        count: 0
      };
    }
    
    const stampedRideRecords = stampUserIdOnRides(
      rideRecords,
      sessionUserId || baseRideData.user_id
    );

    console.log(`📅 Generating ${stampedRideRecords.length} recurring rides...`);
    
    // Insert all rides in a single batch
    const { data, error } = await supabase
      .from('rides')
      .insert(stampedRideRecords)
      .select();
    
    if (error) {
      console.error('Error creating recurring rides:', error);
      return {
        success: false,
        error: error.message,
        count: 0
      };
    }
    
    console.log(`✅ Created ${data.length} recurring rides`);
    
    return {
      success: true,
      data: data,
      count: data.length,
      message: `Successfully created ${data.length} recurring rides`
    };
    
  } catch (error) {
    console.error('Exception in createRecurringRides:', error);
    return {
      success: false,
      error: error.message,
      count: 0
    };
  }
};

/**
 * Get upcoming rides in a recurring series
 * 
 * @param {string} userId - User ID
 * @param {Object} recurrencePattern - Recurrence pattern to match
 * @returns {Promise<Object>} Result with upcoming rides
 */
export const getUpcomingRecurringRides = async (userId, recurrencePattern) => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', userId)
      .eq('ride_timing', 'scheduled_recurring')
      .gte('scheduled_datetime', now)
      .order('scheduled_datetime', { ascending: true });
    
    if (error) {
      console.error('Error fetching recurring rides:', error);
      return { success: false, error: error.message, data: [] };
    }
    
    // Filter by recurrence pattern if provided
    let filteredData = data;
    if (recurrencePattern) {
      filteredData = data.filter(ride => 
        JSON.stringify(ride.recurrence_pattern) === JSON.stringify(recurrencePattern)
      );
    }
    
    return {
      success: true,
      data: filteredData,
      count: filteredData.length
    };
    
  } catch (error) {
    console.error('Exception in getUpcomingRecurringRides:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Cancel all rides in a recurring series
 * 
 * @param {string} userId - User ID
 * @param {Object} recurrencePattern - Recurrence pattern to match
 * @returns {Promise<Object>} Result with cancelled count
 */
export const cancelRecurringSeries = async (userId, recurrencePattern) => {
  try {
    const now = new Date().toISOString();
    
    // Get all upcoming rides in the series
    const { data: upcomingRides, error: fetchError } = await supabase
      .from('rides')
      .select('id, recurrence_pattern')
      .eq('user_id', userId)
      .eq('ride_timing', 'scheduled_recurring')
      .gte('scheduled_datetime', now)
      .eq('ride_status', 'pending');
    
    if (fetchError) {
      console.error('Error fetching rides to cancel:', fetchError);
      return { success: false, error: fetchError.message, count: 0 };
    }
    
    // Filter by recurrence pattern
    const ridesToCancel = upcomingRides.filter(ride =>
      JSON.stringify(ride.recurrence_pattern) === JSON.stringify(recurrencePattern)
    );
    
    if (ridesToCancel.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'No rides to cancel'
      };
    }
    
    // Update all rides to cancelled status
    const rideIds = ridesToCancel.map(r => r.id);
    const { data, error } = await supabase
      .from('rides')
      .update({
        ride_status: 'cancelled',
        status_updated_at: new Date().toISOString()
      })
      .in('id', rideIds)
      .select();
    
    if (error) {
      console.error('Error cancelling rides:', error);
      return { success: false, error: error.message, count: 0 };
    }
    
    console.log(`✅ Cancelled ${data.length} rides in recurring series`);
    
    return {
      success: true,
      data: data,
      count: data.length,
      message: `Cancelled ${data.length} rides in the series`
    };
    
  } catch (error) {
    console.error('Exception in cancelRecurringSeries:', error);
    return { success: false, error: error.message, count: 0 };
  }
};

