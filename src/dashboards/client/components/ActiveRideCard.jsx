import React, { useState, useEffect } from 'react';
import { MapPin, User, Car, Clock, Phone, Navigation, CheckCircle, Star, Package, ShoppingBag, GraduationCap, Briefcase, Zap, Calendar, Repeat } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Button from '../../shared/Button';

/**
 * Card component for active rides (driver assigned through completed)
 * Handles multiple sub-states: driver_assigned, driver_en_route, driver_arrived, in_progress
 */
const ActiveRideCard = ({ ride, onClick }) => {
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (ride.driver_id) {
      loadDriverInfo();
    }
  }, [ride.driver_id]);

  const loadDriverInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('id, user_id, full_name, vehicle_make, vehicle_model, vehicle_color, license_plate')
        .eq('user_id', ride.driver_id)
        .single();

      if (error) throw error;

      // Get driver rating from completed rides
      const { data: ratingData } = await supabase
        .from('rides')
        .select('rating')
        .eq('driver_id', ride.driver_id)
        .eq('ride_status', 'completed')
        .not('rating', 'is', null);

      let avgRating = null;
      if (ratingData && ratingData.length > 0) {
        const sum = ratingData.reduce((acc, r) => acc + r.rating, 0);
        avgRating = (sum / ratingData.length).toFixed(1);
      }

      setDriverInfo({ ...data, rating: avgRating });
    } catch (error) {
      console.error('Error loading driver info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    const status = ride.ride_status || ride.status;
    
    switch (status) {
      case 'driver_assigned':
      case 'offer_accepted':
        return {
          label: 'Driver Assigned',
          color: 'bg-blue-100 text-blue-700',
          message: 'Waiting for driver to start navigation',
          icon: CheckCircle
        };
      case 'driver_en_route':
      case 'driver_on_way':
        return {
          label: 'Driver En Route',
          color: 'bg-purple-100 text-purple-700',
          message: 'Driver is on the way to pickup',
          icon: Navigation
        };
      case 'driver_arrived':
        return {
          label: 'Driver Arrived',
          color: 'bg-green-100 text-green-700',
          message: 'Driver is waiting at pickup location',
          icon: MapPin
        };
      case 'in_progress':
      case 'journey_started':
        return {
          label: 'Journey in Progress',
          color: 'bg-indigo-100 text-indigo-700',
          message: 'On the way to destination',
          icon: Car
        };
      default:
        return {
          label: 'Active',
          color: 'bg-blue-100 text-blue-700',
          message: 'Ride is active',
          icon: Car
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const isRecurring = ride.ride_timing === 'scheduled_recurring';

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
      className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg p-4 cursor-pointer transition-all hover:shadow-xl border-2 border-blue-300"
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
          <span className={`px-3 py-1.5 ${statusInfo.color} text-xs font-bold rounded-full flex items-center gap-1 inline-flex`}>
            <StatusIcon className="w-3 h-3" />
            {statusInfo.label}
          </span>
        </div>
        <div className="text-right ml-2">
          <div className="text-lg font-bold text-green-600">
            ${(parseFloat(ride.fare || ride.estimated_cost) || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Recurring Ride Info */}
      {isRecurring && ride.total_rides_in_series > 0 && (
        <div className="mb-3 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-sm font-bold text-blue-700">
                  Trip {(ride.completed_rides_count || 0) + 1} of {ride.total_rides_in_series}
                </div>
                <div className="text-xs text-blue-600">
                  {ride.remaining_rides_count || 0} trips remaining • {getRecurrenceInfo()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className="mb-3 bg-white rounded-lg px-3 py-2 border border-blue-200">
        <div className="text-sm font-medium text-blue-700">{statusInfo.message}</div>
      </div>

      {/* Driver Info */}
      {loading ? (
        <div className="mb-3 bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-sm text-slate-500">Loading driver info...</div>
        </div>
      ) : driverInfo ? (
        <div className="mb-3 bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {driverInfo.full_name?.charAt(0) || 'D'}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-800">{driverInfo.full_name || 'Driver'}</div>
              <div className="text-sm text-slate-600">
                {driverInfo.vehicle_color} {driverInfo.vehicle_make} {driverInfo.vehicle_model}
              </div>
              <div className="text-xs text-slate-500">{driverInfo.license_plate}</div>
            </div>
            {driverInfo.rating && (
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-bold text-yellow-700">{driverInfo.rating}</span>
              </div>
            )}
          </div>
          {driverInfo.phone_number && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `tel:${driverInfo.phone_number}`;
              }}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Driver
            </Button>
          )}
        </div>
      ) : null}

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

      {/* ETA Info */}
      {ride.estimated_arrival_time && (
        <div className="mb-3 flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <div className="text-sm text-blue-700">
            ETA: {new Date(ride.estimated_arrival_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-slate-200 text-center">
        <div className="text-xs text-slate-500">Tap for more details and live tracking</div>
      </div>
    </div>
  );
};

export default ActiveRideCard;

