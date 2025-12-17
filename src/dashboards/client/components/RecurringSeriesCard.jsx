import React, { useMemo } from 'react';
import { Repeat, Calendar, MapPin, Zap, Package, ShoppingBag, GraduationCap, Briefcase, Car } from 'lucide-react';
import { normalizeServiceType } from '../../../utils/serviceTypes';
import { getRideProgress } from '../../../utils/rideProgressTracking';

const serviceIconMap = {
  taxi: { icon: Car, label: 'Taxi', color: 'text-blue-600', bg: 'bg-blue-50' },
  courier: { icon: Package, label: 'Courier', color: 'text-purple-600', bg: 'bg-purple-50' },
  errand: { icon: ShoppingBag, label: 'Errand', color: 'text-green-600', bg: 'bg-green-50' },
  school_run: { icon: GraduationCap, label: 'School Run', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  work_run: { icon: Briefcase, label: 'Work Run', color: 'text-slate-600', bg: 'bg-slate-50' }
};

const rideTimingMap = {
  instant: { icon: Zap, label: 'Instant', color: 'text-orange-600', bg: 'bg-orange-100' },
  scheduled_recurring: { icon: Repeat, label: 'Recurring', color: 'text-blue-600', bg: 'bg-blue-100' },
  scheduled_single: { icon: Calendar, label: 'Scheduled', color: 'text-purple-600', bg: 'bg-purple-100' }
};

const completedStatuses = new Set(['trip_completed', 'completed', 'ride_completed']);

const parsePattern = (pattern) => {
  if (!pattern) return null;
  if (typeof pattern === 'object') return pattern;
  try {
    return JSON.parse(pattern);
  } catch {
    return null;
  }
};

const getDateValue = (ride) => {
  if (ride?.scheduled_datetime) {
    return new Date(ride.scheduled_datetime);
  }
  if (ride?.scheduled_date && ride?.scheduled_time) {
    return new Date(`${ride.scheduled_date}T${ride.scheduled_time}`);
  }
  if (ride?.created_at) {
    return new Date(ride.created_at);
  }
  return null;
};

const formatDateLabel = (date) => {
  if (!date || Number.isNaN(date.getTime())) return 'Date TBD';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const RecurringSeriesCard = ({ rides = [], onClick, tabContext = 'pending', offerCount = 0 }) => {
  const sortedRides = useMemo(() => {
    return [...rides].sort((a, b) => {
      const aDate = getDateValue(a)?.getTime() ?? 0;
      const bDate = getDateValue(b)?.getTime() ?? 0;
      return aDate - bDate;
    });
  }, [rides]);

  const primaryRide = sortedRides[0];
  if (!primaryRide) return null;

  const normalizedServiceType = normalizeServiceType(primaryRide.service_type || 'taxi') || 'taxi';
  const serviceInfo = serviceIconMap[normalizedServiceType] || serviceIconMap.taxi;
  const timingInfo = rideTimingMap[primaryRide.ride_timing] || rideTimingMap.scheduled_recurring;
  const ServiceIcon = serviceInfo.icon;
  const TimingIcon = timingInfo.icon;

  const pattern = parsePattern(primaryRide.recurrence_pattern);
  const totalTrips = primaryRide.total_rides_in_series || primaryRide.number_of_trips || sortedRides.length;
  // Use centralized progress tracking utility
  const progressInfo = getRideProgress(primaryRide);
  const completed = progressInfo.completed;
  const remaining = progressInfo.remaining;

  const sequenceLabel =
    primaryRide.series_trip_number && totalTrips
      ? `Trip ${primaryRide.series_trip_number} of ${totalTrips}`
      : `${totalTrips} trips planned`;

  const rawSeriesCost = primaryRide.estimated_cost ? parseFloat(primaryRide.estimated_cost) : null;
  const totalSeriesCost = Number.isFinite(rawSeriesCost) ? rawSeriesCost : null;
  const formattedTotalCost = totalSeriesCost !== null ? totalSeriesCost.toFixed(2) : null;
  const perTripCost =
    totalSeriesCost !== null && totalTrips > 0 ? (totalSeriesCost / totalTrips).toFixed(2) : null;

  const pickup = primaryRide.pickup_address || primaryRide.pickup_location || 'Not specified';
  const dropoff = primaryRide.dropoff_address || primaryRide.dropoff_location || 'Not specified';

  const nextOccurrences = sortedRides
    .filter((ride) => ride.scheduled_datetime || ride.scheduled_date)
    .slice(0, 3)
    .map((ride) => {
      const date = getDateValue(ride);
      return {
        id: ride.id,
        label: formatDateLabel(date),
        cost: perTripCost, // Use per-trip cost instead of full ride cost
        status: (ride.ride_status || ride.status || 'pending').replace(/_/g, ' ')
      };
    });

  if (nextOccurrences.length === 0 && pattern?.type === 'specific_dates' && Array.isArray(pattern.dates)) {
    pattern.dates.slice(0, 3).forEach((dateStr) => {
      nextOccurrences.push({
        id: `${primaryRide.id}-${dateStr}`,
        label: formatDateLabel(new Date(`${dateStr}T${pattern.time || '08:00'}`)),
        cost: perTripCost,
        status: 'scheduled'
      });
    });
  }

  const patternLabel = (() => {
    if (!pattern) return 'Recurring series';
    if (pattern.type === 'specific_dates') return 'Specific dates';
    if (pattern.type === 'weekdays') return pattern.month ? `Weekdays • ${pattern.month}` : 'Weekdays';
    if (pattern.type === 'weekends') return pattern.month ? `Weekends • ${pattern.month}` : 'Weekends';
    return 'Recurring series';
  })();

  return (
    <div
      className="bg-white rounded-xl border border-indigo-200 shadow-sm p-4 cursor-pointer transition-all hover:border-indigo-400 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${serviceInfo.bg}`}>
            <ServiceIcon className={`w-4 h-4 ${serviceInfo.color}`} />
            <span className={`text-sm font-semibold ${serviceInfo.color}`}>{serviceInfo.label}</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${timingInfo.bg}`}>
            <TimingIcon className={`w-3.5 h-3.5 ${timingInfo.color}`} />
            <span className={`text-xs font-semibold ${timingInfo.color}`}>{timingInfo.label}</span>
          </div>
        </div>

        {tabContext === 'pending' && offerCount > 0 && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
            {offerCount} offer{offerCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className={`rounded-lg p-3 border ${
        tabContext === 'active' 
          ? 'bg-blue-50 border-blue-200' 
          : tabContext === 'completed'
          ? 'bg-green-50 border-green-200'
          : 'bg-indigo-50 border-indigo-100'
      }`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${
          tabContext === 'active' 
            ? 'text-blue-900' 
            : tabContext === 'completed'
            ? 'text-green-900'
            : 'text-indigo-900'
        }`}>
          <Repeat className="w-4 h-4" />
          <span>{patternLabel}</span>
        </div>
        <div className={`mt-2 text-xs flex flex-wrap gap-3 ${
          tabContext === 'active' 
            ? 'text-blue-700' 
            : tabContext === 'completed'
            ? 'text-green-700'
            : 'text-indigo-700'
        }`}>
          <span>{sequenceLabel}</span>
          <span>•</span>
          {tabContext === 'active' && remaining > 0 ? (
            <>
              <span className="font-semibold">{remaining} remaining</span>
              <span>•</span>
              <span>Completed {completed}/{totalTrips}</span>
            </>
          ) : tabContext === 'completed' && completed > 0 ? (
            <>
              <span className="font-semibold">Completed {completed}/{totalTrips}</span>
              {remaining > 0 && (
                <>
                  <span>•</span>
                  <span>{remaining} remaining</span>
                </>
              )}
            </>
          ) : (
            <>
              <span>
                Completed {completed}/{totalTrips}
              </span>
              <span>•</span>
              <span>{remaining} remaining</span>
            </>
          )}
        </div>
        {formattedTotalCost && (
          <div className={`text-xs mt-1 ${
            tabContext === 'active' 
              ? 'text-blue-800' 
              : tabContext === 'completed'
              ? 'text-green-800'
              : 'text-indigo-800'
          }`}>
            Total series: ${formattedTotalCost}
          </div>
        )}
        {perTripCost && (
          <div className={`text-xs mt-1 ${
            tabContext === 'active' 
              ? 'text-blue-700' 
              : tabContext === 'completed'
              ? 'text-green-700'
              : 'text-indigo-700'
          }`}>
            Per trip: ${perTripCost}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Pickup</p>
            <p className="text-sm text-slate-800">{pickup}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Dropoff</p>
            <p className="text-sm text-slate-800">{dropoff}</p>
          </div>
        </div>
      </div>

      {nextOccurrences.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500 mb-2">Upcoming trips</p>
          <div className="space-y-2">
            {nextOccurrences.map((occurrence) => (
              <div key={occurrence.id} className="flex items-center justify-between text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="font-medium">{occurrence.label}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{occurrence.status}</p>
                  </div>
                </div>
                {occurrence.cost && (
                  <div className="text-sm font-semibold text-slate-900">${occurrence.cost}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tabContext === 'pending' && offerCount === 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
          <span>Waiting for driver offers</span>
        </div>
      )}
    </div>
  );
};

export default RecurringSeriesCard;


