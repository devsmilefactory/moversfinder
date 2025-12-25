/**
 * DriverRidesPage - Main Container Component
 * 
 * Unified driver rides feed with single source of truth for data fetching.
 * Replaces the old DriverRidesHub with a clean, non-blocking architecture.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';
import useDriverStore from '../../stores/driverStore';
import { useToast } from '../../components/ui/ToastProvider';
import { supabase } from '../../lib/supabase';
import { getCurrentLocation, toGeoJSON, fromGeoJSON, detectCurrentLocationWithCity } from '../../utils/locationServices';
import useCentralizedLocation from '../../hooks/useCentralizedLocation';

// Hooks
import { useDriverRidesFeed } from '../../hooks/useDriverRidesFeed';
import { useActiveRideCheck } from '../../hooks/useActiveRideCheck';
import { useNewRidesSubscription } from '../../hooks/useNewRidesSubscription';
import { useCancelRide } from '../../hooks/useCancelRide';
import { RIDE_STATUSES, getRideStatusCategory } from '../../hooks/useRideStatus';
import { useSmartRealtimeFeed } from '../../hooks/useSmartRealtimeFeed';

// Components
import RidesTabs from './components/RidesTabs';
import RideFiltersBar from './components/RideFiltersBar';
import RideList from './components/RideList';
import ActiveRideToast from './components/ActiveRideToast';
import ScheduledAlertToast from './components/ScheduledAlertToast';
import NewAvailableRidesToast from './components/NewAvailableRidesToast';
import RefreshIndicator from '../../components/shared/RefreshIndicator';
import Button from '../../components/ui/Button';
import { EmptyState, ErrorState, RideRequestErrorBoundary } from '../../components/shared/loading';

// Preserved components
import ActiveRideOverlay from './components/ActiveRideOverlay';
import DriverRideDetailsModal from './components/DriverRideDetailsModal';
import CancelRideModal from './components/CancelRideModal';
import PlaceBidModal from './components/PlaceBidModal';
import RatingModal from './components/RatingModal';

// Icons no longer needed - moved to card components
import { activateScheduledRide } from '../../services/driverRidesApi';
import useRatingStore from '../../stores/ratingStore';
import { getDriverStatus } from '../../utils/driverStatusCheck';

const DriverRidesPage = ({ onUiStateChange }) => {
  const { user } = useAuthStore();
  const { activeProfile } = useProfileStore();
  const { documents, loadDocuments } = useDriverStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Driver state
  const [isOnline, setIsOnline] = useState(false);
  const [locationCity, setLocationCity] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  
  // Ref to throttle error notifications
  const locationErrorToastRef = useRef({});

  // Use centralized location hook for continuous tracking
  const {
    currentLocation: driverLocation,
    isDetecting: isDetectingLocation,
    locationError: locationError,
    locationPermission,
    detectLocation,
    startTracking,
    stopTracking
  } = useCentralizedLocation({
    enableTracking: isOnline, // Start tracking when online
    trackingInterval: 30000, // Update every 30 seconds
    updateDatabase: isOnline, // Update database when online
    userId: user?.id,
    autoDetect: false, // Don't auto-detect, we'll do it manually when going online
    onLocationUpdate: (location) => {
      // Location updates are handled silently - no logging needed
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DriverRidesPage.jsx:78',message:'Location updated',data:{hasLocation:!!location},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
    },
    onError: (error) => {
      // Throttle error notifications to prevent spam
      // Only show toast for non-timeout errors (timeouts are expected and handled silently)
      const isTimeoutError = error.code === 3 || error.message?.includes('Timeout');
      
      if (!isTimeoutError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DriverRidesPage.jsx:81',message:'Location tracking error',data:{errorCode:error.code,errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        
        // Debounce toast notifications - only show once per error type
        const errorKey = `location-error-${error.code || 'unknown'}`;
        const lastErrorTime = locationErrorToastRef.current?.[errorKey] || 0;
        const now = Date.now();
        
        if (now - lastErrorTime > 10000) { // Only show once every 10 seconds per error type
          if (!locationErrorToastRef.current) {
            locationErrorToastRef.current = {};
          }
          locationErrorToastRef.current[errorKey] = now;
          
          addToast({ 
            type: 'error', 
            title: 'Location Error', 
            message: error.message || 'Failed to track location' 
          });
        }
      }
    }
  });

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
    error: feedError,
    changeTab,
    changeRideTypeFilter,
    changeScheduleFilter,
    changePage,
    removeRideFromCurrentList,
    addRideToCurrentList,
    updateRideInCurrentList,
    refreshCurrentTab
  } = feedHook;

  const activeRideHook = useActiveRideCheck(user?.id);
  const {
    activeInstantRide,
    scheduledAlerts,
    showActiveRideModal,
    hasActiveRideToast,
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

  // Driver rating modal state
  const [showDriverRatingModal, setShowDriverRatingModal] = useState(false);
  const [driverRideToRate, setDriverRideToRate] = useState(null);

  const { cancelRide } = useCancelRide();
  const { shouldShowRating, markRatingShown } = useRatingStore();

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
      loadDocuments(user.id);
    }
  }, [user?.id]);

  // Redirect to status page if profile is incomplete or pending/rejected approval
  // User must complete profile and get approval before accessing rides
  useEffect(() => {
    if (user?.id && activeProfile && documents !== undefined) {
      const driverStatus = getDriverStatus(activeProfile, documents || []);
      // Block access if not approved - redirect to status page
      if (!driverStatus.canAccessRides) {
        navigate('/driver/status', { replace: true });
      }
    }
  }, [user?.id, activeProfile, documents, navigate]);

  // Update last fetch timestamp when Available tab loads
  useEffect(() => {
    if (activeTab === 'AVAILABLE' && !feedIsLoading) {
      updateLastFetch();
    }
  }, [activeTab, feedIsLoading, updateLastFetch]);

  // Smart realtime feed with optimistic updates
  const realtimeFeed = useSmartRealtimeFeed({
    userId: user?.id,
    userType: 'driver',
    activeTab,
    changeTab: (newTab, meta) => {
      // IMPORTANT: changeTab already triggers a single fetch via the feed hook useEffect.
      // Do NOT call refreshCurrentTab() here or you'll double-fetch on realtime-driven tab switches.
      changeTab(newTab, meta);
      runPriorityChecks(); // refresh active ride check (separate from feed fetch)
    },
    refreshCurrentTab,
    removeRideFromCurrentList,
    addRideToCurrentList,
    updateRideInCurrentList,
    driverOffers: [], // Will be fetched by hook
    onNewDataAvailable: (tab, ride) => {
      console.log(`[Realtime] New data available in ${tab} tab`);
    }
  });

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
        // Note: driverLocation is now managed by useCentralizedLocation hook
        // The hook will sync with the database automatically
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
        // Use centralized location detection with city
        const location = await detectLocation();
        
        if (!location) {
          // Check if it's a permission error - handle gracefully
          const isPermissionError = locationPermission === 'denied' || 
                                   locationError?.includes('permission') || 
                                   locationError?.includes('Location permission denied');
          
          if (isPermissionError) {
            setLocationLoading(false);
            addToast({ 
              type: 'warning', 
              title: 'Location Permission Required', 
              message: 'Please enable location access in your browser settings to go online.' 
            });
            return;
          }
          // For other location errors, show a message but don't throw
          setLocationLoading(false);
          addToast({ 
            type: 'error', 
            title: 'Location Error', 
            message: locationError || 'Failed to detect location. Please try again.' 
          });
          return;
        }

        // Get city from the location result if available
        // Try to get city using Google Maps geocoding
        try {
          // Wait for Google Maps if needed
          let attempts = 0;
          while (!window.google?.maps && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }

          if (window.google?.maps) {
            const locationWithCity = await detectCurrentLocationWithCity({
              geolocationOptions: {
                enableHighAccuracy: false, // Use already detected location
                maximumAge: 60000
              }
            });
            setLocationCity(locationWithCity.city || 'Unknown Location');
          } else {
            setLocationCity('Unknown Location');
          }
        } catch (err) {
          console.warn('Could not get city name:', err);
          setLocationCity('Unknown Location');
        }

        // Update database status
        const { error } = await supabase
          .from('driver_locations')
          .upsert({
            driver_id: user.id,
            is_online: true,
            is_available: true,
            coordinates: toGeoJSON(location),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'driver_id'
          });

        if (error) throw error;

        setIsOnline(true);
        // Start continuous tracking (will be handled by the hook)
        startTracking();
        
        addToast({ type: 'success', title: 'You are now online', message: 'You will receive ride requests' });
        refreshCurrentTab();
      } catch (error) {
        console.error('Location error:', error);
        // Don't show error if it's already handled above (permission denied)
        if (!error.message?.includes('permission') && !error.isPermissionDenied) {
          addToast({ 
            type: 'error', 
            title: 'Location unavailable', 
            message: error.message || 'Please enable location services' 
          });
        }
      } finally {
        setLocationLoading(false);
      }
    } else {
      // Stop location tracking
      stopTracking();
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
        // Stop location tracking when going offline
        stopTracking();
        setIsOnline(false);
        setLocationCity('');
        addToast({ type: 'info', title: 'You are now offline' });
      }
    }
  }, [user?.id, addToast, refreshCurrentTab]);

  const handleActivateRide = async (ride) => {
    if (!user?.id) return;

    // If ride is already in an active state category, just open the active trip overlay
    const statusCategory = getRideStatusCategory(ride.ride_status || ride.status);
    if (statusCategory === 'active') {
      updateActiveRide(ride);
      return;
    }

    // For scheduled/recurring rides that are not yet active, call the
    // activation RPC and then open the overlay.
    const rideTiming = ride.ride_timing || ride.schedule_type;
    if (rideTiming === 'scheduled_single' || rideTiming === 'scheduled_recurring' || rideTiming === 'SCHEDULED' || rideTiming === 'RECURRING') {
      try {
        const result = await activateScheduledRide(ride.id, user.id);

        if (result.success) {
          addToast({ type: 'success', title: 'Ride activated successfully' });
          updateActiveRide(ride);
          refreshCurrentTab();
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
    updateActiveRide(ride);
  };

  const handleRefreshNewRides = useCallback(() => {
    refreshCurrentTab();
    resetNewRides();
  }, [refreshCurrentTab, resetNewRides]);

  const uiState = useMemo(
    () => ({
      isOnline,
      locationCity,
      locationLoading,
      onToggleOnline: handleToggleOnline,
      onRefresh: handleRefreshNewRides,
      hasNewRides,
      newRidesCount,
      isRefreshing: feedIsLoading
    }),
    [
      isOnline,
      locationCity,
      locationLoading,
      handleToggleOnline,
      handleRefreshNewRides,
      hasNewRides,
      newRidesCount,
      feedIsLoading
    ]
  );

  const lastUiStateRef = useRef(null);

  useEffect(() => {
    if (!onUiStateChange) return;

    const prev = lastUiStateRef.current;
    const keys = Object.keys(uiState);
    const hasChanged =
      !prev || keys.some((key) => prev[key] !== uiState[key]);

    if (hasChanged) {
      onUiStateChange(uiState);
      lastUiStateRef.current = uiState;
    }
  }, [onUiStateChange, uiState]);

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
        message: 'Your bid is now in the "Bids" tab.' 
      });

      // Optimistically remove the ride from the current tab (typically Available)
      removeRideFromCurrentList(rideId);
      
      // Switch to BID tab to show the newly placed bid
      changeTab('BID');
      
      // Refresh to load the bid in the new tab
      await refreshCurrentTab();
      
    } catch (error) {
      console.error('Error placing bid:', error);
      throw new Error(error.message || 'Failed to place bid');
    }
  };

  const handleCancelActiveRide = () => {
    if (!activeInstantRide) return;
    setSelectedRide(activeInstantRide);
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
      updateActiveRide(null);
      addToast({ type: 'success', title: 'Ride cancelled' });
      refreshCurrentTab();
      return { success: true };
    } catch (error) {
      console.error('Error cancelling ride:', error);
      addToast({ type: 'error', title: 'Failed to cancel ride' });
      return { success: false, error: error.message };
    }
  };

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
    <RideRequestErrorBoundary>
    <div className="space-y-2">
      {/* Priority UI - Non-blocking */}
      {hasActiveRideToast && activeInstantRide && (
        <ActiveRideToast
          ride={activeInstantRide}
          onView={() => {
            setSelectedRide(activeInstantRide);
            setShowDetailsModal(true);
          }}
          onDismiss={dismissActiveRideToast}
        />
      )}

      <ScheduledAlertToast
        rides={scheduledAlerts}
        onViewAndActivate={(ride) => {
          setSelectedRide(ride);
          setShowDetailsModal(true);
        }}
        onDismiss={clearScheduledAlerts}
      />

      <NewAvailableRidesToast
        visible={hasNewRides}
        onRefresh={handleRefreshNewRides}
        onDismiss={resetNewRides}
      />

      {/* Main Content */}
      <div className="bg-white sm:rounded-lg shadow-sm border-y sm:border border-gray-200 overflow-hidden">
        <RidesTabs
          activeTab={activeTab}
          onTabChange={(tab) => changeTab(tab, { source: 'ui_tab_click' })}
          counts={rideCounts}
        />

        <RideFiltersBar
          rideTypeFilter={rideTypeFilter}
          scheduleFilter={scheduleFilter}
          onRideTypeChange={changeRideTypeFilter}
          onScheduleChange={changeScheduleFilter}
          page={page}
          totalPages={totalPages}
          onPageChange={changePage}
          onRefresh={handleRefreshNewRides}
          isRefreshing={feedIsLoading}
          hasNewRides={hasNewRides}
        />

        {/* Refresh Indicator - Shows when new data available in other tabs */}
        {realtimeFeed.hasNewDataAvailable && (
          <div className="px-2 sm:px-3 pt-2">
            <RefreshIndicator
              hasNewData={realtimeFeed.hasNewDataAvailable}
              affectedTabs={realtimeFeed.newDataTabs}
              onRefresh={realtimeFeed.manualRefresh}
            />
          </div>
        )}

        <div className="p-2 sm:p-3 overflow-y-auto max-h-[calc(100vh-200px)]">
          {!isOnline ? (
            <EmptyState
              icon="📍"
              title="You're Offline"
              message="Go online to start receiving ride requests."
              actionLabel="Go Online"
              onAction={() => handleToggleOnline(true)}
              size="md"
            />
          ) : feedError && !feedIsLoading ? (
            <ErrorState
              hasError={true}
              errorMessage={feedError?.message || 'Failed to load rides'}
              onRetry={handleRefreshNewRides}
              retryLabel="Retry"
              size="md"
            />
          ) : (
            <RideList
              rides={rides}
              isLoading={feedIsLoading}
              activeInstantRide={activeInstantRide}
              onRideClick={handleViewRideDetails}
              onMoreDetails={handleViewRideDetails}
              onAcceptRide={handlePlaceBid}
              onActivateRide={handleActivateRide}
              onActivateNextTrip={handleActivateRide}
              feedCategory={activeTab}
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
      {showActiveRideModal && activeInstantRide && (
        <ActiveRideOverlay
          ride={activeInstantRide}
          onViewDetails={() => {
            setSelectedRide(activeInstantRide);
            setShowDetailsModal(true);
          }}
          onDismiss={dismissActiveRideModal}
          onCancel={handleCancelActiveRide}
          onCompleted={(completedRide) => {
            // Clear active ride in hook
            updateActiveRide(null);

            // Optionally refresh feeds so ACTIVE/COMPLETED tabs reflect new status
            refreshCurrentTab();

            // Trigger driver rating modal using shared ratingStore guard
            if (shouldShowRating(completedRide.id, completedRide.driver_rated_at)) {
              markRatingShown(completedRide.id);
              setDriverRideToRate(completedRide);
              setShowDriverRatingModal(true);
            }
          }}
        />
      )}

      {/* Driver rating modal (mirrors passenger behavior using shared store) */}
      {showDriverRatingModal && driverRideToRate && (
        <RatingModal
          trip={driverRideToRate}
          onClose={async () => {
            // Refresh feeds after modal closes to reflect status transition
            refreshCurrentTab();
            setShowDriverRatingModal(false);
            setDriverRideToRate(null);
            // After modal closes, take driver to COMPLETED tab so the finished trip is immediately visible
            changeTab('COMPLETED');
          }}
          onRatingSubmitted={() => {
            // After rating, take driver to COMPLETED tab so the finished trip is immediately visible
            changeTab('COMPLETED');
          }}
        />
      )}
    </div>
    </RideRequestErrorBoundary>
  );
};

export default DriverRidesPage;