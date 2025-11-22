/**
 * Recurring Trip Service
 * 
 * Handles all recurring trip series operations with Supabase.
 * Manages series creation, updates, status changes, and progress tracking.
 */

import { supabase } from '../lib/supabase';

/**
 * Create a new recurring trip series
 */
export const createRecurringSeries = async (seriesData) => {
  try {
    console.log('🔄 Creating recurring trip series:', {
      seriesName: seriesData.seriesName,
      pattern: seriesData.recurrencePattern,
      totalTrips: seriesData.totalTrips,
      timestamp: new Date().toISOString()
    });

    if (!seriesData.userId || !seriesData.pickupAddress || !seriesData.dropoffAddress) {
      return {
        success: false,
        error: 'missing_required_fields',
        message: 'User ID, pickup address, and dropoff address are required'
      };
    }

    if (!seriesData.recurrencePattern || !['daily', 'weekly', 'weekdays', 'weekends', 'custom'].includes(seriesData.recurrencePattern)) {
      return {
        success: false,
        error: 'invalid_recurrence_pattern',
        message: 'Invalid recurrence pattern'
      };
    }

    if (seriesData.recurrencePattern === 'custom' && (!seriesData.recurrenceDays || seriesData.recurrenceDays.length === 0)) {
      return {
        success: false,
        error: 'missing_recurrence_days',
        message: 'Custom recurrence pattern requires recurrence days'
      };
    }

    const nextTripDate = new Date(seriesData.startDate);
    const [hours, minutes, seconds] = seriesData.tripTime.split(':');
    nextTripDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || 0));

    const seriesRecord = {
      user_id: seriesData.userId,
      driver_id: seriesData.driverId || null,
      series_name: seriesData.seriesName || null,
      recurrence_pattern: seriesData.recurrencePattern,
      recurrence_days: seriesData.recurrenceDays || null,
      pickup_address: seriesData.pickupAddress,
      pickup_coordinates: seriesData.pickupCoordinates || null,
      dropoff_address: seriesData.dropoffAddress,
      dropoff_coordinates: seriesData.dropoffCoordinates || null,
      service_type: seriesData.serviceType || 'standard',
      estimated_cost: seriesData.estimatedCost || null,
      start_date: seriesData.startDate,
      end_date: seriesData.endDate || null,
      trip_time: seriesData.tripTime,
      total_trips: seriesData.totalTrips,
      completed_trips: 0,
      cancelled_trips: 0,
      next_trip_date: nextTripDate.toISOString(),
      status: 'active'
    };

    const { data: series, error: seriesError } = await supabase
      .from('recurring_trip_series')
      .insert([seriesRecord])
      .select()
      .single();

    if (seriesError) {
      console.error('❌ Error creating series:', seriesError);
      throw seriesError;
    }

    console.log('✅ Series created successfully:', series.id);

    const firstRideData = {
      series_id: series.id,
      series_trip_number: 1,
      user_id: seriesData.userId,
      driver_id: seriesData.driverId || null,
      pickup_address: seriesData.pickupAddress,
      pickup_coordinates: seriesData.pickupCoordinates || null,
      dropoff_address: seriesData.dropoffAddress,
      dropoff_coordinates: seriesData.dropoffCoordinates || null,
      service_type: seriesData.serviceType || 'standard',
      ride_timing: 'scheduled_recurring',
      ride_status: seriesData.driverId ? 'accepted' : 'pending',
      scheduled_datetime: nextTripDate.toISOString(),
      estimated_cost: seriesData.estimatedCost || null
    };

    const { data: firstRide, error: rideError } = await supabase
      .from('rides')
      .insert([firstRideData])
      .select()
      .single();

    if (rideError) {
      console.error('❌ Error creating first ride:', rideError);
    } else {
      console.log('✅ First ride created:', firstRide.id);

      try {
        const { error: reminderError } = await supabase.rpc('schedule_trip_reminders', {
          p_series_id: series.id,
          p_ride_id: firstRide.id,
          p_trip_datetime: nextTripDate.toISOString()
        });

        if (reminderError) {
          console.error('⚠️ Error scheduling reminders:', reminderError);
        } else {
          console.log('✅ Reminders scheduled for first ride');
        }
      } catch (reminderErr) {
        console.error('⚠️ Failed to schedule reminders:', reminderErr);
      }
    }

    return {
      success: true,
      data: { series, firstRide },
      message: 'Recurring trip series created successfully'
    };

  } catch (error) {
    console.error('❌ Error in createRecurringSeries:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to create recurring trip series'
    };
  }
};

