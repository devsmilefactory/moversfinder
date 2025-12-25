import React from 'react';
import Button from '../../../../components/ui/Button';
import { RIDE_STATUSES } from '../../../../hooks/useRideStatus';
import {
  driverOnTheWay,
  driverArrived,
  startTrip,
  completeTrip
} from '../../../../services/rideStateService';
import { useRideCompletion } from '../../../../hooks/useRideCompletion';
import useAuthStore from '../../../../stores/authStore';
import { useToast } from '../../../../components/ui/ToastProvider';
import { getRideTypeHandler } from '../../../../utils/rideTypeHandlers';

/**
 * StatusUpdateActions Component
 * 
 * Handles ride status transitions and displays status update buttons.
 * Extracted from ActiveRideOverlay for better organization.
 * 
 * @param {object} props
 * @param {object} props.ride - The ride object
 * @param {function} props.onStatusUpdate - Callback when status is updated
 * @param {boolean} props.updatingStatus - Whether status update is in progress
 * @param {boolean} props.isRideCompleted - Whether the ride is completed
 * @param {boolean} props.isScheduled - Whether the ride is scheduled
 * @param {boolean} props.needsToBeStarted - Whether scheduled ride needs to be started
 */
const StatusUpdateActions = ({
  ride,
  onStatusUpdate,
  updatingStatus = false,
  isRideCompleted = false,
  isScheduled = false,
  needsToBeStarted = false
}) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const { completeRide, completing } = useRideCompletion();

  // Get next action based on current status
  const getNextAction = () => {
    const actions = {
      [RIDE_STATUSES.ACCEPTED]: { 
        label: isScheduled ? 'Begin Trip' : 'Start Driving to Pickup', 
        status: RIDE_STATUSES.DRIVER_ON_WAY, 
        variant: 'primary' 
      },
      [RIDE_STATUSES.DRIVER_ON_WAY]: { 
        label: 'Mark as Arrived', 
        status: RIDE_STATUSES.DRIVER_ARRIVED, 
        variant: 'primary' 
      },
      [RIDE_STATUSES.DRIVER_ARRIVED]: { 
        label: 'Start Trip', 
        status: RIDE_STATUSES.TRIP_STARTED, 
        variant: 'success' 
      },
      [RIDE_STATUSES.TRIP_STARTED]: { 
        label: 'Complete Trip', 
        status: RIDE_STATUSES.TRIP_COMPLETED, 
        variant: 'success' 
      },
    };
    return actions[ride.ride_status] || null;
  };

  // Small retry/backoff for transient failures
  const runWithRetry = async (fn, attempts = 2, delayMs = 250) => {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (i < attempts - 1) {
          await new Promise((res) => setTimeout(res, delayMs * (i + 1)));
        }
      }
    }
    throw lastError;
  };

  const updateTripStatus = async (newStatus) => {
    try {
      // Use handler system for completion checks
      const handler = getRideTypeHandler(ride.service_type);
      
      // Check if ride can be completed before allowing completion
      if (newStatus === 'trip_completed' || newStatus === RIDE_STATUSES.TRIP_COMPLETED) {
        const canCompleteResult = handler.canComplete(ride);
        if (!canCompleteResult.canComplete) {
          addToast({
            type: 'error',
            title: 'Cannot Complete',
            message: canCompleteResult.reason || 'Ride cannot be completed at this time'
          });
          return;
        }
      }
      
      let transitionResult;
      switch (newStatus) {
        case 'driver_on_way':
          transitionResult = await runWithRetry(() => driverOnTheWay(ride.id, user?.id));
          break;
        case 'driver_arrived':
          transitionResult = await runWithRetry(() => driverArrived(ride.id, user?.id));
          break;
        case 'trip_started':
          transitionResult = await runWithRetry(() => startTrip(ride.id, user?.id));
          break;
        case 'trip_completed':
        case RIDE_STATUSES.TRIP_COMPLETED:
          // Use handler's completion logic
          const completionData = handler.prepareCompletionData(ride);
          const completionResult = await handler.onComplete(ride, completionData);
          
          if (completionResult.success) {
            transitionResult = await runWithRetry(() => completeRide({
              rideId: ride.id,
              passengerId: ride.user_id,
              notifyPassenger: true
            }));
          } else {
            addToast({
              type: 'error',
              title: 'Completion Failed',
              message: completionResult.error || 'Failed to complete ride'
            });
            return;
          }
          break;
        default:
          throw new Error('Unsupported status update');
      }

      if (transitionResult?.success) {
        if (onStatusUpdate) {
          onStatusUpdate(newStatus, transitionResult.ride);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: transitionResult?.error || 'Failed to update ride status'
        });
      }
    } catch (error) {
      console.error('Error updating trip status:', error);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update ride status'
      });
    }
  };

  const nextAction = getNextAction();

  return (
    <>
      {/* Progress Stepper - Compact */}
      <div className="bg-gray-50 rounded-lg p-2 mb-3">
        <div className="flex items-center justify-between">
          {(() => {
            const steps = ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'];
            const currentIndex = Math.max(0, steps.indexOf(ride.ride_status));
            return steps.map((s, idx) => {
              const completed = idx < currentIndex;
              const current = idx === currentIndex;
              const next = idx === currentIndex + 1;
              const clickable = next && !updatingStatus;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border
                      ${completed ? 'bg-blue-600 text-white border-blue-600' : ''}
                      ${current ? 'bg-blue-600 text-white border-blue-600' : ''}
                      ${next ? 'bg-white text-blue-700 border-blue-400 cursor-pointer hover:bg-blue-50' : ''}
                      ${(!completed && !current && !next) ? 'bg-gray-200 text-gray-600 border-gray-300' : ''}
                    `}
                    onClick={() => { if (clickable) updateTripStatus(s); }}
                  >
                    {completed ? '✓' : idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${idx < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              );
            });
          })()}
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Accept</span><span>En route</span><span>Arrived</span><span>Started</span>
        </div>
        <p className="text-[10px] text-blue-600 mt-0.5 text-center font-medium">👆 Tap next step to advance</p>
      </div>

      {/* Dynamic progress action */}
      {nextAction && !isRideCompleted && (
        <Button
          variant={nextAction.variant}
          size="md"
          onClick={() => updateTripStatus(nextAction.status)}
          disabled={updatingStatus || completing}
          className="w-full font-semibold"
        >
          {updatingStatus || completing ? '⏳ Updating...' : `▶️ ${nextAction.label}`}
        </Button>
      )}

      {/* Show current status if no action available */}
      {!nextAction && !isRideCompleted && (
        <div className="bg-gray-100 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-600">Current Status: {ride.ride_status}</p>
          <p className="text-xs text-gray-500 mt-1">Use the stepper above to advance</p>
        </div>
      )}
    </>
  );
};

export default StatusUpdateActions;

