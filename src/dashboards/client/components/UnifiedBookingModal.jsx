import React, { useState, useEffect } from 'react';

import Button from '../../shared/Button';
import CompactTaxiForm from './CompactTaxiForm';
import CompactCourierForm from './CompactCourierForm';
import CompactSchoolRunForm from './CompactSchoolRunForm';
import CompactErrandsForm from './CompactErrandsForm';
import CompactBulkForm from './CompactBulkForm';
import ScheduleModal from './ScheduleModal';
import { useAuthStore, useSavedPlacesStore } from '../../../stores';
import { supabase } from '../../../lib/supabase';
import { broadcastRideToDrivers } from '../../../utils/driverMatching';
import { createRecurringRides } from '../../../utils/recurringRides';
import {
  calculateEstimatedFareV2,
  calculateRoundTripFare,
  calculateRecurringTotalFare,
  calculateMultiPackageFare,
  calculateTaxiFare,
  calculateCourierFare,
  calculateSchoolRunFare,
  calculateErrandsFare,
  calculateBulkTripsFare
} from '../../../utils/pricingCalculator';

import { getRouteWithStopsDistanceAndDuration, getRouteDistanceAndDuration, toGeoJSON, fromGeoJSON, calculateDistance, getCurrentLocation } from '../../../utils/locationServices';


/**
 * Unified Booking Modal Component
 *
 * Single-screen booking interface with:
 * - Fixed top bar: New/Saved trip toggle, progress indicator
 * - Trip timing: Instant/Scheduled toggle with date picker
 * - Floating service tabs: Taxi, Courier, School Run, Errands
 * - Scrollable service details section
 * - Fixed bottom bar: Cost estimate and Book button
 *
 * Features:
 * - Smart defaults to minimize clicks
 * - Pre-selection based on trigger button
 * - Saved trip auto-fill
 * - Responsive design (50% width desktop, full width mobile)
 *
 * Database Integration Ready:
 * - Saved trips: SELECT * FROM saved_trips WHERE user_id = current_user
 * - Booking: INSERT INTO rides (user_id, service_type, ...)
 */

