import React, { useMemo } from 'react';
import MapView from '../../../../components/maps/MapView';

/**
 * ActiveRideMap Component
 * 
 * Displays a map with pickup, dropoff, and driver locations for active rides
 */
const ActiveRideMap = ({ activeRides, driverLocations }) => {
  // Generate map markers from active rides
  const mapMarkers = useMemo(() => {
    const markers = [];

    activeRides.forEach(ride => {
      // Pickup marker
      if (ride.pickup_latitude && ride.pickup_longitude) {
        markers.push({
          lat: ride.pickup_latitude,
          lng: ride.pickup_longitude,
          label: 'P',
          icon: '📍',
          title: `Pickup: ${ride.pickup_address}`,
          rideId: ride.id
        });
      }

      // Dropoff marker
      if (ride.dropoff_latitude && ride.dropoff_longitude) {
        markers.push({
          lat: ride.dropoff_latitude,
          lng: ride.dropoff_longitude,
          label: 'D',
          icon: '🎯',
          title: `Dropoff: ${ride.dropoff_address}`,
          rideId: ride.id
        });
      }

      // Driver location marker
      const driverLocation = driverLocations[ride.id];
      if (driverLocation) {
        markers.push({
          lat: driverLocation.lat,
          lng: driverLocation.lng,
          label: 'Driver',
          icon: '🚗',
          title: `Driver Location (Ride #${ride.id?.toString().slice(-6)})`,
          rideId: ride.id,
          isDriver: true
        });
      }
    });

    return markers;
  }, [activeRides, driverLocations]);

  // Calculate map center based on markers
  const mapCenter = useMemo(() => {
    if (mapMarkers.length === 0) {
      // Default to Bulawayo, Zimbabwe
      return { lat: -20.1594, lng: 28.5906 };
    }

    if (mapMarkers.length === 1) {
      return { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng };
    }

    // Calculate center of all markers
    const totalLat = mapMarkers.reduce((sum, marker) => sum + marker.lat, 0);
    const totalLng = mapMarkers.reduce((sum, marker) => sum + marker.lng, 0);

    return {
      lat: totalLat / mapMarkers.length,
      lng: totalLng / mapMarkers.length
    };
  }, [mapMarkers]);

  // Generate route paths for active rides
  const routePaths = useMemo(() => {
    return activeRides
      .filter(ride => 
        ride.pickup_latitude && 
        ride.pickup_longitude && 
        ride.dropoff_latitude && 
        ride.dropoff_longitude
      )
      .map(ride => ({
        rideId: ride.id,
        path: [
          { lat: ride.pickup_latitude, lng: ride.pickup_longitude },
          { lat: ride.dropoff_latitude, lng: ride.dropoff_longitude }
        ],
        options: {
          strokeColor: ride.ride_status === 'trip_started' ? '#10B981' : '#3B82F6',
          strokeOpacity: 0.8,
          strokeWeight: 3
        }
      }));
  }, [activeRides]);

  if (activeRides.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-4xl mb-4">🗺️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Rides</h3>
        <p className="text-gray-600">
          Your active rides will appear on the map when you book a ride.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Map Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Live Ride Tracking</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span>📍</span>
              <span>Pickup</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🎯</span>
              <span>Dropoff</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🚗</span>
              <span>Driver</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <MapView
          center={mapCenter}
          zoom={13}
          markers={mapMarkers}
          height="400px"
          showCurrentLocation={false}
          onMarkerClick={(marker) => {
            console.log('Marker clicked:', marker);
          }}
        />

        {/* Route overlays */}
        {routePaths.map(route => (
          <div key={route.rideId} className="absolute inset-0 pointer-events-none">
            {/* Route path would be rendered here if MapView supported it */}
          </div>
        ))}

        {/* Map overlay with ride count */}
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
          <p className="text-sm font-medium text-gray-900">
            {activeRides.length} Active Ride{activeRides.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Driver location freshness indicator */}
        <div className="absolute top-4 right-4 space-y-2">
          {Object.entries(driverLocations).map(([rideId, location]) => {
            const ride = activeRides.find(r => r.id.toString() === rideId);
            if (!ride) return null;

            const isRecent = new Date() - new Date(location.updated_at) < 60000; // 1 minute

            return (
              <div
                key={rideId}
                className={`bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm text-xs ${
                  isRecent ? 'text-green-700' : 'text-yellow-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className={isRecent ? '🟢' : '🟡'}</span>
                  <span>Ride #{ride.id?.toString().slice(-6)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <p className="text-xs text-gray-600 text-center">
          Driver locations update automatically. Tap markers for more details.
        </p>
      </div>
    </div>
  );
};

export default ActiveRideMap;