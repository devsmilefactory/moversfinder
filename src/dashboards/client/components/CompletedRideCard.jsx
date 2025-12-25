import React, { useMemo } from 'react';
import { MapPin, Calendar, DollarSign, Star, RotateCcw, Zap, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fromGeoJSON } from '../../../utils/locationServices';
import Button from '../../shared/Button';
import { getRideProgressDetails } from '../../../utils/rideProgress';
import { isErrandService } from '../../../utils/serviceTypes';
import { getRideCostDisplay } from '../../../utils/rideCostDisplay';
import { getRideTypeHandler } from '../../../utils/rideTypeHandlers';

/**
 * Card component for completed rides
 */
const CompletedRideCard = ({ ride, onClick, tabContext = 'completed' }) => {
  const navigate = useNavigate();
  const handleRebook = (e) => {
    e.stopPropagation();
    const pickupCoords = fromGeoJSON(ride.pickup_coordinates);
    const dropoffCoords = fromGeoJSON(ride.dropoff_coordinates);
    navigate('/user/book-ride', {
      state: {
        rebookFromRide: {
          pickup: pickupCoords ? { ...pickupCoords, address: ride.pickup_address || ride.pickup_location } : null,
          dropoff: dropoffCoords ? { ...dropoffCoords, address: ride.dropoff_address || ride.dropoff_location } : null,
        }
      }
    });
  };

  // Get ride type handler for modular service-specific handling
  const rideTypeHandler = getRideTypeHandler(ride.service_type);
  
  // Get service type display info from handler
  const serviceInfo = rideTypeHandler.getServiceTypeInfo();
  const ServiceIcon = serviceInfo.icon;

  // Get ride timing info
  const getRideTimingInfo = () => {
    const timing = ride.ride_timing || 'instant';
    if (timing === 'instant') {
      return { icon: Zap, label: 'Instant', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else if (timing === 'scheduled_recurring') {
      return { icon: Repeat, label: 'Recurring', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else {
      return { icon: Calendar, label: 'Scheduled', color: 'text-purple-600', bgColor: 'bg-purple-100' };
    }
  };

  const timingInfo = getRideTimingInfo();
  const TimingIcon = timingInfo.icon;
  const progress = getRideProgressDetails(ride);

  const tripDuration = ride.trip_started_at && ride.trip_completed_at
    ? Math.round((new Date(ride.trip_completed_at) - new Date(ride.trip_started_at)) / 60000)
    : null;

  const tripSummary = () => {
    if (!progress.isMultiTrip && !progress.isRoundTrip) return null;
    if (tabContext === 'completed') {
      const subtitle =
        progress.remainingTrips > 0
          ? `${progress.remainingTrips} trip${progress.remainingTrips === 1 ? '' : 's'} remaining`
          : 'All trips completed';
      return {
        title: `${progress.completedTrips} of ${progress.totalTrips} trip${progress.totalTrips === 1 ? '' : 's'} done`,
        subtitle: subtitle || progress.recurrenceSummary,
      };
    }
    return {
      title: `${progress.totalTrips} trip${progress.totalTrips === 1 ? '' : 's'}`,
      subtitle: progress.recurrenceSummary,
    };
  };

  const summary = tripSummary();

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border border-slate-200"
      onClick={onClick}
    >
      {/* Header - Service Type & Ride Timing */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {/* Service Type - Prominent */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 ${serviceInfo.bgColor} rounded-lg`}>
              <ServiceIcon className={`w-5 h-5 ${serviceInfo.color}`} />
              <span className={`font-bold text-sm ${serviceInfo.color}`}>
                {serviceInfo.label}
              </span>
            </div>
            {/* Ride Timing Badge */}
            <div className={`flex items-center gap-1 px-2 py-1 ${timingInfo.bgColor} rounded-full`}>
              <TimingIcon className={`w-3.5 h-3.5 ${timingInfo.color}`} />
              <span className={`text-xs font-semibold ${timingInfo.color}`}>
                {timingInfo.label}
              </span>
            </div>
          </div>
          {/* Status & Rating */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              Completed
            </span>
            {ride.rating && (
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-bold text-yellow-700">{ride.rating}/5</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="text-lg font-bold text-green-600">
            {(() => {
              const costDisplay = getRideCostDisplay(ride);
              return costDisplay.display;
            })()}
          </div>
          {tripDuration && (
            <div className="text-xs text-slate-500">{tripDuration} min</div>
          )}
        </div>
      </div>

      {summary && (
        <div className="mb-3 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-sm font-bold text-green-700">
                {summary.title}
              </div>
              {summary.subtitle && (
                <div className="text-xs text-green-600">{summary.subtitle}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Service-specific card details using handler */}
      {rideTypeHandler.renderCardDetails(ride, 'completed', { onClick })}

      {/* Locations - Hidden for Errands */}
      {!isErrandService(ride.service_type) && (
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">From</div>
              <div className="text-sm text-slate-800 truncate">
                {ride.pickup_address || ride.pickup_location || '—'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">To</div>
              <div className="text-sm text-slate-800 truncate">
                {ride.dropoff_address || ride.dropoff_location || '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Info */}
      <div className="mb-3 bg-slate-50 rounded-lg px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="text-slate-600">
            <Calendar className="w-3 h-3 inline mr-1" />
            {new Date(ride.trip_completed_at || ride.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          {ride.distance_km && (
            <div className="text-slate-600">
              {parseFloat(ride.distance_km).toFixed(1)} km
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleRebook}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Rebook
        </Button>
        {!ride.rating && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Star className="w-3 h-3 mr-1" />
            Rate Driver
          </Button>
        )}
      </div>
    </div>
  );
};

export default CompletedRideCard;

