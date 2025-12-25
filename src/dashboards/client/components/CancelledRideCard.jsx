import React, { useMemo } from 'react';
import { MapPin, XCircle, Calendar, RotateCcw, Zap, Repeat } from 'lucide-react';
import Button from '../../shared/Button';
import { getRideProgressDetails } from '../../../utils/rideProgress';
import { getRideTypeHandler } from '../../../utils/rideTypeHandlers';

/**
 * Card component for cancelled rides
 */
const CancelledRideCard = ({ ride, onClick, tabContext = 'cancelled' }) => {
  const handleRebook = (e) => {
    e.stopPropagation();
    // TODO: Implement rebook functionality
    alert('Rebook feature coming soon!');
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

  const summary = () => {
    if (!progress.totalTrips) return null;
    return {
      title:
        tabContext === 'cancelled'
          ? `${progress.totalTrips} trip${progress.totalTrips === 1 ? '' : 's'} cancelled`
          : `${progress.totalTrips} trip${progress.totalTrips === 1 ? '' : 's'}`,
      subtitle: progress.recurrenceSummary,
    };
  };

  const tripSummary = summary();

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border border-slate-200 opacity-75"
      onClick={onClick}
    >
      {/* Header - Service Type & Ride Timing */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {/* Service Type - Prominent */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 ${serviceInfo.bgColor} rounded-lg opacity-60`}>
              <ServiceIcon className={`w-5 h-5 ${serviceInfo.color}`} />
              <span className={`font-bold text-sm ${serviceInfo.color}`}>
                {serviceInfo.label}
              </span>
            </div>
            {/* Ride Timing Badge */}
            <div className={`flex items-center gap-1 px-2 py-1 ${timingInfo.bgColor} rounded-full opacity-60`}>
              <TimingIcon className={`w-3.5 h-3.5 ${timingInfo.color}`} />
              <span className={`text-xs font-semibold ${timingInfo.color}`}>
                {timingInfo.label}
              </span>
            </div>
          </div>
          {/* Status Badge */}
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1 inline-flex">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        </div>
        <div className="text-right ml-2">
          <div className="text-sm text-slate-500 line-through">
            ${(parseFloat(ride.estimated_cost || ride.fare) || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {tripSummary && (
        <div className="mb-3 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-red-600" />
            <div>
              <div className="text-sm font-bold text-red-700">
                {tripSummary.title}
              </div>
              {tripSummary.subtitle && (
                <div className="text-xs text-red-600">{tripSummary.subtitle}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Info */}
      {ride.cancellation_reason && (
        <div className="mb-3 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
          <div className="text-xs text-red-600 font-medium">
            Reason: {ride.cancellation_reason}
          </div>
          {ride.cancelled_by && (
            <div className="text-xs text-red-500 mt-1">
              Cancelled by: {ride.cancelled_by}
            </div>
          )}
        </div>
      )}

      {/* Service-specific card details using handler */}
      {rideTypeHandler.renderCardDetails(ride, 'cancelled', { onClick })}

      {/* Locations */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">From</div>
            <div className="text-sm text-slate-600 truncate">
              {ride.pickup_address || ride.pickup_location || '—'}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">To</div>
            <div className="text-sm text-slate-600 truncate">
              {ride.dropoff_address || ride.dropoff_location || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Date */}
      <div className="mb-3 bg-slate-50 rounded-lg px-3 py-2">
        <div className="flex items-center text-xs text-slate-600">
          <Calendar className="w-3 h-3 mr-1" />
          Cancelled on {new Date(ride.cancelled_at || ride.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleRebook}
      >
        <RotateCcw className="w-3 h-3 mr-1" />
        Rebook This Ride
      </Button>
    </div>
  );
};

export default CancelledRideCard;

