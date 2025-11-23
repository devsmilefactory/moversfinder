import React from 'react';
import Button from '../../../components/ui/Button';
import { MapPin, DollarSign, Navigation } from 'lucide-react';

/**
 * Active Trip Indicator Component
 *
 * Displays a prominent indicator at the top of the driver dashboard
 * when the driver has an active instant ride in progress.
 *
 * Features:
 * - Shows pickup and dropoff locations
 * - Displays current status and fare
 * - "View Details" button to open ride modal
 * - Only shows for active instant rides
 * - Styled with green gradient background
 */
const ActiveTripIndicator = ({ activeTrip, onViewDetails }) => {
  // Only show for active instant rides
  if (!activeTrip || activeTrip.ride_timing !== 'instant') return null;

  // Get status display text
  const getStatusText = (status) => {
    const statusMap = {
      'accepted': 'Driver Assigned',
      'driver_on_way': 'On The Way',
      'driver_arrived': 'Arrived at Pickup',
      'trip_started': 'Trip In Progress'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="fixed top-20 left-0 right-0 z-40 mx-4 animate-fade-in">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-lg p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Left: Icon and Trip Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Navigation className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg">Active Trip in Progress</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-green-100">
                <div className="flex items-center gap-1">
                  <span>📍</span>
                  <span className="truncate">Status: {getStatusText(activeTrip.ride_status)}</span>
                </div>
                {activeTrip.estimated_cost && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Fare: ${parseFloat(activeTrip.estimated_cost).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: View Details Button */}
          <Button
            onClick={onViewDetails}
            className="bg-white text-green-600 hover:bg-green-50 font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0 ml-4"
          >
            View Details
          </Button>
        </div>

        {/* Locations */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-green-100 text-xs">Pickup</p>
              <p className="font-medium truncate">{activeTrip.pickup_address || 'Not specified'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-green-100 text-xs">Dropoff</p>
              <p className="font-medium truncate">{activeTrip.dropoff_address || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveTripIndicator;
