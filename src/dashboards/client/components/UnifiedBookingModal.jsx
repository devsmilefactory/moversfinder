import React, { useState, useEffect } from 'react';

import Button from '../../shared/Button';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import CompactTaxiForm from './CompactTaxiForm';
import CompactCourierForm from './CompactCourierForm';
import CompactSchoolRunForm from './CompactSchoolRunForm';
import CompactErrandsForm from './CompactErrandsForm';
import CompactBulkForm from './CompactBulkForm';
import ScheduleModal from './ScheduleModal';
import { useAuthStore, useSavedPlacesStore } from '../../../stores';
import { supabase } from '../../../lib/supabase';
import { broadcastRideToDrivers } from '../../../utils/driverMatching';
import { createRecurringSeries } from '../../../services/recurringTripService';
import {
  calculateRecurrenceDays,
  calculateTotalTrips,
  calculateStartDate,
  calculateEndDate
} from '../../../utils/recurringSeriesHelpers';
import { prepareErrandTasksForInsert } from '../../../utils/errandTasks';
import { formatPrice } from '../../../utils/formatters';
import { isRoundTripRide } from '../../../utils/rideCostDisplay';
import { enforceInstantOnly, FEATURE_FLAGS } from '../../../config/featureFlags';
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
import { calculateReturnTime } from '../../../utils/roundTripHelpers';
import { getRideCostDisplay } from '../../../utils/rideCostDisplay';
import { addCostsToTasks } from '../../../utils/errandCostHelpers';
import {
  getTaskAddressValue,
  getTaskCoordinatesValue,
  estimateErrandTask
} from '../../../utils/errandTasks';

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
  const [scheduleType, setScheduleType] = useState('specific_dates'); // 'specific_dates', 'weekdays', 'weekends'
  const [selectedService, setSelectedService] = useState(defaultServiceType);
  const [selectedSavedTrip, setSelectedSavedTrip] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);


  // Form data - comprehensive for all service types
  const [formData, setFormData] = useState({
    // Scheduling
    scheduleType: 'specific_dates', // 'specific_dates', 'weekdays', 'weekends'
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
  // Derived cost and stats for errands (sum of each task priced as a taxi ride)
  const [errandsTasksCost, setErrandsTasksCost] = useState(0);
  const [errandsTasksSummary, setErrandsTasksSummary] = useState(null);
  const [totalCost, setTotalCost] = useState(0);
  const [fareBreakdown, setFareBreakdown] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (selectedService !== 'errands' || !formData?.tasks?.length) {
      setErrandsTasksCost(0);
      setErrandsTasksSummary(null);
      return () => { cancelled = true; };
    }

    const compute = async () => {
      try {
        const stats = await Promise.all(
          formData.tasks.map(async (task, index) => {
            const title = task?.description || `Task ${index + 1}`;
            const estimate = await estimateErrandTask({
              startPoint: task?.startPoint,
              destinationPoint: task?.destinationPoint
            });
            return {
              index,
              title,
              distanceKm: estimate.distanceKm,
              durationMinutes: estimate.durationMinutes,
              cost: estimate.cost
            };
          })
        );

        if (cancelled) return;

        const totalCost = stats.reduce((sum, task) => sum + (task.cost || 0), 0);
        const totalDistance = stats.reduce((sum, task) => sum + (task.distanceKm || 0), 0);
        const totalDuration = stats.reduce((sum, task) => sum + (task.durationMinutes || 0), 0);

        setErrandsTasksCost(Math.round(totalCost * 100) / 100);
        setErrandsTasksSummary({
          totalTasks: formData.tasks.length,
          totalDistanceKm: Math.round(totalDistance * 10) / 10,
          totalDurationMinutes: Math.max(0, Math.round(totalDuration)),
          perTask: stats
        });
      } catch (e) {
        console.warn('Errands pricing compute failed:', e);
        if (!cancelled) {
          setErrandsTasksCost(0);
          setErrandsTasksSummary(null);
        }
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

            const segCost = segKm ? ((await calculateEstimatedFareV2({ distanceKm: segKm })) ?? 0) : 0;
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
        setScheduleType(initialData.scheduleType || 'specific_dates');
        setSelectedSavedTrip(null);

        // Pre-fill form with initialData
        setFormData({
          scheduleType: initialData.scheduleType || 'specific_dates',
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
        setScheduleType('specific_dates');
        setSelectedSavedTrip(null);
        setFormData({
          scheduleType: 'specific_dates',
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








  const roundToNearestHalfDollar = (amount) => {
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
  };

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

  // Calculate total cost and fare breakdown in realtime
  useEffect(() => {
    let aborted = false;
    
    const computeCost = async () => {
      const numberOfTrips = formData.numberOfTrips || 1;
      let cost = 0;
      let breakdown = null;

      try {
        if (selectedService === 'bulk') {
          if (computedEstimate && computedEstimate.cost != null) {
            cost = roundToNearestHalfDollar(computedEstimate.cost);
          }
        } else if (selectedService === 'errands' && formData.tasks && formData.tasks.length > 0) {
          const singleTripTaskPrice = errandsTasksCost;
          cost = roundToNearestHalfDollar(singleTripTaskPrice * numberOfTrips);
        } else if (selectedService === 'courier' && formData.packages && formData.packages.length > 0) {
          const singleTripPackagePrice = await calculateMultiPackageFare(formData.packages);
          cost = roundToNearestHalfDollar(singleTripPackagePrice * numberOfTrips);
        } else {
          const distanceKmForPrice = (computedEstimate && computedEstimate.distanceKm)
            ? computedEstimate.distanceKm
            : (estimate && estimate.distanceKm ? estimate.distanceKm : null);

          if (distanceKmForPrice != null && distanceKmForPrice > 0) {
            let singleTripFare;
            if ((selectedService === 'taxi' || selectedService === 'school_run') && formData.isRoundTrip) {
              singleTripFare = (await calculateRoundTripFare({ distanceKm: distanceKmForPrice })) ?? 0;
            } else {
              singleTripFare = (await calculateEstimatedFareV2({ distanceKm: distanceKmForPrice })) ?? 0;
            }
            cost = roundToNearestHalfDollar(singleTripFare * numberOfTrips);
          }
        }

        if (!aborted) {
          setTotalCost(cost);
          setFareBreakdown(breakdown);
        }
      } catch (error) {
        console.warn('Realtime cost calculation failed:', error);
      }
    };

    computeCost();
    return () => { aborted = true; };
  }, [selectedService, formData.numberOfTrips, formData.isRoundTrip, formData.packages, formData.tasks, errandsTasksCost, computedEstimate, estimate]);

  // Keep calculateCost for UI parts that still call it, but return the state
  const calculateCost = () => totalCost;


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
               !!formData.tripTime;

      case 'errands': {
        const tasks = Array.isArray(formData.tasks) ? formData.tasks : [];
        if (tasks.length === 0) return false;
        return tasks.every(
          (task) =>
            task &&
            task.startPoint &&
            task.destinationPoint
        );
      }

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
      let finalFareBreakdown = null;
      
      // Variables for errand-specific fields
      let errandTasksJSON = null;
      let errandTasksCount = 0;

      if (selectedService === 'taxi' && finalDistanceKm && finalDistanceKm > 0) {
        const taxiFare = await calculateTaxiFare({
          distanceKm: finalDistanceKm,
          isRoundTrip: formData.isRoundTrip,
          numberOfDates: formData.numberOfTrips || 1
        });
        if (taxiFare) {
          finalCost = roundToNearestHalfDollar(taxiFare.totalFare);
          finalFareBreakdown = taxiFare.breakdown;
        }
      } else if (selectedService === 'courier' && finalDistanceKm && finalDistanceKm > 0) {
        const courierFare = await calculateCourierFare({
          distanceKm: finalDistanceKm,
          vehicleType: formData.vehicleType || 'sedan',
          packageSize: formData.packages?.[0]?.packageSize || 'medium',
          isRecurring: false,
          numberOfDates: formData.numberOfTrips || 1
        });
        if (courierFare) {
          finalCost = roundToNearestHalfDollar(courierFare.totalFare);
          finalFareBreakdown = courierFare.breakdown;
        }
      } else if (selectedService === 'school_run' && finalDistanceKm && finalDistanceKm > 0) {
        const schoolFare = await calculateSchoolRunFare({
          distanceKm: finalDistanceKm,
          isRoundTrip: formData.isRoundTrip,
          numberOfDates: formData.numberOfTrips || 1
        });
        if (schoolFare) {
          finalCost = roundToNearestHalfDollar(schoolFare.totalFare);
          finalFareBreakdown = schoolFare.breakdown;
        }
      } else if (selectedService === 'errands' && formData.tasks && formData.tasks.length > 0) {
        const errandsFare = await calculateErrandsFare({
          errands: formData.tasks,
          numberOfDates: formData.numberOfTrips || 1
        });
        if (errandsFare) {
          finalCost = roundToNearestHalfDollar(errandsFare.totalFare);
          finalFareBreakdown = errandsFare.breakdown;
          
          // Use individual task estimates from the calculated fare
          const normalizedTasks = prepareErrandTasksForInsert(formData.tasks);
          const tasksWithCosts = normalizedTasks.map((task, idx) => {
            const calculatedCost = errandsFare.errandCosts?.[idx]?.fare || 0;
            const calculatedDistance = errandsFare.errandCosts?.[idx]?.distanceKm || 0;
            return {
              ...task,
              cost: calculatedCost,
              distanceKm: calculatedDistance
            };
          });

          // Update final distance/duration
          finalDistanceKm = errandsFare.errandCosts?.reduce((sum, e) => sum + (e.distanceKm || 0), 0) || finalDistanceKm;
          // Duration is not explicitly in errandCosts, so keep what we have or estimate from distance
          if (finalDistanceKm && (!finalDurationMin || finalDurationMin <= 0)) {
            finalDurationMin = Math.round((finalDistanceKm / 35) * 60);
          }

          // Prepare errand specific data
          errandTasksJSON = JSON.stringify(tasksWithCosts);
          errandTasksCount = tasksWithCosts.length;
        }
      } else if (finalDistanceKm && finalDistanceKm > 0) {
        // Fallback to simple calculation
        const estimatedFare = await calculateEstimatedFareV2({ distanceKm: finalDistanceKm });
        finalCost = roundToNearestHalfDollar(estimatedFare ?? 0);
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

      // For errands, use the first task's pickup and last task's dropoff as the main ride's summary locations
      let mainPickupAddress = formData.pickupLocation?.data?.address || formData.pickupLocation;
      let mainDropoffAddress = formData.dropoffLocation?.data?.address || formData.dropoffLocation;

      if (selectedService === 'errands' && Array.isArray(formData.tasks) && formData.tasks.length > 0) {
        const firstTask = formData.tasks[0];
        const lastTask = formData.tasks[formData.tasks.length - 1];
        
        const resolveAddr = (loc) => {
          if (!loc) return '';
          if (typeof loc === 'string') return loc;
          return loc.data?.address || loc.address || loc.data?.name || loc.name || '';
        };

        mainPickupAddress = resolveAddr(firstTask.startPoint) || mainPickupAddress;
        mainDropoffAddress = resolveAddr(lastTask.destinationPoint) || mainDropoffAddress;
        
        if (!pickupGeo) {
          const firstTaskCoords = firstTask.startPoint?.data?.coordinates || firstTask.startPoint?.coordinates;
          if (firstTaskCoords) pickupGeo = toGeoJSON(firstTaskCoords);
        }
        if (!dropoffGeo) {
          const lastTaskCoords = lastTask.destinationPoint?.data?.coordinates || lastTask.destinationPoint?.coordinates;
          if (lastTaskCoords) dropoffGeo = toGeoJSON(lastTaskCoords);
        }
      }

      // Guard: if pickup and dropoff end up identical but addresses differ, try alternate candidate for pickup
      if (pickupGeo && dropoffGeo && JSON.stringify(pickupGeo) === JSON.stringify(dropoffGeo)) {
        if (pickupCandidateB && JSON.stringify(pickupCandidateB) !== JSON.stringify(dropoffGeo)) {
          pickupGeo = pickupCandidateB;
        } else if (pickupCandidateA && JSON.stringify(pickupCandidateA) !== JSON.stringify(dropoffCandidateB || dropoffGeo)) {
          pickupGeo = pickupCandidateA;
        }
      }

      const scheduleType = formData.scheduleType || 'specific_dates';
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

      // Force instant-only mode if feature flags disable scheduled/recurring
      let rideTiming = hasSpecificSchedule
        ? (isRecurringPattern ? 'scheduled_recurring' : 'scheduled_single')
        : 'instant';
      
      // Enforce instant-only mode (scheduled/recurring disabled)
      rideTiming = enforceInstantOnly(rideTiming);

      const bookingData = {
        // User and service info
        user_id: user.id,
        service_type: selectedService === 'bulk' ? 'taxi' : selectedService,

        // Ride timing and type
        ride_timing: rideTiming,
        ride_type: selectedService === 'bulk' ? 'taxi' : selectedService,
        booking_source: 'individual',

        // Location data (standardized columns)
        pickup_location: mainPickupAddress,
        pickup_coordinates: pickupGeo,
        dropoff_location: mainDropoffAddress,
        dropoff_coordinates: dropoffGeo,
        // (Optionally keep legacy address fields for compatibility)
        pickup_address: mainPickupAddress,
        dropoff_address: mainDropoffAddress,

        // Vehicle / passengers
        vehicle_type: formData.vehicleType || 'sedan',

        // Distance and duration (prefer computed with stops when available)
        distance_km: finalDistanceKm ?? null,
        estimated_duration_minutes: finalDurationMin ?? null,

        // Scheduling - combine date and time properly
        scheduled_datetime: (() => {
          if (!hasSpecificSchedule) return null;

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
        })(),

        // Recurrence pattern for recurring rides
        recurrence_pattern: rideTiming === 'scheduled_recurring'
          ? (
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
            )
          : null,

        // Ride series info
        total_rides_in_series: derivedNumberOfTrips,
        completed_rides_count: 0,
        remaining_rides_count: derivedNumberOfTrips,

        // Number of trips (for recurring bookings and price calculation)
        number_of_trips: derivedNumberOfTrips,

        // Status fields
        acceptance_status: 'pending',
        ride_status: 'pending',
        status_updated_at: new Date().toISOString(),

        // Payment and cost
        payment_method: formData.paymentMethod,
        estimated_cost: finalCost,
        payment_status: 'pending',
        
        // Fare breakdown for transparency
        fare_breakdown: finalFareBreakdown ? JSON.stringify(finalFareBreakdown) : null,

        // Service-specific data mapping
        special_requests: formData.specialInstructions || null,
        number_of_passengers: formData.passengers || 1,
        
        // For errands: store number of tasks + normalized metadata with costs
        ...(selectedService === 'errands' && errandTasksJSON
          ? {
              number_of_tasks: errandTasksCount,
              errand_tasks: errandTasksJSON,
              completed_tasks_count: 0,
              remaining_tasks_count: errandTasksCount,
              active_errand_task_index: 0
            }
          : {}),

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

        // School run-specific fields
        ...(selectedService === 'school_run' && {
          passenger_name: formData.passengerName || null,
          contact_number: formData.contactNumber || null,
          is_round_trip: formData.isRoundTrip || false
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

      const segCost = segDistanceKm ? ((await calculateEstimatedFareV2({ distanceKm: segDistanceKm })) ?? 0) : 0;

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

      if (isRecurring && selectedService !== 'errands') {
        // Handle recurring rides - create series using NEW system
        console.log('📅 Creating recurring ride series...');

        // Map frontend pattern type to database-compatible value
        // Database expects: 'daily', 'weekly', 'weekdays', 'weekends', 'custom'
        // Frontend uses: 'specific_dates', 'weekdays', 'weekends'
        const patternType = bookingData.recurrence_pattern.type;
        const dbRecurrencePattern = patternType === 'specific_dates' ? 'custom' : patternType;

        // Build series data from booking data
        const seriesData = {
          userId: user.id,
          seriesName: `${selectedService} - ${bookingData.pickup_address} to ${bookingData.dropoff_address}`,
          recurrencePattern: dbRecurrencePattern, // ✅ Now maps 'specific_dates' → 'custom'
          recurrenceDays: calculateRecurrenceDays(bookingData.recurrence_pattern),
          pickupAddress: bookingData.pickup_address,
          pickupCoordinates: bookingData.pickup_coordinates,
          dropoffAddress: bookingData.dropoff_address,
          dropoffCoordinates: bookingData.dropoff_coordinates,
          serviceType: bookingData.service_type,
          estimatedCost: bookingData.estimated_cost,
          startDate: calculateStartDate(bookingData.recurrence_pattern),
          endDate: calculateEndDate(bookingData.recurrence_pattern),
          tripTime: bookingData.recurrence_pattern.time || '08:00:00',
          totalTrips: calculateTotalTrips(bookingData.recurrence_pattern)
        };

        const seriesResult = await createRecurringSeries(seriesData);

        if (!seriesResult.success) {
          console.error('Error creating recurring series:', seriesResult.error);
          alert('❌ Failed to create recurring ride series. Please try again.');
          setLoading(false);
          return;
        }

        console.log(`✅ Created recurring series with ${seriesData.totalTrips} trips`);
        alert(`🎉 Success! Your recurring ride series with ${seriesData.totalTrips} trips has been created.`);

        setLoading(false);

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess({ 
            series: seriesResult.data.series, 
            firstRide: seriesResult.data.firstRide,
            isRecurring: true 
          });
        }

        onClose();

      } else {
        // Handle single ride (instant or scheduled_single)
        
        // Check if this is a round trip - need to create both legs
        const isRoundTrip = bookingData.is_round_trip;
        
        if (isRoundTrip) {
          // Calculate costs for each leg using our utility
          // For round trips, the estimated_cost should already be the total for both legs
          const totalCost = parseFloat(bookingData.estimated_cost) || 0;
          const outboundCost = totalCost / 2;
          const returnCost = totalCost / 2;
          
          // Calculate return time (default to 1 hour after outbound if not specified)
          const outboundTime = bookingData.scheduled_datetime || new Date().toISOString();
          const estimatedDuration = bookingData.estimated_duration_minutes || 30;
          const returnTime = calculateReturnTime(outboundTime, estimatedDuration, 30);
          
          // Create outbound leg
          const outboundLeg = {
            ...bookingData,
            trip_leg_type: 'outbound',
            round_trip_occurrence_number: 1,
            round_trip_leg_number: 1,
            outbound_cost: outboundCost,
            return_cost: returnCost,
            active_leg: 'outbound',
            estimated_cost: outboundCost // Cost for this leg
          };
          
          // Create return leg (swap pickup/dropoff)
          const returnLeg = {
            ...bookingData,
            trip_leg_type: 'return',
            round_trip_occurrence_number: 1,
            round_trip_leg_number: 2,
            outbound_cost: outboundCost,
            return_cost: returnCost,
            active_leg: null, // Return leg starts inactive
            estimated_cost: returnCost, // Cost for this leg
            scheduled_datetime: returnTime ? returnTime.toISOString() : null,
            // Swap locations for return
            pickup_location: bookingData.dropoff_location,
            pickup_address: bookingData.dropoff_address,
            pickup_coordinates: bookingData.dropoff_coordinates,
            dropoff_location: bookingData.pickup_location,
            dropoff_address: bookingData.pickup_address,
            dropoff_coordinates: bookingData.pickup_coordinates
          };
          
          // Insert both legs
          const { data: rides, error } = await supabase
            .from('rides')
            .insert([outboundLeg, returnLeg])
            .select();

          if (error) {
            console.error('Error creating round trip rides:', error);
            alert('❌ Failed to book round trip. Please try again.');
            setLoading(false);
            return;
          }

          console.log('✅ Round trip created successfully:', rides);

          // For instant rides, broadcast outbound leg to nearby drivers
          const outboundRide = rides[0];
          if (outboundRide.ride_timing === 'instant' && outboundRide.pickup_coordinates) {
            const pickupLatLng = fromGeoJSON(outboundRide.pickup_coordinates) || null;
            const broadcastResult = await broadcastRideToDrivers(
              outboundRide.id,
              pickupLatLng,
              5 // 5km radius
            );

            if (broadcastResult.success && broadcastResult.driversNotified > 0) {
              console.log(`✅ Round trip broadcast to ${broadcastResult.driversNotified} drivers`);
              alert(`🎉 Round trip booked successfully! ${broadcastResult.driversNotified} nearby driver(s) have been notified.`);
            } else {
              console.log('⚠️ No nearby drivers found');
              alert('🎉 Round trip booked successfully! We\'ll notify you when a driver becomes available.');
            }
          } else {
            alert('🎉 Round trip booked successfully! A driver will be assigned shortly.');
          }

          setLoading(false);

          // Call onSuccess callback if provided
          if (onSuccess) {
            onSuccess({ rides, isRoundTrip: true, isRecurring: false });
          }

          onClose();
        } else {
          // Regular single ride (not round trip)
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
      }





  };

  // Format date display
  const getDateDisplay = () => {
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
              {/* New/Saved Trip Switch Toggle */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium transition-colors ${tripMode === 'new' ? 'text-slate-700' : 'text-slate-400'}`}>
                  New Trip
                </span>
                <ToggleSwitch
                  checked={tripMode === 'saved'}
                  onChange={(checked) => setTripMode(checked ? 'saved' : 'new')}
                  size="md"
                />
                <span className={`text-xs font-medium transition-colors ${tripMode === 'saved' ? 'text-slate-700' : 'text-slate-400'}`}>
                  Saved Trip
                </span>
              </div>
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

          {/* Service Type Tabs - Centered, Part of Fixed Area */}
          {tripMode === 'new' && (
            <div className="px-0 -mx-4 py-2 border-t border-slate-150 bg-slate-150">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`relative flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all text-sm snap-start ${
                      selectedService === service.id
                        ? 'bg-slate-150 text-slate-800 border-b-2 border-yellow-400'
                        : 'bg-slate-150 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="mr-1.5">{service.icon}</span>
                    <span>{service.name}</span>
                    {selectedService === service.id && (
                      <>
                        <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-slate-150">
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
                      className="w-full text-left p-4 bg-slate-150 hover:bg-slate-200 rounded-lg transition-all border-2 border-transparent hover:border-yellow-400"
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
                    taskEstimates={errandsTasksSummary}
                    taskTotalCost={errandsTasksCost}
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
                    <p className="text-xl font-bold text-green-600">{formatPrice(calculateCost())}</p>
                    {selectedService === 'bulk' && computedEstimate?.perTripEstimates?.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {computedEstimate.tripCount} trips: {computedEstimate.perTripEstimates.slice(0,3).map((t) => `$${((t.cost || 0)).toFixed(0)}`).join(' + ')}
                        {computedEstimate.tripCount > 3 ? ' + …' : ''} = ${calculateCost().toFixed(0)}
                      </p>
                    )}
                    {selectedService === 'errands' && errandsTasksSummary && (
                      <div className="mt-3 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs text-purple-800">
                        <p className="font-semibold text-purple-900">
                          {errandsTasksSummary.totalTasks} task{errandsTasksSummary.totalTasks === 1 ? '' : 's'} planned
                        </p>
                        <p className="mt-0.5">
                          {Number(errandsTasksSummary.totalDistanceKm ?? 0).toFixed(1)} km combined • {errandsTasksSummary.totalDurationMinutes ?? 0} min est.
                        </p>
                        <p className="text-[11px] text-purple-600 mt-1">
                          Task pricing auto-updates as you edit routes.
                        </p>
                      </div>
                    )}


                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-600">Estimated Cost</p>
                    <p className="text-xl font-bold text-slate-700">{formatPrice(calculateCost())}</p>
                    <p className="text-xs text-slate-500 mt-1">Distance calculating...</p>
                  </>
                )}
              </div>
              <div className="flex gap-2 flex-1 max-w-md">
                {/* Hide Schedule button when scheduled/recurring rides are disabled */}
                {FEATURE_FLAGS.SCHEDULED_RIDES_ENABLED && (
                  <Button
                    variant="outline"
                    onClick={() => setShowScheduleModal(true)}
                    disabled={!isFormValid()}
                    className="flex-1"
                  >
                    📅 Schedule
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleShowConfirmation}
                  disabled={!isFormValid()}
                  loading={loading}
                  className={FEATURE_FLAGS.SCHEDULED_RIDES_ENABLED ? "flex-1" : "flex-1 w-full"}
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
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-150">
            <div className="space-y-4">
              {/* Service Type */}
              <div className="bg-slate-150 rounded-lg p-4">
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
                  {errandsTasksSummary && (
                    <p className="text-xs text-slate-500 mb-2">
                      {errandsTasksSummary.totalTasks} task{errandsTasksSummary.totalTasks === 1 ? '' : 's'} •{' '}
                      {Number(errandsTasksSummary.totalDistanceKm ?? 0).toFixed(1)} km combined •{' '}
                      {errandsTasksSummary.totalDurationMinutes ?? 0} min estimated
                    </p>
                  )}
                  <div className="space-y-2">
                    {formData.tasks.map((task, index) => {
                      const pickup = getTaskAddressValue(task?.startPoint);
                      const dropoff = getTaskAddressValue(task?.destinationPoint);
                      const summary = errandsTasksSummary?.perTask?.[index];
                      return (
                        <div key={index} className="text-sm text-slate-700 pl-4 border-l-2 border-purple-200">
                          <p className="font-medium">{index + 1}. {task.description || `Task ${index + 1}`}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Pickup: {pickup || 'Not set'}</p>
                          <p className="text-xs text-slate-500">Drop-off: {dropoff || 'Not set'}</p>
                          {summary && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              ≈ {Number(summary.distanceKm ?? 0).toFixed(1)} km • {summary.durationMinutes ?? 0} min • {formatPrice(summary.cost)}
                            </p>
                          )}
                        </div>
                      );
                    })}
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
                    <p className="text-2xl font-bold text-green-800">{formatPrice(calculateCost())}</p>
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
                  <p className="text-sm text-slate-700 bg-slate-150 rounded p-3">{formData.specialInstructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-200 rounded-b-xl">
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

