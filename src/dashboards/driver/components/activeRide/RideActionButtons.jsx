import React from 'react';
import Button from '../../../../components/ui/Button';
import { RIDE_STATUSES } from '../../../../hooks/useRideStatus';

/**
 * RideActionButtons Component
 * 
 * Displays action buttons based on current ride status
 */
const RideActionButtons = ({
  ride,
  canonicalStatus,
  isScheduled,
  needsToBeStarted,
  updatingStatus,
  completing,
  onStatusUpdate,
  onCompleteRide,
  onCancel
}) => {
  const status = (canonicalStatus || ride?.ride_status || '').toLowerCase();
  const isRideCompleted = 
    status === RIDE_STATUSES.TRIP_COMPLETED ||
    status === RIDE_STATUSES.COMPLETED;

  const getNextAction = () => {
    if (isRideCompleted) return null;

    switch (status) {
      case 'accepted':
        return {
          label: isScheduled ? 'Begin Trip' : 'On My Way',
          status: 'driver_on_way',
          icon: '🚗',
          variant: 'primary'
        };
      case 'driver_on_way':
        return {
          label: 'Mark Arrived',
          status: 'driver_arrived',
          icon: '📍',
          variant: 'primary'
        };
      case 'driver_arrived':
        return {
          label: 'Start Trip',
          status: 'trip_started',
          icon: '🎯',
          variant: 'primary'
        };
      case 'trip_started':
        return {
          label: 'Complete Trip',
          action: 'complete',
          icon: '✅',
          variant: 'success'
        };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  const handleActionClick = () => {
    if (!nextAction) return;

    if (nextAction.action === 'complete') {
      onCompleteRide();
    } else {
      onStatusUpdate(nextAction.status);
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary Action Button */}
      {nextAction && (
        <Button
          variant={nextAction.variant}
          size="lg"
          onClick={handleActionClick}
          disabled={updatingStatus || completing}
          className="w-full"
        >
          {updatingStatus || completing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {completing ? 'Completing...' : 'Updating...'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>{nextAction.icon}</span>
              {nextAction.label}
            </span>
          )}
        </Button>
      )}

      {/* Cancel Button - Allowed in any non-terminal state */}
      {!['completed', 'cancelled'].includes(status) && (
        <Button
          variant="outline"
          size="md"
          onClick={onCancel}
          disabled={updatingStatus || completing}
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
        >
          Cancel Ride
        </Button>
      )}
    </div>
  );
};

export default RideActionButtons;