import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import { MapPin, Navigation, DollarSign, User, Calendar, Package, Users } from 'lucide-react';
import Button from '../../../components/ui/Button';
import MapView from '../../../components/maps/MapView';
import Modal from '../../../components/ui/Modal';
import { calculateDistance, formatDistance, fromGeoJSON, getCurrentLocation, toGeoJSON } from '../../../utils/locationServices';
import { calculateEstimatedFareV2, formatPrice } from '../../../utils/pricingCalculator';

/**
 * AvailableRidesView - Shows rides available for bidding
 *
 * Displays rides where:
 * - ride_status = 'pending'
 * - acceptance_status = 'pending'
 * - driver_id IS NULL
 * - Driver hasn't already placed a bid
 * - Within radius for instant rides
 */
const AvailableRidesView = ({ isOnline, setIsOnline, driverLocation, setDriverLocation, onBidPlaced }) => {
  const { user } = useAuthStore();
  const [availableRides, setAvailableRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showRideModal, setShowRideModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);

  useEffect(() => {
    if (user?.id && isOnline) {
      loadAvailableRides();
    }
  }, [user?.id, isOnline, driverLocation]); // Re-load when driver location changes

  // Realtime updates: refresh the list when rides or offers change while online
  useEffect(() => {
    if (!user?.id || !isOnline) return;

    const ridesSubscription = supabase
      .channel(`available-rides-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        (payload) => {
          console.log('Rides table changed:', payload);
          loadAvailableRides();
        }
      )
      .subscribe();

    // Subscribe to ride_offers to detect when this driver places a bid
    const offersSubscription = supabase
      .channel(`driver-offers-available-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_offers', filter: `driver_id=eq.${user.id}` },
        (payload) => {
          console.log('Driver placed bid:', payload);
          loadAvailableRides(); // Refresh to remove the ride from available list
        }
      )
      .subscribe();

    return () => {
      ridesSubscription.unsubscribe();
      offersSubscription.unsubscribe();
    };
  }, [user?.id, isOnline]);


  const loadAvailableRides = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let ridesData = [];

      // Use PostGIS server-side filtering for instant rides when driver location is available
      if (driverLocation && driverLocation.lat && driverLocation.lng) {
        // Get rides within 5km radius using PostGIS ST_DWithin
        const { data: nearbyRides, error: nearbyError } = await supabase
          .rpc('find_rides_within_radius', {
            driver_lat: driverLocation.lat,
            driver_lng: driverLocation.lng,
            radius_km: 5
          });

        if (nearbyError) {
          console.error('Error fetching nearby rides:', nearbyError);
          // Fallback to fetching all rides if PostGIS query fails
          const { data: allRides, error: fallbackError } = await supabase
            .from('rides')
            .select('*')
            .eq('ride_status', 'pending')
            .eq('acceptance_status', 'pending')
            .is('driver_id', null)
            .order('created_at', { ascending: false });

          if (fallbackError) throw fallbackError;
          ridesData = allRides || [];
        } else {
          ridesData = nearbyRides || [];
        }
      } else {
        // No driver location - fetch all pending rides (scheduled rides don't need location filtering)
        const { data: allRides, error: ridesError } = await supabase
          .from('rides')
          .select('*')
          .eq('ride_status', 'pending')
          .eq('acceptance_status', 'pending')
          .is('driver_id', null)
          .order('created_at', { ascending: false });

        if (ridesError) throw ridesError;
        ridesData = allRides || [];
      }

      // Get driver's existing offers to filter out rides already bid on
      const { data: offersData, error: offersError } = await supabase
        .from('ride_offers')
        .select('ride_id')
        .eq('driver_id', user.id);

      if (offersError) throw offersError;

      const bidRideIds = new Set(offersData?.map(o => o.ride_id) || []);

      // Filter out rides driver has already bid on
      const filteredRides = ridesData.filter(ride => !bidRideIds.has(ride.id));

      // Process coordinates and calculate distances
      const ridesWithDistance = filteredRides.map(ride => {
        let pickupCoords = null;
        let dropoffCoords = null;

        // Convert pickup coordinates from GeoJSON to {lat, lng}
        if (ride.pickup_coordinates) {
          pickupCoords = fromGeoJSON(ride.pickup_coordinates);
        }

        // Convert dropoff coordinates from GeoJSON to {lat, lng}
        if (ride.dropoff_coordinates) {
          dropoffCoords = fromGeoJSON(ride.dropoff_coordinates);
        }

        // Use distance_to_pickup_km from PostGIS if available, otherwise calculate
        const distanceToPickup = ride.distance_to_pickup_km !== undefined
          ? ride.distance_to_pickup_km
          : (driverLocation && pickupCoords ? calculateDistance(driverLocation, pickupCoords) : null);

        // Calculate total trip distance (pickup to dropoff)
        let tripDistance = null;
        if (ride.distance_km && typeof ride.distance_km === 'number') {
          tripDistance = ride.distance_km;
        } else if (pickupCoords && dropoffCoords) {
          tripDistance = calculateDistance(pickupCoords, dropoffCoords);
        }

        return {
          ...ride,
          pickup_coordinates: pickupCoords,
          dropoff_coordinates: dropoffCoords,
          distance_to_pickup: distanceToPickup,
          trip_distance: tripDistance
        };
      });

      setAvailableRides(ridesWithDistance);
      if (ridesWithDistance.length > 0 && !selectedRide) {
        setSelectedRide(ridesWithDistance[0]);
      }
    } catch (error) {
      console.error('Error loading available rides:', error);
    } finally {
      setLoading(false);
    }
  };

  // Removed duplicate calculateDistance function - now using centralized utility from locationServices.js

  // Compute a fallback suggested fare using centralized V2 estimator when record has no estimated_cost
  const computeSuggestedFare = (ride) => {
    if (!ride) return null;
    if (ride.estimated_cost) return parseFloat(ride.estimated_cost);

    // Prefer stored distance_km, otherwise approximate using Haversine of pickup->dropoff
    const distanceKm = typeof ride.distance_km === 'number'
      ? ride.distance_km
      : (ride.pickup_coordinates && ride.dropoff_coordinates
          ? calculateDistance(ride.pickup_coordinates, ride.dropoff_coordinates)
          : null);

    if (distanceKm && distanceKm > 0) {
      try {
        return calculateEstimatedFareV2({ distanceKm });
      } catch (e) {
        console.warn('Failed to compute suggested fare V2:', e);
        return null;
      }
    }
    return null;
  };


  const handleToggleOnline = async () => {
    if (!isOnline) {
      // Going online - get real location using centralized utility
      setLocationLoading(true);
      try {
        const coords = await getCurrentLocation();

        // Save to database in GeoJSON format using centralized utility
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
        setIsOnline(true);
        loadAvailableRides();
      } catch (error) {
        console.error('Location error:', error);
        alert(error.message || '❌ Failed to get your location. Please enable location services.');
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
      }

      setIsOnline(false);
      setAvailableRides([]);
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedRide || !bidAmount) {
      alert('Please enter a bid amount');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    setSubmittingBid(true);
    try {
      const { error } = await supabase
        .from('ride_offers')
        .insert({
          ride_id: selectedRide.id,
          driver_id: user.id,
          quoted_price: amount,
          message: bidMessage || null,
          offer_status: 'pending',
          offered_at: new Date().toISOString()
        });

      if (error) throw error;

      alert('✅ Bid placed successfully! You will be notified if the passenger accepts your offer.');

      // Close modal and reset form
      setShowRideModal(false);
      setSelectedRide(null);
      setBidAmount('');
      setBidMessage('');

      loadAvailableRides();
      if (onBidPlaced) onBidPlaced();
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('❌ Failed to place bid. Please try again.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const getServiceIcon = (serviceType) => {
    const icons = {
      taxi: '🚕',
      courier: '📦',
      school_run: '🎒',
      errands: '🛒',
      bulk: '👥'
    };
    return icons[serviceType] || '🚕';
  };

  const getTimingIcon = (rideTiming) => {
    const icons = {
      instant: '⚡',
      scheduled_single: '📅',
      scheduled_recurring: '🔄'
    };
    return icons[rideTiming] || '⚡';
  };

  const getTimingLabel = (rideTiming) => {
    const labels = {
      instant: 'Instant',
      scheduled_single: 'Scheduled',
      scheduled_recurring: 'Recurring'
    };
    return labels[rideTiming] || 'Instant';
  };

  if (!isOnline) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">You're Offline</h3>
        <p className="text-gray-600">Toggle the switch above to go online and start receiving ride requests.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available rides...</p>
        </div>
      </div>
    );
  }

  if (availableRides.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Navigation className="w-10 h-10 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Available Rides</h3>
        <p className="text-gray-600 mb-6">Waiting for new ride requests... You'll be notified when one arrives.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">How Bidding Works</p>
            <p className="text-xs text-blue-700">
              Browse available rides, place your bid with your price, and wait for the passenger to accept your offer.
            </p>
          </div>
        </div>
      </div>

      {/* Rides List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Available Rides ({availableRides.length})
          </h3>
        </div>
          {(() => {
            const seen = new Set();
            const groups = [];
            availableRides.forEach((r) => {
              const isBulk = r?.booking_type === 'bulk' && r?.batch_id;
              const key = isBulk ? `bulk:${r.batch_id}` : `single:${r.id}`;
              if (seen.has(key)) return;
              seen.add(key);
              if (isBulk) {
                const members = availableRides.filter(x => x?.booking_type === 'bulk' && x?.batch_id === r.batch_id);
                if (members.length > 1) {
                  groups.push({ type: 'bulk_group', batch_id: r.batch_id, rides: members });
                } else {
                  groups.push({ type: 'single', ride: r });
                }
              } else {
                groups.push({ type: 'single', ride: r });
              }
            });
            return groups;
          })().map((item) => (
            item.type === 'bulk_group' ? (
              <div key={item.batch_id} className="rounded-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden">
                <div className="bg-indigo-600 text-white px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👥</span>
                    <span className="font-semibold text-sm">Bulk Ride - {item.rides.length} Trips</span>
                  </div>
                  <div className="text-sm font-bold">
                    ${item.rides.reduce((s, rr) => s + (parseFloat(rr.estimated_cost) || 0), 0).toFixed(2)}
                  </div>
                </div>
                <div className="p-2 space-y-2">
                  {item.rides.map((ride) => (
                    <div
                      key={ride.id}
                      onClick={() => {
                        setSelectedRide(ride);
                        setShowRideModal(true);
                        const suggested = computeSuggestedFare(ride);
                        const defaultBid = ride.estimated_cost ?? (suggested != null ? suggested.toFixed(2) : '');
                        setBidAmount(defaultBid);
                        setBidMessage('');
                      }}
                      className="p-3 rounded-lg border border-gray-200 cursor-pointer transition-all hover:border-indigo-400 hover:shadow-md bg-white"
                    >
                      <div className="space-y-2">
                        {/* Header with service type and timing */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getServiceIcon(ride.service_type)}</span>
                            <span className="font-semibold text-gray-900 capitalize text-sm">
                              {ride.service_type?.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            {getTimingIcon(ride.ride_timing)} {getTimingLabel(ride.ride_timing)}
                          </span>
                        </div>

                        {/* Pickup location */}
                        <div className="bg-gray-50 rounded p-2">
                          <div className="flex items-start gap-1.5">
                            <span className="text-sm mt-0.5">📍</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500">Pickup</p>
                              <p className="text-xs text-gray-900 font-medium truncate">
                                {ride.pickup_address || ride.pickup_location}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Dropoff location */}
                        {ride.dropoff_address && (
                          <div className="bg-gray-50 rounded p-2">
                            <div className="flex items-start gap-1.5">
                              <span className="text-sm mt-0.5">🎯</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">Dropoff</p>
                                <p className="text-xs text-gray-900 font-medium truncate">
                                  {ride.dropoff_address || ride.dropoff_location}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Trip Info Grid */}
                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100">
                          {ride.distance_to_pickup !== null && (
                            <div className="bg-blue-50 rounded p-1.5 text-center">
                              <span className="text-sm block">🚗</span>
                              <p className="text-xs text-gray-600 text-[10px]">To Pickup</p>
                              <p className="text-xs font-bold text-blue-700">
                                {formatDistance(ride.distance_to_pickup)}
                              </p>
                            </div>
                          )}
                          {ride.trip_distance !== null && (
                            <div className="bg-purple-50 rounded p-1.5 text-center">
                              <span className="text-sm block">📏</span>
                              <p className="text-xs text-gray-600 text-[10px]">Trip Dist</p>
                              <p className="text-xs font-bold text-purple-700">
                                {formatDistance(ride.trip_distance)}
                              </p>
                            </div>
                          )}
                          {ride.estimated_cost && (
                            <div className="bg-green-50 rounded p-1.5 text-center">
                              <span className="text-sm block">💰</span>
                              <p className="text-xs text-gray-600 text-[10px]">Price</p>
                              <p className="text-xs font-bold text-green-700">
                                {formatPrice(parseFloat(ride.estimated_cost))}
                              </p>
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
                key={item.ride.id}
                className="rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg bg-white transition-all overflow-hidden"
              >
                <div
                  onClick={() => {
                    const ride = item.ride;
                    setSelectedRide(ride);
                    setShowRideModal(true);
                    const suggested = computeSuggestedFare(ride);
                    const defaultBid = ride.estimated_cost ?? (suggested != null ? suggested.toFixed(2) : '');
                    setBidAmount(defaultBid);
                    setBidMessage('');
                  }}
                  className="p-4 cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Header with service type and timing */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getServiceIcon(item.ride.service_type)}</span>
                        <span className="font-bold text-gray-900 capitalize">
                          {item.ride.service_type?.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {getTimingIcon(item.ride.ride_timing)} {getTimingLabel(item.ride.ride_timing)}
                      </span>
                    </div>

                    {/* Pickup location */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">Pickup Location</p>
                          <p className="text-sm font-medium text-gray-900">
                            {item.ride.pickup_address || item.ride.pickup_location}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dropoff location */}
                    {item.ride.dropoff_address && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-base mt-0.5">🎯</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Dropoff Location</p>
                            <p className="text-sm font-medium text-gray-900">
                              {item.ride.dropoff_address || item.ride.dropoff_location}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Trip Information Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                      {/* Distance to Pickup */}
                      {item.ride.distance_to_pickup !== null && (
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <span className="text-lg block mb-1">🚗</span>
                          <p className="text-xs text-gray-600 mb-0.5">To Pickup</p>
                          <p className="text-sm font-bold text-blue-700">
                            {formatDistance(item.ride.distance_to_pickup)}
                          </p>
                        </div>
                      )}

                      {/* Total Trip Distance */}
                      {item.ride.trip_distance !== null && (
                        <div className="bg-purple-50 rounded-lg p-2 text-center">
                          <span className="text-lg block mb-1">📏</span>
                          <p className="text-xs text-gray-600 mb-0.5">Trip Distance</p>
                          <p className="text-sm font-bold text-purple-700">
                            {formatDistance(item.ride.trip_distance)}
                          </p>
                        </div>
                      )}

                      {/* Suggested Price */}
                      {item.ride.estimated_cost && (
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <span className="text-lg block mb-1">💰</span>
                          <p className="text-xs text-gray-600 mb-0.5">Suggested</p>
                          <p className="text-sm font-bold text-green-700">
                            {formatPrice(parseFloat(item.ride.estimated_cost))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Place Bid Button - At the bottom */}
                <div className="px-4 pb-4">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      const ride = item.ride;
                      setSelectedRide(ride);
                      setShowRideModal(true);
                      const suggested = computeSuggestedFare(ride);
                      const defaultBid = ride.estimated_cost ?? (suggested != null ? suggested.toFixed(2) : '');
                      setBidAmount(defaultBid);
                      setBidMessage('');
                    }}
                  >
                    Place Bid
                  </Button>
                </div>
              </div>
            )
          ))}
      </div>

      {/* Ride Details Modal */}
      {selectedRide && (
        <Modal
          isOpen={showRideModal}
          onClose={() => {
            setShowRideModal(false);
            setSelectedRide(null);
            setBidAmount('');
            setBidMessage('');
          }}
          title={
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getServiceIcon(selectedRide.service_type)}</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900 capitalize">
                  {selectedRide.service_type?.replace('_', ' ')} Request
                </h3>
                <p className="text-sm text-gray-500">
                  {getTimingIcon(selectedRide.ride_timing)} {getTimingLabel(selectedRide.ride_timing)} • Posted {new Date(selectedRide.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Distance Info - Prominent */}
            {selectedRide.distance_to_pickup !== null && (
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🚗</span>
                      <p className="text-sm font-medium text-blue-900">Distance to Pickup</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">
                      {formatDistance(selectedRide.distance_to_pickup)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Map */}
            {selectedRide.pickup_coordinates && (
              <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                <MapView
                  center={selectedRide.pickup_coordinates}
                  zoom={14}
                  markers={[
                    driverLocation && {
                      position: driverLocation,
                      label: 'You',
                      title: 'Your Location',
                      icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    },
                    {
                      position: selectedRide.pickup_coordinates,
                      label: 'P',
                      title: 'Pickup Location'
                    },
                    selectedRide.dropoff_coordinates && {
                      position: selectedRide.dropoff_coordinates,
                      label: 'D',
                      title: 'Dropoff Location'
                    }
                  ].filter(Boolean)}
                />
              </div>
            )}

            {/* Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">📍</span>
                  <p className="text-xs font-semibold text-gray-700">Pickup</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedRide.pickup_address || selectedRide.pickup_location}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🎯</span>
                  <p className="text-xs font-semibold text-gray-700">Dropoff</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedRide.dropoff_address || selectedRide.dropoff_location}
                </p>
              </div>
            </div>

            {/* Passenger Info */}
            {selectedRide.passenger_name && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">👤</span>
                  <p className="text-xs font-semibold text-gray-700">Passenger</p>
                </div>
                <p className="text-sm font-medium text-gray-900">{selectedRide.passenger_name}</p>
                {selectedRide.number_of_passengers > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedRide.number_of_passengers} passenger(s)
                  </p>
                )}
              </div>
            )}

            {/* Suggested Price */}
            {(selectedRide.estimated_cost || computeSuggestedFare(selectedRide) != null) && (
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💰</span>
                  <p className="text-sm font-semibold text-gray-700">Suggested Price</p>
                </div>
                <p className="text-3xl font-bold text-green-700">
                  ${(selectedRide.estimated_cost ? parseFloat(selectedRide.estimated_cost) : computeSuggestedFare(selectedRide)).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  You can bid higher or lower based on your preference
                </p>
              </div>
            )}

            {/* Bidding Form */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Place Your Bid</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Enter your price"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message to Passenger (Optional)
                  </label>
                  <textarea
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    placeholder="e.g., I can pick you up in 5 minutes"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button
                  variant="success"
                  size="lg"
                  onClick={handlePlaceBid}
                  disabled={submittingBid || !bidAmount}
                  className="w-full"
                >
                  {submittingBid ? 'Placing Bid...' : '✓ Place Bid'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AvailableRidesView;

