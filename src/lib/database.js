/**
 * Database Helper Functions
 * TaxiCab Landing Page
 */

import { supabase } from './supabase';

/**
 * Generic query builder for common database operations
 */

// ============================================================================
// RIDES
// ============================================================================

/**
 * Get rides for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<{data, error}>}
 */
export const getRides = async (userId, options = {}) => {
  try {
    let query = supabase
      .from('rides')
      .select('*')
      .eq('user_id', userId);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.serviceType) {
      query = query.eq('service_type', options.serviceType);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Get rides error:', error);
    return { data: null, error };
  }
};

/**
 * Create a new ride
 * @param {object} rideData - Ride data
 * @returns {Promise<{data, error}>}
 */
export const createRide = async (rideData) => {
  try {
    // Enforce instant-only mode if feature flags are disabled
    const { enforceInstantOnly, isInstantOnlyMode } = await import('../config/featureFlags');
    
    if (isInstantOnlyMode() && rideData.ride_timing && rideData.ride_timing !== 'instant') {
      console.warn(`⚠️ Scheduled/recurring rides disabled. Forcing ride_timing to 'instant' (was: ${rideData.ride_timing})`);
      rideData.ride_timing = 'instant';
      rideData.scheduled_datetime = null;
      rideData.recurrence_pattern = null;
    }
    
    const { data, error } = await supabase
      .from('rides')
      .insert([rideData])
      .select()
      .single();

    if (error) throw error;

    // If instant ride, the database trigger will automatically call the edge function
    // via webhook to broadcast notifications to nearby drivers
    // No need to call it manually here - the trigger handles it
    if (data && data.ride_timing === 'instant') {
      console.log('✅ Instant ride created - notifications will be sent via edge function');
    }

    return { data, error: null };
  } catch (error) {
    console.error('Create ride error:', error);
    return { data: null, error };
  }
};

/**
 * Update a ride
 * @param {string} rideId - Ride ID
 * @param {object} updates - Updates
 * @returns {Promise<{data, error}>}
 */
export const updateRide = async (rideId, updates) => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .update(updates)
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Update ride error:', error);
    return { data: null, error };
  }
};

/**
 * Cancel a ride
 * @param {string} rideId - Ride ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<{data, error}>}
 */
export const cancelRide = async (rideId, reason) => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', rideId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Cancel ride error:', error);
    return { data: null, error };
  }
};

// ============================================================================
// SAVED TRIPS
// ============================================================================

/**
 * Get saved trips for a user
 * @param {string} userId - User ID
 * @returns {Promise<{data, error}>}
 */
export const getSavedTrips = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('saved_trips')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Get saved trips error:', error);
    return { data: null, error };
  }
};

/**
 * Create a saved trip
 * @param {object} tripData - Trip data
 * @returns {Promise<{data, error}>}
 */
export const createSavedTrip = async (tripData) => {
  try {
    const { data, error } = await supabase
      .from('saved_trips')
      .insert([tripData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Create saved trip error:', error);
    return { data: null, error };
  }
};

/**
 * Delete a saved trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<{error}>}
 */
export const deleteSavedTrip = async (tripId) => {
  try {
    const { error } = await supabase
      .from('saved_trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Delete saved trip error:', error);
    return { error };
  }
};

// ============================================================================
// SAVED PLACES
// ============================================================================

/**
 * Get saved places for a user
 * @param {string} userId - User ID
 * @returns {Promise<{data, error}>}
 */
export const getSavedPlaces = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Get saved places error:', error);
    return { data: null, error };
  }
};

/**
 * Create a saved place
 * @param {object} placeData - Place data
 * @returns {Promise<{data, error}>}
 */
export const createSavedPlace = async (placeData) => {
  try {
    const { data, error } = await supabase
      .from('saved_places')
      .insert([placeData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Create saved place error:', error);
    return { data: null, error };
  }
};

/**
 * Delete a saved place
 * @param {string} placeId - Place ID
 * @returns {Promise<{error}>}
 */
export const deleteSavedPlace = async (placeId) => {
  try {
    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('id', placeId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Delete saved place error:', error);
    return { error };
  }
};

// ============================================================================
// PAYMENT METHODS
// ============================================================================

/**
 * Get payment methods for a user
 * @param {string} userId - User ID
 * @returns {Promise<{data, error}>}
 */
export const getPaymentMethods = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Get payment methods error:', error);
    return { data: null, error };
  }
};

/**
 * Create a payment method
 * @param {object} paymentData - Payment method data
 * @returns {Promise<{data, error}>}
 */
export const createPaymentMethod = async (paymentData) => {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Create payment method error:', error);
    return { data: null, error };
  }
};

/**
 * Delete a payment method
 * @param {string} paymentId - Payment method ID
 * @returns {Promise<{error}>}
 */
export const deletePaymentMethod = async (paymentId) => {
  try {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Delete payment method error:', error);
    return { error };
  }
};

// ============================================================================
// CORPORATE
// ============================================================================

/**
 * Get corporate employees
 * @param {string} corporateId - Corporate account ID
 * @returns {Promise<{data, error}>}
 */
export const getCorporateEmployees = async (corporateId) => {
  try {
    const { data, error } = await supabase
      .from('corporate_employees')
      .select('*')
      .eq('corporate_account_id', corporateId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Get corporate employees error:', error);
    return { data: null, error };
  }
};

/**
 * Create bulk booking
 * @param {object} bookingData - Bulk booking data
 * @returns {Promise<{data, error}>}
 */
export const createBulkBooking = async (bookingData) => {
  try {
    const { data, error } = await supabase
      .from('bulk_bookings')
      .insert([bookingData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Create bulk booking error:', error);
    return { data: null, error };
  }
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to ride updates
 * @param {string} rideId - Ride ID
 * @param {function} callback - Callback function
 * @returns {object} Subscription object
 */
export const subscribeToRide = (rideId, callback) => {
  return supabase
    .channel(`ride:${rideId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${rideId}`,
      },
      callback
    )
    .subscribe();
};

/**
 * Subscribe to user notifications
 * @param {string} userId - User ID
 * @param {function} callback - Callback function
 * @returns {object} Subscription object
 */
export const subscribeToNotifications = (userId, callback) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

