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
import { useToast } from '../../components/ui/ToastProvider';
import { supabase } from '../../lib/supabase';
import { getCurrentLocation, toGeoJSON, fromGeoJSON } from '../../utils/locationServices';

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
import ActiveRideOverlay from './components/ActiveRideOverlay';
import DriverRideDetailsModal from './components/DriverRideDetailsModal';
import CancelRideModal from './components/CancelRideModal';
import PlaceBidModal from './components/PlaceBidModal';
import RatingModal from './components/RatingModal';

// Icons no longer needed - moved to card components
import { activateScheduledRide } from '../../services/driverRidesApi';
import useRatingStore from '../../stores/ratingStore';

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
      updateActiveRide(ride);
      return;
    }

    // For scheduled/recurring rides that are not yet active, call the
    // activation RPC and then open the overlay.
    if (ride.schedule_type === 'SCHEDULED' || ride.schedule_type === 'RECURRING') {
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <RidesTabs
          activeTab={activeTab}
          onTabChange={changeTab}
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

        <div className="p-3 overflow-y-auto max-h-[calc(100vh-220px)]">
          {!isOnline ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📍</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Go Online to See Rides</h3>
              <p className="text-sm text-gray-600">Toggle the switch above to start receiving ride requests</p>
            </div>
          ) : (
            <RideList
              rides={rides}
              isLoading={feedIsLoading}
              activeInstantRide={activeInstantRide}
              onRideClick={handleViewRideDetails}
              onMoreDetails={handleViewRideDetails}
              onAcceptRide={handlePlaceBid}
              onActivateRide={handleActivateRide}
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
  );
};

export default DriverRidesPage;