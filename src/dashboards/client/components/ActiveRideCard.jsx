import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, User, Clock, Phone, Navigation, CheckCircle, Star, Zap, Calendar, Repeat, XCircle, Car } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Button from '../../shared/Button';
import { getRideProgressDetails } from '../../../utils/rideProgress';
import { isErrandService } from '../../../utils/serviceTypes';
import { getRideCostDisplay } from '../../../utils/rideCostDisplay';
import { getRideTypeHandler } from '../../../utils/rideTypeHandlers';

/**
 * Card component for active rides (driver assigned through completed)
 * Handles multiple sub-states: driver_assigned, driver_en_route, driver_arrived, in_progress
 */
const ActiveRideCard = ({ ride, onClick, tabContext = 'active' }) => {
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (ride.driver_id) {
      loadDriverInfo();
    }
  }, [ride.driver_id]);

  const loadDriverInfo = async () => {
    try {
      // Fetch driver profile information
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('id, user_id, full_name, vehicle_make, vehicle_model, vehicle_color, license_plate')
        .eq('user_id', ride.driver_id)
        .single();

      if (error) throw error;

      // Fetch phone number from profiles table
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', ride.driver_id)
        .single();

      // Get driver rating from completed rides
      const { data: ratingData } = await supabase
        .from('rides')
        .select('rating')
        .eq('driver_id', ride.driver_id)
        .eq('ride_status', 'completed')
        .not('rating', 'is', null);

      let avgRating = (ratingData && ratingData.length > 0)
        ? (ratingData.reduce((acc, r) => acc + r.rating, 0) / ratingData.length).toFixed(1)
        : '4.9';

      setDriverInfo({
        ...data,
        rating: avgRating,
        phone_number: userProfile?.phone || null
      });
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
  const progress = getRideProgressDetails(ride);

  const tripSummary = () => {
    if (!progress.isMultiTrip && !progress.isRoundTrip) return null;

    if (tabContext === 'active') {
      const activeSubtitle =
        progress.remainingTrips > 0
          ? `${progress.remainingTrips} trip${progress.remainingTrips === 1 ? '' : 's'} remaining after this`
          : 'Final trip in this series';
      return {
        title: `Trip ${progress.currentTripNumber} of ${progress.totalTrips}`,
        subtitle: activeSubtitle || progress.recurrenceSummary,
      };
    }

    return {
      title: `${progress.totalTrips} trip${progress.totalTrips === 1 ? '' : 's'}`,
      subtitle: progress.recurrenceSummary,
    };
  };

  const summary = tripSummary();

  const handleCancelRide = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('transition_ride_status', {
        p_ride_id: ride.id,
        p_new_state: 'CANCELLED',
        p_actor_type: 'PASSENGER',
        p_actor_id: user.id
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to cancel ride');
      
      alert('Ride cancelled successfully');
    } catch (error) {
      console.error('Error cancelling ride:', error);
      alert(`Error: ${error.message}`);
    }
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
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 ${statusInfo.color} text-xs font-bold rounded-full flex items-center gap-1 inline-flex`}>
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </span>
            
            {/* Cancel Button - Only show if not trip_completed/completed */}
            {!['trip_completed', 'completed'].includes(ride.ride_status || ride.status) && (
              <button
                onClick={handleCancelRide}
                className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1.5 bg-red-50 rounded-full border border-red-200 flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>
        </div>
        <div className="text-right ml-2">
          {(() => {
            const costDisplay = getRideCostDisplay(ride);
            return (
              <>
                <div className="text-lg font-bold text-green-600">
                  {costDisplay.perTripDisplay || costDisplay.display}
                </div>
                <div className="text-xs text-slate-500">
                  {costDisplay.perTripDisplay ? 'Per Trip' : (costDisplay.label || 'Price')}
                </div>
                {costDisplay.perTripDisplay && (
                  <div className="text-xs text-slate-600 mt-1">
                    {costDisplay.display} total
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {summary && (
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

      {/* Service-specific card details using handler */}
      {rideTypeHandler.renderCardDetails(ride, 'active', { onClick })}

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

