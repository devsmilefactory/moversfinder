import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
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
  }, [user?.id, isOnline]);

  // Realtime updates: refresh the list when rides change while online
  useEffect(() => {
    if (!user?.id || !isOnline) return;
    const subscription = supabase
      .channel(`available-rides-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        () => {
          loadAvailableRides();
        }
      )
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [user?.id, isOnline]);


  const loadAvailableRides = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get rides where driver hasn't bid yet
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('ride_status', 'pending')
        .eq('acceptance_status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false });

      if (ridesError) throw ridesError;

      // Get driver's existing offers
      const { data: offersData, error: offersError } = await supabase
        .from('ride_offers')
        .select('ride_id')
        .eq('driver_id', user.id);

      if (offersError) throw offersError;

      const bidRideIds = new Set(offersData?.map(o => o.ride_id) || []);

      // Filter out rides driver has already bid on
      const filteredRides = ridesData?.filter(ride => !bidRideIds.has(ride.id)) || [];

      // Calculate distances and filter by radius for instant rides
      const ridesWithDistance = filteredRides.map(ride => {
        let pickupCoords = null;
        let dropoffCoords = null;

        // Convert pickup coordinates from GeoJSON to {lat, lng}
        if (ride.pickup_coordinates) {
          if (ride.pickup_coordinates.type === 'Point') {
            const [lng, lat] = ride.pickup_coordinates.coordinates;
            pickupCoords = { lat, lng };
          } else if (ride.pickup_coordinates.lat && ride.pickup_coordinates.lng) {
            pickupCoords = ride.pickup_coordinates;
          }
        }

        // Convert dropoff coordinates from GeoJSON to {lat, lng}
        if (ride.dropoff_coordinates) {
          if (ride.dropoff_coordinates.type === 'Point') {
            const [lng, lat] = ride.dropoff_coordinates.coordinates;
            dropoffCoords = { lat, lng };
          } else if (ride.dropoff_coordinates.lat && ride.dropoff_coordinates.lng) {
            dropoffCoords = ride.dropoff_coordinates;
          }
        }

        const distanceToPickup = driverLocation && pickupCoords
          ? calculateDistance(driverLocation, pickupCoords)
          : null;

        return {
          ...ride,
          pickup_coordinates: pickupCoords,
          dropoff_coordinates: dropoffCoords,
          distance_to_pickup: distanceToPickup
        };
      });

      // Filter instant rides by 5km radius
      const locationFiltered = ridesWithDistance.filter(ride => {
        if (ride.ride_timing === 'instant') {
          if (ride.distance_to_pickup !== null && ride.distance_to_pickup > 5) {
            return false;
          }
        }
        return true;
      });

      setAvailableRides(locationFiltered);
      if (locationFiltered.length > 0 && !selectedRide) {
        setSelectedRide(locationFiltered[0]);
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
      school_run: '🚌',
      errands: '🛒'
    };
    return icons[serviceType] || '🚗';
  };

  if (!isOnline) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚪</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">You're Offline</h3>
        <p className="text-gray-600 mb-6">Go online to see available ride requests and start bidding.</p>
        <Button
          variant="primary"
          size="lg"
          onClick={handleToggleOnline}
          disabled={locationLoading}
        >
          {locationLoading ? '📍 Getting Location...' : '🟢 Go Online'}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available rides...</p>
        </div>
      </div>
    );
  }

  if (availableRides.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Available Rides</h3>
        <p className="text-gray-600 mb-6">Waiting for new ride requests... You'll be notified when one arrives.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={loadAvailableRides}>
            🔄 Refresh
          </Button>
          <Button variant="danger" onClick={handleToggleOnline}>
            ⚪ Go Offline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Online Status Bar */}
      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
        <div>
          <p className="font-medium text-green-900">🟢 You are online</p>
          {driverLocation && (
            <p className="text-sm text-green-700">
              📍 Location: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAvailableRides}>
            🔄 Refresh
          </Button>
          <Button variant="danger" size="sm" onClick={handleToggleOnline}>
            ⚪ Go Offline
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        💡 <strong>How it works:</strong> Browse available rides, place your bid with your price, and wait for the passenger to accept your offer.
      </p>

      {/* Rides List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 mb-3">
          Available Rides ({availableRides.length})
        </h3>
          {availableRides.map(ride => (
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
              className="p-4 rounded-lg border-2 cursor-pointer transition-all border-gray-200 hover:border-blue-300 hover:shadow-md bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{getServiceIcon(ride.service_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 capitalize truncate">
                      {ride.service_type?.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      📍 {ride.pickup_address || ride.pickup_location}
                    </p>
                    {ride.distance_to_pickup !== null && (
                      <p className="text-xs text-gray-500 mt-1">
                        🚗 {formatDistance(ride.distance_to_pickup)} away
                      </p>
                    )}
                    {ride.estimated_cost && (
                      <p className="text-sm font-semibold text-green-700 mt-2">
                        Suggested: {formatPrice(parseFloat(ride.estimated_cost))}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {ride.ride_timing !== 'instant' && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs whitespace-nowrap">
                      Scheduled
                    </span>
                  )}
                  <Button variant="primary" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
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
              <span className="text-3xl">{getServiceIcon(selectedRide.service_type)}</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900 capitalize">
                  {selectedRide.service_type?.replace('_', ' ')} Request
                </h3>
                <p className="text-sm text-gray-500">
                  Posted {new Date(selectedRide.created_at).toLocaleTimeString()}
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
                    <p className="text-sm font-medium text-blue-900 mb-1">🚗 Distance to Pickup</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {formatDistance(selectedRide.distance_to_pickup)}
                    </p>
                  </div>
                  {driverLocation && (
                    <div className="text-right">
                      <p className="text-xs text-blue-700">Your Location</p>
                      <p className="text-xs text-blue-600">
                        {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  )}
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
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">📍 Pickup</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedRide.pickup_address || selectedRide.pickup_location}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">🎯 Dropoff</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedRide.dropoff_address || selectedRide.dropoff_location}
                </p>
              </div>
            </div>

            {/* Passenger Info */}
            {selectedRide.passenger_name && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-1">👤 Passenger</p>
                <p className="text-sm text-gray-900">{selectedRide.passenger_name}</p>
                {selectedRide.number_of_passengers > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedRide.number_of_passengers} passenger(s)
                  </p>
                )}
              </div>
            )}

            {/* Suggested Price */}
            {(selectedRide.estimated_cost || computeSuggestedFare(selectedRide) != null) && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs font-medium text-gray-700 mb-1">💰 Suggested Price</p>
                <p className="text-2xl font-bold text-green-700">
                  ${(selectedRide.estimated_cost ? parseFloat(selectedRide.estimated_cost) : computeSuggestedFare(selectedRide)).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
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