const UnifiedBookingModal = ({
  isOpen,
  onClose,
  defaultServiceType = 'taxi',
  savedTrips = [],
  initialData = null, // Pre-fill data for edit/rebook scenarios
  mode = 'create', // 'create', 'edit', 'rebook'
  estimate = null, // { distanceKm, durationMinutes, cost }
  onSuccess = null // Callback function called after successful booking with ride data
}) => {
  // Debug: Log estimate when it changes
  useEffect(() => {
    console.log('📊 UnifiedBookingModal estimate updated:', estimate);
  }, [estimate]);

  // Zustand stores
  const user = useAuthStore((state) => state.user);
  const savedPlaces = useSavedPlacesStore((state) => state.savedPlaces);
  const loadSavedPlaces = useSavedPlacesStore((state) => state.loadSavedPlaces);

  // Modal state
  const [tripMode, setTripMode] = useState('new'); // 'new' or 'saved'
  const [scheduleType, setScheduleType] = useState('instant'); // 'instant', 'specific_dates', 'weekdays', 'weekends'
  const [selectedService, setSelectedService] = useState(defaultServiceType);
  const [selectedSavedTrip, setSelectedSavedTrip] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);


  // Form data - comprehensive for all service types
  const [formData, setFormData] = useState({
    // Scheduling
    scheduleType: 'instant', // 'instant', 'specific_dates', 'weekdays', 'weekends'
    selectedDates: [], // Array of date strings for specific dates
    scheduleMonth: '', // Month for weekdays/weekends (YYYY-MM format)
    tripTime: '', // Time for the trip
    tripCount: 1, // Number of trips
    numberOfTrips: 1, // Total number of trips (calculated from schedule)
    // Location
    pickupLocation: '',
    dropoffLocation: '',
    passengers: 1,
    paymentMethod: 'cash',
    specialInstructions: '',
    // Taxi-specific
    isRoundTrip: false,
    // Courier-specific
    packages: [{
      dropoffLocation: '',
      recipientName: '',
      recipientPhone: '',
      recipientEmail: '',
      packageDescription: '',
      packageWeight: '',
      weightUnit: 'kg',
      packageSize: 'medium',
      vehicleType: 'sedan',
      specialInstructions: ''
    }],
    // School Run-specific
    tripDirection: 'one-way',
    passengerName: '',
    contactNumber: '',
    // Errands-specific
    tasks: [],
    returnToStart: false
  });

  const [loading, setLoading] = useState(false);
  // Derived cost for errands (sum of each task priced as a taxi ride)
  const [errandsTasksCost, setErrandsTasksCost] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const compute = async () => {
      try {
        if (selectedService !== 'errands' || !formData?.tasks?.length) {
          if (!cancelled) setErrandsTasksCost(0);
          return;
        }
        const results = await Promise.all(
          formData.tasks.map(async (t) => {
            const origin = t?.startPoint?.data?.address || t?.startPoint?.address || t?.startPoint;
            const dest = t?.destinationPoint?.data?.address || t?.destinationPoint?.address || t?.destinationPoint;
            if (!origin || !dest) return 0;
            const { distance } = await getRouteDistanceAndDuration(origin, dest);
            const km = distance || 0;
            return calculateEstimatedFareV2({ distanceKm: km }) ?? 0;
          })
        );
        const sum = results.reduce((a, b) => a + (b || 0), 0);
        if (!cancelled) setErrandsTasksCost(Math.round(sum * 100) / 100);
      } catch (e) {
        console.warn('Errands pricing compute failed:', e);
        if (!cancelled) setErrandsTasksCost(0);
      }
    };
    compute();
    return () => { cancelled = true; };
  }, [selectedService, formData?.tasks]);


  // Load saved places on mount
  useEffect(() => {
    if (user?.id) {
      loadSavedPlaces(user.id);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Locally computed estimate that includes additional stops/deliveries when present
  const [computedEstimate, setComputedEstimate] = useState(null);

  const extractCoords = (loc) => {
    if (!loc) return null;
    if (loc?.data?.coordinates?.lat && loc?.data?.coordinates?.lng) return { lat: loc.data.coordinates.lat, lng: loc.data.coordinates.lng };
    if (loc?.coordinates?.lat && loc?.coordinates?.lng) return { lat: loc.coordinates.lat, lng: loc.coordinates.lng };
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng };
    return null;
  };

  useEffect(() => {
    // Reset estimate immediately on input/tab changes to update pricing in realtime
    setComputedEstimate(null);

    // Special handling for Bulk trips: sum distances across segments
    if (selectedService === 'bulk') {
      const mode = formData.bulkMode || 'multi_pickup';
      let segments = [];
      if (mode === 'multi_pickup') {
        const drop = extractCoords(formData.dropoffLocation);
        const pickups = (formData.bulkPickups || []).map(extractCoords).filter(Boolean);
        if (!drop || pickups.length === 0) return;
        segments = pickups.map((p) => ({ origin: p, destination: drop }));
      } else {
        const pick = extractCoords(formData.pickupLocation);
        const drops = (formData.bulkDropoffs || []).map(extractCoords).filter(Boolean);
        if (!pick || drops.length === 0) return;
        segments = drops.map((d) => ({ origin: pick, destination: d }));
      }

      let aborted = false;
      (async () => {
        try {
          let totalKm = 0;
          let totalMin = 0;
          const perTripEstimates = [];
          for (const seg of segments) {
            const res = await getRouteDistanceAndDuration(seg.origin, seg.destination);
            let segKm = res?.distance ?? 0;
            let segMin = res?.duration ?? (segKm > 0 ? Math.round((segKm / 40) * 60) : 0);

            if (!segKm || !(segKm > 0)) {
              const hav = calculateDistance(seg.origin, seg.destination);
              if (hav && hav > 0) {
                segKm = hav;
                segMin = Math.round((hav / 40) * 60);
              }
            }

            const segCost = segKm ? (calculateEstimatedFareV2({ distanceKm: segKm }) ?? 0) : 0;
            perTripEstimates.push({ distanceKm: segKm, durationMinutes: segMin, cost: segCost });

            totalKm += segKm;
            totalMin += segMin;
            if (aborted) return;
          }
          if (!aborted && totalKm > 0) {
            const totalCost = perTripEstimates.reduce((sum, t) => sum + (t.cost || 0), 0);
            setComputedEstimate({ distanceKm: totalKm, durationMinutes: totalMin, cost: totalCost, tripCount: perTripEstimates.length, perTripEstimates });
          }
        } catch (e) {
          console.warn('Failed to compute bulk route estimate:', e);
          if (!aborted) setComputedEstimate(null);
        }
      })();

      return () => {};
    }

    // Default handling for single-trip distance computation
    const origin = extractCoords(formData.pickupLocation);
    const destination = extractCoords(formData.dropoffLocation);
    if (!origin || !destination) {
      setComputedEstimate(null);
      return;
    }

    // Build waypoints depending on service type
    let waypoints = [];
    if (selectedService === 'taxi' && Array.isArray(formData.additionalStops) && formData.additionalStops.length) {
      waypoints = formData.additionalStops
        .map((s) => extractCoords(s?.location || s))
        .filter(Boolean);
    } else if (selectedService === 'courier' && Array.isArray(formData.additionalDeliveries) && formData.additionalDeliveries.length) {
      waypoints = formData.additionalDeliveries
        .map((d) => extractCoords(d?.location || d))
        .filter(Boolean);
    }

    const shouldCompute = waypoints.length > 0 || !(estimate && estimate.distanceKm);
    if (!shouldCompute) {
      setComputedEstimate(null);
      return; // Use base page estimate when available and no extra stops
    }

    let aborted = false;
    (async () => {
      try {
        let res;
        if (waypoints.length > 0) {
          res = await getRouteWithStopsDistanceAndDuration({ origin, destination, waypoints });
        } else {
          const single = await getRouteDistanceAndDuration(origin, destination);
          res = single ? { distance: single.distance, duration: single.duration } : null;
        }
        if (!aborted && res?.distance) {
          setComputedEstimate({ distanceKm: res.distance, durationMinutes: res.duration });
        }
      } catch (e) {
        console.warn('Failed to compute route estimate:', e);
        if (!aborted) setComputedEstimate(null);
      }
    })();

    return () => { aborted = true; };
  }, [selectedService, formData.pickupLocation, formData.dropoffLocation, JSON.stringify(formData.additionalStops), JSON.stringify(formData.additionalDeliveries), formData.bulkMode, JSON.stringify(formData.bulkPickups || []), JSON.stringify(formData.bulkDropoffs || [])]);

  // Service types configuration
  const services = [
    { id: 'taxi', name: 'Taxi', icon: '🚕', color: 'yellow' },
    { id: 'courier', name: 'Courier', icon: '📦', color: 'blue' },
    { id: 'errands', name: 'Errands', icon: '🛍️', color: 'purple' },
    { id: 'school_run', name: 'School/Work', icon: '🎒', color: 'green' },
    { id: 'bulk', name: 'Bulk', icon: '👥', color: 'teal' }
  ];

  // Auto-detect on open disabled per UX request (no auto-fill of pickup/dropoff)
  useEffect(() => {
    // intentionally left blank
  }, [isOpen]);



  // Reset to default service when modal opens OR pre-fill with initialData
  useEffect(() => {
    if (isOpen) {
      // If initialData is provided (edit/rebook mode), pre-fill the form
      if (initialData) {
        setSelectedService(initialData.serviceType || defaultServiceType);
        setTripMode('new'); // Always use 'new' mode for edit/rebook
        setScheduleType(initialData.scheduleType || 'instant');
        setSelectedSavedTrip(null);

        // Pre-fill form with initialData
        setFormData({
          scheduleType: initialData.scheduleType || 'instant',
          selectedDates: initialData.selectedDates || [],
          scheduleMonth: initialData.scheduleMonth || '',
          tripTime: initialData.tripTime || '',
          tripCount: initialData.tripCount || 1,
          pickupLocation: initialData.pickupLocation || '',
          dropoffLocation: initialData.dropoffLocation || '',
          passengers: initialData.passengers || 1,
          paymentMethod: initialData.paymentMethod || 'cash',
          specialInstructions: initialData.specialInstructions || '',
          additionalStops: initialData.additionalStops || [],
          recipientName: initialData.recipientName || '',
          recipientPhone: initialData.recipientPhone || '',
          packageDetails: initialData.packageDetails || '',
          packageSize: initialData.packageSize || 'small',
          additionalDeliveries: initialData.additionalDeliveries || [],
          tripDirection: initialData.tripDirection || 'one-way',
          passengerName: initialData.passengerName || '',
          contactNumber: initialData.contactNumber || '',
          tasks: initialData.tasks || [],
          returnToStart: initialData.returnToStart || false
        });
      } else {
        // Default empty form
        setSelectedService(defaultServiceType);
        setTripMode('new');
        setScheduleType('instant');
        setSelectedSavedTrip(null);
        setFormData({
          scheduleType: 'instant',
          selectedDates: [],
          scheduleMonth: '',
          tripTime: '',
          tripCount: 1,
          pickupLocation: '',
          dropoffLocation: '',
          passengers: 1,
          paymentMethod: 'cash',
          specialInstructions: '',
          additionalStops: [],
          recipientName: '',
          recipientPhone: '',
          packageDetails: '',
          packageSize: 'small',
          additionalDeliveries: [],
          tripDirection: 'one-way',
          passengerName: '',
          contactNumber: '',
          tasks: [],
          returnToStart: false
        });
      }
    }
  }, [isOpen, defaultServiceType, initialData]);








  // Handle saved trip selection
  const handleSavedTripSelect = (trip) => {
    setSelectedSavedTrip(trip);
    setSelectedService(trip.serviceType);
    setFormData({
      ...formData,
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      passengers: trip.passengers || 1,
      paymentMethod: trip.paymentMethod || 'cash',
      specialInstructions: trip.specialInstructions || ''
    });
    setTripMode('new'); // Switch to new trip view with pre-filled data
  };

  // Calculate estimated cost without requiring local formData locations; rely on available distance
  const calculateCost = () => {
    if (selectedService === 'bulk') {
      if (computedEstimate && computedEstimate.cost != null) {
        return Math.round(computedEstimate.cost * 100) / 100;
      }
      return 0;
    }

    const distanceKmForPrice = (computedEstimate && computedEstimate.distanceKm)
      ? computedEstimate.distanceKm
      : (estimate && estimate.distanceKm ? estimate.distanceKm : null);

    const numberOfTrips = formData.numberOfTrips || 1;

    // For courier service with multiple packages
    if (selectedService === 'courier' && formData.packages && formData.packages.length > 0) {
      const singleTripPackagePrice = calculateMultiPackageFare(formData.packages);
      // Multiply by number of trips for recurring bookings
      const totalPrice = singleTripPackagePrice * numberOfTrips;
      return Math.round(totalPrice * 100) / 100;
    }

    // For errands service with multiple tasks
    if (selectedService === 'errands' && formData.tasks && formData.tasks.length > 0) {
      const singleTripTaskPrice = errandsTasksCost;
      // Multiply by number of trips for recurring bookings
      const totalPrice = singleTripTaskPrice * numberOfTrips;
      return Math.round(totalPrice * 100) / 100;
    }

    // For distance-based services (taxi, school run)
    if (distanceKmForPrice != null && distanceKmForPrice > 0) {
      let singleTripFare;

      // Calculate single trip fare (with round trip if applicable)
      if ((selectedService === 'taxi' || selectedService === 'school_run') && formData.isRoundTrip) {
        singleTripFare = calculateRoundTripFare({ distanceKm: distanceKmForPrice }) ?? 0;
      } else {
        singleTripFare = calculateEstimatedFareV2({ distanceKm: distanceKmForPrice }) ?? 0;
      }

      // Multiply by number of trips for recurring bookings
      const totalCost = singleTripFare * numberOfTrips;
      return Math.round(totalCost * 100) / 100;
    }

    // No distance yet -> 0 until route is computed
    return 0;
  };


  // Check if form is valid based on service type
  const isFormValid = () => {
    // Service-specific validations
    switch (selectedService) {
      case 'taxi':
        return formData.pickupLocation && formData.dropoffLocation;

      case 'courier':
        return formData.pickupLocation && formData.dropoffLocation &&
               formData.recipientName && formData.recipientPhone && formData.packageDetails;

      case 'school_run':
        return formData.pickupLocation && formData.dropoffLocation &&
               formData.passengerName && formData.contactNumber &&
               (formData.scheduleType === 'instant' || !!formData.tripTime);

      case 'errands':
        return formData.pickupLocation && formData.tasks && formData.tasks.length > 0;

      case 'bulk': {
        const mode = formData.bulkMode || 'multi_pickup';
        if (mode === 'multi_pickup') {
          return formData.dropoffLocation && (formData.bulkPickups || []).length > 0;
        }
        return formData.pickupLocation && (formData.bulkDropoffs || []).length > 0;
      }

      default:
        return false;
    }
  };

  // Handle schedule modal confirmation
  const handleScheduleConfirm = (scheduleData) => {
    setFormData(prev => ({
      ...prev,
      ...scheduleData
    }));
  };

  // Show confirmation modal before booking
  const handleShowConfirmation = () => {
    if (!isFormValid()) return;
    setShowConfirmationModal(true);
  };

  // Handle booking submission (called after confirmation)
  const handleBooking = async () => {
    if (!isFormValid()) return;

    setShowConfirmationModal(false);
    setLoading(true);




      // Ensure we have a distance/duration; compute if missing
      const origin = extractCoords(formData.pickupLocation);
      const destination = extractCoords(formData.dropoffLocation);
      let waypoints = [];
      if (selectedService === 'taxi') {
        waypoints = (formData.additionalStops || [])
          .map((s) => extractCoords(s?.location || s))
          .filter(Boolean);
      } else if (selectedService === 'courier') {
        waypoints = (formData.additionalDeliveries || [])
          .map((d) => extractCoords(d?.location || d))
          .filter(Boolean);
      }

      let finalDistanceKm = (computedEstimate?.distanceKm ?? estimate?.distanceKm) ?? null;
      let finalDurationMin = (computedEstimate?.durationMinutes ?? estimate?.durationMinutes) ?? null;

      if ((!finalDistanceKm || !(finalDistanceKm > 0)) && origin && destination) {
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
        } catch (e) {
          console.warn('Route compute failed in handleBooking:', e);
        }
      }

      // Final fallback: use Haversine if still missing and we have coords
      if ((!finalDistanceKm || !(finalDistanceKm > 0)) && origin && destination) {
        const haversineKm = calculateDistance(origin, destination);
        if (haversineKm && haversineKm > 0) {
          finalDistanceKm = haversineKm;
          finalDurationMin = Math.round((haversineKm / 40) * 60);
        }
      }



      // Calculate final cost using new fare calculation functions with breakdowns
      let finalCost = 0;
      let fareBreakdown = null;
      
      if (selectedService === 'taxi' && finalDistanceKm && finalDistanceKm > 0) {
        const taxiFare = calculateTaxiFare({
          distanceKm: finalDistanceKm,
          isRecurring: formData.isRoundTrip,
          numberOfDates: formData.numberOfTrips || 1
        });
        if (taxiFare) {
          finalCost = taxiFare.totalFare;
          fareBreakdown = taxiFare.breakdown;
        }
      } else if (selectedService === 'courier' && finalDistanceKm && finalDistanceKm > 0) {
        const courierFare = calculateCourierFare({
          distanceKm: finalDistanceKm,
          vehicleType: formData.vehicleType || 'sedan',
          packageSize: formData.packages?.[0]?.packageSize || 'medium',
          isRecurring: false,
          numberOfDates: formData.numberOfTrips || 1
        });
        if (courierFare) {
          finalCost = courierFare.totalFare;
          fareBreakdown = courierFare.breakdown;
        }
      } else if (selectedService === 'school_run' && finalDistanceKm && finalDistanceKm > 0) {
        const schoolFare = calculateSchoolRunFare({
          distanceKm: finalDistanceKm,
          isRoundTrip: formData.isRoundTrip,
          numberOfDates: formData.numberOfTrips || 1
        });
        if (schoolFare) {
          finalCost = schoolFare.totalFare;
          fareBreakdown = schoolFare.breakdown;
        }
      } else if (selectedService === 'errands' && formData.tasks && formData.tasks.length > 0) {
        const errandsFare = calculateErrandsFare({
          errands: formData.tasks,
          numberOfDates: formData.numberOfTrips || 1,
          calculateDistance: calculateDistance
        });
        if (errandsFare) {
          finalCost = errandsFare.totalFare;
          fareBreakdown = errandsFare.breakdown;
        }
      } else if (finalDistanceKm && finalDistanceKm > 0) {
        // Fallback to simple calculation
        finalCost = calculateEstimatedFareV2({ distanceKm: finalDistanceKm }) ?? 0;
      }

      // Prepare booking data with new database schema fields
      // Convert coordinates to GeoJSON Points for database
      // Build robust coordinate candidates for GeoJSON conversion
      const pickupCandidateA = origin ? toGeoJSON(origin) : null;
      const pickupCandidateB = (formData.pickupLocation?.data?.coordinates) ? toGeoJSON(formData.pickupLocation.data.coordinates) : null;
      const dropoffCandidateA = destination ? toGeoJSON(destination) : null;
      const dropoffCandidateB = (formData.dropoffLocation?.data?.coordinates) ? toGeoJSON(formData.dropoffLocation.data.coordinates) : null;

      let pickupGeo = pickupCandidateA || pickupCandidateB;
      let dropoffGeo = dropoffCandidateA || dropoffCandidateB;

      // Guard: if pickup and dropoff end up identical but addresses differ, try alternate candidate for pickup
      if (pickupGeo && dropoffGeo && JSON.stringify(pickupGeo) === JSON.stringify(dropoffGeo)) {
        if (pickupCandidateB && JSON.stringify(pickupCandidateB) !== JSON.stringify(dropoffGeo)) {
          pickupGeo = pickupCandidateB;
        } else if (pickupCandidateA && JSON.stringify(pickupCandidateA) !== JSON.stringify(dropoffCandidateB || dropoffGeo)) {
          pickupGeo = pickupCandidateA;
        }
      }

      const bookingData = {
        // User and service info
        user_id: user.id,
        service_type: selectedService === 'bulk' ? 'taxi' : selectedService,

        // Ride timing and type
        ride_timing: formData.scheduleType === 'instant' ? 'instant' :
                     (formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 1) ? 'scheduled_recurring' :
                     'scheduled_single',
        ride_type: selectedService === 'bulk' ? 'taxi' : selectedService,
        booking_source: 'individual',

        // Location data (standardized columns)
        pickup_location: formData.pickupLocation?.data?.address || formData.pickupLocation,
        pickup_coordinates: pickupGeo,
        dropoff_location: formData.dropoffLocation?.data?.address || formData.dropoffLocation,
        dropoff_coordinates: dropoffGeo,
        // (Optionally keep legacy address fields for compatibility)
        pickup_address: formData.pickupLocation?.data?.address || formData.pickupLocation,
        dropoff_address: formData.dropoffLocation?.data?.address || formData.dropoffLocation,

        // Vehicle / passengers
        vehicle_type: formData.vehicleType || 'sedan',

        // Distance and duration (prefer computed with stops when available)
        distance_km: finalDistanceKm ?? null,
        estimated_duration_minutes: finalDurationMin ?? null,

        // Scheduling - combine date and time properly
        scheduled_datetime: (() => {
          if (formData.scheduleType === 'instant' || !formData.tripTime) return null;

          // For single scheduled ride or first date of recurring rides
          let dateStr;
          if (formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 0) {
            dateStr = formData.selectedDates[0]; // Use first date for the initial ride
          } else if (formData.scheduleType === 'weekdays' || formData.scheduleType === 'weekends') {
            // For weekdays/weekends, we'll use the first day of the selected month
            // The actual dates will be generated by createRecurringRides
            const [year, month] = formData.scheduleMonth.split('-');
            dateStr = `${year}-${month}-01`;
          } else {
            return null;
          }

          // Combine date and time
          const dateTimeStr = `${dateStr}T${formData.tripTime}:00`;
          const dateObj = new Date(dateTimeStr);

          // Validate the date
          if (isNaN(dateObj.getTime())) {
            console.error('Invalid date created:', dateTimeStr);
            return null;
          }

          return dateObj.toISOString();
        })(),

        // Recurrence pattern for recurring rides
        recurrence_pattern: formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 1 ? {
          type: 'specific_dates',
          dates: formData.selectedDates,
          time: formData.tripTime
        } : formData.scheduleType === 'weekdays' ? {
          type: 'weekdays',
          month: formData.scheduleMonth,
          time: formData.tripTime
        } : formData.scheduleType === 'weekends' ? {
          type: 'weekends',
          month: formData.scheduleMonth,
          time: formData.tripTime
        } : null,

        // Ride series info
        total_rides_in_series: formData.scheduleType === 'specific_dates' ? formData.selectedDates.length :
                               formData.scheduleType === 'weekdays' || formData.scheduleType === 'weekends' ? formData.tripCount : 1,
        completed_rides_count: 0,
        remaining_rides_count: formData.scheduleType === 'specific_dates' ? formData.selectedDates.length :
                               formData.scheduleType === 'weekdays' || formData.scheduleType === 'weekends' ? formData.tripCount : 1,

        // Number of trips (for recurring bookings and price calculation)
        number_of_trips: formData.numberOfTrips || 1,

        // Status fields
        acceptance_status: 'pending',
        ride_status: 'pending',
        status_updated_at: new Date().toISOString(),

        // Payment and cost
        payment_method: formData.paymentMethod,
        estimated_cost: finalCost,
        payment_status: 'pending',
        
        // Fare breakdown for transparency
        fare_breakdown: fareBreakdown ? JSON.stringify(fareBreakdown) : null,

        // Service-specific data mapping
        special_requests: formData.specialInstructions || null,
        number_of_passengers: formData.passengers || 1,
        
        // For errands: store number of tasks
        ...(selectedService === 'errands' && formData.tasks && {
          number_of_tasks: formData.tasks.length,
          errand_tasks: JSON.stringify(formData.tasks.map(t => ({
            description: t.description,
            pickup_location: t.pickup_location,
            dropoff_location: t.dropoff_location
          })))
        }),

        // Taxi-specific fields
        ...(selectedService === 'taxi' && {
          is_round_trip: formData.isRoundTrip || false
        }),


        // Courier-specific fields
        ...(selectedService === 'courier' && formData.packages && {
          courier_packages: JSON.stringify(formData.packages),
          package_size: formData.packages[0]?.packageSize || 'medium',
          recipient_name: formData.packages[0]?.recipientName || null,
          recipient_phone: formData.packages[0]?.recipientPhone || null
        }),

        // Timestamps
        created_at: new Date().toISOString()
      };


      // Check if this is a recurring ride
      // Bulk booking: create one ride per segment with shared batch_id
if (selectedService === 'bulk') {
  try {
    const mode = formData.bulkMode || 'multi_pickup';
    const extractAddress = (loc) => {
      if (!loc) return '';
      return typeof loc === 'string' ? loc : (loc?.data?.address || '');
    };

    const segments = [];
    if (mode === 'multi_pickup') {
      const dropCoords = extractCoords(formData.dropoffLocation);
      const dropAddr = extractAddress(formData.dropoffLocation);
      if (!dropCoords || !dropAddr) {
        alert('Please set a drop-off location before adding pickups.');
        setLoading(false);
        return;
      }
      (formData.bulkPickups || []).forEach((p) => {
        const pCoords = extractCoords(p);
        const pAddr = extractAddress(p);
        if (pCoords && pAddr) {
          segments.push({ origin: pCoords, originAddr: pAddr, destination: dropCoords, destAddr: dropAddr });
        }
      });
    } else {
      const pickCoords = extractCoords(formData.pickupLocation);
      const pickAddr = extractAddress(formData.pickupLocation);
      if (!pickCoords || !pickAddr) {
        alert('Please set a pickup location before adding drop-offs.');
        setLoading(false);
        return;
      }
      (formData.bulkDropoffs || []).forEach((d) => {
        const dCoords = extractCoords(d);
        const dAddr = extractAddress(d);
        if (dCoords && dAddr) {
          segments.push({ origin: pickCoords, originAddr: pickAddr, destination: dCoords, destAddr: dAddr });
        }
      });
    }

    if (segments.length === 0) {
      alert('Add at least one valid location in the multiple list.');
      setLoading(false);
      return;
    }

    const batchId = (window.crypto?.randomUUID && window.crypto.randomUUID()) || Math.random().toString(36).slice(2);

    const ridesToInsert = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      let segDistanceKm = null;
      let segDurationMin = null;
      try {
        const route = await getRouteDistanceAndDuration(seg.origin, seg.destination);
        segDistanceKm = route?.distance ?? null;
        segDurationMin = route?.duration ?? null;
      } catch (e) {
        // ignore and fallback below
      }
      if (!segDistanceKm || !(segDistanceKm > 0)) {
        const hav = calculateDistance(seg.origin, seg.destination);
        if (hav && hav > 0) {
          segDistanceKm = hav;
          segDurationMin = Math.round((hav / 40) * 60);
        }
      }

      const segCost = segDistanceKm ? (calculateEstimatedFareV2({ distanceKm: segDistanceKm }) ?? 0) : 0;

      ridesToInsert.push({
        user_id: bookingData.user_id,
        service_type: bookingData.service_type,
        ride_type: bookingData.ride_type,
        ride_timing: bookingData.ride_timing,
        booking_source: bookingData.booking_source,
        pickup_location: seg.originAddr,
        pickup_coordinates: toGeoJSON(seg.origin),
        dropoff_location: seg.destAddr,
        dropoff_coordinates: toGeoJSON(seg.destination),
        vehicle_type: bookingData.vehicle_type,
        distance_km: segDistanceKm ?? null,
        estimated_duration_minutes: segDurationMin ?? null,
        scheduled_datetime: bookingData.scheduled_datetime ?? null,
        number_of_trips: 1,
        is_round_trip: false,
        is_saved_template: false,
        acceptance_status: 'pending',
        ride_status: 'pending',
        status_updated_at: new Date().toISOString(),
        payment_method: bookingData.payment_method,
        estimated_cost: segCost,
        payment_status: 'pending',
        special_requests: bookingData.special_requests || null,
        batch_id: batchId,
        created_at: new Date().toISOString()
      });
    }

    const { data: createdRides, error: bulkError } = await supabase
      .from('rides')
      .insert(ridesToInsert)
      .select();

    if (bulkError) {
      console.error('Error creating bulk rides:', bulkError);
      alert('❌ Failed to book bulk trips. Please try again.');
      setLoading(false);
      return;
    }

    if (bookingData.ride_timing === 'instant') {
      for (const ride of createdRides || []) {
        if (ride.pickup_coordinates) {
          const pickupLatLng = fromGeoJSON(ride.pickup_coordinates);
          await broadcastRideToDrivers(ride.id, pickupLatLng, 5);
        }
      }
      alert(`🎉 Success! ${createdRides.length} trip(s) created and sent to nearby drivers.`);
    } else {
      alert(`🎉 Success! ${createdRides.length} trip(s) have been scheduled.`);
    }

    setLoading(false);
    if (onSuccess) onSuccess({ rides: createdRides, isBulk: true, batchId });
    onClose();
    return;
  } catch (err) {
    console.error('Bulk booking failed:', err);
    alert('❌ Bulk booking failed. Please try again.');
    setLoading(false);
    return;
  }
}

// Check if this is a recurring ride
const isRecurring = bookingData.ride_timing === 'scheduled_recurring' && bookingData.recurrence_pattern;

      if (isRecurring) {
        // Handle recurring rides - generate multiple ride records
        console.log('📅 Creating recurring ride series...');

        const recurringResult = await createRecurringRides(
          bookingData,
          bookingData.recurrence_pattern
        );

        if (!recurringResult.success) {
          console.error('Error creating recurring rides:', recurringResult.error);
          alert('❌ Failed to create recurring rides. Please try again.');
          setLoading(false);
          return;
        }

        console.log(`✅ Created ${recurringResult.count} recurring rides`);
        alert(`🎉 Success! ${recurringResult.count} rides have been scheduled for your recurring trip.`);

        setLoading(false);

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess({ rides: recurringResult.rides, isRecurring: true });
        }

        onClose();

      } else {
        // Handle single ride (instant or scheduled_single)
        const { data: ride, error } = await supabase
          .from('rides')
          .insert([bookingData])
          .select()
          .single();

        if (error) {
          console.error('Error creating ride:', error);
          alert('❌ Failed to book trip. Please try again.');
          setLoading(false);
          return;
        }

        console.log('✅ Ride created successfully:', ride);

        // For instant rides, broadcast to nearby drivers
        if (ride.ride_timing === 'instant' && ride.pickup_coordinates) {
          const pickupLatLng = fromGeoJSON(ride.pickup_coordinates) || null;
          const broadcastResult = await broadcastRideToDrivers(
            ride.id,
            pickupLatLng,
            5 // 5km radius
          );

          if (broadcastResult.success && broadcastResult.driversNotified > 0) {
            console.log(`✅ Ride broadcast to ${broadcastResult.driversNotified} drivers`);
            alert(`🎉 Trip booked successfully! ${broadcastResult.driversNotified} nearby driver(s) have been notified.`);
          } else {
            console.log('⚠️ No nearby drivers found');
            alert('🎉 Trip booked successfully! We\'ll notify you when a driver becomes available.');
          }
        } else {
          alert('🎉 Trip booked successfully! A driver will be assigned shortly.');
        }

        setLoading(false);

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess({ ride, isRecurring: false });
        }

        onClose();
      }





  };

  // Format date display
  const getDateDisplay = () => {
    if (formData.scheduleType === 'instant') return 'Trip date: Instant';
    if (formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 0) {
      return `${formData.selectedDates.length} date(s) selected`;
    }
    if (formData.scheduleType === 'weekdays' && formData.scheduleMonth) {
      return `Weekdays in ${formData.scheduleMonth}`;
    }
    if (formData.scheduleType === 'weekends' && formData.scheduleMonth) {
      return `Weekends in ${formData.scheduleMonth}`;
    }
    return 'Not scheduled';
  };

  // Helper functions for confirmation modal
  const getLocationAddress = (location) => {
    if (!location) return 'Not specified';
    if (typeof location === 'string') return location;
    return location?.data?.address || location?.address || 'Not specified';
  };

  const getScheduleDisplay = () => {
    if (formData.scheduleType === 'instant') return 'Instant (Now)';

    if (formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 0) {
      if (formData.selectedDates.length === 1) {
        // Single scheduled ride
        const date = new Date(formData.selectedDates[0]);
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        return `${formattedDate} at ${formData.tripTime || 'Not set'}`;
      }
      // Multiple specific dates (recurring)
      return `${formData.selectedDates.length} rides on specific dates starting ${formData.selectedDates[0]} at ${formData.tripTime || 'Not set'}`;
    }

    if (formData.scheduleType === 'weekdays' && formData.scheduleMonth) {
      const [year, month] = formData.scheduleMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `All weekdays (Mon-Fri) in ${monthName} at ${formData.tripTime || 'Not set'} (${formData.tripCount || 0} trips)`;
    }

    if (formData.scheduleType === 'weekends' && formData.scheduleMonth) {
      const [year, month] = formData.scheduleMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `All weekends (Sat-Sun) in ${monthName} at ${formData.tripTime || 'Not set'} (${formData.tripCount || 0} trips)`;
    }

    return 'Not scheduled';
  };

  const getServiceIcon = () => {
    const service = services.find(s => s.id === selectedService);
    return service ? service.icon : '🚕';
  };

  const getServiceName = () => {
    const service = services.find(s => s.id === selectedService);
    return service ? service.name : 'Taxi';
  };

  if (!isOpen) return null;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Container - Full height, 50% width on desktop, full width on mobile */}
        <div
          className="relative bg-white md:rounded-xl shadow-2xl w-full md:w-1/2 h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Fixed Top Bar - Compact */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 md:rounded-t-xl">
          {/* Header Row - Compact */}
          <div className="px-4 py-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-700 transition-colors rounded-full p-1.5 bg-slate-100 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-lg font-bold text-slate-700">Book a Trip</h2>
              </div>
              <div />
            </div>
            {/* Progress Indicator - Centered, Full Width - Only show for new trips */}
            {tripMode === 'new' && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${formData.pickupLocation ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span>Pickup</span>
                <div className="flex-1 h-px bg-slate-200 max-w-[60px]" />
                <div className={`w-1.5 h-1.5 rounded-full ${formData.dropoffLocation ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span>Dropoff</span>
                <div className="flex-1 h-px bg-slate-200 max-w-[60px]" />
                <div className={`w-1.5 h-1.5 rounded-full ${isFormValid() ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span>Ready</span>
              </div>
            )}
          </div>

          {/* Toolbar Row - New/Saved Toggle */}
          <div className="flex items-center justify-center gap-3 px-4 py-2 bg-slate-50">
            {/* New/Saved Trip Toggle - Compact with Green Indicator */}
            <div className="flex bg-slate-200 rounded-md p-0.5">
              <button
                onClick={() => setTripMode('new')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                  tripMode === 'new'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-700'
                }`}
              >
                {tripMode === 'new' && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                <span>New Trip</span>
              </button>
              <button
                onClick={() => setTripMode('saved')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                  tripMode === 'saved'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-700'
                }`}
              >
                {tripMode === 'saved' && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                <span>Saved Trip</span>
              </button>
            </div>
          </div>

          {/* Service Type Tabs - Centered, Part of Fixed Area */}
          {tripMode === 'new' && (
            <div className="px-0 -mx-4 py-2 border-t border-slate-100">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all text-sm snap-start ${
                      selectedService === service.id
                        ? 'bg-yellow-400 text-slate-800 shadow-md transform -translate-y-0.5'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="mr-1.5">{service.icon}</span>
                    <span>{service.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {tripMode === 'saved' ? (
            /* Saved Trips List */
            <div className="p-4">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Select a Saved Trip</h3>
              {savedTrips.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-slate-600 mb-4">No saved trips yet</p>
                  <Button variant="outline" onClick={() => setTripMode('new')}>
                    Create New Trip
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedTrips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => handleSavedTripSelect(trip)}
                      className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border-2 border-transparent hover:border-yellow-400"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{services.find(s => s.id === trip.serviceType)?.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-700">{trip.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {(typeof trip.pickupLocation === 'string' ? trip.pickupLocation : (trip.pickupLocation?.data?.address || ''))}

                            →

                            {(typeof trip.dropoffLocation === 'string' ? trip.dropoffLocation : (trip.dropoffLocation?.data?.address || ''))}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>💰 ${trip.estimatedCost}</span>
                            <span>⏱️ {trip.estimatedDuration}</span>
                            <span>Used {trip.usageCount} times</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* New Trip Form - Service Details Section */
            <div className="p-4">



                {selectedService === 'taxi' && (
                  <CompactTaxiForm
                    formData={formData}


                    onChange={setFormData}
                    savedPlaces={savedPlaces}
                  />
                )}

                {selectedService === 'courier' && (
                  <CompactCourierForm
                    formData={formData}
                    onChange={setFormData}
                    savedPlaces={savedPlaces}
                  />
                )}

                {selectedService === 'school_run' && (
                  <CompactSchoolRunForm
                    formData={formData}
                    onChange={setFormData}
                    savedPlaces={savedPlaces}
                  />
                )}

                {selectedService === 'bulk' && (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="text-center max-w-md">
                      <div className="text-6xl mb-4">🚧</div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-3">Coming Soon!</h3>
                      <p className="text-slate-600 mb-6">
                        Bulk booking feature is currently under development. We're working hard to bring you the ability to book multiple rides at once.
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          <span className="font-semibold">Stay tuned!</span> This feature will be available soon.
                        </p>
                      </div>
                    </div>
                    {/* Keep the actual form hidden but in the code for future use */}
                    <div className="hidden">
                      <CompactBulkForm
                        formData={formData}
                        onChange={setFormData}
                        savedPlaces={savedPlaces}
                      />
                    </div>
                  </div>
                )}


                {selectedService === 'errands' && (
                  <CompactErrandsForm
                    formData={formData}
                    onChange={setFormData}
                    savedPlaces={savedPlaces}
                  />
                )}
            </div>
          )}
        </div>

        {/* Fixed Bottom Bar - Compact */}
        {tripMode === 'new' && (
          <div className="sticky bottom-0 z-20 bg-white border-t border-slate-200 px-4 py-3 md:rounded-b-xl">
            <div className="flex items-center justify-between gap-4">
              {/* Distance and Cost - Stacked */}
              <div className="flex-shrink-0">
                {(computedEstimate?.distanceKm ?? (estimate && estimate.distanceKm)) != null ? (
                  <>
                    <p className="text-xs text-slate-600">Distance</p>
                    <p className="text-lg font-semibold text-slate-700">
                      {(computedEstimate?.distanceKm ?? estimate.distanceKm).toFixed(1)} km
                    </p>
                    {(formData?.additionalStops?.length > 0 || formData?.deliveries?.length > 0) && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">
                        Includes stops
                      </span>
                    )}
                    <p className="text-xs text-slate-600 mt-1">Estimated Cost</p>
                    <p className="text-xl font-bold text-green-600">${calculateCost().toFixed(2)}</p>
                    {selectedService === 'bulk' && computedEstimate?.perTripEstimates?.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {computedEstimate.tripCount} trips: {computedEstimate.perTripEstimates.slice(0,3).map((t) => `$${((t.cost || 0)).toFixed(0)}`).join(' + ')}
                        {computedEstimate.tripCount > 3 ? ' + …' : ''} = ${calculateCost().toFixed(0)}
                      </p>
                    )}


                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-600">Estimated Cost</p>
                    <p className="text-xl font-bold text-slate-700">${calculateCost().toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">Distance calculating...</p>
                  </>
                )}
              </div>
              <div className="flex gap-2 flex-1 max-w-md">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(true)}
                  disabled={!isFormValid()}
                  className="flex-1"
                >
                  📅 Schedule
                </Button>
                <Button
                  variant="primary"
                  onClick={handleShowConfirmation}
                  disabled={!isFormValid()}
                  loading={loading}
                  className="flex-1"
                >
                  ⚡ Book Now
                </Button>
              </div>
            </div>
            {(computedEstimate?.durationMinutes ?? (estimate && estimate.durationMinutes)) != null && (
              <div className="text-xs text-slate-500 text-center mt-1">
                <span>Estimated time: {(computedEstimate?.durationMinutes ?? estimate.durationMinutes)} min</span>
                {(computedEstimate?.durationMinutes ?? estimate.durationMinutes) != null && (
                  <span>{' '}• ETA: {(computedEstimate?.durationMinutes ?? estimate.durationMinutes)} min</span>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 text-center mt-2">
              Final fare calculated based on actual distance
            </p>
          </div>
        )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowConfirmationModal(false)}
        />

        {/* Confirmation Modal Container */}
        <div
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getServiceIcon()}</span>
                <h2 className="text-xl font-bold text-slate-800">Confirm Your Booking</h2>
              </div>
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
            <div className="space-y-4">
              {/* Service Type */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Service Type</p>
                <p className="text-lg font-semibold text-slate-800">{getServiceName()}</p>
              </div>

              {/* Locations */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">📍 Pickup Location</p>
                  <p className="text-sm text-slate-700">{getLocationAddress(formData.pickupLocation)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">📍 Dropoff Location</p>
                  <p className="text-sm text-slate-700">{getLocationAddress(formData.dropoffLocation)}</p>
                </div>
              </div>

              {/* Additional Stops (Taxi) */}
              {selectedService === 'taxi' && formData.additionalStops && formData.additionalStops.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">🛑 Additional Stops</p>
                  <div className="space-y-1">
                    {formData.additionalStops.map((stop, index) => (
                      <p key={index} className="text-sm text-slate-700 pl-4">
                        {index + 1}. {getLocationAddress(stop.location || stop)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Deliveries (Courier) */}
              {selectedService === 'courier' && formData.additionalDeliveries && formData.additionalDeliveries.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">📦 Additional Deliveries</p>
                  <div className="space-y-2">
                    {formData.additionalDeliveries.map((delivery, index) => (
                      <div key={index} className="text-sm text-slate-700 pl-4 border-l-2 border-blue-300">
                        <p className="font-medium">{index + 1}. {getLocationAddress(delivery.location)}</p>
                        {delivery.recipientName && <p className="text-xs">Recipient: {delivery.recipientName}</p>}
                        {delivery.recipientPhone && <p className="text-xs">Phone: {delivery.recipientPhone}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks (Errands) */}
              {selectedService === 'errands' && formData.tasks && formData.tasks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">🛍️ Tasks</p>
                  <div className="space-y-1">
                    {formData.tasks.map((task, index) => (
                      <div key={index} className="text-sm text-slate-700 pl-4">
                        <p className="font-medium">{index + 1}. {task.description || task}</p>
                        {task.location && <p className="text-xs text-slate-500">Location: {getLocationAddress(task.location)}</p>}
                      </div>
                    ))}
                  </div>
                  {formData.returnToStart && (
                    <p className="text-xs text-blue-600 mt-2 pl-4">↩️ Return to starting point</p>
                  )}
                </div>
              )}

              {/* Schedule */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">⏰ Schedule</p>
                <p className="text-sm font-medium text-blue-900 mb-2">{getScheduleDisplay()}</p>

                {/* Show all dates for specific dates recurring rides */}
                {formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs font-semibold text-blue-700 mb-2">All Scheduled Dates:</p>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {formData.selectedDates.map((date, index) => (
                        <div key={index} className="text-xs bg-white rounded px-2 py-1 text-blue-800">
                          {new Date(date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show trip count for weekdays/weekends */}
                {(formData.scheduleType === 'weekdays' || formData.scheduleType === 'weekends') && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-700">
                      <span className="font-semibold">Total Rides:</span> {formData.tripCount || 0} trips
                    </p>
                  </div>
                )}
              </div>

              {/* Service-Specific Details */}
              <div className="grid grid-cols-2 gap-3">
                {(selectedService === 'taxi' || selectedService === 'school_run') && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">👥 Passengers</p>
                    <p className="text-sm text-slate-700">{formData.passengers || 1}</p>
                  </div>
                )}

                {selectedService === 'courier' && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">📦 Package Size</p>
                      <p className="text-sm text-slate-700 capitalize">{(formData.packages && formData.packages[0]?.packageSize) || 'Small'}</p>
                    </div>
                    {formData.packageDetails && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Package Details</p>
                        <p className="text-sm text-slate-700">{formData.packageDetails}</p>
                      </div>
                    )}
                    {formData.recipientName && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Recipient</p>
                        <p className="text-sm text-slate-700">{formData.recipientName}</p>
                      </div>
                    )}
                    {formData.recipientPhone && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Recipient Phone</p>
                        <p className="text-sm text-slate-700">{formData.recipientPhone}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedService === 'school_run' && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Direction</p>
                      <p className="text-sm text-slate-700 capitalize">{formData.tripDirection || 'One-way'}</p>
                    </div>
                    {formData.passengerName && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Passenger Name</p>
                        <p className="text-sm text-slate-700">{formData.passengerName}</p>
                      </div>
                    )}
                    {formData.contactNumber && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Contact Number</p>
                        <p className="text-sm text-slate-700">{formData.contactNumber}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Estimate Details */}
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-green-700 uppercase mb-2">💰 Estimate</p>
                <div className="grid grid-cols-3 gap-3">
                  {(computedEstimate?.distanceKm ?? estimate?.distanceKm) != null && (
                    <div>
                      <p className="text-xs text-green-600">Distance</p>
                      <p className="text-lg font-bold text-green-800">
                        {(computedEstimate?.distanceKm ?? estimate.distanceKm).toFixed(1)} km
                      </p>
                    </div>
                  )}
                  {(computedEstimate?.durationMinutes ?? estimate?.durationMinutes) != null && (
                    <div>
                      <p className="text-xs text-green-600">Duration</p>
                      <p className="text-lg font-bold text-green-800">
                        {Math.round(computedEstimate?.durationMinutes ?? estimate.durationMinutes)} min
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-green-600">Estimated Cost</p>
                    <p className="text-2xl font-bold text-green-800">${calculateCost().toFixed(2)}</p>
                  </div>
                {selectedService === 'bulk' && computedEstimate?.perTripEstimates?.length > 0 && (
                  <div className="text-[11px] text-green-700 mt-1">
                    {computedEstimate.tripCount} trips: {computedEstimate.perTripEstimates.slice(0,3).map((t) => `$${((t.cost || 0)).toFixed(0)}`).join(' + ')}
                    {computedEstimate.tripCount > 3 ? ' + …' : ''} = ${calculateCost().toFixed(0)}
                  </div>
                )}

                </div>
                <p className="text-xs text-green-600 mt-2">
                  * Final fare calculated based on actual distance
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">💳 Payment Method</p>
                <p className="text-sm text-slate-700 capitalize">{formData.paymentMethod || 'Cash'}</p>
              </div>

              {/* Special Instructions */}
              {formData.specialInstructions && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">📝 Special Instructions</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded p-3">{formData.specialInstructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmationModal(false)}
                className="flex-1"
              >
                ← Go Back
              </Button>
              <Button
                variant="primary"
                onClick={handleBooking}
                loading={loading}
                className="flex-1"
              >
                ✓ Confirm & Book
              </Button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={handleScheduleConfirm}
        initialData={{
          scheduleType: formData.scheduleType,
          selectedDates: formData.selectedDates,
          scheduleMonth: formData.scheduleMonth,
          tripTime: formData.tripTime,
          tripCount: formData.tripCount
        }}
      />
    </>
  );
};

export default UnifiedBookingModal;

