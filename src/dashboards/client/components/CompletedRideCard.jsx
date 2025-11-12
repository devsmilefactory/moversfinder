import React from 'react';
import { MapPin, Calendar, DollarSign, Star, RotateCcw, Car, Package, ShoppingBag, GraduationCap, Briefcase, Zap, Repeat } from 'lucide-react';
import Button from '../../shared/Button';

/**
 * Card component for completed rides
 */
const CompletedRideCard = ({ ride, onClick }) => {
  const handleRebook = (e) => {
    e.stopPropagation();
    // TODO: Implement rebook functionality
    alert('Rebook feature coming soon!');
  };

  // Get service type icon and label
  const getServiceTypeInfo = () => {
    const serviceType = ride.service_type || 'taxi';
    const serviceMap = {
      taxi: { icon: Car, label: 'Taxi', color: 'text-blue-600', bgColor: 'bg-blue-50' },
      courier: { icon: Package, label: 'Courier', color: 'text-purple-600', bgColor: 'bg-purple-50' },
      errand: { icon: ShoppingBag, label: 'Errand', color: 'text-green-600', bgColor: 'bg-green-50' },
      school_run: { icon: GraduationCap, label: 'School Run', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
      work_run: { icon: Briefcase, label: 'Work Run', color: 'text-slate-600', bgColor: 'bg-slate-50' }
    };
    return serviceMap[serviceType] || serviceMap.taxi;
  };

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

  const serviceInfo = getServiceTypeInfo();
  const timingInfo = getRideTimingInfo();
  const ServiceIcon = serviceInfo.icon;
  const TimingIcon = timingInfo.icon;
  const isRecurring = ride.ride_timing === 'scheduled_recurring';

  const tripDuration = ride.trip_started_at && ride.trip_completed_at
    ? Math.round((new Date(ride.trip_completed_at) - new Date(ride.trip_started_at)) / 60000)
    : null;

  // Get recurrence pattern info
  const getRecurrenceInfo = () => {
    if (!ride.recurrence_pattern) return null;
    const pattern = ride.recurrence_pattern;
    if (pattern.type === 'specific_dates') {
      return `${pattern.dates?.length || 0} specific dates`;
    } else if (pattern.type === 'weekdays') {
      return 'Weekdays';
    } else if (pattern.type === 'weekends') {
      return 'Weekends';
    }
    return 'Recurring';
  };

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
            ${(parseFloat(ride.fare || ride.estimated_cost) || 0).toFixed(2)}
          </div>
          {tripDuration && (
            <div className="text-xs text-slate-500">{tripDuration} min</div>
          )}
        </div>
      </div>

      {/* Recurring Ride Info */}
      {isRecurring && ride.total_rides_in_series > 0 && (
        <div className="mb-3 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-sm font-bold text-green-700">
                {ride.total_rides_in_series} trips completed
              </div>
              <div className="text-xs text-green-600">
                {getRecurrenceInfo()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courier Package Details - Prominent */}
      {ride.service_type === 'courier' && (ride.courier_package_details || ride.package_size) && (
        <div className="mb-3 bg-purple-50 rounded-lg px-3 py-2.5 border border-purple-200">
          <div className="flex items-start gap-2">
            <Package className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-bold text-purple-700 mb-1">Package Details</div>
              {ride.package_size && (
                <div className="text-xs text-purple-600 mb-1">
                  Size: <span className="font-semibold capitalize">{ride.package_size}</span>
                </div>
              )}
              {ride.courier_package_details && (
                <div className="text-sm text-purple-700">{ride.courier_package_details}</div>
              )}
              {ride.recipient_name && (
                <div className="text-xs text-purple-600 mt-1">
                  To: {ride.recipient_name} {ride.recipient_phone && `• ${ride.recipient_phone}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Locations */}
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

