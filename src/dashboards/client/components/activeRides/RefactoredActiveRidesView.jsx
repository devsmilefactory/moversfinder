import React, { useState } from 'react';
import { useToast } from '../../../../components/ui/ToastProvider';
import { useCancelRide } from '../../../../hooks/useCancelRide';
import useRatingStore from '../../../../stores/ratingStore';
import useActiveRides from '../../../../hooks/useActiveRides';

// Import modular components
import ActiveRideCard from './ActiveRideCard';
import ActiveRideMap from './ActiveRideMap';
import PassengerOffersPanel from '../PassengerOffersPanel';
import OffersNotificationBanner from '../OffersNotificationBanner';
import SharedCancelRideModal from '../../../../components/shared/SharedCancelRideModal';
import RatingModal from '../RatingModal';
import RideDetailsModal from '../RideDetailsModal';

/**
 * RefactoredActiveRidesView Component
 * 
 * Modular version of ActiveRidesView broken down into focused components.
 * Reduced from 643+ lines to a manageable container component.
 */
const RefactoredActiveRidesView = () => {
  // Custom hooks
  const { 
    activeRides, 
    loading, 
    error, 
    driverLocations, 
    driverInfo, 
    loadActiveRides 
  } = useActiveRides();
  
  const { cancelRide } = useCancelRide();
  const { addToast } = useToast();
  const { shouldShowRating, markRatingShown } = useRatingStore();

  // Local state
  const [selectedRide, setSelectedRide] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetRideId, setCancelTargetRideId] = useState(null);
  const [cancellingRideId, setCancellingRideId] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rideToRate, setRideToRate] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  // Event handlers
  const handleViewDetails = (ride) => {
    setSelectedRide(ride);
  };

  const handleCancelRide = (rideId) => {
    setCancelTargetRideId(rideId);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetRideId) return;

    setCancellingRideId(cancelTargetRideId);
    try {
      const ride = (activeRides || []).find(r => r.id === cancelTargetRideId);
      const result = await cancelRide({
        rideId: cancelTargetRideId,
        role: 'passenger',
        reason: 'Cancelled by passenger',
        otherPartyUserId: ride?.driver_id || null
      });
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Ride Cancelled',
          message: 'Your ride has been cancelled successfully.'
        });
        
        // Refresh active rides
        loadActiveRides();
      } else {
        addToast({
          type: 'error',
          title: 'Cancellation Failed',
          message: result.error || 'Failed to cancel ride. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: 'Failed to cancel ride. Please try again.'
      });
    } finally {
      setCancellingRideId(null);
      setShowCancelModal(false);
      setCancelTargetRideId(null);
    }
  };

  const handleContactDriver = (phone) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const handleRatingComplete = () => {
    setShowRatingModal(false);
    setRideToRate(null);
    loadActiveRides(); // Refresh to update rating status
  };

  // Check for completed rides that need rating
  React.useEffect(() => {
    const completedRide = activeRides.find(ride => 
      ride.ride_status === 'trip_completed' && 
      shouldShowRating(ride.id, ride.passenger_rated_at)
    );

    if (completedRide && !showRatingModal) {
      markRatingShown(completedRide.id);
      setRideToRate(completedRide);
      setShowRatingModal(true);
    }
  }, [activeRides, shouldShowRating, markRatingShown, showRatingModal]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-600">Loading active rides...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <span className="text-red-600 text-xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Rides</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={loadActiveRides}
              className="mt-3 text-red-600 hover:text-red-700 font-medium text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (activeRides.length === 0) {
    return (
      <div className="space-y-6">
        {/* Offers notification banner */}
        <OffersNotificationBanner />
        
        {/* Empty state */}
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-gray-400 text-6xl mb-6">🚗</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            No Active Rides
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            You don't have any active rides at the moment. Book a ride to see it here with real-time tracking.
          </p>
          <button
            onClick={() => window.location.href = '/book'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Book a Ride
          </button>
        </div>

        {/* Offers panel */}
        <PassengerOffersPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Rides</h2>
          <p className="text-gray-600 mt-1">
            {activeRides.length} active ride{activeRides.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🗺️ Map View
          </button>
        </div>
      </div>

      {/* Offers notification banner */}
      <OffersNotificationBanner />

      {/* Content */}
      {viewMode === 'map' ? (
        <ActiveRideMap 
          activeRides={activeRides} 
          driverLocations={driverLocations} 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active rides list */}
          <div className="space-y-4">
            {activeRides.map(ride => (
              <ActiveRideCard
                key={ride.id}
                ride={ride}
                driverInfo={driverInfo[ride.driver_id]}
                driverLocation={driverLocations[ride.id]}
                onViewDetails={handleViewDetails}
                onCancel={handleCancelRide}
                onContactDriver={handleContactDriver}
              />
            ))}
          </div>

          {/* Map sidebar */}
          <div className="lg:sticky lg:top-6">
            <ActiveRideMap 
              activeRides={activeRides} 
              driverLocations={driverLocations} 
            />
          </div>
        </div>
      )}

      {/* Offers panel */}
      <PassengerOffersPanel />

      {/* Modals */}
      {selectedRide && (
        <RideDetailsModal
          ride={selectedRide}
          isOpen={!!selectedRide}
          onClose={() => setSelectedRide(null)}
        />
      )}

      {showCancelModal && (
        <SharedCancelRideModal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setCancelTargetRideId(null);
          }}
          onConfirm={handleConfirmCancel}
          loading={!!cancellingRideId}
          rideId={cancelTargetRideId}
        />
      )}

      {showRatingModal && rideToRate && (
        <RatingModal
          ride={rideToRate}
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onComplete={handleRatingComplete}
        />
      )}
    </div>
  );
};

export default RefactoredActiveRidesView;