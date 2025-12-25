import React, { useState, useMemo } from 'react';
import { Bell, MapPin, Calendar, XCircle, Loader2, Zap, Repeat } from 'lucide-react';
import Button from '../../shared/Button';
import { useCancelRide } from '../../../hooks/useCancelRide';
import { getRideProgressDetails } from '../../../utils/rideProgress';
import { isErrandService } from '../../../utils/serviceTypes';
import { getRoundTripDisplay } from '../../../utils/roundTripHelpers';
import { getRideCostDisplay } from '../../../utils/rideCostDisplay';
import { formatPrice } from '../../../utils/formatters';
import { getRideTypeHandler } from '../../../utils/rideTypeHandlers';

/**
 * Card component for pending rides (awaiting driver offers)
 */
const PendingRideCard = ({ ride, offerCount = 0, onClick, onCancelled, tabContext = 'pending' }) => {
  const [cancelling, setCancelling] = useState(false);
  const { cancelRide } = useCancelRide();

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

  const handleCancelRide = async (e) => {
    e.stopPropagation(); // Prevent card click

    if (!confirm('Are you sure you want to cancel this ride?')) {
      return;
    }

    setCancelling(true);
    try {
      const result = await cancelRide({
        rideId: ride.id,
        role: 'passenger',
        reason: 'Cancelled by passenger',
      });

      if (result?.success && onCancelled) {
        onCancelled();
      }
    } finally {
      setCancelling(false);
    }
  };

  const isScheduled = ride.ride_timing !== 'instant';
  const scheduledTime = ride.scheduled_datetime || ride.scheduled_time;
  const progress = getRideProgressDetails(ride);
  
  // Get round trip display info
  const roundTripInfo = getRoundTripDisplay(ride);
  
  // Get cost display with leg breakdown
  const costDisplay = getRideCostDisplay(ride);

  const tripSummary = () => {
    const plannedLabel =
      progress.totalTrips === 1
        ? '1 trip'
        : `${progress.totalTrips} trips`;

    const title =
      tabContext === 'pending'
        ? `${plannedLabel} planned`
        : plannedLabel;

    const subtitle =
      progress.recurrenceSummary ||
      (progress.isRoundTrip ? 'Includes return ride' : 'Single ride');

    return { title, subtitle };
  };

  const summary = tripSummary();
  const showTripSummary = progress.isMultiTrip || progress.isRoundTrip;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
        offerCount > 0 ? 'border-2 border-blue-400 ring-2 ring-blue-100' : 'border border-slate-200'
      }`}
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
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
              Awaiting Offers
            </span>
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="text-lg font-bold text-green-600">
            {costDisplay.perTripDisplay || costDisplay.display}
          </div>
          <div className="text-xs text-slate-500">
            {costDisplay.perTripDisplay ? 'Per Trip' : (costDisplay.label || 'Estimated')}
          </div>
          {costDisplay.perTripDisplay && (
            <div className="text-xs text-slate-600 mt-1">
              {costDisplay.display} total
            </div>
          )}
        </div>
      </div>

      {/* Round Trip Leg Display */}
      {roundTripInfo && (
        <div className="mb-3 bg-indigo-50 rounded-lg px-3 py-2.5 border border-indigo-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{roundTripInfo.indicator}</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-indigo-700">
                {roundTripInfo.displayText}
              </div>
              {roundTripInfo.isRecurring && (
                <div className="text-xs text-indigo-600 mt-0.5">
                  {roundTripInfo.legLabel} leg of occurrence {roundTripInfo.occurrenceNumber}
                </div>
              )}
            </div>
            {costDisplay.breakdown && (
              <div className="text-right">
                <div className="text-xs text-indigo-600">
                  Out: {formatPrice(costDisplay.breakdown.outbound)}
                </div>
                <div className="text-xs text-indigo-600">
                  Ret: {formatPrice(costDisplay.breakdown.return)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTripSummary && !roundTripInfo && (
        <div className="mb-3 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-bold text-blue-700">
                {summary.title}
              </div>
              {summary.subtitle && (
                <div className="text-xs text-blue-600">{summary.subtitle}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offer Notification - Prominent with Animation */}
      {offerCount > 0 && (
        <div className="mb-3 relative overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 animate-pulse opacity-20"></div>
          
          {/* Main notification content */}
          <div className="relative flex items-center gap-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl px-4 py-4 border-2 border-green-400 shadow-lg">
            {/* Animated bell icon */}
            <div className="flex-shrink-0">
              <div className="relative">
                <Bell className="w-7 h-7 text-green-600 animate-bounce" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            </div>
            
            {/* Text content */}
            <div className="flex-1">
              <div className="text-base font-bold text-green-700 mb-0.5">
                🎉 {offerCount} Driver Offer{offerCount !== 1 ? 's' : ''} Received!
              </div>
              <div className="text-sm text-green-600 font-medium">
                Tap card to view details and accept
              </div>
            </div>
            
            {/* Count badge */}
            <div className="flex-shrink-0">
              <div className="bg-green-500 text-white font-bold text-lg px-3 py-2 rounded-full shadow-md">
                {offerCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service-specific card details using handler */}
      {rideTypeHandler.renderCardDetails(ride, 'pending', { onClick })}

      {/* Locations - Hidden for Errands */}
      {!isErrandService(ride.service_type) && (
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Pickup</div>
              <div className="text-sm text-slate-800 truncate">
                {ride.pickup_address || ride.pickup_location || '—'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Destination</div>
              <div className="text-sm text-slate-800 truncate">
                {ride.dropoff_address || ride.dropoff_location || '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Time */}
      {isScheduled && scheduledTime && (
        <div className="mb-3 flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          <div className="text-sm text-purple-700">
            {new Date(scheduledTime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          Posted {new Date(ride.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelRide}
          disabled={cancelling}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          {cancelling ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Cancelling...
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 mr-1" />
              Cancel
            </>
          )}
        </Button>
      </div>

      {/* Waiting Animation */}
      {offerCount === 0 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-slate-400">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-xs">Waiting for driver offers</span>
        </div>
      )}
    </div>
  );
};

export default PendingRideCard;

