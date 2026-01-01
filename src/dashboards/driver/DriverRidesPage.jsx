/**
 * DriverRidesPage - Main Container Component
 * 
 * Unified driver rides feed with single source of truth for data fetching.
 * Replaces the old DriverRidesHub with a clean, non-blocking architecture.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';
import { useToast } from '../../components/ui/ToastProvider';
import { supabase } from '../../lib/supabase';
import { getCurrentLocation, toGeoJSON, fromGeoJSON } from '../../utils/locationServices';
import { formatDistance } from '../../utils/formatters';
import { formatPrice } from '../../utils/pricingCalculator';
import { getRecurringMeta } from '../../utils/rideSeries';
import { summarizeErrandTasks, describeTaskState } from '../../utils/errandTasks';

// Hooks
import { useDriverRidesFeed } from '../../hooks/useDriverRidesFeed';
import { useActiveRideCheck } from '../../hooks/useActiveRideCheck';
import { useNewRidesSubscription } from '../../hooks/useNewRidesSubscription';
import { useCancelRide } from '../../hooks/useCancelRide';
import { RIDE_STATUSES, getRideStatusCategory } from '../../hooks/useRideStatus';

// Components
import RidesTabs from './components/RidesTabs';
import RideFiltersBar from './components/RideFiltersBar';
import RideList from './components/RideList';
import ActiveRideToast from './components/ActiveRideToast';
import ScheduledAlertToast from './components/ScheduledAlertToast';
import NewAvailableRidesToast from './components/NewAvailableRidesToast';
import Button from '../../components/ui/Button';

// Preserved components
import RefactoredActiveRideOverlay from './components/activeRide/RefactoredActiveRideOverlay';
import DriverRideDetailsModal from './components/DriverRideDetailsModal';
import CancelRideModal from './components/CancelRideModal';
import PlaceBidModal from './components/PlaceBidModal';
import RatingModal from './components/RatingModal';

import {
  Car as CarIcon,
  Package,
  GraduationCap,
  ShoppingBag,
  MapPin as MapPinIcon,
  Flag,
  Navigation,
  Ruler,
  Wallet
} from 'lucide-react';
import { activateScheduledRide } from '../../services/driverRidesApi';
import { useDriverPostRideFlow } from '../../hooks/useDriverPostRideFlow';

const DriverRidesPage = ({ onUiStateChange }) => {
  const { user } = useAuthStore();
  const { activeProfile, refreshProfiles, loadProfileData } = useProfileStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Driver state
  const [isOnline, setIsOnline] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationCity, setLocationCity] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  // Initialize hooks
  const feedHook = useDriverRidesFeed(user?.id);
  const {
    activeTab,
    rideTypeFilter,
    scheduleFilter,
    page,
    totalPages,
    rides,
    isLoading: feedIsLoading,
    changeTab,
    changeRideTypeFilter,
    changeScheduleFilter,
    changePage,
    removeRideFromCurrentList,
    refreshCurrentTab
  } = feedHook;

  const activeRideHook = useActiveRideCheck(user?.id);
  const {
    activeInstantRide,
    scheduledAlerts,
    showActiveRideModal,
    dismissActiveRideToast,
    dismissActiveRideModal,
    clearScheduledAlerts,
    updateActiveRide,
    runPriorityChecks
  } = activeRideHook;

  const newRidesHook = useNewRidesSubscription(user?.id, activeTab, isOnline);
  const { hasNewRides, newRidesCount, updateLastFetch, resetNewRides } = newRidesHook;

  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  const { cancelRide } = useCancelRide();
  const postRide = useDriverPostRideFlow({
    refreshFeed: feedHook.refreshCurrentTab,
    changeTab: feedHook.changeTab,
  });

  // Ride counts for tabs
  const [rideCounts] = useState({
    available: 0,
    bid: 0,
    active: 0,
    completed: 0
  });

  // Load driver status on mount
  useEffect(() => {
    if (user?.id) {
      loadDriverStatus();
    }
  }, [user?.id]);

  // Update last fetch timestamp when Available tab loads
  useEffect(() => {
    if (activeTab === 'AVAILABLE' && !feedIsLoading) {
      updateLastFetch();
    }
  }, [activeTab, feedIsLoading, updateLastFetch]);

  // Real-time subscription for ride status changes - automatically refresh and transition tabs
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`driver-ride-status-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          const updatedRide = payload.new;
          const oldRide = payload.old;
          const newStatus = updatedRide.ride_status;
          const oldStatus = oldRide?.ride_status;

          // Only process if status actually changed
          if (newStatus !== oldStatus) {
            console.log('🔄 Driver ride status changed:', {
              rideId: updatedRide.id,
              oldStatus,
              newStatus
            });

            let targetTab = activeTab;
            const statusCategory = getRideStatusCategory(newStatus);

            if (statusCategory === 'completed') {
              targetTab = 'COMPLETED';
            } else if (statusCategory === 'active') {
              targetTab = 'ACTIVE';
            } else if (statusCategory === 'pending') {
              if (oldStatus === 'pending' && updatedRide.driver_id === user.id) {
                targetTab = 'ACTIVE';
              }
            }

            // Only switch tabs if we're not already on the correct tab
            // and the ride would actually appear in that tab
            if (targetTab !== activeTab) {
              console.log(`🔄 Auto-switching to ${targetTab} tab`);
              changeTab(targetTab);
            }

            // Always refresh the current tab to get updated data
            refreshCurrentTab();

            // Also refresh active ride check
            runPriorityChecks();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_offers',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          // When an offer is accepted/rejected, refresh feeds
          console.log('🔄 Ride offer updated:', payload.new);
          refreshCurrentTab();
          
          // If offer was accepted, switch to ACTIVE tab
          if (payload.new.offer_status === 'accepted') {
            changeTab('ACTIVE');
          } else if (payload.new.offer_status === 'rejected') {
            // If rejected, might need to go back to AVAILABLE
            if (activeTab === 'BID') {
              refreshCurrentTab();
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, activeTab, changeTab, refreshCurrentTab, runPriorityChecks]);

  const loadDriverStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setIsOnline(data.is_online);
        if (data.coordinates) {
          const coords = fromGeoJSON(data.coordinates);
          if (coords) {
            setDriverLocation(coords);
          }
        }
      }
    } catch (error) {
      console.error('Error loading driver status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = useCallback(async (newStatus) => {
    if (!user?.id) return;

    if (newStatus) {
      setLocationLoading(true);
      try {
        const coords = await getCurrentLocation();

        // Get city name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown Location';
          setLocationCity(city);
        } catch (err) {
          console.error('Error getting city name:', err);
          setLocationCity('Unknown Location');
        }

        const { error } = await supabase
          .from('driver_locations')
          .upsert({
            driver_id: user.id,
            is_online: true,
            is_available: true,
            coordinates: toGeoJSON(coords),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'driver_id'
          });

        if (error) throw error;

        setDriverLocation(coords);
        setIsOnline(true);
        addToast({ type: 'success', title: 'You are now online', message: 'You will receive ride requests' });
        refreshCurrentTab();
      } catch (error) {
        console.error('Location error:', error);
        addToast({ type: 'error', title: 'Location unavailable', message: error.message || 'Please enable location services' });
      } finally {
        setLocationLoading(false);
      }
    } else {
      const { error } = await supabase
        .from('driver_locations')
        .update({
          is_online: false,
          is_available: false,
          updated_at: new Date().toISOString()
        })
        .eq('driver_id', user.id);

      if (error) {
        console.error('Error going offline:', error);
        addToast({ type: 'error', title: 'Failed to go offline' });
      } else {
        setIsOnline(false);
        setLocationCity('');
        addToast({ type: 'info', title: 'You are now offline' });
      }
    }
  }, [user?.id, addToast, refreshCurrentTab]);

  const handleActivateRide = async (ride) => {
    if (!user?.id) return;

    // If ride is already active, just open the active trip overlay without
    // calling the activation RPC again.
    if (ride.status_group === 'ACTIVE') {
      activeRideHook.updateActiveRide(ride);
      return;
    }

    // For scheduled/recurring rides that are not yet active, call the
    // activation RPC and then open the overlay.
    if (ride.schedule_type === 'SCHEDULED' || ride.schedule_type === 'RECURRING') {
      try {
        const result = await activateScheduledRide(ride.id, user.id);

        if (result.success) {
          addToast({ type: 'success', title: 'Ride activated successfully' });
          activeRideHook.updateActiveRide(ride);
          feedHook.refreshCurrentTab();
        } else {
          addToast({ type: 'error', title: 'Failed to activate ride', message: result.error });
        }
      } catch (error) {
        console.error('Error activating ride:', error);
        addToast({ type: 'error', title: 'Failed to activate ride' });
      }
      return;
    }

    // Fallback: for any other ride type, just open the active trip overlay
    activeRideHook.updateActiveRide(ride);
  };

  const handleRefreshNewRides = useCallback(() => {
    refreshCurrentTab();
    resetNewRides();
  }, [refreshCurrentTab, resetNewRides]);

  useEffect(() => {
    if (!onUiStateChange) return;
    onUiStateChange({
      isOnline,
      locationCity,
      locationLoading,
      onToggleOnline: handleToggleOnline,
      onRefresh: handleRefreshNewRides,
      hasNewRides: newRidesHook.hasNewRides,
      newRidesCount: newRidesHook.newRidesCount,
      isRefreshing: feedIsLoading
    });
  }, [
    onUiStateChange,
    isOnline,
    locationCity,
    locationLoading,
    handleToggleOnline,
    handleRefreshNewRides,
    hasNewRides,
    newRidesCount,
    feedIsLoading
  ]);

  const handleViewRideDetails = (ride) => {
    setSelectedRide(ride);
    setShowDetailsModal(true);
  };

  const handlePlaceBid = (ride) => {
    setSelectedRide(ride);
    setShowBidModal(true);
  };

  const handleSubmitBid = async (bidAmount) => {
    if (!selectedRide || !user?.id) {
      throw new Error('Missing ride or user information');
    }

    const rideId = selectedRide.id;

    try {
      // Check for existing pending offer
      const { data: existing, error: existErr } = await supabase
        .from('ride_offers')
        .select('id')
        .eq('ride_id', selectedRide.id)
        .eq('driver_id', user.id)
        .eq('offer_status', 'pending');

      if (existErr) throw existErr;
      
      if (existing && existing.length > 0) {
        throw new Error('You already have a pending offer for this ride');
      }

      const { data, error } = await supabase
        .from('ride_offers')
        .insert({
          ride_id: selectedRide.id,
          driver_id: user.id,
          quoted_price: bidAmount,
          offer_status: 'pending',
          offered_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Close modal and clear selection
      setShowBidModal(false);
      setSelectedRide(null);
      
      // Show success message
      addToast({ 
        type: 'success', 
        title: 'Bid placed successfully', 
        message: 'The passenger will review your offer. Check the "Bids" tab to track it.' 
      });

      // Optimistically remove the ride from the current tab (typically Available)
      feedHook.removeRideFromCurrentList(rideId);
      
      // Refresh the current tab to remove the ride from Available
      // The ride will now appear in the Bids tab due to the backend filtering
      await feedHook.refreshCurrentTab();
      
    } catch (error) {
      console.error('Error placing bid:', error);
      throw new Error(error.message || 'Failed to place bid');
    }
  };

  const handleCancelActiveRide = () => {
    if (!activeRideHook.activeInstantRide) return;
    setSelectedRide(activeRideHook.activeInstantRide);
    setShowCancelModal(true);
  };

  const confirmCancelRide = async (reason) => {
    if (!selectedRide) return { success: false };

    try {
      const result = await cancelRide({
        rideId: selectedRide.id,
        role: 'driver',
        reason,
        otherPartyUserId: selectedRide.user_id,
      });

      if (!result?.success) {
        return result;
      }

      setShowCancelModal(false);
      activeRideHook.updateActiveRide(null);
      addToast({ type: 'success', title: 'Ride cancelled' });
      feedHook.refreshCurrentTab();
      return { success: true };
    } catch (error) {
      console.error('Error cancelling ride:', error);
      addToast({ type: 'error', title: 'Failed to cancel ride' });
      return { success: false, error: error.message };
    }
  };

  // Render ride card (following existing pattern)
  const renderRideCard = (ride, activeInstantRide, onRideClick, onAcceptRide, onActivateRide) => {
    const recurringMeta = getRecurringMeta(ride);
    const serviceIconMap = {
      taxi: CarIcon,
      courier: Package,
      school_run: GraduationCap,
      errands: ShoppingBag
    };

    const getServiceIcon = (serviceType) => {
      return serviceIconMap[serviceType?.toLowerCase()] || CarIcon;
    };

    const getTimingBadgeColor = (scheduleType) => {
      const colors = {
        INSTANT: 'bg-blue-100 text-blue-700',
        SCHEDULED: 'bg-purple-100 text-purple-700',
        RECURRING: 'bg-green-100 text-green-700'
      };
      return colors[scheduleType] || 'bg-blue-100 text-blue-700';
    };

    const getStatusBadge = () => {
      const group = ride.status_group;
      const status = ride.ride_status;

      if (group === 'ACTIVE') {
        switch (status) {
          case RIDE_STATUSES.DRIVER_ON_WAY:
            return { label: 'On the way to pickup', classes: 'bg-blue-100 text-blue-700' };
          case RIDE_STATUSES.DRIVER_ARRIVED:
            return { label: 'Arrived at pickup', classes: 'bg-purple-100 text-purple-700' };
          case RIDE_STATUSES.TRIP_STARTED:
            return { label: 'Trip in progress', classes: 'bg-orange-100 text-orange-700' };
          case RIDE_STATUSES.ACCEPTED:
            return { label: 'Ride accepted', classes: 'bg-emerald-100 text-emerald-700' };
          default:
            return { label: 'Active', classes: 'bg-blue-100 text-blue-700' };
        }
      }

      if (group === 'AVAILABLE') {
        return { label: 'Available', classes: 'bg-gray-100 text-gray-700' };
      }

      if (group === 'BID') {
        return { label: 'Bid placed', classes: 'bg-yellow-100 text-yellow-700' };
      }

      if (group === 'COMPLETED') {
        return { label: 'Completed', classes: 'bg-green-100 text-green-700' };
      }

      return null;
    };

    const statusBadge = getStatusBadge();
    const isErrandRide = (ride.service_type || '').toLowerCase().includes('errand');
    const errandSummary = isErrandRide ? summarizeErrandTasks(ride.errand_tasks || ride.tasks) : null;
    const totalErrandTasks = isErrandRide ? errandSummary?.total || ride.number_of_tasks || 0 : 0;
    const completedErrandTasks = isErrandRide
      ? errandSummary?.completed ?? ride.completed_tasks_count ?? 0
      : 0;
    const remainingErrandTasks = isErrandRide
      ? errandSummary?.remaining ?? ride.remaining_tasks_count ?? Math.max(totalErrandTasks - completedErrandTasks, 0)
      : 0;
    const errandActiveTask = errandSummary?.activeTask;

    const isAcceptDisabled =
      !!activeInstantRide &&
      ride.schedule_type === 'INSTANT' &&
      ride.status_group === 'AVAILABLE';

    const canOpenActiveTrip = ride.status_group === 'ACTIVE';

    const ServiceIcon = getServiceIcon(ride.service_type);

    return (
      <div
        key={ride.id}
        className="rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg bg-white transition-all overflow-hidden cursor-pointer"
        onClick={() => onRideClick(ride)}
      >
        <div className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ServiceIcon className="w-5 h-5 text-gray-700" />
                <span className="font-bold text-gray-900 capitalize">
                  {ride.service_type?.replace('_', ' ')}
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTimingBadgeColor(
                  ride.schedule_type
                )}`}
              >
                {ride.schedule_type}
              </span>
            </div>

            {statusBadge && (
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.classes}`}
                >
                  {statusBadge.label}
                </span>
              </div>
            )}

            {isErrandRide ? (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 mb-1">Errand Overview</p>
                <p className="text-sm text-emerald-900 font-medium">
                  {totalErrandTasks} task{totalErrandTasks === 1 ? '' : 's'} planned •{' '}
                  {completedErrandTasks}/{totalErrandTasks} completed
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  {remainingErrandTasks} task{remainingErrandTasks === 1 ? '' : 's'} remaining
                </p>
                {errandActiveTask && (
                  <div className="mt-2 text-xs text-emerald-800">
                    <p className="font-semibold">Next task: {errandActiveTask.title}</p>
                    <p className="text-[11px] text-emerald-700">
                      {describeTaskState(errandActiveTask.state)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">Pickup</p>
                      <p className="text-sm font-medium text-gray-900">
                        {ride.pickup_address || ride.pickup_location}
                      </p>
                    </div>
                  </div>
                </div>

                {ride.dropoff_address && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Flag className="w-4 h-4 text-red-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Dropoff</p>
                        <p className="text-sm font-medium text-gray-900">
                          {ride.dropoff_address || ride.dropoff_location}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Trip / Errand Info Grid */}
            <div
              className={`grid ${isErrandRide ? 'grid-cols-2' : 'grid-cols-3'} gap-2 pt-2 border-t border-gray-200`}
            >
              {isErrandRide ? (
                <>
                  <div className="bg-emerald-100 rounded-lg p-2 text-center border border-emerald-200">
                    <ShoppingBag className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
                    <p className="text-xs text-emerald-700 mb-0.5">Tasks</p>
                    <p className="text-sm font-bold text-emerald-900">
                      {totalErrandTasks} total
                    </p>
                  </div>
                  {ride.estimated_cost && (
                    <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                      <Wallet className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-xs text-green-700 mb-0.5">Total Cost</p>
                      <p className="text-sm font-bold text-green-800">
                        {formatPrice(parseFloat(ride.estimated_cost))}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {ride.distance_to_driver_km !== null && (
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <Navigation className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600 mb-0.5">To Pickup</p>
                      <p className="text-sm font-bold text-blue-700">
                        {formatDistance(ride.distance_to_driver_km)}
                      </p>
                    </div>
                  )}
                  {ride.distance_km !== null && (
                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <Ruler className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600 mb-0.5">Trip Dist</p>
                      <p className="text-sm font-bold text-purple-700">
                        {formatDistance(ride.distance_km)}
                      </p>
                    </div>
                  )}
                  {ride.estimated_cost && (
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <Wallet className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600 mb-0.5">Price</p>
                      <p className="text-sm font-bold text-green-700">
                        {formatPrice(parseFloat(ride.estimated_cost))}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Recurring Series Details */}
            {recurringMeta && (
              <div className="mt-3 bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <div className="flex items-center justify-between text-sm font-semibold text-indigo-900">
                  <span>{recurringMeta.patternLabel}</span>
                  {recurringMeta.sequenceLabel && (
                    <span className="text-xs text-indigo-700">{recurringMeta.sequenceLabel}</span>
                  )}
                </div>
                <p className="text-xs text-indigo-700 mt-1">
                  Completed {recurringMeta.completed}/{recurringMeta.totalTrips} • Remaining {recurringMeta.remaining}
                </p>
                {recurringMeta.perTripCost && (
                  <p className="text-xs text-indigo-700 mt-1">Per trip: ${recurringMeta.perTripCost}</p>
                )}
                {recurringMeta.upcomingDates.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {recurringMeta.upcomingDates.map((dateLabel, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-indigo-800">
                        <span>📅 {dateLabel}</span>
                      </div>
                    ))}
                    {recurringMeta.hasMoreDates && (
                      <p className="text-[11px] text-indigo-500">More dates in this series…</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Contact details (only if ride accepted) */}
            {ride.driver_id === user?.id && ride.passenger_name && (
              <div className="bg-blue-50 rounded-lg p-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Passenger</p>
                <p className="text-sm font-semibold text-gray-900">{ride.passenger_name}</p>
                {ride.passenger_phone && (
                  <p className="text-xs text-gray-600 mt-1">{ride.passenger_phone}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4 space-y-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onRideClick(ride);
            }}
          >
            View Details
          </Button>

          {/* Open Active Trip button for ACTIVE rides */}
          {canOpenActiveTrip && onActivateRide && (
            <Button
              variant="primary"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onActivateRide(ride);
              }}
            >
              Open Active Trip
            </Button>
          )}

          {/* Accept/Bid button for AVAILABLE rides */}
          {ride.status_group === 'AVAILABLE' && onAcceptRide && (
            <Button
              variant="primary"
              className="w-full"
              disabled={isAcceptDisabled}
              onClick={(e) => {
                e.stopPropagation();
                onAcceptRide(ride);
              }}
              title={isAcceptDisabled ? 'You must complete your current instant trip first' : ''}
            >
              {isAcceptDisabled ? '🚫 Complete Current Trip First' : 'Place Bid'}
            </Button>
          )}

          {/* Activate button for SCHEDULED/RECURRING rides that already belong to this driver */}
          {(ride.schedule_type === 'SCHEDULED' || ride.schedule_type === 'RECURRING') &&
            ride.status_group !== 'ACTIVE' &&
            ride.status_group !== 'COMPLETED' &&
            ride.status_group !== 'AVAILABLE' &&
            ride.driver_id === user?.id &&
            onActivateRide && (
              <Button
                variant="success"
                className="w-full"
                disabled={!!activeInstantRide}
                onClick={(e) => {
                  e.stopPropagation();
                  onActivateRide(ride);
                }}
                title={activeInstantRide ? 'Complete your current ride first' : ''}
              >
                {activeInstantRide ? '🚫 Complete Current Trip First' : '▶️ Activate Ride'}
              </Button>
            )}
        </div>
      </div>
    );
  };

  // Check if driver is approved
  const isApproved = activeProfile?.approval_status === 'approved';

  if (!isApproved && activeProfile?.approval_status === 'pending') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Approval Pending</h2>
          <p className="text-gray-600 mb-6">
            Your profile is currently under review. You will be notified once your account has been approved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={refreshingStatus}
              onClick={async () => {
                if (!user?.id) return;
                try {
                  setRefreshingStatus(true);
                  await refreshProfiles(user.id);
                  await loadProfileData(user.id, 'driver');
                  addToast({ type: 'success', message: 'Status refreshed' });
                } catch (e) {
                  console.error('Failed to refresh status', e);
                  addToast({ type: 'error', message: 'Failed to refresh status. Please try again.' });
                } finally {
                  setRefreshingStatus(false);
                }
              }}
              className="bg-yellow-400 text-slate-900 hover:bg-yellow-500"
            >
              {refreshingStatus ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/driver/profile')}
            >
              View Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Priority UI - Non-blocking */}
      <ActiveRideToast
        ride={activeRideHook.activeInstantRide}
        onView={() => {
          // Match feed CTA behavior ("View Active Ride"): open the active trip overlay.
          if (activeRideHook.activeInstantRide) {
            handleActivateRide(activeRideHook.activeInstantRide);
          }
        }}
        onDismiss={activeRideHook.dismissActiveRideToast}
      />

      <ScheduledAlertToast
        rides={activeRideHook.scheduledAlerts}
        onViewAndActivate={(ride) => {
          setSelectedRide(ride);
          setShowDetailsModal(true);
        }}
        onDismiss={activeRideHook.clearScheduledAlerts}
      />

      <NewAvailableRidesToast
        visible={newRidesHook.hasNewRides}
        onRefresh={handleRefreshNewRides}
        onDismiss={newRidesHook.resetNewRides}
      />

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <RidesTabs
          activeTab={feedHook.activeTab}
          onTabChange={feedHook.changeTab}
          counts={rideCounts}
        />

        <RideFiltersBar
          rideTypeFilter={feedHook.rideTypeFilter}
          scheduleFilter={feedHook.scheduleFilter}
          onRideTypeChange={feedHook.changeRideTypeFilter}
          onScheduleChange={feedHook.changeScheduleFilter}
          page={feedHook.page}
          totalPages={feedHook.totalPages}
          onPageChange={feedHook.changePage}
          onRefresh={handleRefreshNewRides}
          isRefreshing={feedHook.isLoading}
          hasNewRides={newRidesHook.hasNewRides}
        />

        <div className="p-3 overflow-y-auto max-h-[calc(100vh-260px)]">
          {!isOnline ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Go Online to See Rides</h3>
              <p className="text-gray-600">Toggle the switch above to start receiving ride requests</p>
            </div>
          ) : (
            <RideList
              rides={feedHook.rides}
              isLoading={feedHook.isLoading}
              activeInstantRide={activeRideHook.activeInstantRide}
              onRideClick={handleViewRideDetails}
              onAcceptRide={handlePlaceBid}
              onActivateRide={handleActivateRide}
              renderRideCard={renderRideCard}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showDetailsModal && selectedRide && (
        <DriverRideDetailsModal
          open={showDetailsModal}
          ride={selectedRide}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRide(null);
          }}
          onCancel={handleCancelActiveRide}
        />
      )}

      {showBidModal && selectedRide && (
        <PlaceBidModal
          open={showBidModal}
          ride={selectedRide}
          onClose={() => {
            setShowBidModal(false);
            setSelectedRide(null);
          }}
          onSubmit={handleSubmitBid}
        />
      )}

      {showCancelModal && selectedRide && (
        <CancelRideModal
          open={showCancelModal}
          ride={selectedRide}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedRide(null);
          }}
          onConfirm={confirmCancelRide}
        />
      )}

      {/* Active Ride Overlay (preserved component) */}
      {activeRideHook.showActiveRideModal && activeRideHook.activeInstantRide && (
        <RefactoredActiveRideOverlay
          ride={activeRideHook.activeInstantRide}
          onViewDetails={(ride) => handleViewRideDetails(ride)}
          onDismiss={activeRideHook.dismissActiveRideModal}
          onCancel={handleCancelActiveRide}
          onCompleted={(completedRide) => {
            // Clear active ride in hook
            activeRideHook.updateActiveRide(null);

            // Optionally refresh feeds so ACTIVE/COMPLETED tabs reflect new status
            feedHook.refreshCurrentTab();

            // Trigger driver post-ride flow (rating modal / navigation)
            postRide.handleRideCompleted(completedRide);
          }}
        />
      )}

      {/* Driver rating modal (mirrors passenger behavior using shared store) */}
      {postRide.showDriverRatingModal && postRide.driverRideToRate && (
        <RatingModal
          trip={postRide.driverRideToRate}
          onClose={postRide.handleCloseRatingModal}
          onRatingSubmitted={postRide.handleRatingSubmitted}
        />
      )}
    </div>
  );
};

export default DriverRidesPage;