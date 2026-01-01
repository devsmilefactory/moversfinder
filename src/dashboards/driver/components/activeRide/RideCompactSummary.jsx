import React from 'react';
import { isRoundTripRide } from '../../../../utils/rideCostDisplay';

/**
 * RideCompactSummary
 *
 * Small, dense summary block used in the non-blocking active overlay.
 * Intentionally UI-only (no business logic / no state transitions).
 */
const RideCompactSummary = ({ ride, passengerPhone, isScheduled = false }) => {
  if (!ride) return null;

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
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">📍</span>
        <p className="text-gray-900 truncate flex-1">
          {ride.pickup_address || ride.pickup_location}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-gray-500">🎯</span>
        <p className="text-gray-900 truncate flex-1">
          {ride.dropoff_address || ride.dropoff_location}
        </p>
      </div>

      {ride.passenger_name && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">👤</span>
          <p className="text-gray-900">{ride.passenger_name}</p>
        </div>
      )}

      {passengerPhone && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500" title="Passenger phone">📞</span>
          <a
            href={`tel:${passengerPhone}`}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
            aria-label="Call passenger"
            title="Call passenger"
          >
            Passenger: {passengerPhone}
          </a>
        </div>
      )}

      {ride.estimated_cost && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">💰</span>
          <p className="text-green-700 font-medium">
            ${(parseFloat(ride.estimated_cost) || 0).toFixed(2)}
            {ride.number_of_trips && ride.number_of_trips > 1 && (
              <span className="text-xs text-gray-500 ml-1">
                (${((parseFloat(ride.estimated_cost) || 0) / (ride.number_of_trips || 1)).toFixed(2)} × {ride.number_of_trips})
              </span>
            )}
            {isRoundTripRide(ride) && (
              <span className="text-xs text-cyan-600 ml-1">🔄</span>
            )}
          </p>
        </div>
      )}

      {isScheduled && ride.scheduled_datetime && (
        <p className="text-xs text-gray-600 mt-0.5">
          📅 Scheduled for {formatScheduledTime(ride.scheduled_datetime)}
        </p>
      )}
    </div>
  );
};

export default RideCompactSummary;


