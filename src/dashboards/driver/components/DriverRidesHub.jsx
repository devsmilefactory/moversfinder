import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../../components/ui/ToastProvider';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import useProfileStore from '../../../stores/profileStore';
import { Search, Clock, TrendingUp, CheckCircle, MapPin, Radio, RotateCw } from 'lucide-react';
import Button from '../../../components/ui/Button';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import AvailableRidesView from './AvailableRidesView';
import PendingBidsView from './PendingBidsView';
import ActiveRidesView from './ActiveTripsView';
import ActiveRideOverlay from './ActiveRideOverlay';
import CancelRideModal from './CancelRideModal';
import DriverRideDetailsModal from './DriverRideDetailsModal';
import { fromGeoJSON, getCurrentLocation, toGeoJSON, calculateDistance } from '../../../utils/locationServices';

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
  const navigate = useNavigate();


  const { user } = useAuthStore();
  const { activeProfile, refreshProfiles, loadProfileData } = useProfileStore();
  const [activeTab, setActiveTab] = useState('available'); // 'available', 'pending', 'active'
  const [isOnline, setIsOnline] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  const [driverLocation, setDriverLocation] = useState(null);
  const [previousLocation, setPreviousLocation] = useState(null); // Track previous location for change detection
  const [locationCity, setLocationCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  // Counts for badges
  const [availableCount, setAvailableCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const [showCancelModal, setShowCancelModal] = useState(false);
  // Details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);


  const location = useLocation();
  const [overlayDismissKey, setOverlayDismissKey] = useState(() => {
    try { return sessionStorage.getItem('driver_overlay_dismiss_key') || null; } catch { return null; }
  });
  const [overlayDismissPath, setOverlayDismissPath] = useState(() => {
    try { return sessionStorage.getItem('driver_overlay_dismiss_path') || null; } catch { return null; }
  });

  useEffect(() => {
    // If driver navigates to a different page, reset the dismissal so overlay may show again
    if (overlayDismissPath && overlayDismissPath !== location.pathname) {
      setOverlayDismissKey(null);
      setOverlayDismissPath(null);
      try {
        sessionStorage.removeItem('driver_overlay_dismiss_key');
        sessionStorage.removeItem('driver_overlay_dismiss_path');
      } catch {}
    }
  }, [location.pathname]);


  // Active ride overlay state
  const [activeInstantRide, setActiveInstantRide] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadDriverStatus();
      setupRealtimeSubscriptions();
    }
  }, [user?.id]);

  // Periodic location updates every 35 seconds when online
  useEffect(() => {
    if (!user?.id || !isOnline) return;

    const updateDriverLocation = async () => {
      try {
        const coords = await getCurrentLocation();

        // Check if driver has moved significantly (>200m)
        let shouldUpdateFeed = false;
        if (previousLocation) {
          const distanceMoved = calculateDistance(previousLocation, coords);
          if (distanceMoved > 0.2) { // 0.2 km = 200 meters
            console.log(`Driver moved ${(distanceMoved * 1000).toFixed(0)}m - refreshing feed`);
            shouldUpdateFeed = true;
          }
        }

        // Update location in database
        const { error } = await supabase
          .from('driver_locations')
          .update({
            coordinates: toGeoJSON(coords),
            updated_at: new Date().toISOString()
          })
          .eq('driver_id', user.id);

        if (error) {
          console.error('Error updating driver location:', error);
        } else {
          setDriverLocation(coords);
          setPreviousLocation(coords);

          // If driver moved significantly, refresh the available rides feed
          if (shouldUpdateFeed) {
            loadCounts();
          }
        }
      } catch (error) {
        console.error('Error in periodic location update:', error);
      }
    };

    // Update immediately on mount
    updateDriverLocation();

    // Then update every 35 seconds
    const intervalId = setInterval(updateDriverLocation, 35000);

    return () => clearInterval(intervalId);
  }, [user?.id, isOnline, previousLocation]);

  const handleDismissOverlay = () => {
    if (!activeInstantRide) return;
    const key = `${activeInstantRide.id}:${activeInstantRide.ride_status}`;
    setOverlayDismissKey(key);
    setOverlayDismissPath(location.pathname);
    try {
      sessionStorage.setItem('driver_overlay_dismiss_key', key);
      sessionStorage.setItem('driver_overlay_dismiss_path', location.pathname);
    } catch {}
  };

  const restoreOverlaySuppression = () => {
    setOverlayDismissKey(null);
    setOverlayDismissPath(null);
    try {
      sessionStorage.removeItem('driver_overlay_dismiss_key');
      sessionStorage.removeItem('driver_overlay_dismiss_path');
    } catch {}
  };


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

      // Count completed rides
      const { count: compCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', user.id)
        .eq('ride_status', 'completed');

      setAvailableCount(availCount || 0);
      setPendingCount(pendCount || 0);
      setActiveCount(actCount || 0);
      setCompletedCount(compCount || 0);

      // Select overlay ride: only active statuses, and for scheduled rides only after started
      const allowedStatuses = ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'];
      const overlayRide = (activeRides || [])
        .filter(r => allowedStatuses.includes(r.ride_status))
        .find(ride => (
          ride.ride_timing === 'instant' ||
          (ride.ride_timing !== 'instant' && ['driver_on_way','driver_arrived','trip_started'].includes(ride.ride_status))
        ));
      setActiveInstantRide(overlayRide || null);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  useEffect(() => {
    if (user?.id && isOnline) {
      loadCounts();
    }
  }, [user?.id, isOnline]);

  // Handlers for active ride overlay (details/cancel)
  // Note: no direct navigate overlay action is rendered anymore

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

  // Toggle online/offline status
  const handleToggleOnline = async (newStatus) => {
    if (!user?.id) return;

    if (newStatus) {
      // Going online - get real location
      setLocationLoading(true);
      try {
        const coords = await getCurrentLocation();

        // Get city name from coordinates
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown Location';
          setLocationCity(city);
        } catch (err) {
          console.error('Error getting city name:', err);
          setLocationCity('Unknown Location');
        }

        // Save to database in GeoJSON format
        const { error } = await supabase
          .from('driver_locations')
          .upsert({
            driver_id: user.id,
            is_online: true,
            is_available: true,
            coordinates: toGeoJSON(coords),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        setDriverLocation(coords);
        setPreviousLocation(coords); // Set initial previous location
        setIsOnline(true);
        addToast({ type: 'success', title: 'You are now online', message: 'You will receive ride requests' });
        loadCounts();
      } catch (error) {
        console.error('Location error:', error);
        addToast({ type: 'error', title: 'Location unavailable', message: error.message || 'Please enable location services' });
      } finally {
        setLocationLoading(false);
      }
    } else {
      // Going offline
      const { error } = await supabase
        .from('driver_locations')
        .update({
          is_online: false,
          is_available: false,
          updated_at: new Date().toISOString()
        })
        .eq('driver_id', user.id);

      if (error) {
        console.error('Error going offline:', error);
        addToast({ type: 'error', title: 'Failed to go offline' });
      } else {
        setIsOnline(false);
        setLocationCity('');
        setPreviousLocation(null); // Clear previous location when going offline
        addToast({ type: 'info', title: 'You are now offline' });
      }
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
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={refreshingStatus}
              onClick={async () => {
                if (!user?.id) return;
                try {
                  setRefreshingStatus(true);
                  await refreshProfiles(user.id);
                  await loadProfileData(user.id, 'driver');
                  addToast({ type: 'success', message: 'Status refreshed' });
                } catch (e) {
                  console.error('Failed to refresh status', e);
                  addToast({ type: 'error', message: 'Failed to refresh status. Please try again.' });
                } finally {
                  setRefreshingStatus(false);
                }
              }}
              className="bg-yellow-400 text-slate-900 hover:bg-yellow-500"
            >
              {refreshingStatus ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/driver/profile')}
            >
              View Profile
            </Button>
          </div>
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
    <div className="space-y-4">
      {/* Header - Fixed Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {/* Top Row: Online/Offline Toggle and Location - Centered */}
        <div className="flex items-center justify-center gap-6 mb-3">
          {/* Online/Offline Toggle */}
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={isOnline}
              onChange={handleToggleOnline}
              disabled={locationLoading}
              size="lg"
            />
            <div>
              <p className="font-semibold text-gray-900">
                {isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-xs text-gray-600">
                {locationLoading ? 'Getting location...' : (isOnline ? 'Receiving ride requests' : 'Go online to start earning')}
              </p>
            </div>
          </div>

          {/* Current Location - Always visible when online */}
          {isOnline && driverLocation && locationCity && (
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <div>
                <p className="text-xs text-gray-500">Current Location</p>
                <p className="text-sm font-medium text-gray-700">
                  {locationCity}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row: Searching indicator and Refresh */}
        <div className="flex items-center justify-center gap-3">
          {isOnline && (
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <span className="text-sm text-blue-700 font-medium animate-pulse">
                Searching for rides...
              </span>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-sm transition-colors"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation - Horizontally Scrollable */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-shrink-0 px-6 py-3.5 text-center font-medium transition-all relative whitespace-nowrap ${
              activeTab === 'available'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-base">🔍</span>
              <span className="text-sm font-semibold">Available</span>
              {availableCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-semibold">
                  {availableCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-shrink-0 px-6 py-3.5 text-center font-medium transition-all relative whitespace-nowrap ${
              activeTab === 'pending'
                ? 'text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-base">⏰</span>
              <span className="text-sm font-semibold">My Bids</span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full font-semibold">
                  {pendingCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-shrink-0 px-6 py-3.5 text-center font-medium transition-all relative whitespace-nowrap ${
              activeTab === 'active'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-base">🚗</span>
              <span className="text-sm font-semibold">In Progress</span>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-semibold">
                  {activeCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-shrink-0 px-6 py-3.5 text-center font-medium transition-all relative whitespace-nowrap ${
              activeTab === 'completed'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-base">✅</span>
              <span className="text-sm font-semibold">Completed</span>
              {completedCount > 0 && (
                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-semibold">
                  {completedCount}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(100vh-320px)]">
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
          {activeTab === 'active' && (
            <ActiveRidesView onRideUpdate={loadCounts} onTripSelected={restoreOverlaySuppression} />
          )}
          {activeTab === 'completed' && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Completed Rides</h3>
              <p className="text-gray-600">Your completed rides will appear here</p>
            </div>
          )}
        </div>
      </div>

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

      {/* Active Ride Overlay */}
      {activeInstantRide && (() => {
        const key = `${activeInstantRide.id}:${activeInstantRide.ride_status}`;
        const suppressed = overlayDismissKey === key && overlayDismissPath === location.pathname;
        return suppressed ? null : (
          <ActiveRideOverlay
            ride={activeInstantRide}
            onViewDetails={handleViewRideDetails}
            onCancel={handleCancelActiveRide}
            onDismiss={handleDismissOverlay}
          />
        );
      })()}

    </div>
  );
};

export default DriverRidesHub;

