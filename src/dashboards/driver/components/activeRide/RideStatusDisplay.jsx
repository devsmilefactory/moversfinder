import React from 'react';

/**
 * RideStatusDisplay Component
 * 
 * Displays the current status of an active ride with appropriate styling
 */
const RideStatusDisplay = ({ ride, isScheduled }) => {
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

  return (
    <div className={`border rounded-lg p-4 ${statusDisplay.color}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{statusDisplay.icon}</span>
        <div>
          <h3 className={`font-semibold ${statusDisplay.textColor}`}>
            {statusDisplay.text}
          </h3>
          <p className="text-sm text-gray-600">
            Ride #{ride.id?.toString().slice(-6)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RideStatusDisplay;