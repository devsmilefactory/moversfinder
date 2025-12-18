/**
 * CardMetadata Component
 * 
 * Displays ride metadata such as distance, cost, and passenger/driver information.
 * Adapts based on role and what information is available.
 */

import React from 'react';
import { Navigation, Ruler, Wallet, User, Phone } from 'lucide-react';
import { formatPrice, formatDistance } from '../../utils/formatters';

/**
 * CardMetadata - Shows ride metadata
 * @param {Object} props
 * @param {Object} props.ride - Ride object
 * @param {string} props.role - User role ('driver' or 'passenger')
 * @param {boolean} props.showDistance - Show distance information
 * @param {boolean} props.showCost - Show cost information
 * @param {boolean} props.showPassengerInfo - Show passenger information (for drivers)
 * @param {boolean} props.showDriverInfo - Show driver information (for passengers)
 */
const CardMetadata = ({
  ride,
  role = 'passenger',
  showDistance = true,
  showCost = true,
  showPassengerInfo = false,
  showDriverInfo = false
}) => {
  const isErrand = (ride.service_type || '').toLowerCase().includes('errand');
  
  // Use consistent field names from updated RPCs
  const distanceKm = ride.distance_km ?? ride.distance;
  const estimatedCost = ride.estimated_cost ?? ride.fare ?? ride.quoted_price;
  const passengerName = ride.passenger_name;
  const passengerPhone = ride.passenger_phone || ride.contact_number;
  const driverName = ride.driver_name;
  const driverPhone = ride.driver_phone;

  return (
    <div className="space-y-3">
      {/* Distance and Cost Grid */}
      {(showDistance || showCost) && (
        <div className={`grid ${isErrand ? 'grid-cols-2' : 'grid-cols-3'} gap-2 pt-2 border-t border-gray-200`}>
          {/* Distance to Driver (for drivers only) */}
          {role === 'driver' && showDistance && ride.distance_to_driver_km !== null && ride.distance_to_driver_km !== undefined && !isErrand && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <Navigation className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600 mb-0.5">To Pickup</p>
              <p className="text-sm font-bold text-blue-700">
                {formatDistance(ride.distance_to_driver_km)}
              </p>
            </div>
          )}

          {/* Trip Distance */}
          {showDistance && distanceKm !== null && distanceKm !== undefined && !isErrand && (
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <Ruler className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600 mb-0.5">Trip Dist</p>
              <p className="text-sm font-bold text-purple-700">
                {formatDistance(distanceKm)}
              </p>
            </div>
          )}

          {/* Cost */}
          {showCost && estimatedCost && (
            <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
              <Wallet className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-green-700 mb-0.5">{isErrand ? 'Total Cost' : 'Price'}</p>
              <p className="text-sm font-bold text-green-800">
                {formatPrice(parseFloat(estimatedCost || 0))}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Passenger Information (for drivers) */}
      {showPassengerInfo && passengerName && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-medium text-blue-700">Passenger</p>
          </div>
          <p className="text-sm font-semibold text-blue-900">{passengerName}</p>
          {passengerPhone && (
            <div className="flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3 text-blue-600" />
              <p className="text-xs text-blue-700">{passengerPhone}</p>
            </div>
          )}
        </div>
      )}

      {/* Driver Information (for passengers) */}
      {showDriverInfo && driverName && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-medium text-blue-700">Driver</p>
          </div>
          <p className="text-sm font-semibold text-blue-900">{driverName}</p>
          {driverPhone && (
            <div className="flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3 text-blue-600" />
              <p className="text-xs text-blue-700">{driverPhone}</p>
            </div>
          )}
          {ride.vehicle_info && (
            <p className="text-xs text-blue-700 mt-1">
              {ride.vehicle_info.make || ride.vehicle_info.brand} {ride.vehicle_info.model} • {ride.vehicle_info.plate_number || ride.vehicle_info.plate}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CardMetadata;
