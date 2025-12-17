import React from 'react';
import { getNavigationUrlTo } from '../../../../utils/navigation';

/**
 * RideLocationInfo Component
 * 
 * Displays pickup and dropoff locations with navigation links
 */
const RideLocationInfo = ({ ride, passengerPhone }) => {
  const handleNavigateToPickup = () => {
    const url = getNavigationUrlTo(ride.pickup_latitude, ride.pickup_longitude);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleNavigateToDropoff = () => {
    const url = getNavigationUrlTo(ride.dropoff_latitude, ride.dropoff_longitude);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleCallPassenger = () => {
    if (passengerPhone) {
      window.open(`tel:${passengerPhone}`, '_self');
    }
  };

  return (
    <div className="space-y-4">
      {/* Pickup Location */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 text-lg">📍</span>
              <h4 className="font-medium text-gray-900">Pickup Location</h4>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {ride.pickup_address || 'Address not available'}
            </p>
            {ride.pickup_latitude && ride.pickup_longitude && (
              <button
                onClick={handleNavigateToPickup}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                🧭 Navigate to Pickup
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dropoff Location */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 text-lg">🎯</span>
              <h4 className="font-medium text-gray-900">Dropoff Location</h4>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {ride.dropoff_address || 'Address not available'}
            </p>
            {ride.dropoff_latitude && ride.dropoff_longitude && (
              <button
                onClick={handleNavigateToDropoff}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                🧭 Navigate to Dropoff
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contact Passenger */}
      {passengerPhone && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Contact Passenger</h4>
              <p className="text-sm text-blue-700">Call for directions or updates</p>
            </div>
            <button
              onClick={handleCallPassenger}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              📞 Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideLocationInfo;