import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createRecurringSeries } from '../services/recurringTripService';
import { prepareErrandTasksForInsert } from '../utils/errandTasks';
import { enforceInstantOnly, FEATURE_FLAGS } from '../config/featureFlags';
import { toGeoJSON, calculateDistance, getRouteDistanceAndDuration, getRouteWithStopsDistanceAndDuration } from '../utils/locationServices';
import { addCostsToTasks } from '../utils/errandCostHelpers';
import {
  calculateEstimatedFareV2
} from '../utils/pricingCalculator';
import { getRideTypeHandler } from '../utils/rideTypeHandlers';

/**
 * useBookingSubmission Hook
 * 
 * Handles the booking submission process including:
 * - Form validation
 * - Route calculation
 * - Fare calculation
 * - Database insertion
 * - Success/error handling
 * 
 * Extracted from UnifiedBookingModal for better modularity.
 */
const useBookingSubmission = ({
  onSuccess,
  onError,
  onValidationError
} = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Helper function to round to nearest half dollar
  const roundToNearestHalfDollar = useCallback((amount) => {
    if (amount === null || amount === undefined) return 0;
    const numeric = Number(amount);
    if (Number.isNaN(numeric)) return 0;

    const dollars = Math.floor(numeric);
    const cents = Math.round((numeric - dollars) * 100);

    let roundedValue;
    if (cents < 25) {
      roundedValue = dollars;
    } else if (cents < 75) {
      roundedValue = dollars + 0.5;
    } else {
      roundedValue = dollars + 1;
    }

    return Number(roundedValue.toFixed(2));
  }, []);

  // Helper function to extract coordinates
  const extractCoords = useCallback((loc) => {
    if (!loc) return null;
    if (loc?.data?.coordinates?.lat && loc?.data?.coordinates?.lng) return { lat: loc.data.coordinates.lat, lng: loc.data.coordinates.lng };
    if (loc?.coordinates?.lat && loc?.coordinates?.lng) return { lat: loc.coordinates.lat, lng: loc.coordinates.lng };
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng };
    return null;
  }, []);

  // Validate form data based on service type
  const validateBookingData = useCallback((selectedService, formData, serviceData = {}) => {
    const errors = {};

    // Common validations
    if (!formData.pickupLocation) {
      errors.pickupLocation = 'Pickup location is required';
    }
    if (!formData.dropoffLocation) {
      errors.dropoffLocation = 'Dropoff location is required';
    }

    // Service-specific validations
    // Prefer ride-type handler registry (scales without growing this file).
    // Keep 'bulk' local for now because bulk is a booking-mode (batch_id) rather than a canonical service_type.
    if (selectedService !== 'bulk') {
      try {
        const handler = getRideTypeHandler(selectedService);
        const result = handler?.validateBookingData?.(formData, serviceData);
        if (result && result.isValid === false && result.errors) {
          Object.assign(errors, result.errors);
        }
      } catch (e) {
        errors.service = 'Invalid service type';
      }
    } else {
        const mode = serviceData.bulkMode || 'multi_pickup';
        if (mode === 'multi_pickup') {
          if (!formData.dropoffLocation) {
            errors.dropoffLocation = 'Dropoff location is required for multi-pickup';
          }
          if (!serviceData.bulkPickups || serviceData.bulkPickups.length === 0) {
            errors.bulkPickups = 'At least one pickup location is required';
          }
        } else {
          if (!formData.pickupLocation) {
            errors.pickupLocation = 'Pickup location is required for multi-dropoff';
          }
          if (!serviceData.bulkDropoffs || serviceData.bulkDropoffs.length === 0) {
            errors.bulkDropoffs = 'At least one dropoff location is required';
          }
        }
        if (!serviceData.organizationName) {
          errors.organizationName = 'Organization name is required';
        }
        if (!serviceData.contactPerson) {
          errors.contactPerson = 'Contact person is required';
        }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, []);

  // Calculate route distance and duration
  const calculateRouteDetails = useCallback(async (selectedService, formData, serviceData = {}) => {
    const origin = extractCoords(formData.pickupLocation);
    const destination = extractCoords(formData.dropoffLocation);

    if (!origin || !destination) {
      throw new Error('Invalid pickup or dropoff coordinates');
    }

    let waypoints = [];
    
    // Build waypoints based on service type
    if (selectedService === 'taxi' && serviceData.additionalStops?.length > 0) {
      waypoints = serviceData.additionalStops
        .map(stop => extractCoords(stop?.location || stop))
        .filter(Boolean);
    } else if (selectedService === 'courier' && serviceData.additionalDeliveries?.length > 0) {
      waypoints = serviceData.additionalDeliveries
        .map(delivery => extractCoords(delivery?.location || delivery))
        .filter(Boolean);
    }

    let finalDistanceKm = null;
    let finalDurationMin = null;

    try {
      if (waypoints.length > 0) {
        const res = await getRouteWithStopsDistanceAndDuration({ origin, destination, waypoints });
        if (res?.distance) {
          finalDistanceKm = res.distance;
          finalDurationMin = res.duration;
        }
      } else {
        const single = await getRouteDistanceAndDuration(origin, destination);
        if (single?.distance) {
          finalDistanceKm = single.distance;
          finalDurationMin = single.duration;
        }
      }
    } catch (error) {
      console.warn('Route calculation failed:', error);
    }

    // Fallback to Haversine distance if route calculation fails
    if (!finalDistanceKm || finalDistanceKm <= 0) {
      const haversineKm = calculateDistance(origin, destination);
      if (haversineKm && haversineKm > 0) {
        finalDistanceKm = haversineKm;
        finalDurationMin = Math.round((haversineKm / 40) * 60); // Assume 40 km/h average speed
      }
    }

    return {
      origin,
      destination,
      distanceKm: finalDistanceKm,
      durationMinutes: finalDurationMin
    };
  }, [extractCoords]);

  // Calculate final fare
  const calculateFinalFare = useCallback(async (selectedService, routeDetails, formData, serviceData = {}) => {
    const { distanceKm } = routeDetails;
    
    if (!distanceKm || distanceKm <= 0) {
      return { totalFare: 0, breakdown: null };
    }

    const numberOfTrips = formData.numberOfTrips || 1;

    try {
      // Use handler system for pricing calculation
      const handler = getRideTypeHandler(selectedService);
      const fareResult = await handler.calculateFare({
        distanceKm,
        formData,
        serviceData,
        numberOfTrips
      });
      
      // Special handling for errands: update routeDetails with total distance/duration
      if (selectedService === 'errands' && fareResult && serviceData.tasks) {
        const totalDistance = serviceData.tasks.reduce((sum, t) => sum + (parseFloat(t.distanceKm || t.distance) || 0), 0);
        const totalDuration = serviceData.tasks.reduce((sum, t) => sum + (parseInt(t.durationMinutes || t.duration) || 0), 0);
        
        if (totalDistance > 0) routeDetails.distanceKm = totalDistance;
        if (totalDuration > 0) routeDetails.durationMinutes = totalDuration;
      }
      
      return fareResult;
    } catch (error) {
      console.warn('Fare calculation failed:', error);
      // Fallback calculation
      const baseFare = (await calculateEstimatedFareV2({ distanceKm })) || 0;
      return {
        totalFare: baseFare * numberOfTrips,
        breakdown: [{ label: 'Base fare', amount: baseFare }]
      };
    }
  }, []);

  // Prepare booking data for database insertion
  const prepareBookingData = useCallback((user, selectedService, formData, serviceData, routeDetails, fareDetails) => {
    const { origin, destination, distanceKm, durationMinutes } = routeDetails;
    const { totalFare } = fareDetails;

    // Convert coordinates to GeoJSON Points
    const pickupGeo = origin ? toGeoJSON(origin) : null;
    const dropoffGeo = destination ? toGeoJSON(destination) : null;

    const scheduleType = formData.scheduleType || 'instant';
    const selectedDatesCount = Array.isArray(formData.selectedDates) ? formData.selectedDates.length : 0;
    const baseTripCount = formData.numberOfTrips || selectedDatesCount || 1;
    const roundTripMultiplier = formData.isRoundTrip ? 2 : 1;
    const derivedNumberOfTrips = Math.max(baseTripCount * roundTripMultiplier, 1);

    const hasSpecificSchedule = Boolean(
      formData.tripTime &&
      (
        (scheduleType === 'specific_dates' && selectedDatesCount >= 1) ||
        ((scheduleType === 'weekdays' || scheduleType === 'weekends') && formData.scheduleMonth)
      )
    );

    const isRecurringPattern = hasSpecificSchedule && (
      (scheduleType === 'specific_dates' && selectedDatesCount > 1) ||
      scheduleType === 'weekdays' ||
      scheduleType === 'weekends' ||
      baseTripCount > 1
    );

    let rideTiming = hasSpecificSchedule
      ? (isRecurringPattern ? 'scheduled_recurring' : 'scheduled_single')
      : 'instant';
    
    // Enforce instant-only mode if feature flags disable scheduled/recurring
    rideTiming = enforceInstantOnly(rideTiming);
    const rideIsInstant = rideTiming === 'instant';

    // Errands: normalize tasks and store them on rides.errand_tasks (canonical in app/UI)
    // We keep the errand_tasks table in the schema, but the app’s UX relies on rides.errand_tasks JSON.
    let errandsPayload = {};
    if (selectedService === 'errands') {
      const normalizedTasks = prepareErrandTasksForInsert(serviceData?.tasks || formData?.tasks || []);
      const tasksWithCosts = addCostsToTasks(normalizedTasks, Number(totalFare || 0));
      const taskCount = Array.isArray(tasksWithCosts) ? tasksWithCosts.length : 0;

      errandsPayload = {
        errand_tasks: taskCount > 0 ? JSON.stringify(tasksWithCosts) : JSON.stringify([]),
        number_of_tasks: taskCount,
        completed_tasks_count: 0,
        remaining_tasks_count: taskCount,
        active_errand_task_index: 0
      };
    }

    return {
      // User and service info
      user_id: user.id,
      service_type: selectedService === 'bulk' ? 'taxi' : selectedService,
      ride_timing: rideTiming,
      ride_type: selectedService === 'bulk' ? 'taxi' : selectedService,
      booking_source: 'individual',

      // Location data
      pickup_location: formData.pickupLocation?.data?.address || formData.pickupLocation,
      pickup_coordinates: pickupGeo,
      dropoff_location: formData.dropoffLocation?.data?.address || formData.dropoffLocation,
      dropoff_coordinates: dropoffGeo,
      pickup_address: formData.pickupLocation?.data?.address || formData.pickupLocation,
      dropoff_address: formData.dropoffLocation?.data?.address || formData.dropoffLocation,

      // Vehicle and passengers
      vehicle_type: serviceData.vehicleType || 'sedan',
      passenger_count: formData.passengers || 1,

      // Distance and duration
      distance_km: distanceKm,
      estimated_duration_minutes: durationMinutes,

      // Pricing
      estimated_cost: roundToNearestHalfDollar(totalFare),
      payment_method: formData.paymentMethod || 'cash',

      // Scheduling (only set if not in instant-only mode)
      // Instant-only: scheduled_datetime must be NULL
      scheduled_datetime: rideTiming === 'instant' ? null : (!hasSpecificSchedule ? null : (() => {
        let dateStr;
        if (scheduleType === 'specific_dates' && formData.selectedDates.length > 0) {
          dateStr = formData.selectedDates[0];
        } else if ((scheduleType === 'weekdays' || scheduleType === 'weekends') && formData.scheduleMonth) {
          const [year, month] = formData.scheduleMonth.split('-');
          dateStr = `${year}-${month}-01`;
        } else {
          return null;
        }

        const dateTimeStr = `${dateStr}T${formData.tripTime}:00`;
        const dateObj = new Date(dateTimeStr);

        if (isNaN(dateObj.getTime())) {
          console.error('Invalid date created:', dateTimeStr);
          return null;
        }

        return dateObj.toISOString();
      })()),

      // Recurrence pattern (only set if recurring is enabled)
      recurrence_pattern: (!rideIsInstant && rideTiming === 'scheduled_recurring' && FEATURE_FLAGS.RECURRING_RIDES_ENABLED) ? (
        scheduleType === 'specific_dates' ? {
          type: 'specific_dates',
          dates: formData.selectedDates,
          time: formData.tripTime
        } : scheduleType === 'weekdays' ? {
          type: 'weekdays',
          month: formData.scheduleMonth,
          time: formData.tripTime
        } : scheduleType === 'weekends' ? {
          type: 'weekends',
          month: formData.scheduleMonth,
          time: formData.tripTime
        } : null
      ) : null,

      // Series info (normalize instant to single)
      total_rides_in_series: rideIsInstant ? 1 : derivedNumberOfTrips,
      completed_rides_count: 0,
      remaining_rides_count: rideIsInstant ? 1 : derivedNumberOfTrips,

      // Service-specific data
      special_requests: formData.specialInstructions || '',
      
      // Status and state alignment (feed categories are generated in DB)
      status: 'pending',
      ride_status: 'pending',
      state: 'PENDING',
      execution_sub_state: 'NONE',
      status_updated_at: new Date().toISOString(),

      // Series fields (normalized for instant-only)
      series_id: null,
      series_trip_number: 1,
      series_occurrence_index: null,

      created_at: new Date().toISOString(),

      // Ride-type specific payloads
      ...errandsPayload
    };
  }, [roundToNearestHalfDollar]);

  // Main submission function
  const submitBooking = useCallback(async (selectedService, formData, serviceData = {}, user) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Get authenticated user ID directly from Supabase auth to ensure RLS policy compliance
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser?.id) {
        throw new Error('You must be logged in to book a ride. Please log in and try again.');
      }

      // Step 1: Validate form data
      const validation = validateBookingData(selectedService, formData, serviceData);
      if (!validation.isValid) {
        if (onValidationError) {
          onValidationError(validation.errors);
        }
        throw new Error('Form validation failed');
      }

      // Step 2: Calculate route details
      const routeDetails = await calculateRouteDetails(selectedService, formData, serviceData);

      // Step 3: Calculate fare
      const fareDetails = await calculateFinalFare(selectedService, routeDetails, formData, serviceData);

      // Step 4: Prepare booking data (use authenticated user ID for RLS compliance)
      const bookingData = prepareBookingData(authUser, selectedService, formData, serviceData, routeDetails, fareDetails);

      // Step 5: Insert into database
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .insert([bookingData])
        .select()
        .single();

      if (rideError) {
        throw new Error(`Database insertion failed: ${rideError.message}`);
      }

      // Step 6: Handle service-specific post-processing
      // Errands post-processing removed: errands are stored canonically on rides.errand_tasks JSON.

      // Step 7: Handle recurring rides (only if feature flag enabled)
      if (FEATURE_FLAGS.RECURRING_RIDES_ENABLED && 
          bookingData.ride_timing === 'scheduled_recurring' && 
          bookingData.recurrence_pattern) {
        try {
          await createRecurringSeries({
            baseRideId: rideData.id,
            recurrencePattern: bookingData.recurrence_pattern,
            totalRides: bookingData.total_rides_in_series
          });
        } catch (recurringError) {
          console.warn('Failed to create recurring series:', recurringError);
        }
      }

      // Step 8: Broadcast to drivers
      // IMPORTANT: this is now handled by a DB trigger on rides INSERT (production),
      // so we do not broadcast from the client to avoid double notifications/queue rows.

      setSubmitSuccess(true);
      
      if (onSuccess) {
        onSuccess(rideData);
      }

      return rideData;

    } catch (error) {
      console.error('Booking submission failed:', error);
      setSubmitError(error.message || 'Booking submission failed');
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    validateBookingData,
    calculateRouteDetails,
    calculateFinalFare,
    prepareBookingData,
    onSuccess,
    onError,
    onValidationError
  ]);

  // Clear booking state
  const clearBookingState = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(false);
  }, []);

  return {
    isSubmitting,
    submitError,
    submitSuccess,
    submitBooking,
    clearBookingState,
    validateBookingData
  };
};

export default useBookingSubmission;