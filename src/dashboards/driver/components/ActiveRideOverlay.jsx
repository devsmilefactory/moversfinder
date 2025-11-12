import React from 'react';
import Button from '../../../components/ui/Button';

/**
 * ActiveRideOverlay Component
 * 
 * Displays an overlay on all tabs when driver has an active ride
 * Prevents accepting other rides and provides quick access to active ride actions
 */
const ActiveRideOverlay = ({ ride, onNavigateToPickup, onViewDetails, onCancel }) => {
  if (!ride) return null;

  const isScheduled = ride.ride_timing !== 'instant';
  const isInstant = ride.ride_timing === 'instant';
  
  // Determine ride status display
  const getStatusDisplay = () => {
    switch (ride.ride_status) {
      case 'accepted':
        return {
          icon: '✅',
          text: isScheduled ? 'Scheduled Ride Accepted' : 'Ride Accepted',
          color: 'bg-green-50 border-green-200',
          textColor: 'text-green-900'
        };
      case 'driver_on_way':
        return {
          icon: '🚗',
          text: 'On the way to pickup',
          color: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-900'
        };
      case 'driver_arrived':
        return {
          icon: '📍',
          text: 'Arrived at pickup',
          color: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-900'
        };
      case 'trip_started':
        return {
          icon: '🎯',
          text: 'Trip in progress',
          color: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-900'
        };
      default:
        return {
          icon: '⏳',
          text: 'Active Ride',
          color: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-900'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Check if ride needs to be started (scheduled rides only)
  const needsToBeStarted = isScheduled && ride.ride_status === 'accepted';
  
  // Format scheduled time
  const formatScheduledTime = (datetime) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className={`rounded-lg p-4 border-2 ${statusDisplay.color}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{statusDisplay.icon}</span>
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${statusDisplay.textColor}`}>
                {statusDisplay.text}
              </h3>
              {isScheduled && ride.scheduled_datetime && (
                <p className="text-sm text-gray-600 mt-1">
                  📅 Scheduled for {formatScheduledTime(ride.scheduled_datetime)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ride Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-gray-500">📍</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium text-gray-900">
                {ride.pickup_address || ride.pickup_location}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-500">🎯</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Dropoff</p>
              <p className="text-sm font-medium text-gray-900">
                {ride.dropoff_address || ride.dropoff_location}
              </p>
            </div>
          </div>
          {ride.passenger_name && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500">👤</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Passenger</p>
                <p className="text-sm font-medium text-gray-900">{ride.passenger_name}</p>
              </div>
            </div>
          )}
          {ride.estimated_cost && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500">💰</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Fare</p>
                <p className="text-sm font-medium text-green-700">
                  ${parseFloat(ride.estimated_cost).toFixed(2)}
                </p>
                {ride.number_of_trips && ride.number_of_trips > 1 && (
                  <p className="text-xs text-gray-500">
                    ${(parseFloat(ride.estimated_cost) / ride.number_of_trips).toFixed(2)} × {ride.number_of_trips} trips
                  </p>
                )}
                {ride.is_round_trip && (
                  <p className="text-xs text-cyan-600">🔄 Round trip</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Warning Message */}
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

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            variant="primary"
            size="lg"
            onClick={onViewDetails}
            className="w-full"
          >
            📱 View Full Ride Details
          </Button>
          
          {!needsToBeStarted && ride.ride_status !== 'trip_started' && (
            <Button
              variant="success"
              size="lg"
              onClick={onNavigateToPickup}
              className="w-full"
            >
              🗺️ Navigate to Pickup
            </Button>
          )}

          <Button
            variant="danger"
            size="md"
            onClick={onCancel}
            className="w-full"
          >
            ❌ Cancel Ride
          </Button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-center text-gray-500">
          This overlay will remain until the ride is completed or cancelled
        </p>
      </div>
    </div>
  );
};

export default ActiveRideOverlay;

