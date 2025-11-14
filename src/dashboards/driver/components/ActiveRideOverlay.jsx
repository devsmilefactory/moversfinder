import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import { getNavigationUrlTo } from '../../../utils/navigation';

/**
 * ActiveRideOverlay Component
 *
 * Displays an overlay on all tabs when driver has an active ride
 * Prevents accepting other rides and provides quick access to active ride actions
 */
const ActiveRideOverlay = ({ ride, onViewDetails, onCancel, onDismiss }) => {
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
      accepted: { label: isScheduled ? 'Begin Trip' : 'Start Driving to Pickup', status: 'driver_on_way', variant: 'primary' },
      driver_on_way: { label: 'Mark as Arrived', status: 'driver_arrived', variant: 'primary' },
      driver_arrived: { label: 'Start Trip', status: 'trip_started', variant: 'success' },
      trip_started: { label: 'Complete Trip', status: 'completed', variant: 'success' },
    };
    return actions[localRide.ride_status] || null;
  };

  const updateTripStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const allowedFrom = {
        driver_on_way: 'accepted',
        driver_arrived: 'driver_on_way',
        trip_started: 'driver_arrived',
        completed: 'trip_started',
      };
      const expectedCurrent = allowedFrom[newStatus];
      if (!expectedCurrent) throw new Error('Invalid status transition');

      const { error } = await supabase
        .from('rides')
        .update({
          ride_status: newStatus,
          status_updated_at: new Date().toISOString(),
          ...(newStatus === 'driver_arrived' && { estimated_arrival_time: new Date().toISOString() }),
          ...(newStatus === 'trip_started' && { actual_pickup_time: new Date().toISOString() }),
          ...(newStatus === 'completed' && { actual_dropoff_time: new Date().toISOString(), payment_status: 'paid' })
        })
        .eq('id', ride.id)
        .eq('driver_id', user.id)
        .eq('ride_status', expectedCurrent);

      if (error) throw error;

      // Optimistically update local UI so the label/stepper change immediately
      setLocalRide((prev) => ({ ...prev, ride_status: newStatus }));

      // If completed, mark driver available again
      if (newStatus === 'completed') {
        try { await supabase.from('driver_locations').update({ is_available: true }).eq('driver_id', user.id); } catch {}
        try { onDismiss && onDismiss(); } catch {}
      }

      addToast({ type: 'success', title: 'Trip status updated' });
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Failed to update status' });
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
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
        <button
          aria-label="Close overlay"
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        {/* Header */}
        <div className={`rounded-lg p-4 border-2 ${statusDisplay.color}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{statusDisplay.icon}</span>
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${statusDisplay.textColor}`}>
                {statusDisplay.text}
              </h3>
              {isScheduled && ride.scheduled_datetime && (
                <p className="text-sm text-gray-600 mt-1">
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
          size="lg"
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
                size="lg"
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
                size="lg"
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
            size="md"
            onClick={onCancel}
            className="w-full"
          >
            ❌ Cancel Ride
          </Button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-center text-gray-500">
          This overlay will remain until the ride is completed or cancelled
        </p>
      </div>
    </div>
  );
};

export default ActiveRideOverlay;

