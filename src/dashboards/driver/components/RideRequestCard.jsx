import React from 'react';
import { MapPin, Clock, User, MessageSquare } from 'lucide-react';
import ActionButtons from './ActionButtons';
import { formatDistance, formatCurrency, formatTime } from '../../../utils/formatters';
import { calculateDistance, fromGeoJSON } from '../../../utils/locationServices';

/**
 * RideRequestCard Component
 * 
 * Individual ride request card with action buttons
 */
const RideRequestCard = ({
  ride,
  isSelected,
  driverLocation,
  onSelect,
  onBidClick,
  onAcceptClick,
  onDeclineClick,
  onShowDetails,
  loading
}) => {
  const getServiceIcon = (serviceType) => {
    switch (serviceType) {
      case 'taxi': return '🚕';
      case 'courier': return '📦';
      case 'errands': return '🛍️';
      case 'school_run': return '🎒';
      default: return '🚗';
    }
  };

  const getStatusColor = (status) => {
    // Standardize on ride_status values
    switch (status) {
      case 'pending': return 'text-green-600 bg-green-50';
      case 'accepted': return 'text-blue-600 bg-blue-50';
      case 'driver_on_way': return 'text-purple-600 bg-purple-50';
      case 'driver_arrived': return 'text-indigo-600 bg-indigo-50';
      case 'trip_started': return 'text-orange-600 bg-orange-50';
      case 'trip_completed':
      case 'completed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDistanceFromDriver = () => {
    if (!driverLocation || !ride.pickup_coordinates) return null;
    
    // Support both legacy {lat, lng} and new GeoJSON format
    let pickupCoords = ride.pickup_coordinates;
    if (pickupCoords.type === 'Point' && Array.isArray(pickupCoords.coordinates)) {
      pickupCoords = fromGeoJSON(pickupCoords);
    }
    
    if (!pickupCoords || typeof pickupCoords.lat !== 'number') return null;

    return calculateDistance(driverLocation, pickupCoords);
  };

  const distanceFromDriver = getDistanceFromDriver();
  const currentStatus = ride.ride_status || ride.status || 'pending';

  return (
    <div 
      className={`bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getServiceIcon(ride.service_type)}</span>
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {ride.service_type?.replace('_', ' ')} Request
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                  {currentStatus.replace('_', ' ').toUpperCase()}
                </span>
                {distanceFromDriver !== null && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(distanceFromDriver)} away
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(ride.estimated_cost || ride.fare)}
            </div>
            {ride.distance_km && (
              <div className="text-sm text-gray-500">
                {formatDistance(ride.distance_km)}
              </div>
            )}
          </div>
        </div>

        {/* Route Information */}
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Pickup</p>
              <p className="text-sm text-gray-600">{ride.pickup_address || ride.pickup_location}</p>
            </div>
          </div>
          
          {(ride.dropoff_address || ride.dropoff_location) && (
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Dropoff</p>
                <p className="text-sm text-gray-600">{ride.dropoff_address || ride.dropoff_location}</p>
              </div>
            </div>
          )}
        </div>

        {/* Ride Details */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          {(ride.pickup_time || ride.scheduled_datetime) && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatTime(ride.pickup_time || ride.scheduled_datetime)}</span>
            </div>
          )}
          
          {(ride.passenger_count || ride.number_of_passengers) && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>
                {ride.passenger_count || ride.number_of_passengers} passenger
                {(ride.passenger_count || ride.number_of_passengers) > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {(ride.special_requests || ride.special_instructions) && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>Special instructions</span>
            </div>
          )}
        </div>

        {/* Existing Offers */}
        {ride.offers && ride.offers.length > 0 && (
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">
              {ride.offers.length} offer{ride.offers.length > 1 ? 's' : ''} received
            </p>
            <div className="flex items-center gap-2">
              {ride.offers.slice(0, 3).map((offer, index) => (
                <span key={index} className="text-xs bg-white px-2 py-1 rounded border">
                  {formatCurrency(offer.offer_amount)}
                </span>
              ))}
              {ride.offers.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{ride.offers.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <ActionButtons
          ride={ride}
          onBidClick={() => onBidClick()}
          onAcceptClick={() => onAcceptClick()}
          onDeclineClick={(reason) => onDeclineClick(reason)}
          onShowDetails={() => onShowDetails()}
          loading={loading}
          size="sm"
          layout="horizontal"
        />
      </div>
    </div>
  );
};

export default RideRequestCard;