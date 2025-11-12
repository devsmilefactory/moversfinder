import { supabase } from '../lib/supabase';

/**
 * Corporate Booking Service
 * Handles all corporate booking operations with Supabase
 */

/**
 * Create a single ride booking
 * @param {Object} bookingData - The booking data from the form
 * @param {Object} user - The current user object
 * @returns {Promise<Object>} - Result with success status and data/error
 */
export const createSingleRideBooking = async (bookingData, user) => {
  try {
    const {
      passengerSelection,
      selectedPassenger,
      manualPassenger,
      pickup,
      dropoff,
      vehicleType,
      scheduleType,
      scheduledDate,
      scheduledTime,
      recurringPattern,
      recurringEndDate,
      specialInstructions,
      saveOptions
    } = bookingData;

    // Determine passenger info
    let passengerInfo = {};
    if (passengerSelection === 'existing' && selectedPassenger) {
      const { data: passenger } = await supabase
        .from('corporate_passengers')
        .select('*')
        .eq('id', selectedPassenger)
        .single();

      if (passenger) {
        passengerInfo = {
          passenger_id: passenger.id,
          passenger_name: passenger.name,
          passenger_phone: passenger.phone,
          passenger_email: passenger.email
        };
      }
    } else if (passengerSelection === 'other' && manualPassenger) {
      passengerInfo = {
        passenger_name: manualPassenger.name,
        passenger_phone: manualPassenger.phone,
        passenger_email: manualPassenger.email || null
      };
    }

    // Create ride record
    const rideData = {
      user_id: user.id,
      service_type: 'taxi',
      booking_type: 'single',
      pickup_location: pickup.address,
      pickup_lat: pickup.coordinates?.lat || null,
      pickup_lng: pickup.coordinates?.lng || null,
      dropoff_location: dropoff.address,
      dropoff_lat: dropoff.coordinates?.lat || null,
      dropoff_lng: dropoff.coordinates?.lng || null,
      vehicle_type: vehicleType,
      schedule_type: scheduleType,
      scheduled_date: scheduleType === 'scheduled' || scheduleType === 'recurring' ? scheduledDate : null,
      scheduled_time: scheduleType === 'scheduled' || scheduleType === 'recurring' ? scheduledTime : null,
      special_requests: specialInstructions || null,
      status: 'pending',
      payment_method: 'account_balance',
      platform_id: 'taxicab',
      ...passengerInfo
    };

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .insert([rideData])
      .select()
      .single();

    if (rideError) throw rideError;

    // Handle recurring trips
    if (scheduleType === 'recurring' && recurringPattern && recurringEndDate) {
      const scheduledTripData = {
        user_id: user.id,
        ride_id: ride.id,
        recurrence_pattern: recurringPattern,
        start_date: scheduledDate,
        end_date: recurringEndDate,
        is_active: true
      };

      const { error: scheduledError } = await supabase
        .from('scheduled_trips')
        .insert([scheduledTripData]);

      if (scheduledError) console.error('Error creating scheduled trip:', scheduledError);
    }

    // Handle save trip option
    if (saveOptions?.saveTrip && saveOptions?.tripName) {
      const savedTripData = {
        user_id: user.id,
        trip_name: saveOptions.tripName,
        service_type: 'taxi',
        pickup_location: pickup.address,
        pickup_lat: pickup.coordinates?.lat || null,
        pickup_lng: pickup.coordinates?.lng || null,
        dropoff_location: dropoff.address,
        dropoff_lat: dropoff.coordinates?.lat || null,
        dropoff_lng: dropoff.coordinates?.lng || null,
        vehicle_type: vehicleType,
        ...passengerInfo
      };

      const { error: savedError } = await supabase
        .from('saved_trips')
        .insert([savedTripData]);

      if (savedError) console.error('Error saving trip:', savedError);
    }

    return { success: true, data: ride };
  } catch (error) {
    console.error('Error creating single ride booking:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a single courier booking
 * @param {Object} bookingData - The booking data from the form
 * @param {Object} user - The current user object
 * @returns {Promise<Object>} - Result with success status and data/error
 */
export const createSingleCourierBooking = async (bookingData, user) => {
  try {
    const {
      pickup,
      dropoff,
      packageDetails,
      packageSize,
      recipientName,
      recipientPhone,
      scheduleType,
      scheduledDate,
      scheduledTime,
      recurringPattern,
      recurringEndDate,
      specialInstructions,
      saveOptions
    } = bookingData;

    // Create ride record for courier
    const rideData = {
      user_id: user.id,
      service_type: 'courier',
      booking_type: 'single',
      pickup_location: pickup.address,
      pickup_lat: pickup.coordinates?.lat || null,
      pickup_lng: pickup.coordinates?.lng || null,
      dropoff_location: dropoff.address,
      dropoff_lat: dropoff.coordinates?.lat || null,
      dropoff_lng: dropoff.coordinates?.lng || null,
      vehicle_type: packageSize === 'large' ? 'van' : 'sedan',
      schedule_type: scheduleType,
      scheduled_date: scheduleType === 'scheduled' || scheduleType === 'recurring' ? scheduledDate : null,
      scheduled_time: scheduleType === 'scheduled' || scheduleType === 'recurring' ? scheduledTime : null,
      special_requests: `Package: ${packageDetails}\nSize: ${packageSize}\nRecipient: ${recipientName} (${recipientPhone})${specialInstructions ? '\n' + specialInstructions : ''}`,
      status: 'pending',
      payment_method: 'account_balance',
      platform_id: 'taxicab',
      passenger_name: recipientName,
      passenger_phone: recipientPhone
    };

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .insert([rideData])
      .select()
      .single();

    if (rideError) throw rideError;

    // Handle recurring trips
    if (scheduleType === 'recurring' && recurringPattern && recurringEndDate) {
      const scheduledTripData = {
        user_id: user.id,
        ride_id: ride.id,
        recurrence_pattern: recurringPattern,
        start_date: scheduledDate,
        end_date: recurringEndDate,
        is_active: true
      };

      const { error: scheduledError } = await supabase
        .from('scheduled_trips')
        .insert([scheduledTripData]);

      if (scheduledError) console.error('Error creating scheduled trip:', scheduledError);
    }

    // Handle save trip option
    if (saveOptions?.saveTrip && saveOptions?.tripName) {
      const savedTripData = {
        user_id: user.id,
        trip_name: saveOptions.tripName,
        service_type: 'courier',
        pickup_location: pickup.address,
        pickup_lat: pickup.coordinates?.lat || null,
        pickup_lng: pickup.coordinates?.lng || null,
        dropoff_location: dropoff.address,
        dropoff_lat: dropoff.coordinates?.lat || null,
        dropoff_lng: dropoff.coordinates?.lng || null,
        vehicle_type: packageSize === 'large' ? 'van' : 'sedan',
        passenger_name: recipientName,
        passenger_phone: recipientPhone
      };

      const { error: savedError } = await supabase
        .from('saved_trips')
        .insert([savedTripData]);

      if (savedError) console.error('Error saving trip:', savedError);
    }

    return { success: true, data: ride };
  } catch (error) {
    console.error('Error creating single courier booking:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a bulk booking
 * @param {Object} bookingData - The booking data from the form
 * @param {Object} user - The current user object
 * @returns {Promise<Object>} - Result with success status and data/error
 */
export const createBulkBooking = async (bookingData, user) => {
  try {
    const {
      serviceType,
      passengerType,
      selectionMethod,
      selectedPassengers,
      passengerCount,
      vehicleType,
      pickupStrategy,
      pickupLocations,
      dropoffStrategy,
      dropoffLocations,
      scheduleType,
      scheduledDate,
      scheduledTime,
      recurringPattern,
      recurringEndDate,
      specialInstructions,
      paymentMethod
    } = bookingData;

    // Create bulk booking record
    const bulkBookingData = {
      corporate_user_id: user.id,
      service_type: serviceType === 'rides' ? 'taxi' : 'courier',
      passenger_type: passengerType,
      selection_method: selectionMethod,
      passenger_count: passengerCount,
      vehicle_type: vehicleType,
      pickup_strategy: pickupStrategy,
      dropoff_strategy: dropoffStrategy,
      schedule_type: scheduleType,
      scheduled_date: scheduleType === 'scheduled' || scheduleType === 'recurring' ? scheduledDate : null,
      scheduled_time: scheduleType === 'scheduled' || scheduleType === 'recurring' ? scheduledTime : null,
      special_instructions: specialInstructions || null,
      payment_method: paymentMethod,
      status: 'pending'
    };

    const { data: bulkBooking, error: bulkError } = await supabase
      .from('bulk_bookings')
      .insert([bulkBookingData])
      .select()
      .single();

    if (bulkError) throw bulkError;

    return { success: true, data: bulkBooking };
  } catch (error) {
    console.error('Error creating bulk booking:', error);
    return { success: false, error: error.message };
  }
};



/**
 * Create bulk rides with batch_id and per-row progress
 * @param {Object} bookingData
 * @param {Object} user
 * @param {(update: {index:number, success?:boolean, error?:string, rideId?:string}) => void} onProgress
 */
export const createBulkRidesWithProgress = async (bookingData, user, onProgress) => {
  const {
    serviceType,
    selectionMethod,
    selectedPassengers,
    passengerCount,
    vehicleType,
    pickupStrategy,
    pickupLocations = [],
    dropoffStrategy,
    dropoffLocations = [],
    scheduleType,
    scheduledDate,
    scheduledTime,
    recurringPattern,
    specialInstructions,
    paymentMethod,
  } = bookingData;

  const total = selectionMethod === 'specific' ? (selectedPassengers?.length || 0) : Number(passengerCount || 0);
  const batchId = (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const results = [];
  for (let i = 0; i < total; i++) {
    try {
      const pickupAddr = pickupLocations[0]?.location || null;
      const dropoffAddr = dropoffLocations[0]?.location || null;
      if (!pickupAddr || !dropoffAddr) throw new Error('Pickup and dropoff locations are required');

      const ride = {
        user_id: user.id,
        booking_type: 'bulk',
        service_type: serviceType === 'rides' ? 'taxi' : 'courier',
        status: 'pending',
        payment_status: 'pending',
        vehicle_type: vehicleType,
        pickup_location: pickupAddr,
        dropoff_location: dropoffAddr,
        schedule_type: scheduleType,
        scheduled_date: scheduleType !== 'instant' ? scheduledDate : null,
        scheduled_time: scheduleType !== 'instant' ? scheduledTime : null,
        recurring_pattern: scheduleType === 'recurring' ? recurringPattern : null,
        special_instructions: specialInstructions || null,
        payment_method: paymentMethod,
        batch_id: batchId,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('rides')
        .insert([ride])
        .select()
        .single();
      if (error) throw error;

      results.push({ index: i, success: true, rideId: data.id });
      onProgress?.({ index: i, success: true, rideId: data.id });
    } catch (err) {
      results.push({ index: i, error: err?.message || String(err) });
      onProgress?.({ index: i, error: err?.message || String(err) });
    }
  }

  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  return {
    success: true,
    batchId,
    results,
    counts: { total, success, failed },
  };
};
