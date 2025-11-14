import React, { useState, useEffect } from 'react';
import { useAuthStore, useRidesStore } from '../../../stores';
import { supabase } from '../../../lib/supabase';
import Button from '../../shared/Button';
import MapView from '../../../components/maps/MapView';
import PassengerOffersPanel from './PassengerOffersPanel';
import CancelRideModal from './CancelRideModal';

/**
 * Active Rides View Component
 *
 * Displays current active rides with real-time status updates
 * Shows driver information, ETA, and ride tracking
 *
 * Features:
 * - Real-time ride status updates via Supabase subscriptions
 * - Live driver location tracking
 * - Interactive map showing pickup/dropoff locations
 * - Ride status timeline
 * - Driver contact information
 * - Cancel ride functionality
 */
const ActiveRidesView = () => {
  const user = useAuthStore((state) => state.user);
  const { rides, ridesLoading, loadRides, cancelRide } = useRidesStore();
  const [activeRides, setActiveRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetRideId, setCancelTargetRideId] = useState(null);

  const [driverLocation, setDriverLocation] = useState(null);
  const [cancellingRideId, setCancellingRideId] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [driverInfoLoading, setDriverInfoLoading] = useState(false);

  // Load active rides on mount
  useEffect(() => {
    if (user?.id) {
      loadActiveRides();
    }
  }, [user?.id]);

  // Load active rides (not completed or cancelled)
  const loadActiveRides = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user.id)
        .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActiveRides(data || []);

      // Auto-select first ride if none selected
      if (data && data.length > 0 && !selectedRide) {
        setSelectedRide(data[0]);
      }
    } catch (error) {
      console.error('Error loading active rides:', error);
    }
  };

  // Set up real-time subscription for ride updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('active-rides-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Ride update received:', payload);
          loadActiveRides();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Set up real-time subscription for driver location
  useEffect(() => {
    if (!selectedRide?.driver_id) return;

    const subscription = supabase
      .channel('driver-location-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${selectedRide.driver_id}`
        },
        (payload) => {
          console.log('Driver location update:', payload);
          setDriverLocation(payload.new.coordinates);
        }
      )
      .subscribe();

    // Load initial driver location
    loadDriverLocation(selectedRide.driver_id);

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedRide?.driver_id]);

  // Load driver info when a driver is assigned
  useEffect(() => {
    const loadInfo = async () => {
      if (!selectedRide?.driver_id) { setDriverInfo(null); return; }
      setDriverInfoLoading(true);
      try {
        // Fetch driver profile information
        const { data: driverProfile, error: profileError } = await supabase
          .from('driver_profiles')
          .select('full_name, vehicle_make, vehicle_model, vehicle_color, license_plate')
          .eq('user_id', selectedRide.driver_id)
          .single();

        // Fetch phone number from profiles table
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', selectedRide.driver_id)
          .single();

        if (!profileError && !userError) {
          setDriverInfo({
            ...driverProfile,
            phone_number: userProfile?.phone || null
          });
        } else {
          setDriverInfo(driverProfile || null);
        }
      } catch (e) {
        console.error('Error loading driver info:', e);
        setDriverInfo(null);
      } finally {
        setDriverInfoLoading(false);
      }
    };
    loadInfo();
  }, [selectedRide?.driver_id]);

  // Load driver location
  const loadDriverLocation = async (driverId) => {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('coordinates')
        .eq('driver_id', driverId)
        .single();

      if (error) throw error;
      setDriverLocation(data?.coordinates);
    } catch (error) {
      console.error('Error loading driver location:', error);
    }
  };

  // Open cancel modal
  const handleCancelRide = (rideId) => {
    setCancelTargetRideId(rideId);
    setShowCancelModal(true);
  };

  // Confirm cancellation with reason
  const confirmCancelRide = async (reason) => {
    const rideId = cancelTargetRideId;
    if (!rideId) return;

    setCancellingRideId(rideId);
    try {
      // Try extended cancellation fields first
      const update = {
        ride_status: 'cancelled',
        cancel_reason: reason,
        cancelled_by: 'passenger',
        cancelled_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('rides')
        .update(update)
        .eq('id', rideId);

      if (error) {
        console.warn('Extended cancel update failed, falling back:', error.message);
        // Fallback to minimal update in case columns do not exist
        const { error: e2 } = await supabase
          .from('rides')
          .update({ ride_status: 'cancelled', status_updated_at: new Date().toISOString() })
          .eq('id', rideId);
        if (e2) throw e2;
      }

      alert('✅ Ride cancelled successfully');
      setShowCancelModal(false);
      setCancelTargetRideId(null);
      loadActiveRides();

      if (selectedRide?.id === rideId) {
        setSelectedRide(null);
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
      alert('❌ Failed to cancel ride. Please try again.');
    } finally {
      setCancellingRideId(null);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Finding Driver', icon: '🔍' },
      accepted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Driver Assigned', icon: '✓' },
      driver_on_way: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Driver On Way', icon: '🚗' },
      driver_arrived: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Driver Arrived', icon: '📍' },
      trip_started: { bg: 'bg-green-100', text: 'text-green-800', label: 'Trip In Progress', icon: '🚕' },
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: '•' };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        <span>{badge.icon}</span>
        <span>{badge.label}</span>
      </span>
    );
  };

  // Get service icon
  const getServiceIcon = (serviceType) => {
    const icons = {
      taxi: '🚕',
      courier: '📦',
      school_run: '🎒',
      errands: '🛍️',
      bulk: '👥',
    };
    return icons[serviceType] || '🚗';
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (ridesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading active rides...</p>
        </div>
      </div>
    );
  }

  if (activeRides.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚕</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Rides</h3>
        <p className="text-gray-600 mb-6">You don't have any active rides at the moment.</p>
        <Button variant="primary" onClick={() => window.location.href = '/user'}>
          Book a Ride
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Active Rides List */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Active Rides ({activeRides.length})</h2>

        {activeRides.map((ride) => (
          <div
            key={ride.id}
            onClick={() => setSelectedRide(ride)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedRide?.id === ride.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getServiceIcon(ride.service_type)}</span>
                <div>
                  <p className="font-semibold text-gray-900 capitalize">
                    {ride.service_type?.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(ride.created_at)}</p>
                </div>
              </div>
              {getStatusBadge(ride.ride_status)}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">📍</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Pickup</p>
                  <p className="text-gray-900 line-clamp-1">{ride.pickup_address || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">📍</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Dropoff</p>
                  <p className="text-gray-900 line-clamp-1">{ride.dropoff_address || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {ride.ride_timing === 'scheduled_single' && ride.scheduled_datetime && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">Scheduled for</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(ride.scheduled_datetime)} at {formatTime(ride.scheduled_datetime)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ride Details and Map */}
      <div className="lg:col-span-2">
        {selectedRide ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getServiceIcon(selectedRide.service_type)}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {selectedRide.service_type?.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Booked on {formatDate(selectedRide.created_at)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(selectedRide.ride_status)}
              </div>

              {/* Status Timeline */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {['pending', 'accepted', 'driver_on_way', 'driver_arrived', 'trip_started'].map((status, index) => {
                  const isActive = ['pending', 'accepted', 'driver_on_way', 'driver_arrived', 'trip_started']
                    .indexOf(selectedRide.ride_status) >= index;
                  return (
                    <React.Fragment key={status}>
                      <div className={`flex items-center gap-2 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      {index < 4 && (
                        <div className={`h-0.5 w-8 ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Map */}
            <div className="h-96 relative">
              <MapView
                center={selectedRide.pickup_coordinates || { lat: -20.1594, lng: 28.5833 }}
                zoom={13}
                markers={[
                  selectedRide.pickup_coordinates && {
                    position: selectedRide.pickup_coordinates,
                    label: 'P',
                    title: 'Pickup Location'
                  },
                  selectedRide.dropoff_coordinates && {
                    position: selectedRide.dropoff_coordinates,
                    label: 'D',
                    title: 'Dropoff Location'
                  },
                  driverLocation && {
                    position: driverLocation,
                    label: '🚗',
                    title: 'Driver Location'
                  }
                ].filter(Boolean)}
              />
            </div>

            {/* Ride Details */}
              {/* Offers Panel (when ride is pending) */}
              {selectedRide.ride_status === 'pending' && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <PassengerOffersPanel rideId={selectedRide.id} onAccepted={() => loadActiveRides()} />
                </div>
              )}

            <div className="p-6 space-y-4">
              {/* Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Pickup Location</p>
                  <p className="text-gray-900">{selectedRide.pickup_address || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Dropoff Location</p>
                  <p className="text-gray-900">{selectedRide.dropoff_address || 'Not specified'}</p>
                </div>
              </div>
      <CancelRideModal
        open={showCancelModal}
        onClose={() => { setShowCancelModal(false); setCancelTargetRideId(null); }}
        onConfirm={confirmCancelRide}
      />


              {/* Driver Info (if assigned) */}
              {selectedRide.driver_id && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Driver Information</p>
                  {driverInfoLoading ? (
                    <p className="text-sm text-gray-600">Loading driver details...</p>
                  ) : driverInfo ? (
                    <div>
                      <p className="text-gray-900 font-medium">{driverInfo.full_name || 'Driver'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {driverInfo.vehicle_color} {driverInfo.vehicle_make} {driverInfo.vehicle_model} • {driverInfo.license_plate}
                      </p>
                      {driverInfo.phone_number && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-sm text-gray-700">{driverInfo.phone_number}</span>
                          <Button variant="outline" size="sm" onClick={() => window.location.href = `tel:${driverInfo.phone_number}`}>
                            Call Driver
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Driver assigned</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {selectedRide.ride_status === 'pending' && (
                  <Button
                    variant="danger"
                    onClick={() => handleCancelRide(selectedRide.id)}
                    disabled={cancellingRideId === selectedRide.id}
                  >
                    {cancellingRideId === selectedRide.id ? 'Cancelling...' : 'Cancel Ride'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => alert('Contact support feature coming soon!')}>
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Select a ride to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveRidesView;

