/**
 * Build a Google Maps navigation URL for a ride/trip.
 * - For driver: if ride_status is accepted/driver_on_way/driver_arrived -> navigate to pickup
 *   if trip_started -> navigate to dropoff
 */
export function getNavigationUrlForDriver(trip) {
  if (!trip) return null;
  const status = trip.ride_status;
  const toPickupStatuses = ['accepted', 'driver_on_way', 'driver_arrived'];
  const target = toPickupStatuses.includes(status) ? 'pickup' : 'dropoff';
  return getNavigationUrlTo(trip, target);
}

function coerceLatLngAny(c) {
  if (!c) return null;

  // Shape: { lat, lng } (string or number)
  let lat = typeof c?.lat === 'string' ? parseFloat(c.lat) : c?.lat;
  let lng = typeof c?.lng === 'string' ? parseFloat(c.lng) : c?.lng;
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  // Shape: { latitude, longitude }
  lat = typeof c?.latitude === 'string' ? parseFloat(c.latitude) : c?.latitude;
  lng = typeof c?.longitude === 'string' ? parseFloat(c.longitude) : c?.longitude;
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  // Shape: GeoJSON Point
  if (c?.type === 'Point' && Array.isArray(c?.coordinates)) {
    const [lngG, latG] = c.coordinates;
    if (Number.isFinite(latG) && Number.isFinite(lngG)) return { lat: latG, lng: lngG };
  }

  // Shape: [lat, lng] or [lng, lat]
  if (Array.isArray(c) && c.length === 2) {
    const a = typeof c[0] === 'string' ? parseFloat(c[0]) : c[0];
    const b = typeof c[1] === 'string' ? parseFloat(c[1]) : c[1];
    if (Number.isFinite(a) && Number.isFinite(b)) {
      // If first looks like latitude (<=90), treat as [lat,lng]; else assume [lng,lat]
      if (Math.abs(a) <= 90) return { lat: a, lng: b };
      return { lat: b, lng: a };
    }
  }

  return null;
}

function resolveDestination(trip, target = 'pickup') {
  const isPickup = target === 'pickup';
  const addr = isPickup ? (trip.pickup_address || trip.pickup_location) : (trip.dropoff_address || trip.dropoff_location);

  const candidates = [
    isPickup ? trip.pickup_coordinates : trip.dropoff_coordinates,
    isPickup ? trip.pickup_point : trip.dropoff_point,
    isPickup ? trip.pickup_geojson : trip.dropoff_geojson,
    isPickup ? trip.pickupPosition : trip.dropoffPosition,
    isPickup ? [trip.pickup_lat, trip.pickup_lng] : [trip.dropoff_lat, trip.dropoff_lng],
  ];

  for (const cand of candidates) {
    const coerced = coerceLatLngAny(cand);
    if (coerced) return { coords: coerced };
  }

  return { address: addr || null };
}

/**
 * Build a Google Maps navigation URL explicitly to pickup or dropoff
 * target: 'pickup' | 'dropoff'
 */
export function getNavigationUrlTo(trip, target = 'pickup') {
  if (!trip) return null;
  const resolved = resolveDestination(trip, target);

  const params = new URLSearchParams({ api: '1', origin: 'My+Location', travelmode: 'driving' });

  if (resolved?.coords) {
    params.set('destination', `${resolved.coords.lat},${resolved.coords.lng}`);
  } else if (resolved?.address) {
    params.set('destination', resolved.address);
  } else {
    return null;
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
