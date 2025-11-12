import React, { useState, useEffect } from 'react';
import { useToast } from '../../../components/ui/ToastProvider';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import useProfileStore from '../../../stores/profileStore';
import Button from '../../../components/ui/Button';
import AvailableRidesView from './AvailableRidesView';
import PendingBidsView from './PendingBidsView';
import ActiveRidesView from './ActiveTripsView';
import ActiveRideOverlay from './ActiveRideOverlay';
import CancelRideModal from './CancelRideModal';
import DriverRideDetailsModal from './DriverRideDetailsModal';
import { fromGeoJSON } from '../../../utils/locationServices';
import { getNavigationUrlTo } from '../../../utils/navigation';

/**
 * DriverRidesHub - Main hub for driver ride management
 *
 * Manages 3 distinct ride states following inDrive bidding model:
 * 1. AVAILABLE RIDES - Rides drivers can bid on (status='pending', no offer from this driver yet)
 * 2. PENDING BIDS - Rides driver has bid on, waiting for passenger acceptance (offer_status='pending')
 * 3. ACTIVE RIDES - Rides where driver's bid was accepted (offer_status='accepted', ride in progress)
 *
 * Key Rules:
 * - Driver can only have ONE active instant ride at a time
 * - Driver can have multiple pending bids
 * - Driver can have multiple scheduled rides accepted
 * - When passenger accepts a bid, all other bids are rejected and drivers notified
 */
