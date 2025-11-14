import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import MapView from '../../../components/maps/MapView';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastProvider';
import { formatDistance, calculateDistance, getCurrentLocation } from '../../../utils/locationServices';

import { getNavigationUrlForDriver, getNavigationUrlTo } from '../../../utils/navigation';

/**
 * Active Trips View Component (Driver Version)
 *
 * Displays driver's current active trips with real-time status updates
 * Shows passenger information, pickup/dropoff locations, and trip tracking
 *
 * Features:
 * - Real-time trip status updates via Supabase subscriptions
 * - Interactive map showing pickup/dropoff locations
 * - Trip status management (accept, start, complete)
 * - Passenger contact information
 * - Navigation to pickup/dropoff
 */
const ActiveTripsView = ({ onTripSelected }) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [tripToRate, setTripToRate] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [reportedIssues, setReportedIssues] = useState([]);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  const [passengerProfile, setPassengerProfile] = useState(null);

  useEffect(() => {
    if (!selectedTrip?.user_id) { setPassengerProfile(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('name, phone, email')
          .eq('id', selectedTrip.user_id)
          .maybeSingle();
        if (!cancelled) setPassengerProfile(data || null);
      } catch (e) {
        if (!cancelled) setPassengerProfile(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTrip?.user_id]);

  // Load active trips on mount
  useEffect(() => {
    if (user) {
      loadActiveTrips();
      setupRealtimeSubscription();
    }
  }, [user]);

  // Load active trips assigned to this driver
  const loadActiveTrips = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get driver's current location from driver_locations table
      let driverLocation = null;
      try {
        const { data: locationData } = await supabase
          .from('driver_locations')
          .select('coordinates')
          .eq('driver_id', user.id)
          .maybeSingle();

        if (locationData?.coordinates) {
          if (locationData.coordinates.type === 'Point') {
            const [lng, lat] = locationData.coordinates.coordinates;
            driverLocation = { lat, lng };
          } else if (locationData.coordinates.lat && locationData.coordinates.lng) {
            driverLocation = locationData.coordinates;
          }
        }
      } catch (locError) {
        console.warn('Could not fetch driver location:', locError);
      }

      // Process trips with distance calculations
      const tripsWithDistance = (data || []).map(trip => {
        let pickupCoords = null;
        let dropoffCoords = null;

        // Convert pickup coordinates from GeoJSON to {lat, lng}
        if (trip.pickup_coordinates) {
          if (trip.pickup_coordinates.type === 'Point') {
            const [lng, lat] = trip.pickup_coordinates.coordinates;
            pickupCoords = { lat, lng };
          } else if (trip.pickup_coordinates.lat && trip.pickup_coordinates.lng) {
            pickupCoords = trip.pickup_coordinates;
          }
        }

        // Convert dropoff coordinates from GeoJSON to {lat, lng}
        if (trip.dropoff_coordinates) {
          if (trip.dropoff_coordinates.type === 'Point') {
            const [lng, lat] = trip.dropoff_coordinates.coordinates;
            dropoffCoords = { lat, lng };
          } else if (trip.dropoff_coordinates.lat && trip.dropoff_coordinates.lng) {
            dropoffCoords = trip.dropoff_coordinates;
          }
        }

        // Calculate distance to pickup (dynamic based on driver's current location)
        const distanceToPickup = driverLocation && pickupCoords
          ? calculateDistance(driverLocation, pickupCoords)
          : null;

        // Calculate total trip distance (pickup to dropoff)
        // Use stored distance_km if available, otherwise calculate using coordinates
        let tripDistance = null;
        if (trip.distance_km && typeof trip.distance_km === 'number') {
          tripDistance = trip.distance_km;
        } else if (trip.distance && typeof trip.distance === 'number') {
          tripDistance = trip.distance;
        } else if (pickupCoords && dropoffCoords) {
          tripDistance = calculateDistance(pickupCoords, dropoffCoords);
        }

        return {
          ...trip,
          pickup_coordinates: pickupCoords,
          dropoff_coordinates: dropoffCoords,
          distance_to_pickup: distanceToPickup,
          trip_distance: tripDistance
        };
      });

      setActiveTrips(tripsWithDistance);

      // Auto-select first trip if none selected
      if (tripsWithDistance.length > 0 && !selectedTrip) {
        setSelectedTrip(tripsWithDistance[0]);
      }
    } catch (error) {
      console.error('Error loading active trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const subscription = supabase
      .channel(`driver-trips-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Trip update received:', payload);
          loadActiveTrips();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  // Update trip status with basic transition guard
  const updateTripStatus = async (trip, newStatus) => {
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
          ...(newStatus === 'completed' && {
            actual_dropoff_time: new Date().toISOString(),
            payment_status: 'paid' // Mark as paid when completed
          })
        })
        .eq('id', trip.id)
        .eq('driver_id', user.id)
        .eq('ride_status', expectedCurrent);

      if (error) throw error;

      // If trip completed, show rating modal
      if (newStatus === 'completed') {
        setTripToRate(trip);
        setShowRatingModal(true);

        // Mark driver as available again
        await supabase
          .from('driver_locations')
          .update({ is_available: true })
          .eq('driver_id', user.id);
      }

      addToast({ type: 'success', title: 'Trip status updated' });
      loadActiveTrips();
    } catch (error) {
      console.error('Error updating trip status:', error);
      addToast({ type: 'error', title: 'Failed to update trip status' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle rating submitted
  const handleRatingSubmitted = (tripId, rating) => {
    console.log(`Trip ${tripId} rated: ${rating} stars`);
    loadActiveTrips();
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      accepted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Accepted', icon: '✓' },
      driver_on_way: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'On Way to Pickup', icon: '🚗' },
      driver_arrived: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Arrived at Pickup', icon: '📍' },
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
    };
    return icons[serviceType] || '🚗';
  };

  // Get next action button
  const getNextActionButton = (trip) => {
    const actions = {
      accepted: {
        label: 'Start Driving to Pickup',
        status: 'driver_on_way',
        variant: 'primary'
      },
      driver_on_way: {
        label: 'Mark as Arrived',
        status: 'driver_arrived',
        variant: 'primary'
      },
      driver_arrived: {
        label: 'Start Trip',
        status: 'trip_started',
        variant: 'success'
      },
      trip_started: {
        label: 'Complete Trip',
        status: 'completed',
        variant: 'success'
      }
    };

    const action = actions[trip.ride_status];
    if (!action) return null;

    return (
      <Button
        variant={action.variant}
        onClick={() => updateTripStatus(trip, action.status)}
        disabled={updatingStatus}
        className="w-full"
      >
        {updatingStatus ? 'Updating...' : action.label}
      </Button>
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading active trips...</p>
        </div>
      </div>
    );
  }

  if (activeTrips.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚕</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Trips</h3>
        <p className="text-gray-600 mb-6">You don't have any active trips at the moment.</p>
        <Button variant="primary" onClick={() => window.location.href = '/driver/ride-requests'}>
          View Ride Requests
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Active Trips List */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Active Trips ({activeTrips.length})</h2>

        {(() => {
          const seen = new Set();
          const groups = [];
          activeTrips.forEach((t) => {
            const isBulk = t?.booking_type === 'bulk' && t?.batch_id;
            const key = isBulk ? `bulk:${t.batch_id}` : `single:${t.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            if (isBulk) {
              const members = activeTrips.filter(x => x?.booking_type === 'bulk' && x?.batch_id === t.batch_id);
              if (members.length > 1) {
                groups.push({ type: 'bulk_group', batch_id: t.batch_id, trips: members });
              } else {
                groups.push({ type: 'single', trip: t });
              }
            } else {
              groups.push({ type: 'single', trip: t });
            }
          });
          return groups;
        })().map((item) => (
          item.type === 'bulk_group' ? (
            <div key={item.batch_id} className="p-4 rounded-lg border-2 border-indigo-300 bg-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-indigo-800">Bulk Batch ({item.trips.length} trips)</div>
                <div className="text-sm text-indigo-700">
                  Total: ${item.trips.reduce((s, tr) => s + (parseFloat(tr.estimated_cost) || 0), 0).toFixed(2)}
                </div>
              </div>
              <div className="space-y-2">
                {item.trips.map((trip) => (
                  <div
                    key={trip.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedTrip(trip); try { onTripSelected && onTripSelected(trip); } catch {} }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTrip(trip); try { onTripSelected && onTripSelected(trip); } catch {} } }}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      selectedTrip?.id === trip.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getServiceIcon(trip.service_type)}</span>
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">
                            {trip.service_type?.replace('_', ' ')} <span className="ml-1 text-xs text-indigo-600 font-medium">Bulk</span>
                          </p>
                          <p className="text-xs text-gray-500">{formatTime(trip.created_at)}</p>
                        </div>
                      </div>
                      {getStatusBadge(trip.ride_status)}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">📍</span>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Pickup</p>
                          <p className="text-gray-900 line-clamp-1">{trip.pickup_address || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">📍</span>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Dropoff</p>
                          <p className="text-gray-900 line-clamp-1">{trip.dropoff_address || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {trip.distance_to_pickup !== null && (
                          <div className="flex items-start gap-1">
                            <span className="text-blue-600 mt-0.5 text-xs">🚗</span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">To Pickup</p>
                              <p className="text-xs font-semibold text-blue-700">
                                {formatDistance(trip.distance_to_pickup)}
                              </p>
                            </div>
                          </div>
                        )}
                        {trip.trip_distance !== null && (
                          <div className="flex items-start gap-1">
                            <span className="text-indigo-600 mt-0.5 text-xs">📏</span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">Trip Dist</p>
                              <p className="text-xs font-semibold text-indigo-700">
                                {formatDistance(trip.trip_distance)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              key={item.trip.id}
              role="button"
              tabIndex={0}
              onClick={() => { setSelectedTrip(item.trip); try { onTripSelected && onTripSelected(item.trip); } catch {} }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTrip(item.trip); try { onTripSelected && onTripSelected(item.trip); } catch {} } }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedTrip?.id === item.trip.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getServiceIcon(item.trip.service_type)}</span>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">
                      {item.trip.service_type?.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">{formatTime(item.trip.created_at)}</p>
                  </div>
                </div>
                {getStatusBadge(item.trip.ride_status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">📍</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="text-gray-900 line-clamp-1">{item.trip.pickup_address || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">📍</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Dropoff</p>
                    <p className="text-gray-900 line-clamp-1">{item.trip.dropoff_address || 'Not specified'}</p>
                  </div>
                </div>

                {/* Distance Information Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  {item.trip.distance_to_pickup !== null && (
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🚗</span>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">To Pickup</p>
                          <p className="text-sm font-bold text-blue-700">
                            {formatDistance(item.trip.distance_to_pickup)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {item.trip.trip_distance !== null && (
                    <div className="bg-purple-50 rounded-lg p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">📏</span>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Trip Dist</p>
                          <p className="text-sm font-bold text-purple-700">
                            {formatDistance(item.trip.trip_distance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {item.trip.estimated_cost && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">
                    Fare: ${parseFloat(item.trip.estimated_cost).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )
        ))}
      </div>

      {/* Trip Details and Map */}
      <div className="lg:col-span-2">
        {selectedTrip ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getServiceIcon(selectedTrip.service_type)}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {selectedTrip.service_type?.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Booked at {formatTime(selectedTrip.created_at)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(selectedTrip.ride_status)}
              </div>
            </div>

            {/* Map */}
            <div className="h-96 relative">
              <MapView
                center={selectedTrip.pickup_coordinates || selectedTrip.dropoff_coordinates || null}
                zoom={13}
                markers={[
                  selectedTrip.pickup_coordinates && {
                    position: selectedTrip.pickup_coordinates,
                    label: 'P',
                    title: 'Pickup Location'
                  },
                  selectedTrip.dropoff_coordinates && {
                    position: selectedTrip.dropoff_coordinates,
                    label: 'D',
                    title: 'Dropoff Location'
                  }
                ].filter(Boolean)}
              />
            </div>

            {/* Trip Details */}
            <div className="p-6 space-y-4">
              {/* Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Pickup Location</p>
                  <p className="text-gray-900">{selectedTrip.pickup_address || 'Not specified'}</p>
                  {selectedTrip.pickup_coordinates &&
                    isFinite(parseFloat(selectedTrip.pickup_coordinates.lat)) &&
                    isFinite(parseFloat(selectedTrip.pickup_coordinates.lng)) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Coords: {parseFloat(selectedTrip.pickup_coordinates.lat).toFixed(5)}, {parseFloat(selectedTrip.pickup_coordinates.lng).toFixed(5)}
                      </p>
                    )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Dropoff Location</p>
                  <p className="text-gray-900">{selectedTrip.dropoff_address || 'Not specified'}</p>
                  {selectedTrip.dropoff_coordinates &&
                    isFinite(parseFloat(selectedTrip.dropoff_coordinates.lat)) &&
                    isFinite(parseFloat(selectedTrip.dropoff_coordinates.lng)) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Coords: {parseFloat(selectedTrip.dropoff_coordinates.lat).toFixed(5)}, {parseFloat(selectedTrip.dropoff_coordinates.lng).toFixed(5)}
                      </p>
                    )}
                </div>

	              {typeof selectedTrip.distance_km === 'number' && (
	                <div className="mt-4 text-sm text-gray-700">
	                  Trip distance:{' '}
	                  <span className="font-semibold">
	                    {formatDistance(selectedTrip.distance_km)}
	                  </span>
	                </div>
	              )}

              </div>

              {/* Passenger Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500 mb-2">Passenger</p>
                <div className="text-gray-900 font-medium">
                  {passengerProfile?.name || 'Unknown'}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="mr-2">User ID:</span>
                  <span className="font-mono text-xs">{selectedTrip.user_id}</span>
                </div>
                {passengerProfile?.phone && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-sm text-gray-700">{passengerProfile.phone}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `tel:${passengerProfile.phone}`;
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.163 21 3 14.837 3 7V6a1 1 0 011-1z" />
                      </svg>
                      Call Passenger
                    </button>
                  </div>
                )}
                {selectedTrip.passengers && (
                  <p className="text-sm text-gray-600 mt-1">Passengers: {selectedTrip.passengers}</p>
                )}
                {selectedTrip.special_instructions && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Special Instructions</p>
                    <p className="text-sm text-gray-900">{selectedTrip.special_instructions}</p>
                  </div>
                )}
              </div>

              {/* Courier Package Details */}
              {selectedTrip.service_type === 'courier' && (selectedTrip.courier_package_details || selectedTrip.package_size) && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm font-bold text-purple-700 mb-1">Package Details</p>
                  {selectedTrip.package_size && (
                    <div className="text-xs text-purple-600 mb-1">
                      Size: <span className="font-semibold capitalize">{selectedTrip.package_size}</span>
                    </div>
                  )}
                  {selectedTrip.courier_package_details && (
                    <div className="text-sm text-purple-700">{selectedTrip.courier_package_details}</div>
                  )}
                </div>
              )}

              {/* Fare */}
              {selectedTrip.estimated_cost && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Estimated Fare</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${parseFloat(selectedTrip.estimated_cost).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Scheduled Info */}
              {(selectedTrip.ride_timing?.includes('scheduled') || selectedTrip.scheduled_datetime || selectedTrip.scheduled_date) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-700 mb-1">Scheduled</p>
                  <p className="text-sm text-blue-800">
                    {selectedTrip.scheduled_datetime
                      ? new Date(selectedTrip.scheduled_datetime).toLocaleString()
                      : (selectedTrip.scheduled_date && selectedTrip.scheduled_time)
                        ? `${selectedTrip.scheduled_date} ${selectedTrip.scheduled_time}`
                        : 'Scheduled'}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {getNextActionButton(selectedTrip)}

                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setNavMenuOpen((v) => !v)}
                  >
                    Navigate
                  </Button>
                  {navMenuOpen && (
                    <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                      {/* Show Pickup when not yet started; show Drop-off once trip started */}
                      {(['accepted','driver_on_way','driver_arrived'].includes(selectedTrip.ride_status)) && (
                        <button
                          type="button"
                          className="block w-full text-left px-4 py-2 hover:bg-slate-50"
                          onClick={() => {
                            const url = getNavigationUrlTo(selectedTrip, 'pickup');
                            if (url) {
                              window.open(url, '_blank');
                            } else {
                              addToast({ type: 'warn', title: 'Navigation unavailable', message: 'Missing coordinates' });
                            }
                            setNavMenuOpen(false);
                          }}
                        >
                          Navigate to Pickup
                        </button>
                      )}
                      {(selectedTrip.ride_status === 'trip_started') && (
                        <button
                          type="button"
                          className="block w-full text-left px-4 py-2 hover:bg-slate-50"
                          onClick={() => {
                            const url = getNavigationUrlTo(selectedTrip, 'dropoff');
                            if (url) {
                              window.open(url, '_blank');
                            } else {
                              addToast({ type: 'warn', title: 'Navigation unavailable', message: 'Missing coordinates' });
                            }
                            setNavMenuOpen(false);
                          }}
                        >
                          Navigate to Drop-off
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Select a trip to view details</p>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && tripToRate && (
        <RatingModal
          trip={tripToRate}
          onClose={() => {
            setShowRatingModal(false);
            setTripToRate(null);
          }}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
};

export default ActiveTripsView;

