import React, { useState, useEffect, useRef } from 'react';
import Button from '../../../../components/ui/Button';
import { RIDE_STATUSES } from '../../../../hooks/useRideStatus';
import { useToast } from '../../../../components/ui/ToastProvider';
import { supabase } from '../../../../lib/supabase';

// Import modular components
import RideStatusDisplay from './RideStatusDisplay';
import RideLocationInfo from './RideLocationInfo';
import StatusUpdateActions from './StatusUpdateActions';
import RideNavigationModal from './RideNavigationModal';
import ComingSoonChatModal from '../../../../components/shared/ComingSoonChatModal';
import RideCompactSummary from './RideCompactSummary';
import { getActiveRideOverlayResolution } from './registry/activeRideOverlayRegistry.jsx';

/**
 * RefactoredActiveRideOverlay Component
 * 
 * Modular version of ActiveRideOverlay broken down into focused components.
 * Reduced from 698+ lines to a manageable container component.
 */
const RefactoredActiveRideOverlay = ({ ride, onViewDetails, onCancel, onDismiss, onCompleted }) => {
  if (!ride) return null;

  console.log('🚗 RefactoredActiveRideOverlay rendered with ride:', {
    id: ride.id,
    status: ride.ride_status,
    timing: ride.ride_timing,
    pickup: ride.pickup_address,
    dropoff: ride.dropoff_address
  });

  // State management
  const [localRide, setLocalRide] = useState(ride);
  const [passengerPhone, setPassengerPhone] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);
  const [navDefaultDestination, setNavDefaultDestination] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const completionTriggeredRef = useRef(false);

  // Computed values
  const isScheduled = localRide?.ride_timing !== 'instant';
  const isInstant = localRide?.ride_timing === 'instant';
  const needsToBeStarted = isScheduled && localRide.ride_status === 'accepted';
  const isRideCompleted = 
    localRide.ride_status === RIDE_STATUSES.TRIP_COMPLETED ||
    localRide.ride_status === RIDE_STATUSES.COMPLETED;
  // (Round trip UI is handled in summary display / other screens; keep overlay lean.)

  // Hooks
  const { addToast } = useToast();

  // Load passenger phone number
  useEffect(() => {
    const loadPassengerPhone = async () => {
      if (!localRide?.user_id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', localRide.user_id)
          .single();

        if (error) {
          console.error('Error loading passenger phone:', error);
          return;
        }

        setPassengerPhone(data?.phone);
      } catch (error) {
        console.error('Error loading passenger phone:', error);
      }
    };

    loadPassengerPhone();
  }, [localRide?.user_id]);

  // Update local ride when prop changes
  useEffect(() => {
    setLocalRide(ride);
  }, [ride]);

  // Hydrate + keep local ride in sync with the database (important if the overlay is closed/reopened
  // and the caller passes a stale/partial ride object).
  useEffect(() => {
    const rideId = ride?.id;
    if (!rideId) return;

    let cancelled = false;

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('id', rideId)
          .single();

        if (cancelled) return;
        if (error) {
          console.warn('Failed to hydrate active ride from DB:', error);
          return;
        }
        if (data) {
          setLocalRide((prev) => ({ ...(prev || {}), ...data }));
        }
      } catch (e) {
        if (!cancelled) console.warn('Failed to hydrate active ride from DB:', e);
      }
    };

    fetchLatest();

    const channel = supabase
      .channel(`refactored-active-ride-overlay-${rideId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          if (!payload?.new) return;
          setLocalRide((prev) => ({ ...(prev || {}), ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        channel.unsubscribe();
      } catch {}
    };
  }, [ride?.id]);

  // Auto-dismiss overlay + trigger rating flow when trip reaches completion (non-errands).
  const registry = getActiveRideOverlayResolution({
    ride: localRide,
    isRideCompleted,
    setLocalRide,
    onCompleted,
    onDismiss,
  });

  useEffect(() => {
    if (completionTriggeredRef.current) return;
    const completed =
      localRide?.ride_status === RIDE_STATUSES.TRIP_COMPLETED ||
      localRide?.ride_status === RIDE_STATUSES.COMPLETED;
    if (!completed) return;

    // Some ride types (e.g. errands) handle completion internally.
    if (registry?.handlesCompletion) return;

    completionTriggeredRef.current = true;
    if (typeof onCompleted === 'function') {
      onCompleted(localRide);
    }
    if (typeof onDismiss === 'function') {
      onDismiss();
    }
  }, [localRide?.id, localRide?.ride_status, registry?.handlesCompletion, onCompleted, onDismiss]);

  return (
    <>
      {/* Non-blocking overlay shell (matches legacy overlay behavior) */}
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
          <RideStatusDisplay ride={localRide} isScheduled={isScheduled} />

          {/* Compact ride summary (pickup/dropoff/phone/cost) */}
          <RideCompactSummary
            ride={localRide}
            passengerPhone={passengerPhone}
            isScheduled={isScheduled}
          />

          {/* Warning Messages */}
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

          {/* Primary actions row */}
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => onViewDetails?.(localRide)}
              className="w-1/2"
            >
              📱 View Details
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowChatModal(true)}
              className="w-1/2"
            >
              💬 Chat
            </Button>
          </div>

          {/* Location Information */}
          <RideLocationInfo ride={localRide} passengerPhone={passengerPhone} />

          {/* Ride-type specific panels (registry-driven) */}
          {registry?.servicePanels?.length > 0 && (
            <div className="space-y-3">
              {registry.servicePanels.map((panel, idx) => (
                <React.Fragment key={idx}>{panel}</React.Fragment>
              ))}
            </div>
          )}

          {/* Status Stepper + Dynamic Button (canonical) */}
          <StatusUpdateActions
            ride={localRide}
            onStatusUpdate={(newStatus, updatedRide) => {
              setUpdatingStatus(true);
              if (updatedRide) {
                setLocalRide(updatedRide);
              } else {
                setLocalRide((prev) => ({ ...(prev || {}), ride_status: newStatus }));
              }
              setUpdatingStatus(false);
            }}
            onPromptNavigate={({ defaultDestination }) => {
              setNavDefaultDestination(defaultDestination || null);
              setShowNavModal(true);
            }}
            updatingStatus={updatingStatus}
            isRideCompleted={isRideCompleted}
            isScheduled={isScheduled}
            needsToBeStarted={needsToBeStarted}
          />

          {/* Always-visible actions */}
          <div className="space-y-2 border-t-2 border-gray-200 pt-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setNavDefaultDestination(null);
                setShowNavModal(true);
              }}
              className="w-full"
            >
              🗺️ Navigate
            </Button>

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

      {/* IMPORTANT: render modals outside the pointer-events-none overlay wrapper */}
      <RideNavigationModal
        isOpen={showNavModal}
        onClose={() => setShowNavModal(false)}
        ride={localRide}
        passengerPhone={passengerPhone}
        defaultDestination={navDefaultDestination}
      />

      <ComingSoonChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        title="Chat (Coming soon)"
      />
    </>
  );
};

export default RefactoredActiveRideOverlay;