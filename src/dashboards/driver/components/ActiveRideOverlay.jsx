import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import { RIDE_STATUSES } from '../../../hooks/useRideStatus';
import { supabase } from '../../../lib/supabase';
import { getRideTypeHandler } from '../../../utils/rideTypeHandlers';
import { isRoundTripRide } from '../../../utils/rideCostDisplay';
import ErrandTaskManager from './activeRide/ErrandTaskManager';
import StatusUpdateActions from './activeRide/StatusUpdateActions';
import RideNavigationMenu from './activeRide/RideNavigationMenu';


/**
 * ActiveRideOverlay Component
 *
 * Displays an overlay on all tabs when driver has an active ride
 * Prevents accepting other rides and provides quick access to active ride actions
 */
const ActiveRideOverlay = ({ ride, onViewDetails, onCancel, onDismiss, onCompleted }) => {
  if (!ride) return null;

  console.log('🚗 ActiveRideOverlay rendered with ride:', {
    id: ride.id,
    status: ride.ride_status,
    timing: ride.ride_timing,
    pickup: ride.pickup_address,
    dropoff: ride.dropoff_address
  });

  const [localRide, setLocalRide] = useState(ride);
  const [passengerPhone, setPassengerPhone] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const isScheduled = localRide?.ride_timing !== 'instant';
  const isInstant = localRide?.ride_timing === 'instant';
  
  // Get ride type handler
  const rideTypeHandler = getRideTypeHandler(localRide?.service_type);

  const isRideCompleted =
    localRide.ride_status === RIDE_STATUSES.TRIP_COMPLETED ||
    localRide.ride_status === RIDE_STATUSES.COMPLETED;

  // Check if ride needs to be started (scheduled rides only)
  const needsToBeStarted = isScheduled && localRide.ride_status === 'accepted';

  // Helper to get status display info (for header)
  const getStatusDisplay = () => {
    switch (localRide.ride_status) {
      case 'accepted':
        return {
          icon: '✅',
          text: isScheduled ? 'Scheduled Ride Accepted' : 'Ride Accepted',
          color: 'bg-green-50 border-green-200',
          textColor: 'text-green-900'
        };
      case 'driver_on_way':
        return {
          icon: '🚗',
          text: 'On the way to pickup',
          color: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-900'
        };
      case 'driver_arrived':
        return {
          icon: '📍',
          text: 'Arrived at pickup',
          color: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-900'
        };
      case 'trip_started':
        return {
          icon: '🎯',
          text: 'Trip in progress',
          color: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-900'
        };
      default:
        return {
          icon: '⏳',
          text: 'Active Ride',
          color: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-900'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  useEffect(() => {
    setLocalRide(ride);
  }, [ride?.id, ride?.ride_status]);

  // Fetch passenger phone number when ride is accepted/active
  useEffect(() => {
    const fetchPassengerPhone = async () => {
      if (!ride?.user_id) {
        setPassengerPhone(null);
        return;
      }

      // Only show contact info when ride is accepted or active
      const showContact = ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'].includes(ride.ride_status);
      if (!showContact) {
        setPassengerPhone(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', ride.user_id)
          .single();

        if (!error && data?.phone) {
          setPassengerPhone(data.phone);
        }
      } catch (error) {
        console.error('Error fetching passenger phone:', error);
      }
    };

    fetchPassengerPhone();
  }, [ride?.user_id, ride?.ride_status]);


  // Format scheduled time
  const formatScheduledTime = (datetime) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-center items-start p-2 sm:p-4 pointer-events-none overflow-y-auto pt-16">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 space-y-3 relative pointer-events-auto">
        <button
          aria-label="Minimize overlay"
          onClick={onDismiss}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 font-bold text-xl transition-colors"
          title="Minimize this overlay"
        >
          ✕
        </button>

        {/* Header */}
        <div className={`rounded-lg p-3 border-2 ${statusDisplay.color}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{statusDisplay.icon}</span>
            <div className="flex-1">
              <h3 className={`text-base font-semibold ${statusDisplay.textColor}`}>
                {statusDisplay.text}
              </h3>
              {isScheduled && ride.scheduled_datetime && (
                <p className="text-xs text-gray-600 mt-0.5">
                  📅 Scheduled for {formatScheduledTime(ride.scheduled_datetime)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ride Info - Compact */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">📍</span>
            <p className="text-gray-900 truncate flex-1">
              {ride.pickup_address || ride.pickup_location}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">🎯</span>
            <p className="text-gray-900 truncate flex-1">
              {ride.dropoff_address || ride.dropoff_location}
            </p>
          </div>
          {ride.passenger_name && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">👤</span>
              <p className="text-gray-900">{ride.passenger_name}</p>
            </div>
          )}
          {passengerPhone && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">📞</span>
              <a
                href={`tel:${passengerPhone}`}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {passengerPhone}
              </a>
            </div>
          )}
          {ride.estimated_cost && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">💰</span>
              <p className="text-green-700 font-medium">
                ${(parseFloat(ride.estimated_cost) || 0).toFixed(2)}
                {ride.number_of_trips && ride.number_of_trips > 1 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (${((parseFloat(ride.estimated_cost) || 0) / (ride.number_of_trips || 1)).toFixed(2)} × {ride.number_of_trips})
                  </span>
                )}
                {isRoundTripRide(ride) && (
                  <span className="text-xs text-cyan-600 ml-1">🔄</span>
                )}
              </p>
            </div>
          )}
        </div>

      {rideTypeHandler.isServiceType(localRide, 'errands') && (
        <ErrandTaskManager
          ride={localRide}
          errandTasks={ride?.errand_tasks || ride?.tasks}
          onErrandTasksChange={(tasks) => {
            // Update local ride if needed
          }}
          isRideCompleted={isRideCompleted}
          onRideCompleted={(completedRide) => {
            setLocalRide(completedRide);
            if (typeof onCompleted === 'function') {
              onCompleted(completedRide);
            }
            if (onDismiss) {
              onDismiss();
            }
          }}
          onDismiss={onDismiss}
        />
      )}

        {/* Warning Message */}
        {isInstant && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ You cannot accept other rides while this instant ride is active
            </p>
          </div>
        )}

        {needsToBeStarted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ Click "Begin Trip" when you're ready to start this scheduled ride
            </p>
          </div>
        )}

        {/* View Details above stepper */}
        <Button
          variant="primary"
          size="md"
          onClick={onViewDetails}
          className="w-full"
        >
          📱 View Full Ride Details
        </Button>

        {/* Status Update Actions */}
        <StatusUpdateActions
          ride={localRide}
          onStatusUpdate={(newStatus, updatedRide) => {
            setUpdatingStatus(true);
            if (updatedRide) {
              setLocalRide(updatedRide);
            } else {
              setLocalRide(prev => ({ ...prev, ride_status: newStatus }));
            }
            setUpdatingStatus(false);
          }}
          updatingStatus={updatingStatus}
          isRideCompleted={isRideCompleted}
          isScheduled={isScheduled}
          needsToBeStarted={needsToBeStarted}
        />

        {/* Action Buttons - Always Visible */}
        <div className="space-y-2 border-t-2 border-gray-200 pt-3">
          {/* Navigation Menu */}
          <RideNavigationMenu
            ride={localRide}
            passengerPhone={passengerPhone}
            onNavigate={(destination) => {
              // Navigation handled by component
            }}
            onCall={(phone) => {
              // Call handled by component
            }}
          />

          <Button
            variant="danger"
            size="sm"
            onClick={onCancel}
            className="w-full"
          >
            ❌ Cancel Ride
          </Button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-center text-gray-500">
          Click the ✕ button to minimize this overlay. It will reappear when you navigate to a different page.
        </p>
      </div>
    </div>
  );
};

export default ActiveRideOverlay;

