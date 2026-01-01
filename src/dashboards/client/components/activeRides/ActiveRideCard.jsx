import React, { useState } from 'react';
import Button from '../../../shared/Button';
import { formatDistanceToNow } from 'date-fns';

/**
 * ActiveRideCard Component
 * 
 * Displays information for a single active ride
 */
const ActiveRideCard = ({ 
  ride, 
  driverInfo, 
  driverLocation, 
  onViewDetails, 
  onCancel, 
  onContactDriver 
}) => {
  const [showDriverDetails, setShowDriverDetails] = useState(false);

  const getStatusDisplay = () => {
    switch (ride.ride_status) {
      case 'accepted':
        return {
          icon: '✅',
          text: 'Ride Accepted',
          color: 'bg-green-50 border-green-200 text-green-800'
        };
      case 'driver_on_way':
        return {
          icon: '🚗',
          text: 'Driver On The Way',
          color: 'bg-blue-50 border-blue-200 text-blue-800'
        };
      case 'driver_arrived':
        return {
          icon: '📍',
          text: 'Driver Arrived',
          color: 'bg-purple-50 border-purple-200 text-purple-800'
        };
      case 'trip_started':
        return {
          icon: '🎯',
          text: 'Trip In Progress',
          color: 'bg-orange-50 border-orange-200 text-orange-800'
        };
      default:
        return {
          icon: '⏳',
          text: 'Active',
          color: 'bg-gray-50 border-gray-200 text-gray-800'
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const driver = driverInfo;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{statusDisplay.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">
              {ride.service_type?.charAt(0).toUpperCase() + ride.service_type?.slice(1)} Ride
            </h3>
            <p className="text-sm text-gray-600">
              Ride #{ride.id?.toString().slice(-6)}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusDisplay.color}`}>
          {statusDisplay.text}
        </div>
      </div>

      {/* Route Information */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-green-600 mt-1">📍</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Pickup</p>
            <p className="text-sm text-gray-600">{ride.pickup_address}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-red-600 mt-1">🎯</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Dropoff</p>
            <p className="text-sm text-gray-600">{ride.dropoff_address}</p>
          </div>
        </div>
      </div>

      {/* Driver Information */}
      {driver && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Your Driver</h4>
            <button
              onClick={() => setShowDriverDetails(!showDriverDetails)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showDriverDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {driver.profile_picture_url ? (
              <img
                src={driver.profile_picture_url}
                alt={driver.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-lg">👤</span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{driver.full_name}</p>
              {showDriverDetails && (
                <div className="mt-2 space-y-1">
                  {driver.vehicle_make && (
                    <p className="text-sm text-gray-600">
                      🚗 {driver.vehicle_make} {driver.vehicle_model} - {driver.vehicle_color}
                    </p>
                  )}
                  {driver.license_plate && (
                    <p className="text-sm text-gray-600">
                      🔢 {driver.license_plate}
                    </p>
                  )}
                </div>
              )}
            </div>
            {driver.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onContactDriver(driver.phone)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                📞 Call
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Driver Location Status */}
      {driverLocation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">📍</span>
            <div>
              <p className="text-sm font-medium text-blue-900">Driver Location</p>
              <p className="text-xs text-blue-700">
                Last updated {formatDistanceToNow(new Date(driverLocation.updated_at))} ago
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ride Timing */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {ride.ride_timing === 'instant' ? 'Instant Ride' : 'Scheduled Ride'}
        </span>
        <span>
          Created {formatDistanceToNow(new Date(ride.created_at))} ago
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={() => onViewDetails(ride)}
          className="flex-1"
        >
          View Details
        </Button>
        {!['completed', 'cancelled'].includes((ride.ride_status || '').toLowerCase()) && (
          <Button
            variant="outline"
            size="md"
            onClick={() => onCancel(ride.id)}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActiveRideCard;