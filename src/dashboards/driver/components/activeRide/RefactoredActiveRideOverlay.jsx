import React, { useState, useEffect } from 'react';
import Button from '../../../../components/ui/Button';
import { useRideStatus, RIDE_STATUSES } from '../../../../hooks/useRideStatus';
import { useToast } from '../../../../components/ui/ToastProvider';
import { supabase } from '../../../../lib/supabase';
import useAuthStore from '../../../../stores/authStore';
import { useRideCompletion } from '../../../../hooks/useRideCompletion';
import { notifyStatusUpdateFromOverlay } from '../../../../services/notificationService';
import { isErrandService } from '../../../../utils/serviceTypes';
import { isRoundTripRide } from '../../../../utils/rideCostDisplay';

// Import modular components
import RideStatusDisplay from './RideStatusDisplay';
import RideLocationInfo from './RideLocationInfo';
import RideActionButtons from './RideActionButtons';
import ErrandTaskManager from './ErrandTaskManager';
import RideProgressStepper from './RideProgressStepper';

/**
 * RefactoredActiveRideOverlay Component
 * 
 * Modular version of ActiveRideOverlay broken down into focused components.
 * Reduced from 698+ lines to a manageable container component.
 */
const RefactoredActiveRideOverlay = ({ ride, onViewDetails, onCancel, onDismiss, onCompleted }) => {
  if (!ride) return null;

  console.log('🚗 RefactoredActiveRideOverlay rendered with ride:', {
    id: ride.id,
    status: ride.ride_status,
    timing: ride.ride_timing,
    pickup: ride.pickup_address,
    dropoff: ride.dropoff_address
  });

  // State management
  const [localRide, setLocalRide] = useState(ride);
  const [passengerPhone, setPassengerPhone] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Computed values
  const isScheduled = localRide?.ride_timing !== 'instant';
  const isInstant = localRide?.ride_timing === 'instant';
  const needsToBeStarted = isScheduled && localRide.ride_status === 'accepted';
  const isRideCompleted = 
    localRide.ride_status === RIDE_STATUSES.TRIP_COMPLETED ||
    localRide.ride_status === RIDE_STATUSES.COMPLETED;
  const isErrand = isErrandService(localRide.service_type);
  const isRoundTrip = isRoundTripRide(localRide);

  // Hooks
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const { completeRide, completing } = useRideCompletion();

  // Load passenger phone number
  useEffect(() => {
    const loadPassengerPhone = async () => {
      if (!localRide?.user_id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', localRide.user_id)
          .single();

        if (error) {
          console.error('Error loading passenger phone:', error);
          return;
        }

        setPassengerPhone(data?.phone);
      } catch (error) {
        console.error('Error loading passenger phone:', error);
      }
    };

    loadPassengerPhone();
  }, [localRide?.user_id]);

  // Update local ride when prop changes
  useEffect(() => {
    setLocalRide(ride);
  }, [ride]);

  // Status update handler
  const handleStatusUpdate = async (newStatus) => {
    if (!localRide?.id || updatingStatus) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('rides')
        .update({ 
          ride_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', localRide.id);

      if (error) {
        console.error('Error updating ride status:', error);
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update ride status. Please try again.'
        });
        return;
      }

      // Update local state
      const updatedRide = { ...localRide, ride_status: newStatus };
      setLocalRide(updatedRide);

      // Send notification to passenger
      const statusMessages = {
        'driver_on_way': {
          title: '🚗 Driver On The Way',
          message: 'Your driver is heading to the pickup location.'
        },
        'driver_arrived': {
          title: '📍 Driver Arrived',
          message: 'Your driver has arrived at the pickup location.'
        },
        'trip_started': {
          title: '🎯 Trip Started',
          message: 'Your trip is now in progress.'
        }
      };

      const notification = statusMessages[newStatus];
      if (notification) {
        await notifyStatusUpdateFromOverlay({
          rideId: localRide.id,
          passengerId: localRide.user_id,
          title: notification.title,
          message: notification.message
        });
      }

      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Ride status updated to ${newStatus.replace('_', ' ')}`
      });

    } catch (error) {
      console.error('Error updating ride status:', error);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update ride status. Please try again.'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Complete ride handler
  const handleCompleteRide = async () => {
    try {
      const result = await completeRide(localRide.id);
      if (result.success) {
        const completedRide = { ...localRide, ride_status: 'trip_completed' };
        setLocalRide(completedRide);
        
        if (onCompleted) {
          onCompleted(completedRide);
        }

        addToast({
          type: 'success',
          title: 'Trip Completed',
          message: 'Trip has been marked as completed successfully.'
        });
      } else {
        addToast({
          type: 'error',
          title: 'Completion Failed',
          message: result.error || 'Failed to complete trip. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error completing ride:', error);
      addToast({
        type: 'error',
        title: 'Completion Failed',
        message: 'Failed to complete trip. Please try again.'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Active Ride</h2>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Ride Status */}
          <RideStatusDisplay ride={localRide} isScheduled={isScheduled} />

          {/* Warning Messages */}
          {isInstant && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ You cannot accept other rides while this instant ride is active
              </p>
            </div>
          )}

          {needsToBeStarted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ℹ️ Click "Begin Trip" when you're ready to start this scheduled ride
              </p>
            </div>
          )}

          {/* View Details Button */}
          <Button
            variant="primary"
            size="md"
            onClick={onViewDetails}
            className="w-full"
          >
            📱 View Full Ride Details
          </Button>

          {/* Location Information */}
          <RideLocationInfo ride={localRide} passengerPhone={passengerPhone} />

          {/* Errand Task Manager (if applicable) */}
          {isErrand && (
            <ErrandTaskManager 
              ride={localRide} 
              user={user} 
              isRideCompleted={isRideCompleted} 
            />
          )}

          {/* Ride Progress Stepper */}
          <RideProgressStepper ride={localRide} isScheduled={isScheduled} />

          {/* Action Buttons */}
          <RideActionButtons
            ride={localRide}
            isScheduled={isScheduled}
            needsToBeStarted={needsToBeStarted}
            updatingStatus={updatingStatus}
            completing={completing}
            onStatusUpdate={handleStatusUpdate}
            onCompleteRide={handleCompleteRide}
            onCancel={onCancel}
          />

          {/* Round Trip Information */}
          {isRoundTrip && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-600 text-lg">🔄</span>
                <h4 className="font-medium text-purple-900">Round Trip</h4>
              </div>
              <p className="text-sm text-purple-700">
                This is a round trip ride. After reaching the destination, you'll return to the pickup location.
              </p>
            </div>
          )}

          {/* Ride Completion Status */}
          {isRideCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-xl">✅</span>
                <div>
                  <h4 className="font-medium text-green-900">Trip Completed</h4>
                  <p className="text-sm text-green-700">
                    This ride has been completed successfully.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Ride #{localRide.id?.toString().slice(-6)}</span>
            <span>{localRide.service_type?.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefactoredActiveRideOverlay;