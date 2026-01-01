import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { getNavigationUrlForDriver, getNavigationUrlTo } from '../../../utils/navigation';
import { summarizeErrandTasks } from '../../../utils/errandTasks';
import { getRideCostDisplay } from '../../../utils/rideCostDisplay';
import { getRideProgress } from '../../../utils/rideProgressTracking';
import { getRideTypeHandler } from '../../../utils/rideTypeHandlers';
import { isErrandService } from '../../../utils/serviceTypes';

const Row = ({ label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-xs text-gray-500 min-w-[90px]">{label}</span>
    <div className="text-sm text-gray-900 flex-1 break-words">{value || '—'}</div>
  </div>
);

const parseRecurrencePattern = (pattern) => {
  if (!pattern) return null;
  if (typeof pattern === 'object') return pattern;
  try {
    return JSON.parse(pattern);
  } catch {
    return null;
  }
};

const formatRecurringDate = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const date = timeStr ? new Date(`${dateStr}T${timeStr}`) : new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const buildRecurringInfo = (ride) => {
  if (!ride) return null;
  const isRecurring =
    ride.ride_timing === 'scheduled_recurring' ||
    (ride.number_of_trips && ride.number_of_trips > 1) ||
    (ride.total_rides_in_series && ride.total_rides_in_series > 1);

  if (!isRecurring) return null;

  const pattern = parseRecurrencePattern(ride.recurrence_pattern);
  // Use centralized progress tracking utility
  const progressInfo = getRideProgress(ride);
  const totalTrips = progressInfo.total;
  const completed = progressInfo.completed;
  const remaining = progressInfo.remaining;
  const sequenceLabel =
    ride.series_trip_number && totalTrips
      ? `Trip ${ride.series_trip_number} of ${totalTrips}`
      : totalTrips
        ? `${totalTrips} trips`
        : null;

  // Use centralized cost display utility
  const costDisplay = getRideCostDisplay(ride);
  const totalCost = costDisplay.total || 0;
  const perTripCost = costDisplay.perTrip || costDisplay.total || 0;

  let patternLabel = 'Recurring series';
  if (pattern?.type === 'specific_dates') {
    patternLabel = 'Specific dates';
  } else if (pattern?.type === 'weekdays') {
    patternLabel = pattern.month ? `Weekdays • ${pattern.month}` : 'Weekdays';
  } else if (pattern?.type === 'weekends') {
    patternLabel = pattern.month ? `Weekends • ${pattern.month}` : 'Weekends';
  }

  const upcomingDates = [];
  let hasMoreDates = false;

  if (pattern?.type === 'specific_dates' && Array.isArray(pattern.dates)) {
    pattern.dates.slice(0, 4).forEach((dateStr) => {
      const formatted = formatRecurringDate(dateStr, pattern.time);
      if (formatted) {
        upcomingDates.push(formatted);
      }
    });
    hasMoreDates = pattern.dates.length > upcomingDates.length;
  } else if (ride.scheduled_datetime) {
    const formatted = formatRecurringDate(ride.scheduled_datetime);
    if (formatted) {
      upcomingDates.push(formatted);
    }
  }

  return {
    totalTrips,
    completed,
    remaining,
    sequenceLabel,
    patternLabel,
    perTripCost,
    upcomingDates,
    hasMoreDates
  };
};

const DriverRideDetailsModal = ({ open, onClose, ride }) => {
  if (!open || !ride) return null;

  const onNavigate = () => {
    const url = getNavigationUrlForDriver(ride) || getNavigationUrlTo(ride, 'pickup');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const [passenger, setPassenger] = useState({ name: null, phone: null });
  const isActive = !['cancelled', 'completed'].includes(ride?.ride_status);
  const recurringInfo = useMemo(() => buildRecurringInfo(ride), [ride]);
  const costDisplay = useMemo(() => getRideCostDisplay(ride), [ride]);
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  const courierPackages = useMemo(() => {
    try {
      if (!ride?.courier_packages) return [];
      return typeof ride.courier_packages === 'string'
        ? JSON.parse(ride.courier_packages)
        : ride.courier_packages;
    } catch {
      return [];
    }
  }, [ride?.courier_packages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ride?.user_id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', ride.user_id)
          .maybeSingle();
        if (!cancelled && data) setPassenger({ name: data.name, phone: data.phone });
      } catch (e) {
        if (!cancelled) setPassenger({ name: null, phone: null });
      }
    })();
    return () => { cancelled = true; };
  }, [ride?.user_id]);

  return (
    <Modal isOpen={open} onClose={onClose} title="Ride Details" size="lg">
      <div className="space-y-4">
        {isActive && (
          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-700">
              Passenger: <span className="font-medium">{passenger.name || '—'}</span>
              {passenger.phone && <span className="text-slate-500 ml-2">• {passenger.phone}</span>}
            </div>
            {passenger.phone && (
              <Button size="sm" variant="outline" onClick={() => window.location.href = `tel:${passenger.phone}`}>
                Call
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <Row label="Service" value={
            (() => {
              const handler = getRideTypeHandler(ride.service_type);
              return handler.getServiceTypeDisplayName();
            })()
          } />
          {(() => {
            const handler = getRideTypeHandler(ride.service_type);
            const locationDetails = handler.renderLocationDetails(ride);
            return locationDetails !== null;
          })() && (
            <>
              <Row label="Pickup" value={ride.pickup_address || ride.pickup_location} />
              <Row label="Dropoff" value={ride.dropoff_address || ride.dropoff_location} />
            </>
          )}
          {ride.scheduled_datetime && (
            <Row label="Scheduled" value={new Date(ride.scheduled_datetime).toLocaleString()} />
          )}
          {(ride.scheduled_date && ride.scheduled_time) && (
            <Row label="Scheduled" value={`${ride.scheduled_date} ${ride.scheduled_time}`} />
          )}
          {(ride.special_requests || ride.special_instructions) && (
            <Row label="Instructions" value={ride.special_requests || ride.special_instructions} />
          )}
          {ride.notes && (
            <Row label="Notes" value={ride.notes} />
          )}
          {ride.courier_package_details && (
            <Row label="Package" value={ride.courier_package_details} />
          )}
          {ride.package_size && (
            <Row label="Size" value={String(ride.package_size)} />
          )}
          {ride.number_of_passengers && (
            <Row label="Passengers" value={String(ride.number_of_passengers)} />
          )}
          {(ride.recipient_name || ride.recipient_phone) && (
            <Row
              label="Recipient"
              value={`${ride.recipient_name || '—'}${ride.recipient_phone ? ` • ${ride.recipient_phone}` : ''}`}
            />
          )}
          {(ride.passenger_name || ride.contact_number) && (
            <Row
              label="Contact"
              value={`${ride.passenger_name || '—'}${ride.contact_number ? ` • ${ride.contact_number}` : ''}`}
            />
          )}
          {ride.estimated_cost && (
            <Row label="Estimated Fare" value={costDisplay.display} />
          )}
        </div>

        {/* Extra details (ride-type specific) */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowExtraDetails((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">More details</span>
            <span className="text-xs text-gray-500">{showExtraDetails ? 'Hide' : 'Show'}</span>
          </button>
          {showExtraDetails && (
            <div className="p-3 space-y-2 bg-white">
              <Row label="Ride ID" value={<span className="font-mono text-xs">{ride.id}</span>} />
              <Row label="Status" value={ride.ride_status || ride.status || ride.state} />
              {ride.vehicle_type && <Row label="Vehicle" value={String(ride.vehicle_type)} />}
              {ride.payment_method && <Row label="Payment" value={String(ride.payment_method)} />}
              {courierPackages.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Courier packages</p>
                  <div className="space-y-2">
                    {courierPackages.map((pkg, idx) => (
                      <div key={idx} className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                        <p className="text-xs font-semibold text-amber-900">
                          Package {idx + 1}: {pkg.packageSize || pkg.size || '—'}
                        </p>
                        {(pkg.packageDescription || pkg.description) && (
                          <p className="text-xs text-amber-800 mt-0.5">
                            {pkg.packageDescription || pkg.description}
                          </p>
                        )}
                        {(pkg.recipientName || pkg.recipientPhone) && (
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Recipient: {pkg.recipientName || '—'}{pkg.recipientPhone ? ` • ${pkg.recipientPhone}` : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Errand Tasks Breakdown */}
        {(() => {
          const handler = getRideTypeHandler(ride.service_type);
          return handler.isServiceType(ride, 'errands');
        })() && ride.errand_tasks && (() => {
          const errandSummary = summarizeErrandTasks(ride.errand_tasks);
          if (!errandSummary || errandSummary.total === 0) return null;
          return (
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-900">
                  🛒 {errandSummary.total} Task{errandSummary.total !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-emerald-700">
                  {errandSummary.completed} done • {errandSummary.remaining} left
                </span>
              </div>
              <div className="space-y-2">
                {errandSummary.allTasks?.map((task, idx) => (
                  <div key={task.id || idx} className="bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {idx + 1}. {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.state === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : task.state === 'started' 
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {task.state || 'pending'}
                      </span>
                    </div>
                    {(task.pickup || task.dropoff) && (
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        {task.pickup && (
                          <div className="flex items-start gap-1">
                            <span className="text-green-500">●</span>
                            <span className="line-clamp-1">{task.pickup}</span>
                          </div>
                        )}
                        {task.dropoff && (
                          <div className="flex items-start gap-1">
                            <span className="text-red-500">●</span>
                            <span className="line-clamp-1">{task.dropoff}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {recurringInfo && (
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold text-indigo-900">
              <span>{recurringInfo.patternLabel}</span>
              {recurringInfo.sequenceLabel && (
                <span className="text-xs text-indigo-700">{recurringInfo.sequenceLabel}</span>
              )}
            </div>
            <p className="text-xs text-indigo-700">
              Completed {recurringInfo.completed}/{recurringInfo.totalTrips} • Remaining {recurringInfo.remaining}
            </p>
            {recurringInfo.perTripCost && (
              <p className="text-xs text-indigo-700">Per trip: ${recurringInfo.perTripCost}</p>
            )}
            {recurringInfo.upcomingDates.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-indigo-800 mb-1">Upcoming dates</p>
                <ul className="space-y-1 text-xs text-indigo-800">
                  {recurringInfo.upcomingDates.map((dateLabel, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{dateLabel}</span>
                    </li>
                  ))}
                </ul>
                {recurringInfo.hasMoreDates && (
                  <p className="text-[11px] text-indigo-500 mt-1">More dates available in this series</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-3">
          <Button variant="success" onClick={onNavigate}>Open in Google Maps</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

export default DriverRideDetailsModal;