/**
 * Get series details by ID
 */
export const getSeriesDetails = async (seriesId) => {
  try {
    const { data, error } = await supabase
      .from('recurring_trip_series')
      .select('*')
      .eq('id', seriesId)
      .single();

    if (error) throw error;

    if (!data) {
      return {
        success: false,
        error: 'series_not_found',
        message: 'Series not found'
      };
    }

    const tripsRemaining = data.total_trips - data.completed_trips - data.cancelled_trips;

    return {
      success: true,
      data: { ...data, trips_remaining: tripsRemaining }
    };

  } catch (error) {
    console.error('❌ Error getting series details:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to get series details'
    };
  }
};

/**
 * Get all series for a user
 */
export const getUserSeries = async (userId, role = 'passenger', statuses = ['active', 'paused']) => {
  try {
    const column = role === 'driver' ? 'driver_id' : 'user_id';
    
    let query = supabase
      .from('recurring_trip_series')
      .select('*')
      .eq(column, userId);

    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }

    query = query.order('next_trip_date', { ascending: true, nullsFirst: false });

    const { data, error } = await query;

    if (error) throw error;

    const seriesWithRemaining = (data || []).map(series => ({
      ...series,
      trips_remaining: series.total_trips - series.completed_trips - series.cancelled_trips
    }));

    return {
      success: true,
      data: seriesWithRemaining
    };

  } catch (error) {
    console.error('❌ Error getting user series:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to get user series'
    };
  }
};

/**
 * Update series status
 */
export const updateSeriesStatus = async (seriesId, newStatus, userId) => {
  try {
    console.log('🔄 Updating series status:', { seriesId, newStatus });

    if (!['active', 'paused', 'cancelled'].includes(newStatus)) {
      return {
        success: false,
        error: 'invalid_status',
        message: 'Invalid status. Must be active, paused, or cancelled'
      };
    }

    const { data: series, error: fetchError } = await supabase
      .from('recurring_trip_series')
      .select('user_id, driver_id, status')
      .eq('id', seriesId)
      .single();

    if (fetchError) throw fetchError;

    if (!series) {
      return {
        success: false,
        error: 'series_not_found',
        message: 'Series not found'
      };
    }

    if (series.user_id !== userId && series.driver_id !== userId) {
      return {
        success: false,
        error: 'unauthorized',
        message: 'You are not authorized to modify this series'
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from('recurring_trip_series')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', seriesId)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ Series status updated successfully');

    if (newStatus === 'cancelled') {
      const { error: reminderError } = await supabase
        .from('trip_reminders')
        .update({ status: 'cancelled' })
        .eq('series_id', seriesId)
        .eq('status', 'pending');

      if (reminderError) {
        console.error('⚠️ Error cancelling reminders:', reminderError);
      }
    }

    return {
      success: true,
      data: updated,
      message: `Series ${newStatus} successfully`
    };

  } catch (error) {
    console.error('❌ Error updating series status:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to update series status'
    };
  }
};

/**
 * Get rides in a series
 */
export const getSeriesRides = async (seriesId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('series_id', seriesId)
      .order('series_trip_number', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ Error getting series rides:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to get series rides'
    };
  }
};

/**
 * Get series progress statistics
 */
export const getSeriesProgress = async (seriesId) => {
  try {
    const { data: series, error: seriesError } = await supabase
      .from('recurring_trip_series')
      .select('total_trips, completed_trips, cancelled_trips')
      .eq('id', seriesId)
      .single();

    if (seriesError) throw seriesError;

    if (!series) {
      return {
        success: false,
        error: 'series_not_found',
        message: 'Series not found'
      };
    }

    const tripsRemaining = series.total_trips - series.completed_trips - series.cancelled_trips;
    const completionPercentage = series.total_trips > 0 
      ? Math.round((series.completed_trips / series.total_trips) * 100) 
      : 0;

    return {
      success: true,
      data: {
        total_trips: series.total_trips,
        completed_trips: series.completed_trips,
        cancelled_trips: series.cancelled_trips,
        trips_remaining: tripsRemaining,
        completion_percentage: completionPercentage
      }
    };

  } catch (error) {
    console.error('❌ Error getting series progress:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to get series progress'
    };
  }
};
