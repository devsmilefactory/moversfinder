import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { broadcastRideToDrivers } from '../utils/driverMatching';
import { createRecurringSeries } from '../services/recurringTripService';
import { prepareErrandTasksForInsert } from '../utils/errandTasks';
import { enforceInstantOnly, FEATURE_FLAGS } from '../config/featureFlags';
import { toGeoJSON, calculateDistance, getRouteDistanceAndDuration, getRouteWithStopsDistanceAndDuration } from '../utils/locationServices';
import {
  calculateEstimatedFareV2,
  calculateTaxiFare,
  calculateCourierFare,
  calculateSchoolRunFare,
  calculateErrandsFare,
  calculateBulkTripsFare
} from '../utils/pricingCalculator';

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
    switch (selectedService) {
      case 'taxi':
        if (!formData.passengers || formData.passengers < 1) {
          errors.passengers = 'Number of passengers is required';
        }
        break;

      case 'courier':
        if (!serviceData.recipient?.name) {
          errors.recipientName = 'Recipient name is required';
        }
        if (!serviceData.recipient?.phone) {
          errors.recipientPhone = 'Recipient phone is required';
        }
        if (!serviceData.package?.description) {
          errors.packageDescription = 'Package description is required';
        }
        break;

      case 'school_run':
        if (!serviceData.passenger?.name) {
          errors.passengerName = 'Passenger name is required';
        }
        if (!serviceData.guardian?.name) {
          errors.guardianName = 'Guardian name is required';
        }
        if (!serviceData.guardian?.phone) {
          errors.guardianPhone = 'Guardian phone is required';
        }
        if (!formData.tripTime) {
          errors.tripTime = 'Trip time is required for school runs';
        }
        break;

      case 'errands':
        if (!serviceData.tasks || serviceData.tasks.length === 0) {
          errors.tasks = 'At least one task is required';
        } else {
          serviceData.tasks.forEach((task, index) => {
            if (!task.startPoint || !task.destinationPoint) {
              errors[`task_${index}`] = `Task ${index + 1} requires both start and destination points`;
            }
          });
        }
        break;

      case 'bulk':
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
        break;

      default:
        errors.service = 'Invalid service type';
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
      switch (selectedService) {
        case 'taxi':
          return await calculateTaxiFare({
            distanceKm,
            isRoundTrip: formData.isRoundTrip || false,
            numberOfDates: numberOfTrips
          });

        case 'courier':
          return await calculateCourierFare({
            distanceKm,
            vehicleType: serviceData.vehicleType || 'sedan',
            packageSize: serviceData.package?.size || 'medium',
            isRecurring: numberOfTrips > 1,
            numberOfDates: numberOfTrips
          });

        case 'school_run':
          return await calculateSchoolRunFare({
            distanceKm,
            isRoundTrip: formData.isRoundTrip || false,
            numberOfDates: numberOfTrips
          });

        case 'errands':
          const fare = await calculateErrandsFare({
            errands: serviceData.tasks || [],
            numberOfDates: numberOfTrips
          });
          
          // If we have errand tasks, update the routeDetails with total distance/duration
          if (fare && serviceData.tasks) {
            const totalDistance = serviceData.tasks.reduce((sum, t) => sum + (parseFloat(t.distanceKm || t.distance) || 0), 0);
            const totalDuration = serviceData.tasks.reduce((sum, t) => sum + (parseInt(t.durationMinutes || t.duration) || 0), 0);
            
            if (totalDistance > 0) routeDetails.distanceKm = totalDistance;
            if (totalDuration > 0) routeDetails.durationMinutes = totalDuration;
          }
          
          return fare;

        case 'bulk':
          return await calculateBulkTripsFare({
            distanceKm,
            numberOfTrips
          });

        default:
          // Fallback to simple calculation
          const baseFare = (await calculateEstimatedFareV2({ distanceKm })) || 0;
          return {
            totalFare: baseFare * numberOfTrips,
            breakdown: [{ label: 'Base fare', amount: baseFare }]
          };
      }
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
      scheduled_datetime: (rideTiming === 'instant' || !hasSpecificSchedule) ? null : (() => {
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
      })() : null,

      // Recurrence pattern (only set if recurring is enabled)
      recurrence_pattern: (rideTiming === 'scheduled_recurring' && FEATURE_FLAGS.RECURRING_RIDES_ENABLED) ? (
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

      // Series info
      total_rides_in_series: derivedNumberOfTrips,
      completed_rides_count: 0,
      remaining_rides_count: derivedNumberOfTrips,

      // Service-specific data
      special_requests: formData.specialInstructions || '',
      
      // Status
      status: 'pending',
      created_at: new Date().toISOString()
    };
  }, [roundToNearestHalfDollar]);

  // Main submission function
  const submitBooking = useCallback(async (selectedService, formData, serviceData = {}, user) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
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

      // Step 4: Prepare booking data
      const bookingData = prepareBookingData(user, selectedService, formData, serviceData, routeDetails, fareDetails);

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
      if (selectedService === 'errands' && serviceData.tasks?.length > 0) {
        const errandTasks = prepareErrandTasksForInsert(serviceData.tasks, rideData.id);
        const { error: tasksError } = await supabase
          .from('errand_tasks')
          .insert(errandTasks);

        if (tasksError) {
          console.warn('Failed to insert errand tasks:', tasksError);
        }
      }

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

      // Step 8: Broadcast to drivers (for instant rides)
      if (bookingData.ride_timing === 'instant') {
        try {
          await broadcastRideToDrivers(rideData);
        } catch (broadcastError) {
          console.warn('Failed to broadcast ride to drivers:', broadcastError);
        }
      }

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