const DriverRidesHub = () => {
  const { addToast } = useToast();

  const { user } = useAuthStore();
  const { activeProfile } = useProfileStore();
  const [activeTab, setActiveTab] = useState('available'); // 'available', 'pending', 'active'
  const [isOnline, setIsOnline] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Counts for badges
  const [availableCount, setAvailableCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  const [showCancelModal, setShowCancelModal] = useState(false);
  // Details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);


  // Active ride overlay state
  const [activeInstantRide, setActiveInstantRide] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadDriverStatus();
      setupRealtimeSubscriptions();
    }
  }, [user?.id]);

  const loadDriverStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setIsOnline(data.is_online);
        if (data.coordinates) {
          // Convert GeoJSON to {lat, lng} using centralized utility
          const coords = fromGeoJSON(data.coordinates);
          if (coords) {
            setDriverLocation(coords);
          }
        }
      }
    } catch (error) {
      console.error('Error loading driver status:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to ride_offers changes for this driver
    const offersSubscription = supabase
      .channel(`driver-offers-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_offers',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Offer update:', payload);
          // Refresh counts when offers change
          loadCounts();
        }
      )
      .subscribe();

    // Subscribe to rides changes
    const ridesSubscription = supabase
      .channel(`driver-rides-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides'
        },
        (payload) => {
          console.log('Ride update:', payload);
          loadCounts();
        }
      )
      .subscribe();

    // Subscribe to notifications for this driver
    const notificationsSubscription = supabase
      .channel(`driver-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const n = payload?.new;
          console.log('Driver notification:', payload);
          if (n) {
            const isAccepted = (n.title || '').toLowerCase().includes('accepted');
            try { if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]); } catch {}
            addToast({
              type: isAccepted ? 'success' : 'info',
              title: n.title || 'Notification',
              message: n.message || '',
              duration: 8000
            });
          }
          loadCounts();
        }
      )
      .subscribe();

    return () => {
      offersSubscription.unsubscribe();
      ridesSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
    };
  };

  const loadCounts = async () => {
    if (!user?.id) return;

    try {
      // Count available rides (pending rides within radius, no offer from this driver)
      const { count: availCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('ride_status', 'pending')
        .eq('acceptance_status', 'pending')
        .is('driver_id', null);

      // Count pending bids (offers waiting for passenger acceptance)
      const { count: pendCount } = await supabase
        .from('ride_offers')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', user.id)
        .eq('offer_status', 'pending');

      // Count active rides (accepted offers or rides in progress)
      const { data: activeRides, count: actCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact' })
        .eq('driver_id', user.id)
        .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started']);

      setAvailableCount(availCount || 0);
      setPendingCount(pendCount || 0);
      setActiveCount(actCount || 0);

      // Check for active instant ride (for overlay)
      const instantRide = activeRides?.find(ride => ride.ride_timing === 'instant');
      setActiveInstantRide(instantRide || null);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  useEffect(() => {
    if (user?.id && isOnline) {
      loadCounts();
    }
  }, [user?.id, isOnline]);

  // Handlers for active ride overlay
  const handleNavigateToPickup = () => {
    if (!activeInstantRide) return;
    const url = getNavigationUrlTo(activeInstantRide, 'pickup');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      addToast({ type: 'warn', title: 'Navigation unavailable', message: 'Pickup coordinates missing or invalid.' });
    }
    setActiveTab('active'); // Switch to active rides tab
  };

  const handleViewRideDetails = () => {
    if (!activeInstantRide) return;
    setShowDetailsModal(true);
  };

  const handleCancelActiveRide = () => {
    if (!activeInstantRide) return;
    setShowCancelModal(true);
  };

  const confirmCancelRide = async (reason) => {
    if (!activeInstantRide) return { success: false };
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          ride_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'driver',
          cancellation_reason: reason
        })
        .eq('id', activeInstantRide.id);

      if (error) throw error;

      // Send notification to passenger
      await supabase
        .from('notifications')
        .insert({
          user_id: activeInstantRide.user_id,
          title: '❌ Ride cancelled',
          message: 'Your ride has been cancelled by the driver',
          type: 'ride',
          action_url: `/user/rides/${activeInstantRide.id}`
        });

      setShowCancelModal(false);
      setActiveInstantRide(null);
      addToast({ type: 'success', title: 'Ride cancelled' });
      loadCounts();
      return { success: true };
    } catch (error) {
      console.error('Error cancelling ride:', error);
      addToast({ type: 'error', title: 'Failed to cancel ride' });
      return { success: false, error: error.message };
    }
  };

  // Check if driver is approved
  const isApproved = activeProfile?.approval_status === 'approved';

  if (!isApproved) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Approval Pending</h2>
          <p className="text-gray-600 mb-6">
            Your profile is currently under review. You will be notified once your account has been approved.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Online Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Ride Management</h1>
            <p className="text-sm text-gray-600">
              {isOnline
                ? '🟢 You are online and can receive ride requests'
                : '⚪ You are offline. Go online to start earning'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-xl font-bold text-slate-700">
            T
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors relative ${
              activeTab === 'available'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>🔍 Available Rides</span>
              {availableCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {availableCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors relative ${
              activeTab === 'pending'
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>⏳ My Bids</span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors relative ${
              activeTab === 'active'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>🚗 Active Rides</span>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                  {activeCount}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'available' && (
            <AvailableRidesView
              isOnline={isOnline}
              setIsOnline={setIsOnline}
              driverLocation={driverLocation}
              setDriverLocation={setDriverLocation}
              onBidPlaced={loadCounts}
            />
          )}
          {activeTab === 'pending' && (
            <PendingBidsView onBidUpdate={loadCounts} />
          )}

      {/* Cancel Ride Modal */}
      <CancelRideModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelRide}
      />

      {/* Ride Details Modal */}
      <DriverRideDetailsModal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        ride={activeInstantRide}
      />

          {activeTab === 'active' && (
            <ActiveRidesView onRideUpdate={loadCounts} />
          )}
        </div>
      </div>

      {/* Active Ride Overlay - Shows when driver has an active instant ride */}
      {activeInstantRide && (
        <ActiveRideOverlay
          ride={activeInstantRide}
          onNavigateToPickup={handleNavigateToPickup}
          onViewDetails={handleViewRideDetails}
          onCancel={handleCancelActiveRide}
        />
      )}
    </div>
  );
};

export default DriverRidesHub;

