/**
 * @deprecated Not used by the current routed driver experience.
 * Driver routes render `dashboards/driver/pages/RideRequestsPage.jsx` which uses
 * `dashboards/driver/DriverRidesPage.jsx` (unified feed + `useSmartRealtimeFeed`).
 *
 * Kept for reference for the older modular ride-requests container approach.
 * See: `docs/DEPRECATED_CODE_MAP.md`
 */

import React, { useState, useEffect } from 'react';
import { useRideRequests, useRideFiltering, useRideActions, useRealTimeUpdates } from '../../../hooks';
import { RideRequestErrorBoundary } from '../../../components/shared';
import RideRequestsHeader from './RideRequestsHeader';
import FilterControls from './FilterControls';
import RideRequestsList from './RideRequestsList';
import DriverRideDetailsModal from './DriverRideDetailsModal';
import PlaceBidModal from './PlaceBidModal';
import { LoadingSpinner, ErrorState, EmptyState } from '../../../components/shared/loading';

/**
 * RideRequestsView Container Component
 * 
 * Main container for the driver ride requests interface.
 * Orchestrates state management, filtering, and component interactions.
 */
const RideRequestsViewContainer = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  // Ride requests state management
  const {
    rides,
    selectedRide,
    driverStatus,
    rideStats,
    lastRefresh,
    loading,
    actionLoading,
    error,
    actionError,
    setSelectedRide,
    updateOnlineStatus,
    refreshRides,
    clearActionError
  } = useRideRequests({
    autoRefresh,
    refreshInterval
  });

  // Ride filtering
  const {
    filters,
    filteredRides,
    filterStats,
    hasActiveFilters,
    updateFilter,
    updateFilters,
    applyQuickFilter,
    resetFilters
  } = useRideFiltering({
    rides,
    initialFilters: {
      serviceType: 'all',
      status: 'pending',
      showOnlyNearby: true
    }
  });

  // Ride actions
  const {
    actionLoading: rideActionLoading,
    actionError: rideActionError,
    placeBid: handlePlaceBid,
    acceptRide: handleAcceptRide,
    declineRide: handleDeclineRide,
    clearActionError: clearRideActionError
  } = useRideActions({
    onRideUpdate: (update) => {
      console.log('Ride action update:', update);
      refreshRides();
    },
    onError: (error) => {
      console.error('Ride action error:', error);
    }
  });

  // Real-time updates
  const {
    isConnected,
    connectionError,
    clearConnectionError
  } = useRealTimeUpdates({
    onRideUpdate: (update) => {
      console.log('Real-time ride update:', update);
      refreshRides();
    },
    onOfferUpdate: (update) => {
      console.log('Real-time offer update:', update);
      refreshRides();
    },
    onError: (error) => {
      console.error('Real-time connection error:', error);
    },
    enabled: driverStatus.isOnline
  });

  // Local state for modals
  const [showBidModal, setShowBidModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [bidModalRide, setBidModalRide] = useState(null);

  // Handle online/offline toggle
  const handleToggleOnline = async () => {
    try {
      await updateOnlineStatus(!driverStatus.isOnline);
    } catch (error) {
      console.error('Failed to toggle online status:', error);
    }
  };

  // Handle ride selection
  const handleRideSelect = (ride) => {
    setSelectedRide(ride);
  };

  // Handle bid placement
  const handleBidClick = (ride) => {
    setBidModalRide(ride);
    setShowBidModal(true);
  };

  // Handle bid submission
  const handleBidSubmit = async (bidData) => {
    if (!bidModalRide) return;
    
    try {
      const result = await handlePlaceBid(
        bidModalRide.id,
        bidData.amount,
        bidData.message
      );
      
      if (result.success) {
        setShowBidModal(false);
        setBidModalRide(null);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to place bid:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle ride acceptance
  const handleAccept = async (rideId) => {
    try {
      const result = await handleAcceptRide(rideId);
      return result;
    } catch (error) {
      console.error('Failed to accept ride:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle ride decline
  const handleDecline = async (rideId, reason) => {
    try {
      const result = await handleDeclineRide(rideId, reason);
      return result;
    } catch (error) {
      console.error('Failed to decline ride:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle details modal
  const handleShowDetails = (ride) => {
    setSelectedRide(ride);
    setShowDetailsModal(true);
  };

  // Clear errors when they change
  useEffect(() => {
    if (actionError) {
      const timeout = setTimeout(clearActionError, 5000);
      return () => clearTimeout(timeout);
    }
  }, [actionError, clearActionError]);

  useEffect(() => {
    if (rideActionError) {
      const timeout = setTimeout(clearRideActionError, 5000);
      return () => clearTimeout(timeout);
    }
  }, [rideActionError, clearRideActionError]);

  useEffect(() => {
    if (connectionError) {
      const timeout = setTimeout(clearConnectionError, 5000);
      return () => clearTimeout(timeout);
    }
  }, [connectionError, clearConnectionError]);

  // Show error state if there's a critical error
  if (error && !loading) {
    return (
      <ErrorState
        title="Failed to load ride requests"
        message={error.message || 'An unexpected error occurred'}
        onRetry={refreshRides}
      />
    );
  }

  return (
    <RideRequestErrorBoundary>
      <div className={`ride-requests-view ${className}`}>
        <RideRequestsHeader
          driverStatus={driverStatus}
          rideStats={rideStats}
          lastRefresh={lastRefresh}
          isConnected={isConnected}
          connectionError={connectionError}
          onToggleOnline={handleToggleOnline}
          onRefresh={refreshRides}
          loading={loading || actionLoading}
        />

        <FilterControls
          filters={filters}
          filterStats={filterStats}
          hasActiveFilters={hasActiveFilters}
          quickFilters={['all', 'available', 'nearby', 'highValue', 'urgent']}
          onUpdateFilter={updateFilter}
          onUpdateFilters={updateFilters}
          onApplyQuickFilter={applyQuickFilter}
          onResetFilters={resetFilters}
          disabled={!driverStatus.isOnline}
        />

        <div className="ride-requests-content">
          {!driverStatus.isOnline ? (
            <EmptyState
              icon="⚪"
              title="You're Offline"
              message="Go online to start receiving ride requests and earning money."
              action={{
                label: 'Go Online',
                onClick: handleToggleOnline
              }}
            />
          ) : loading ? (
            <LoadingSpinner message="Loading ride requests..." />
          ) : filteredRides.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={rides.length === 0 ? 'No Ride Requests' : 'No Matching Rides'}
              message={
                rides.length === 0
                  ? "Waiting for ride requests... You'll be notified when a new request arrives."
                  : 'Try adjusting your filters to see more rides.'
              }
              action={{
                label: 'Refresh',
                onClick: refreshRides
              }}
            />
          ) : (
            <RideRequestsList
              rides={filteredRides}
              selectedRide={selectedRide}
              driverLocation={driverStatus.currentLocation}
              onRideSelect={handleRideSelect}
              onBidClick={handleBidClick}
              onAcceptClick={handleAccept}
              onDeclineClick={handleDecline}
              onShowDetails={handleShowDetails}
              loading={actionLoading || rideActionLoading}
            />
          )}
        </div>

        {showBidModal && bidModalRide && (
          <PlaceBidModal
            ride={bidModalRide}
            isOpen={showBidModal}
            onClose={() => {
              setShowBidModal(false);
              setBidModalRide(null);
            }}
            onSubmit={handleBidSubmit}
            loading={rideActionLoading}
          />
        )}

        {showDetailsModal && selectedRide && (
          <DriverRideDetailsModal
            ride={selectedRide}
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            onBidClick={() => handleBidClick(selectedRide)}
            onAcceptClick={() => handleAccept(selectedRide.id)}
            onDeclineClick={(reason) => handleDecline(selectedRide.id, reason)}
            loading={rideActionLoading}
          />
        )}

        {(actionError || rideActionError || connectionError) && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {actionError || rideActionError || connectionError}
                </span>
                <button
                  onClick={() => {
                    clearActionError();
                    clearRideActionError();
                    clearConnectionError();
                  }}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RideRequestErrorBoundary>
  );
};

export default RideRequestsViewContainer;