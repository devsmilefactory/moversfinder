import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import { useRideStatus, RIDE_STATUSES } from '../../../hooks/useRideStatus';
import { useToast } from '../../../components/ui/ToastProvider';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import { getNavigationUrlTo } from '../../../utils/navigation';
import { useRideCompletion } from '../../../hooks/useRideCompletion';
import { notifyStatusUpdateFromOverlay } from '../../../services/notificationService';

/**
 * ActiveRideOverlay Component
 *
 * Displays an overlay on all tabs when driver has an active ride
 * Prevents accepting other rides and provides quick access to active ride actions
 */
const ActiveRideOverlay = ({ ride, onViewDetails, onCancel, onDismiss, onCompleted }) => {
  if (!ride) return null;

  const [localRide, setLocalRide] = useState(ride);
  const [passengerPhone, setPassengerPhone] = useState(null);
  const isScheduled = localRide?.ride_timing !== 'instant';
  const isInstant = localRide?.ride_timing === 'instant';

  // Determine ride status display
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

  // Check if ride needs to be started (scheduled rides only)
  const needsToBeStarted = isScheduled && localRide.ride_status === 'accepted';

  // Toast and auth
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { completeRide, completing } = useRideCompletion();

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

  // Allowed transitions and next-action UI
  const getNextAction = () => {
    const actions = {
      [RIDE_STATUSES.ACCEPTED]: { label: isScheduled ? 'Begin Trip' : 'Start Driving to Pickup', status: RIDE_STATUSES.DRIVER_ON_WAY, variant: 'primary' },
      [RIDE_STATUSES.DRIVER_ON_WAY]: { label: 'Mark as Arrived', status: RIDE_STATUSES.DRIVER_ARRIVED, variant: 'primary' },
      [RIDE_STATUSES.DRIVER_ARRIVED]: { label: 'Start Trip', status: RIDE_STATUSES.TRIP_STARTED, variant: 'success' },
      [RIDE_STATUSES.TRIP_STARTED]: { label: 'Complete Trip', status: RIDE_STATUSES.TRIP_COMPLETED, variant: 'success' },
    };
    return actions[localRide.ride_status] || null;
  };

  const updateTripStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const { validateTransition, RIDE_STATUSES: STATUSES } = useRideStatus();

      const allowedFrom = {
        [STATUSES.DRIVER_ON_WAY]: STATUSES.ACCEPTED,
        [STATUSES.DRIVER_ARRIVED]: STATUSES.DRIVER_ON_WAY,
        [STATUSES.TRIP_STARTED]: STATUSES.DRIVER_ARRIVED,
        [STATUSES.TRIP_COMPLETED]: STATUSES.TRIP_STARTED,
      };
      const expectedCurrent = allowedFrom[newStatus];
      if (!expectedCurrent) throw new Error('Invalid status transition');

      const updateData = {
        ride_status: newStatus,
        status_updated_at: new Date().toISOString(),
      };

      // Add status-specific fields
      if (newStatus === 'driver_arrived') {
        updateData.estimated_arrival_time = new Date().toISOString();
      } else if (newStatus === 'trip_started') {
        updateData.actual_pickup_time = new Date().toISOString();
      } else if (newStatus === 'trip_completed') {
        // Delegate to shared completion hook for canonical completion behavior
        const result = await completeRide({
          rideId: ride.id,
          passengerId: ride.user_id,
          notifyPassenger: true,
          extraRideUpdates: {
            // Preserve any additional overlay-specific fields
            ...updateData,
            ride_status: undefined, // handled in hook
          },
        });

        if (!result?.success) {
          throw result.error || new Error('Failed to complete ride');
        }

        // Optimistically update local UI so the label/stepper change immediately
        const completedRide = { ...localRide, ride_status: newStatus };
        setLocalRide(completedRide);

        // Let parent know about completion so it can refresh feeds / show rating modal
        try {
          if (typeof onCompleted === 'function') {
            onCompleted(completedRide);
          }
        } catch (callbackError) {
          console.error('Error in onCompleted callback:', callbackError);
        }

        // Always dismiss overlay on completion
        try {
          if (onDismiss) {
            onDismiss();
          }
        } catch (dismissError) {
          console.error('Error dismissing overlay after completion:', dismissError);
        }

        addToast({ type: 'success', title: 'Trip status updated successfully' });
        return;
      }

      const { error } = await supabase
        .from('rides')
        .update(updateData)
        .eq('id', ride.id)
        .eq('driver_id', user.id)
        .eq('ride_status', expectedCurrent);

      if (error) {
        console.error('Database error updating ride status:', error);
        throw error;
      }

      // Optimistically update local UI so the label/stepper change immediately
      setLocalRide((prev) => ({ ...prev, ride_status: newStatus }));

      // Send notifications to passenger for all status changes except completion
      const notificationMessages = {
        driver_on_way: {
          title: '🚗 Driver En Route',
          message: 'Your driver is on the way to pick you up!'
        },
        driver_arrived: {
          title: '📍 Driver Arrived',
          message: 'Your driver has arrived at the pickup location.'
        },
        trip_started: {
          title: '🎯 Journey Started',
          message: 'Your trip has started. Have a safe journey!'
        }
      };

      const notification = notificationMessages[newStatus];
      if (notification && ride.user_id) {
        try {
          await notifyStatusUpdateFromOverlay({
            userId: ride.user_id,
            rideId: ride.id,
            title: notification.title,
            message: notification.message,
          });
        } catch (e) {
          console.error('Error sending notification:', e);
        }
      }

      addToast({ type: 'success', title: 'Trip status updated successfully' });
    } catch (e) {
      console.error('Error updating trip status:', e);
      addToast({
        type: 'error',
        title: 'Failed to update status',
        message: e.message || 'Please try again or contact support if the issue persists'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

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
    <div className="fixed inset-0 z-40 flex justify-center items-center p-2 sm:p-4 pointer-events-none overflow-y-auto">
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

        {/* Ride Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-gray-500">📍</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium text-gray-900">
                {ride.pickup_address || ride.pickup_location}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-500">🎯</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Dropoff</p>
              <p className="text-sm font-medium text-gray-900">
                {ride.dropoff_address || ride.dropoff_location}
              </p>
            </div>
          </div>
          {ride.passenger_name && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500">👤</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Passenger</p>
                <p className="text-sm font-medium text-gray-900">{ride.passenger_name}</p>
              </div>
            </div>
          )}
          {passengerPhone && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500">📞</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Contact Passenger</p>
                <a
                  href={`tel:${passengerPhone}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {passengerPhone}
                </a>
              </div>
            </div>
          )}
          {ride.estimated_cost && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500">💰</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Fare</p>
                <p className="text-sm font-medium text-green-700">
                  ${parseFloat(ride.estimated_cost).toFixed(2)}
                </p>
                {ride.number_of_trips && ride.number_of_trips > 1 && (
                  <p className="text-xs text-gray-500">
                    ${(parseFloat(ride.estimated_cost) / ride.number_of_trips).toFixed(2)} × {ride.number_of_trips} trips
                  </p>
                )}
                {ride.is_round_trip && (
                  <p className="text-xs text-cyan-600">🔄 Round trip</p>
                )}
              </div>
            </div>
          )}
        </div>

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

        {/* Progress Stepper */}
        <div className="pt-1">
          <div className="flex items-center justify-between">
            {(() => {
              const steps = ['accepted','driver_on_way','driver_arrived','trip_started'];
              const currentIndex = Math.max(0, steps.indexOf(localRide.ride_status));
              return steps.map((s, idx) => {
                const completed = idx < currentIndex;
                const current = idx === currentIndex;
                const next = idx === currentIndex + 1;
                const clickable = next && !updatingStatus;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border
                        ${completed ? 'bg-blue-600 text-white border-blue-600' : ''}
                        ${current ? 'bg-blue-600 text-white border-blue-600' : ''}
                        ${next ? 'bg-white text-blue-700 border-blue-400 cursor-pointer hover:bg-blue-50' : ''}
                        ${(!completed && !current && !next) ? 'bg-gray-200 text-gray-600 border-gray-300' : ''}
                      `}
                      onClick={() => { if (clickable) updateTripStatus(s); }}
                    >
                      {completed ? '✓' : idx+1}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 ${idx < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex justify-between text-[11px] text-gray-600 mt-1">
            <span>Accepted</span><span>On the way</span><span>Arrived</span><span>In trip</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 text-center">Tap the next step to update status</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Dynamic progress action */}
          {(() => {
            const action = getNextAction();
            return action ? (
              <Button
                variant={action.variant}
                size="md"
                onClick={() => updateTripStatus(action.status)}
                disabled={updatingStatus}
                className="w-full"
              >
                {updatingStatus ? 'Updating...' : action.label}
              </Button>
            ) : null;
          })()}

          {/* Navigate menu (available accepted → trip_started) */}
          {['accepted','driver_on_way','driver_arrived','trip_started'].includes(localRide.ride_status) && (
            <div className="relative">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setNavOpen(v => !v)}
                className="w-full"
              >
                🗺️ Navigate
              </Button>
              {navOpen && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                  {(() => {
                    const pickupUrl = getNavigationUrlTo(localRide, 'pickup');
                    const dropoffUrl = getNavigationUrlTo(localRide, 'dropoff');
                    return (
                      <div className="space-y-1">
                        <button
                          className={`w-full text-left px-3 py-2 rounded-md text-sm ${pickupUrl ? 'hover:bg-gray-50 text-gray-800' : 'text-gray-400 cursor-not-allowed'}`}
                          onClick={() => { if (pickupUrl) { window.open(pickupUrl, '_blank', 'noopener,noreferrer'); setNavOpen(false); } else { addToast({ type:'warn', title:'Navigation unavailable', message:'Pickup location missing or invalid.' }); } }}
                          disabled={!pickupUrl}
                        >
                          🚩 Navigate to Pickup
                        </button>
                        <button
                          className={`w-full text-left px-3 py-2 rounded-md text-sm ${dropoffUrl ? 'hover:bg-gray-50 text-gray-800' : 'text-gray-400 cursor-not-allowed'}`}
                          onClick={() => { if (dropoffUrl) { window.open(dropoffUrl, '_blank', 'noopener,noreferrer'); setNavOpen(false); } else { addToast({ type:'warn', title:'Navigation unavailable', message:'Drop-off location missing or invalid.' }); } }}
                          disabled={!dropoffUrl}
                        >
                          🎯 Navigate to Drop-off
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

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

