import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores';
import useProfileStore from '../../../stores/profileStore';
import { supabase } from '../../../lib/supabase';
import Button from '../../shared/Button';
import MapView from '../../../components/maps/MapView';
import { useToast } from '../../../components/ui/ToastProvider';
import { getCurrentLocation, calculateDistance, toGeoJSON } from '../../../utils/locationServices';

/**
 * Ride Requests View Component (Driver)
 *
 * Primary interface for drivers to view and respond to ride requests
 * Shows pending rides from ride_acceptance_queue
 *
 * Features:
 * - Online/Offline toggle with location capture (Google Maps Geolocation API)
 * - Location-based ride matching (5km radius for instant rides, all scheduled rides)
 * - Ride feed filters (type, timing, fare, distance, pickup time)
 * - Real-time ride requests via Supabase subscriptions
 * - Express interest / Accept / Decline actions
 * - Interactive map showing pickup location
 * - Distance from driver to pickup
 * - Estimated earnings
 * - Auto-refresh when new rides are broadcast
 *
 * Approval Requirements:
 * - Driver must have profile_completion_status = 'complete'
 * - Driver must have approval_status = 'approved'
 * - Ride feed only shows when is_online = true
 */
const RideRequestsView = () => {
  const { addToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const activeProfile = useProfileStore((state) => state.activeProfile);
  const [isOnline, setIsOnline] = useState(false);
  const [rideRequests, setRideRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [lastUpdateAt, setLastUpdateAt] = useState(0);
  const [lastLoc, setLastLoc] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    rideTypes: [], // ['taxi', 'courier', 'school_run', 'errands']
    rideTiming: 'all', // 'all', 'instant', 'scheduled'
    minFare: 0,
    maxDistance: 100, // km
    pickupTimeRange: 'all' // 'all', 'next_hour', 'next_3_hours', 'today', 'tomorrow'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load driver's online status and location on mount
  useEffect(() => {
    if (user?.id) {
      loadDriverStatus();
    }
  }, [user?.id]);

  // Load ride requests when online status or active profile changes
  useEffect(() => {
    if (user?.id && isOnline && activeProfile) {
      loadRideRequests();
    }
  }, [user?.id, isOnline, activeProfile]);

  // Load driver's online status
  const loadDriverStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('is_online, is_available, coordinates')
        .eq('driver_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error

      if (data) {
        setIsOnline(data.is_online);

        // Convert GeoJSON Point to {lat, lng} format
        if (data.coordinates && data.coordinates.type === 'Point') {
          const [lng, lat] = data.coordinates.coordinates;
          setDriverLocation({ lat, lng });
        }
      }
    } catch (error) {
      console.error('Error loading driver status:', error);
    }
  };

  // Removed duplicate getCurrentLocation and calculateDistance functions
  // Now using centralized utilities from locationServices.js

  // Load ride requests from queue with location-based filtering
  const loadRideRequests = async () => {
    // Check if driver meets all requirements
    if (!user?.id || !isOnline) {
      setRideRequests([]);
      setFilteredRequests([]);
      setLoading(false);
      return;
    }

    // Enforce profile completion and approval requirements
    // Check activeProfile from driver_profiles table
    if (!activeProfile || activeProfile.approval_status !== 'approved') {
      setRideRequests([]);
      setFilteredRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get ride requests for this driver from the queue
      const { data: queueData, error: queueError } = await supabase
        .from('ride_acceptance_queue')
        .select('ride_id, status, viewed_at')
        .eq('driver_id', user.id)
        .in('status', ['viewing', 'interested'])
        .order('created_at', { ascending: false });

      if (queueError) throw queueError;

      if (!queueData || queueData.length === 0) {
        setRideRequests([]);
        setFilteredRequests([]);
        setLoading(false);
        return;
      }

      // Get full ride details
      const rideIds = queueData.map(q => q.ride_id);
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .in('id', rideIds)
        .eq('ride_status', 'pending')
        .eq('acceptance_status', 'pending');

      if (ridesError) throw ridesError;

      // Merge queue status with ride data and calculate distances
      const mergedData = ridesData.map(ride => {
        const queueItem = queueData.find(q => q.ride_id === ride.id);

        // Convert GeoJSON coordinates to {lat, lng} format for distance calculation
        let pickupCoords = null;
        if (ride.pickup_coordinates) {
          if (ride.pickup_coordinates.type === 'Point') {
            // GeoJSON format: {type: 'Point', coordinates: [lng, lat]}
            const [lng, lat] = ride.pickup_coordinates.coordinates;
            pickupCoords = { lat, lng };
          } else if (ride.pickup_coordinates.lat && ride.pickup_coordinates.lng) {
            // Already in {lat, lng} format
            pickupCoords = ride.pickup_coordinates;
          }
        }

        const distanceToPickup = driverLocation && pickupCoords
          ? calculateDistance(driverLocation, pickupCoords)
          : null;

        return {
          ...ride,
          queue_status: queueItem?.status,
          viewed_at: queueItem?.viewed_at,
          distance_to_pickup: distanceToPickup
        };
      });

      // Filter based on ride timing and distance
      const locationFiltered = mergedData.filter(ride => {
        // For instant rides: only show within 5km radius
        if (ride.ride_timing === 'instant') {
          if (ride.distance_to_pickup !== null && ride.distance_to_pickup > 5) {
            return false;
          }
        }
        // For scheduled rides (scheduled_single, scheduled_recurring): show all regardless of distance
        return true;
      });

      setRideRequests(locationFiltered || []);
      setFilteredRequests(locationFiltered || []);

      // Auto-select first request if none selected
      if (locationFiltered && locationFiltered.length > 0 && !selectedRequest) {
        setSelectedRequest(locationFiltered[0]);
      }
    } catch (error) {
      console.error('Error loading ride requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to ride requests
  useEffect(() => {
    if (!rideRequests || rideRequests.length === 0) {
      setFilteredRequests([]);
      return;
    }

    let filtered = [...rideRequests];

    // Filter by ride type
    if (filters.rideTypes.length > 0) {
      filtered = filtered.filter(ride => filters.rideTypes.includes(ride.service_type));
    }

    // Filter by ride timing
    if (filters.rideTiming !== 'all') {
      if (filters.rideTiming === 'instant') {
        filtered = filtered.filter(ride => ride.ride_timing === 'instant');
      } else if (filters.rideTiming === 'scheduled') {
        filtered = filtered.filter(ride =>
          ride.ride_timing === 'scheduled_single' || ride.ride_timing === 'scheduled_recurring'
        );
      }
    }

    // Filter by minimum fare
    if (filters.minFare > 0) {
      filtered = filtered.filter(ride =>
        ride.estimated_cost && parseFloat(ride.estimated_cost) >= filters.minFare
      );
    }

    // Filter by maximum distance
    if (filters.maxDistance < 100) {
      filtered = filtered.filter(ride =>
        ride.distance_to_pickup === null || ride.distance_to_pickup <= filters.maxDistance
      );
    }

    // Filter by pickup time range (for scheduled rides)
    if (filters.pickupTimeRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(ride => {
        if (!ride.scheduled_datetime) return true; // Include instant rides

        const pickupTime = new Date(ride.scheduled_datetime);
        const hoursDiff = (pickupTime - now) / (1000 * 60 * 60);

        switch (filters.pickupTimeRange) {
          case 'next_hour':
            return hoursDiff >= 0 && hoursDiff <= 1;
          case 'next_3_hours':
            return hoursDiff >= 0 && hoursDiff <= 3;
          case 'today':
            return pickupTime.toDateString() === now.toDateString();
          case 'tomorrow':
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return pickupTime.toDateString() === tomorrow.toDateString();
          default:
            return true;
        }
      });
    }

    setFilteredRequests(filtered);
  }, [rideRequests, filters]);

  // Periodic location updates while online (every 30 seconds)
  useEffect(() => {
    if (!user?.id || !isOnline) return;

    const updateLocation = async () => {
      try {
        const now = Date.now();
        const location = await getCurrentLocation();

        // If called too soon (<20s) and movement < 20m, skip DB write
        const minIntervalMs = 20000;
        const minMoveMeters = 20;
        let movedEnough = true;
        if (lastLoc) {
          const km = calculateDistance(lastLoc, location) || 0;
          movedEnough = (km * 1000) >= minMoveMeters;
        }
        if (now - lastUpdateAt < minIntervalMs && !movedEnough) {
          setDriverLocation(location);
          return;
        }

        setDriverLocation(location);

        // Update driver location in database using centralized GeoJSON utility
        await supabase
          .from('driver_locations')
          .update({
            coordinates: toGeoJSON(location),
            updated_at: new Date().toISOString()
          })
          .eq('driver_id', user.id);

        setLastUpdateAt(now);
        setLastLoc(location);
        console.log('Location updated:', location);
      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    // Update location immediately
    updateLocation();

    // Set up interval for periodic updates (every 30 seconds)
    const locationInterval = setInterval(updateLocation, 30000);

    return () => {
      clearInterval(locationInterval);
    };
  }, [user?.id, isOnline]);

  // Set up real-time subscription for new ride requests
  useEffect(() => {
    // Only subscribe if driver meets all requirements
    if (!user?.id || !isOnline) return;
    if (!activeProfile || activeProfile.approval_status !== 'approved') return;

    const subscription = supabase
      .channel(`driver-ride-requests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_acceptance_queue',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New ride request received:', payload);
          loadRideRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, isOnline, activeProfile]);

  // Toggle online/offline status with location capture
  const handleToggleOnline = async () => {
    if (!user?.id) return;

    try {
      const newStatus = !isOnline;

      if (newStatus) {
        // Going online - capture current location
        setLocationLoading(true);

        try {
          const location = await getCurrentLocation();
          setDriverLocation(location);

          // Upsert driver location with captured coordinates using centralized GeoJSON utility
          const { error } = await supabase
            .from('driver_locations')
            .upsert({
              driver_id: user.id,
              is_online: true,
              is_available: true,
              coordinates: toGeoJSON(location),
              updated_at: new Date().toISOString()
            });

          if (error) throw error;

          setIsOnline(true);
          addToast({ type: 'success', title: 'You are online', message: 'You will receive ride requests within 5km' });

          // Load ride requests now that we're online
          loadRideRequests();
        } catch (locationError) {
          console.error('Location error:', locationError);
          addToast({ type: 'error', title: 'Location unavailable', message: 'Enable location services and try again' });
          setLocationLoading(false);
          return;
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

        if (error) throw error;

        setIsOnline(false);
        setRideRequests([]);
        setFilteredRequests([]);
        addToast({ type: 'info', title: 'You are offline', message: 'You will not receive new requests' });
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
      addToast({ type: 'error', title: 'Failed to update status' });
    }
  };

  // Express interest in a ride
  const handleExpressInterest = async (rideId) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('ride_acceptance_queue')
        .update({
          status: 'interested',
          viewed_at: new Date().toISOString()
        })
        .eq('ride_id', rideId)
        .eq('driver_id', user.id);

      if (error) throw error;

      addToast({ type: 'success', title: 'Interest expressed', message: 'The customer will be notified' });
      loadRideRequests();
    } catch (error) {
      console.error('Error expressing interest:', error);
      addToast({ type: 'error', title: 'Failed to express interest' });
    } finally {
      setActionLoading(false);
    }
  };

  // Accept a ride
  const handleAcceptRide = async (rideId) => {
    if (!confirm('Are you sure you want to accept this ride?')) return;

    // Check if driver already has an active instant ride
    const ride = rideRequests.find(r => r.id === rideId);
    if (ride?.ride_timing === 'instant') {
      const { data: activeInstantRides, error: checkError } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', user.id)
        .eq('ride_timing', 'instant')
        .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started']);

      if (checkError) {
        console.error('Error checking active rides:', checkError);
        addToast({ type: 'error', title: 'Failed to check active rides' });
        return;
      }

      if (activeInstantRides && activeInstantRides.length > 0) {
        addToast({ type: 'warn', title: 'Active instant ride in progress', message: 'Please complete it before accepting another' });
        return;
      }
    }

    setActionLoading(true);
    try {
      // Update queue status
      const { error: queueError } = await supabase
        .from('ride_acceptance_queue')
        .update({
          status: 'accepted',
          viewed_at: new Date().toISOString()
        })
        .eq('ride_id', rideId)
        .eq('driver_id', user.id);

      if (queueError) throw queueError;

      // Update ride with driver assignment
      const { error: rideError } = await supabase
        .from('rides')
        .update({
          driver_id: user.id,
          acceptance_status: 'accepted',
          ride_status: 'accepted',
          accepted_at: new Date().toISOString(),
          status_updated_at: new Date().toISOString()
        })
        .eq('id', rideId);

      if (rideError) throw rideError;

      // Mark driver as unavailable for instant rides only
      if (ride?.ride_timing === 'instant') {
        const { error: locationError } = await supabase
          .from('driver_locations')
          .update({ is_available: false })
          .eq('driver_id', user.id);

        if (locationError) throw locationError;
      }

      // Expire other drivers' queue entries for this ride
      const { error: expireError } = await supabase
        .from('ride_acceptance_queue')
        .update({ status: 'expired' })
        .eq('ride_id', rideId)
        .neq('driver_id', user.id);

      if (expireError) console.error('Error expiring other queue entries:', expireError);

      addToast({ type: 'success', title: 'Ride accepted', message: 'Redirecting to active trips...' });

      // Reload ride requests to remove accepted ride
      loadRideRequests();

      // Redirect to active trips
      setTimeout(() => {
        window.location.href = '/driver/active-trips';
      }, 1000);
    } catch (error) {
      console.error('Error accepting ride:', error);
      addToast({ type: 'error', title: 'Failed to accept ride' });
    } finally {
      setActionLoading(false);
    }
  };

  // Decline a ride
  const handleDeclineRide = async (rideId) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('ride_acceptance_queue')
        .update({
          status: 'declined',
          viewed_at: new Date().toISOString()
        })
        .eq('ride_id', rideId)
        .eq('driver_id', user.id);

      if (error) throw error;

      addToast({ type: 'info', title: 'Ride declined' });
      loadRideRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error declining ride:', error);
      addToast({ type: 'error', title: 'Failed to decline ride' });
    } finally {
      setActionLoading(false);
    }
  };

  // Get service icon
  const getServiceIcon = (serviceType) => {
    const icons = {
      taxi: '🚕',
      courier: '📦',
      school_run: '🎒',
      errands: '🛍️',
    };
    return icons[serviceType] || '🚗';
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate time ago
  const timeAgo = (dateString) => {
    if (!dateString) return '';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Check profile completion status
  // For drivers, check activeProfile from driver_profiles table, not user from profiles table
  const isProfileComplete = activeProfile?.profile_status === 'approved' || activeProfile?.completion_percentage === 100;
  const isApproved = activeProfile?.approval_status === 'approved';

  // Show profile incomplete warning
  if (!isProfileComplete) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Complete Your Profile
          </h2>
          <p className="text-gray-600 mb-6">
            You need to complete your driver profile before you can start receiving ride requests.
            Please fill in all required information including personal details, license information,
            vehicle details, and upload all required documents.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => window.location.href = '/driver/profile'}
          >
            Complete Profile Now
          </Button>
        </div>
      </div>
    );
  }

  // Show approval pending warning
  if (!isApproved) {
    const statusMessages = {
      pending: {
        icon: '⏳',
        title: 'Approval Pending',
        message: 'Your profile is currently under review. You will be notified once your account has been approved and you can start receiving ride requests.',
        color: 'yellow'
      },
      under_review: {
        icon: '🔍',
        title: 'Under Review',
        message: 'Your profile is being reviewed by our team. This process typically takes 24-48 hours. You will receive a notification once approved.',
        color: 'blue'
      },
      rejected: {
        icon: '❌',
        title: 'Account Rejected',
        message: activeProfile?.rejection_reason || 'Your account application was not approved. Please contact support for more information.',
        color: 'red'
      },
      suspended: {
        icon: '🚫',
        title: 'Account Suspended',
        message: 'Your account has been suspended. Please contact support for assistance.',
        color: 'red'
      }
    };

    const status = statusMessages[activeProfile?.approval_status] || statusMessages.pending;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className={`w-20 h-20 bg-${status.color}-100 rounded-full flex items-center justify-center mx-auto mb-6`}>
            <span className="text-4xl">{status.icon}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {status.title}
          </h2>
          <p className="text-gray-600 mb-6">
            {status.message}
          </p>
          {(activeProfile?.approval_status === 'rejected' || activeProfile?.approval_status === 'suspended') && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => window.location.href = '/support'}
            >
              Contact Support
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ride requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Online/Offline Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Driver Status</h2>
            <p className="text-sm text-gray-600">
              {isOnline
                ? `🟢 You are online and receiving ride requests${driverLocation ? ' within 5km' : ''}`
                : '⚪ You are offline. Go online to receive ride requests'}
            </p>
            {driverLocation && isOnline && (
              <p className="text-xs text-gray-500 mt-1">
                📍 Location: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
              </p>
            )}
          </div>
          <Button
            variant={isOnline ? 'success' : 'primary'}
            size="lg"
            onClick={handleToggleOnline}
            disabled={locationLoading}
            className="min-w-[150px]"
          >
            {locationLoading ? '📍 Getting Location...' : isOnline ? '🟢 Online' : '⚪ Go Online'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {isOnline && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ride Filters</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? '▲ Hide Filters' : '▼ Show Filters'}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Ride Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ride Type
                </label>
                <div className="space-y-2">
                  {['taxi', 'courier', 'school_run', 'errands'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.rideTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({
                              ...prev,
                              rideTypes: [...prev.rideTypes, type]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              rideTypes: prev.rideTypes.filter(t => t !== type)
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {type.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ride Timing Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ride Timing
                </label>
                <select
                  value={filters.rideTiming}
                  onChange={(e) => setFilters(prev => ({ ...prev, rideTiming: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Rides</option>
                  <option value="instant">Instant Only</option>
                  <option value="scheduled">Scheduled Only</option>
                </select>
              </div>

              {/* Minimum Fare Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Fare: ${filters.minFare}
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={filters.minFare}
                  onChange={(e) => setFilters(prev => ({ ...prev, minFare: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Maximum Distance Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Distance: {filters.maxDistance === 100 ? 'Any' : `${filters.maxDistance}km`}
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={filters.maxDistance}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Pickup Time Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Time (Scheduled)
                </label>
                <select
                  value={filters.pickupTimeRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, pickupTimeRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Times</option>
                  <option value="next_hour">Next Hour</option>
                  <option value="next_3_hours">Next 3 Hours</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                </select>
              </div>

              {/* Reset Filters Button */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    rideTypes: [],
                    rideTiming: 'all',
                    minFare: 0,
                    maxDistance: 100,
                    pickupTimeRange: 'all'
                  })}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {(filters.rideTypes.length > 0 || filters.rideTiming !== 'all' || filters.minFare > 0 ||
            filters.maxDistance < 100 || filters.pickupTimeRange !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Active Filters:</span>{' '}
                {filters.rideTypes.length > 0 && `Types: ${filters.rideTypes.join(', ')} • `}
                {filters.rideTiming !== 'all' && `Timing: ${filters.rideTiming} • `}
                {filters.minFare > 0 && `Min Fare: $${filters.minFare} • `}
                {filters.maxDistance < 100 && `Max Distance: ${filters.maxDistance}km • `}
                {filters.pickupTimeRange !== 'all' && `Pickup: ${filters.pickupTimeRange.replace('_', ' ')}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Showing {filteredRequests.length} of {rideRequests.length} rides
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ride Requests */}
      {!isOnline ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">⚪</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">You're Offline</h3>
          <p className="text-gray-600 mb-6">Go online to start receiving ride requests and earning money.</p>
          <p className="text-sm text-gray-500">
            📍 We'll capture your location when you go online to match you with nearby rides.
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {rideRequests.length === 0 ? 'No Ride Requests' : 'No Matching Rides'}
          </h3>
          <p className="text-gray-600 mb-6">
            {rideRequests.length === 0
              ? "Waiting for ride requests... You'll be notified when a new request arrives."
              : 'Try adjusting your filters to see more rides.'}
          </p>
          <Button variant="outline" onClick={loadRideRequests}>
            🔄 Refresh
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Ride Requests ({filteredRequests.length})
              </h2>
              <button
                onClick={loadRideRequests}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Refresh ride list"
              >
                <span className={loading ? 'animate-spin' : ''}>{loading ? '⟳' : '↻'}</span>
                <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {filteredRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedRequest?.id === request.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getServiceIcon(request.service_type)}</span>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">
                        {request.service_type?.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500">{timeAgo(request.created_at)}</p>
                    </div>
                  </div>
                  {request.queue_status === 'interested' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      ⭐ Interested
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">📍</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Pickup</p>
                      <p className="text-gray-900 line-clamp-2">{request.pickup_address || 'Not specified'}</p>
                    </div>
                  </div>

                  {request.distance_to_pickup !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">🚗</span>
                      <p className="text-xs text-gray-600">
                        {request.distance_to_pickup.toFixed(1)}km away
                      </p>
                    </div>
                  )}

                  {request.ride_timing !== 'instant' && request.scheduled_datetime && (
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">🕐</span>
                      <p className="text-xs text-gray-600">
                        {new Date(request.scheduled_datetime).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Badges for special ride types */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {request.is_round_trip && (
                      <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">
                        🔄 Round Trip
                      </span>
                    )}
                    {request.number_of_trips && request.number_of_trips > 1 && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                        🔄 {request.number_of_trips} Trips
                      </span>
                    )}
                  </div>
                </div>

                {request.estimated_cost && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-700">
                        Earn: ${parseFloat(request.estimated_cost).toFixed(2)}
                      </p>
                      {request.number_of_trips && request.number_of_trips > 1 && (
                        <p className="text-xs text-gray-500">
                          ${(parseFloat(request.estimated_cost) / request.number_of_trips).toFixed(2)} per trip
                        </p>
                      )}
                    </div>
                    {request.ride_timing !== 'instant' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        Scheduled
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Request Details */}
          <div className="lg:col-span-2">
            {selectedRequest ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getServiceIcon(selectedRequest.service_type)}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 capitalize">
                          {selectedRequest.service_type?.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Requested {timeAgo(selectedRequest.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map */}
                <div className="h-96 relative">
                  <MapView
                    center={selectedRequest.pickup_coordinates || { lat: -20.1594, lng: 28.5833 }}
                    zoom={14}
                    markers={[
                      selectedRequest.pickup_coordinates && {
                        position: selectedRequest.pickup_coordinates,
                        label: 'P',
                        title: 'Pickup Location'
                      },
                      selectedRequest.dropoff_coordinates && {
                        position: selectedRequest.dropoff_coordinates,
                        label: 'D',
                        title: 'Dropoff Location'
                      }
                    ].filter(Boolean)}
                  />
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                  {/* Ride Type & Timing */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                      {selectedRequest.service_type?.replace('_', ' ')}
                    </span>
                    {selectedRequest.ride_timing !== 'instant' && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        Scheduled
                      </span>
                    )}
                    {selectedRequest.booking_source && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium capitalize">
                        {selectedRequest.booking_source}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Time */}
                  {selectedRequest.scheduled_datetime && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">📅 Scheduled For</p>
                      <p className="text-lg font-bold text-purple-900">
                        {new Date(selectedRequest.scheduled_datetime).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  {/* Recurring Ride Info */}
                  {selectedRequest.number_of_trips && selectedRequest.number_of_trips > 1 && (
                    <div className="bg-indigo-50 rounded-lg p-4 border-2 border-indigo-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">🔄 Recurring Ride</p>
                      <div className="space-y-1">
                        <p className="text-gray-900">
                          <span className="font-medium">Total Trips:</span> {selectedRequest.number_of_trips}
                        </p>
                        {selectedRequest.recurrence_pattern && (
                          <p className="text-gray-900">
                            <span className="font-medium">Pattern:</span>{' '}
                            {selectedRequest.recurrence_pattern.type === 'specific_dates' && 'Specific Dates'}
                            {selectedRequest.recurrence_pattern.type === 'weekdays' && 'Weekdays (Mon-Fri)'}
                            {selectedRequest.recurrence_pattern.type === 'weekends' && 'Weekends (Sat-Sun)'}
                          </p>
                        )}
                        {selectedRequest.total_rides_in_series && (
                          <p className="text-xs text-gray-600 mt-1">
                            Part of a series of {selectedRequest.total_rides_in_series} rides
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Round Trip Indicator */}
                  {selectedRequest.is_round_trip && (
                    <div className="bg-cyan-50 rounded-lg p-4 border-2 border-cyan-200">
                      <p className="text-sm font-medium text-gray-700 mb-1">🔄 Round Trip</p>
                      <p className="text-gray-900">
                        This is a round trip ride - passenger will return to pickup location
                      </p>
                    </div>
                  )}

                  {/* Locations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">📍 Pickup Location</p>
                      <p className="text-gray-900 font-medium">{selectedRequest.pickup_address || selectedRequest.pickup_location || 'Not specified'}</p>
                      {selectedRequest.distance_to_pickup !== null && (
                        <p className="text-xs text-gray-600 mt-2">
                          🚗 {selectedRequest.distance_to_pickup.toFixed(1)} km from your location
                        </p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">🎯 Dropoff Location</p>
                      <p className="text-gray-900 font-medium">{selectedRequest.dropoff_address || selectedRequest.dropoff_location || 'Not specified'}</p>
                      {selectedRequest.distance_km && (
                        <p className="text-xs text-gray-600 mt-2">
                          📏 Trip distance: {selectedRequest.distance_km} km
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Passenger Info */}
                  {(selectedRequest.passenger_name || selectedRequest.contact_number || selectedRequest.number_of_passengers) && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">👤 Passenger Information</p>
                      <div className="space-y-1">
                        {selectedRequest.passenger_name && (
                          <p className="text-gray-900"><span className="font-medium">Name:</span> {selectedRequest.passenger_name}</p>
                        )}
                        {selectedRequest.contact_number && (
                          <p className="text-gray-900"><span className="font-medium">Phone:</span> {selectedRequest.contact_number}</p>
                        )}
                        {selectedRequest.number_of_passengers > 0 && (
                          <p className="text-gray-900"><span className="font-medium">Passengers:</span> {selectedRequest.number_of_passengers}</p>
                        )}
                        {selectedRequest.vehicle_type && (
                          <p className="text-gray-900"><span className="font-medium">Vehicle Type:</span> {selectedRequest.vehicle_type}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Special Requests / Notes */}
                  {(selectedRequest.special_requests || selectedRequest.notes) && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">📝 Special Requests</p>
                      <p className="text-gray-900">{selectedRequest.special_requests || selectedRequest.notes}</p>
                    </div>
                  )}

                  {/* Earnings */}
                  {selectedRequest.estimated_cost && (
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                      <p className="text-sm font-medium text-gray-700 mb-1">💰 Estimated Earnings</p>

                      {/* Show breakdown for recurring rides */}
                      {selectedRequest.number_of_trips && selectedRequest.number_of_trips > 1 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-gray-600">Per trip:</span>
                            <span className="text-lg font-semibold text-green-700">
                              ${(parseFloat(selectedRequest.estimated_cost) / selectedRequest.number_of_trips).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-gray-600">× {selectedRequest.number_of_trips} trips:</span>
                            <span className="text-3xl font-bold text-green-700">
                              ${parseFloat(selectedRequest.estimated_cost).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-3xl font-bold text-green-700">
                          ${parseFloat(selectedRequest.estimated_cost).toFixed(2)}
                        </p>
                      )}

                      {selectedRequest.estimated_duration_minutes && (
                        <p className="text-sm text-gray-600 mt-2">
                          ⏱️ Estimated duration: {selectedRequest.estimated_duration_minutes} minutes
                          {selectedRequest.number_of_trips > 1 && ' per trip'}
                        </p>
                      )}

                      {/* Show round trip indicator in earnings */}
                      {selectedRequest.is_round_trip && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Includes round trip fare
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    {selectedRequest.queue_status === 'viewing' && (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => handleExpressInterest(selectedRequest.id)}
                          disabled={actionLoading}
                          className="flex-1"
                        >
                          {actionLoading ? 'Processing...' : '⭐ Express Interest'}
                        </Button>
                        <Button
                          variant="success"
                          onClick={() => handleAcceptRide(selectedRequest.id)}
                          disabled={actionLoading}
                          className="flex-1"
                        >
                          {actionLoading ? 'Processing...' : '✓ Accept Ride'}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleDeclineRide(selectedRequest.id)}
                          disabled={actionLoading}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    {selectedRequest.queue_status === 'interested' && (
                      <>
                        <Button
                          variant="success"
                          onClick={() => handleAcceptRide(selectedRequest.id)}
                          disabled={actionLoading}
                          className="flex-1"
                        >
                          {actionLoading ? 'Processing...' : '✓ Accept Ride'}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleDeclineRide(selectedRequest.id)}
                          disabled={actionLoading}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Select a ride request to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RideRequestsView;

