import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores';
import { supabase } from '../../../lib/supabase';
import Button from '../../shared/Button';
import MapView from '../../../components/maps/MapView';

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
  const user = useAuthStore((state) => state.user);
  const [isOnline, setIsOnline] = useState(false);
  const [rideRequests, setRideRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

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
      loadRideRequests();
    }
  }, [user?.id]);

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
        setDriverLocation(data.coordinates);
      }
    } catch (error) {
      console.error('Error loading driver status:', error);
    }
  };

  // Get current location using Google Maps Geolocation API
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Load ride requests from queue with location-based filtering
  const loadRideRequests = async () => {
    if (!user?.id || !isOnline) {
      setRideRequests([]);
      setFilteredRequests([]);
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
        const distanceToPickup = driverLocation && ride.pickup_coordinates
          ? calculateDistance(driverLocation, ride.pickup_coordinates)
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
        if (ride.ride_timing === 'instant' || ride.ride_timing === 'scheduled_single') {
          if (ride.distance_to_pickup !== null && ride.distance_to_pickup > 5) {
            return false;
          }
        }
        // For scheduled rides: show all regardless of distance
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
        const location = await getCurrentLocation();
        setDriverLocation(location);

        // Update driver location in database
        await supabase
          .from('driver_locations')
          .update({
            coordinates: location,
            updated_at: new Date().toISOString()
          })
          .eq('driver_id', user.id);

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
    if (!user?.id || !isOnline) return;

    const subscription = supabase
      .channel('driver-ride-requests')
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
  }, [user?.id, isOnline]);

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

          // Upsert driver location with captured coordinates
          const { error } = await supabase
            .from('driver_locations')
            .upsert({
              driver_id: user.id,
              is_online: true,
              is_available: true,
              coordinates: location,
              updated_at: new Date().toISOString()
            });

          if (error) throw error;

          setIsOnline(true);
          alert('✅ You are now online and will receive ride requests within 5km!');

          // Load ride requests now that we're online
          loadRideRequests();
        } catch (locationError) {
          console.error('Location error:', locationError);
          alert('❌ Unable to get your location. Please enable location services and try again.');
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
        alert('⚪ You are now offline. You will not receive new ride requests.');
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
      alert('❌ Failed to update status. Please try again.');
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

      alert('✅ Interest expressed! The customer will be notified.');
      loadRideRequests();
    } catch (error) {
      console.error('Error expressing interest:', error);
      alert('❌ Failed to express interest. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Accept a ride
  const handleAcceptRide = async (rideId) => {
    if (!confirm('Are you sure you want to accept this ride?')) return;

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

      // Mark driver as unavailable
      const { error: locationError } = await supabase
        .from('driver_locations')
        .update({ is_available: false })
        .eq('driver_id', user.id);

      if (locationError) throw locationError;

      alert('✅ Ride accepted! Navigate to Active Trips to manage this ride.');
      loadRideRequests();
      
      // Redirect to active trips
      setTimeout(() => {
        window.location.href = '/driver/active-trips';
      }, 1500);
    } catch (error) {
      console.error('Error accepting ride:', error);
      alert('❌ Failed to accept ride. Please try again.');
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

      alert('Ride declined.');
      loadRideRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error declining ride:', error);
      alert('❌ Failed to decline ride. Please try again.');
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Ride Requests ({filteredRequests.length})
            </h2>

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
                </div>

                {request.estimated_cost && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm font-semibold text-green-700">
                      Earn: ${parseFloat(request.estimated_cost).toFixed(2)}
                    </p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Pickup Location</p>
                      <p className="text-gray-900">{selectedRequest.pickup_address || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Dropoff Location</p>
                      <p className="text-gray-900">{selectedRequest.dropoff_address || 'Not specified'}</p>
                    </div>
                  </div>

                  {selectedRequest.estimated_cost && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Estimated Earnings</p>
                      <p className="text-2xl font-bold text-green-700">
                        ${parseFloat(selectedRequest.estimated_cost).toFixed(2)}
                      </p>
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

