import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import { RIDE_STATUSES } from '../../../../hooks/useRideStatus';
import {
  driverOnTheWay,
  driverArrived,
  startTrip,
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
  needsToBeStarted = false,
  onPromptNavigate
}) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const { completeRide, completing } = useRideCompletion();
  const [internalUpdating, setInternalUpdating] = useState(false);

  const PROGRESS_STEPS = [
    RIDE_STATUSES.ACCEPTED,
    RIDE_STATUSES.DRIVER_ON_WAY,
    RIDE_STATUSES.DRIVER_ARRIVED,
    RIDE_STATUSES.TRIP_STARTED,
    RIDE_STATUSES.TRIP_COMPLETED
  ];

  // Normalize status using the platform state machine fields when available.
  // This avoids UI confusion when ride_status lags state/execution_sub_state.
  const getCanonicalStatusForProgress = () => {
    const rawStatus = (ride?.ride_status || ride?.status || '').toLowerCase();
    const state = (ride?.state || '').toUpperCase();
    const sub = (ride?.execution_sub_state || '').toUpperCase();

    if (state === 'ACTIVE_PRE_TRIP') return RIDE_STATUSES.ACCEPTED;

    if (state === 'ACTIVE_EXECUTION') {
      if (sub === 'DRIVER_ON_THE_WAY') return RIDE_STATUSES.DRIVER_ON_WAY;
      if (sub === 'DRIVER_ARRIVED') return RIDE_STATUSES.DRIVER_ARRIVED;
      if (sub === 'TRIP_STARTED') return RIDE_STATUSES.TRIP_STARTED;
      // fall back to ride_status if sub-state not present/known
    }

    if (state === 'COMPLETED_INSTANCE') return RIDE_STATUSES.TRIP_COMPLETED;
    if (state === 'COMPLETED_FINAL') return RIDE_STATUSES.TRIP_COMPLETED;
    if (state === 'CANCELLED') return RIDE_STATUSES.CANCELLED;

    // Handle common aliases
    if ([RIDE_STATUSES.DRIVER_EN_ROUTE, RIDE_STATUSES.DRIVER_ENROUTE].includes(rawStatus)) {
      return RIDE_STATUSES.DRIVER_ON_WAY;
    }
    if ([RIDE_STATUSES.JOURNEY_STARTED, RIDE_STATUSES.IN_PROGRESS, RIDE_STATUSES.RIDE_IN_PROGRESS].includes(rawStatus)) {
      return RIDE_STATUSES.TRIP_STARTED;
    }
    if ([RIDE_STATUSES.DRIVER_ASSIGNED, RIDE_STATUSES.DRIVER_CONFIRMED, RIDE_STATUSES.OFFER_ACCEPTED].includes(rawStatus)) {
      return RIDE_STATUSES.ACCEPTED;
    }
    if (rawStatus === RIDE_STATUSES.COMPLETED) return RIDE_STATUSES.TRIP_COMPLETED;

    return rawStatus || RIDE_STATUSES.ACCEPTED;
  };

  const canonicalStatus = getCanonicalStatusForProgress();

  const getNextStatus = (status) => {
    const idx = PROGRESS_STEPS.indexOf(status);
    if (idx < 0) {
      // If status is unknown (or still syncing), default to the first step
      return PROGRESS_STEPS[0];
    }
    if (idx >= PROGRESS_STEPS.length - 1) return null;
    return PROGRESS_STEPS[idx + 1];
  };

  // Get next action based on current status
  const getNextAction = () => {
    const nextStatus = getNextStatus(canonicalStatus);
    if (!nextStatus) return null;

    switch (canonicalStatus) {
      case RIDE_STATUSES.ACCEPTED:
        return { label: isScheduled ? 'Begin Trip' : 'Start Driving to Pickup', status: nextStatus, variant: 'primary' };
      case RIDE_STATUSES.DRIVER_ON_WAY:
        return { label: 'Mark as Arrived', status: nextStatus, variant: 'primary' };
      case RIDE_STATUSES.DRIVER_ARRIVED:
        return { label: 'Start Trip', status: nextStatus, variant: 'success' };
      case RIDE_STATUSES.TRIP_STARTED:
        return { label: 'Complete Trip', status: nextStatus, variant: 'success' };
      default:
        // If we’re in an unknown “active” alias, still allow progressing to next known step.
        return { label: 'Continue', status: nextStatus, variant: 'primary' };
    }
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
    if (internalUpdating) return;
    setInternalUpdating(true);
    try {
      if (!ride?.id) {
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: 'Ride ID missing. Please refresh and try again.'
        });
        return;
      }
      if (!user?.id) {
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: 'User session not ready. Please wait a moment and try again.'
        });
        return;
      }

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
        case RIDE_STATUSES.DRIVER_ON_WAY:
          transitionResult = await runWithRetry(() => driverOnTheWay(ride.id, user?.id));
          break;
        case RIDE_STATUSES.DRIVER_ARRIVED:
          transitionResult = await runWithRetry(() => driverArrived(ride.id, user?.id));
          break;
        case RIDE_STATUSES.TRIP_STARTED:
          transitionResult = await runWithRetry(() => startTrip(ride.id, user?.id));
          break;
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
          const updatedRide =
            transitionResult.ride ||
            transitionResult.data?.ride ||
            transitionResult.data ||
            null;
          onStatusUpdate(newStatus, updatedRide);
        }

        // Prompt navigation modal after key transitions (in addition to status changes)
        if (typeof onPromptNavigate === 'function') {
          if (newStatus === RIDE_STATUSES.DRIVER_ON_WAY) {
            onPromptNavigate({ defaultDestination: 'pickup' });
          }
          if (newStatus === RIDE_STATUSES.TRIP_STARTED) {
            onPromptNavigate({ defaultDestination: 'dropoff' });
          }
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
    } finally {
      setInternalUpdating(false);
    }
  };

  const nextAction = getNextAction();
  const busy = updatingStatus || completing || internalUpdating;

  return (
    <>
      {/* Progress Stepper - Compact */}
      <div className="bg-gray-50 rounded-lg p-2 mb-3">
        <div className="flex items-center justify-between">
          {(() => {
            const stepItems = [
              { status: RIDE_STATUSES.ACCEPTED, label: 'Accepted' },
              { status: RIDE_STATUSES.DRIVER_ON_WAY, label: 'En route' },
              { status: RIDE_STATUSES.DRIVER_ARRIVED, label: 'Arrived' },
              { status: RIDE_STATUSES.TRIP_STARTED, label: 'Trip' },
              { status: RIDE_STATUSES.TRIP_COMPLETED, label: 'Done' },
            ];
            const currentIndex = Math.max(0, stepItems.findIndex(s => s.status === canonicalStatus));
            const nextStatus = getNextStatus(canonicalStatus);
            return stepItems.map((s, idx) => {
              const completed = idx < currentIndex;
              const current = idx === currentIndex;
              const next = idx === currentIndex + 1;
              const clickable = next && !busy;
              return (
                <div key={s.status} className="flex items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border
                      ${completed ? 'bg-blue-600 text-white border-blue-600' : ''}
                      ${current ? 'bg-blue-600 text-white border-blue-600' : ''}
                      ${next ? 'bg-white text-blue-700 border-blue-400 cursor-pointer hover:bg-blue-50' : ''}
                      ${(!completed && !current && !next) ? 'bg-gray-200 text-gray-600 border-gray-300' : ''}
                    `}
                    onClick={() => { if (clickable && nextStatus) updateTripStatus(nextStatus); }}
                    title={clickable ? `Next: ${s.label}` : s.label}
                  >
                    {completed ? '✓' : idx + 1}
                  </div>
                  {idx < stepItems.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${idx < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              );
            });
          })()}
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Accepted</span><span>En route</span><span>Arrived</span><span>Trip</span><span>Done</span>
        </div>
        <p className="text-[10px] text-blue-600 mt-0.5 text-center font-medium">👆 Tap next step to advance</p>
      </div>

      {/* Dynamic progress action */}
      {nextAction && !isRideCompleted && (
        <Button
          variant={nextAction.variant}
          size="md"
          onClick={() => updateTripStatus(nextAction.status)}
          disabled={busy}
          className="w-full font-semibold"
        >
          {busy ? '⏳ Updating...' : `▶️ ${nextAction.label}`}
        </Button>
      )}

      {/* Show current status if no action available */}
      {!nextAction && !isRideCompleted && (
        <div className="bg-gray-100 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-600">
            Current Status: {ride?.ride_status || ride?.status || 'unknown'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Use the stepper above to advance</p>
        </div>
      )}
    </>
  );
};

export default StatusUpdateActions;

