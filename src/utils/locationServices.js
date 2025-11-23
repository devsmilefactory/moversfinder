/**
 * Location Services Utility
 * Centralized location-related functions following DRY principles
 *
 * Features:
 * - Real geolocation using browser Geolocation API
 * - Distance calculation using Haversine formula
 * - GeoJSON conversion for PostGIS
 * - Coordinate validation
 * - Error handling
 */

/**
 * Get current location using browser Geolocation API
 * @param {Object} options - Geolocation options
 * @returns {Promise<{lat: number, lng: number}>} Current location coordinates
 * @throws {Error} If geolocation fails or is not supported
 */
export const getCurrentLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // No caching - always get fresh location
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        reject(new Error(errorMessage));
      },
      defaultOptions
    );
  });
};

/**
 * Detect current location with reverse geocoding using Google Maps Platform best practices
 * Returns a single, accurate location with city name extracted from address components
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.geolocationOptions - Options for navigator.geolocation
 * @param {number} options.timeout - Overall timeout in milliseconds (default: 15000)
 * @returns {Promise<{coords: {lat: number, lng: number}, address: string, city: string, country: string, fullResult: Object}>}
 * @throws {Error} If location detection or geocoding fails
 *
 * @example
 * const location = await detectCurrentLocationWithCity();
 * console.log(location.city); // "Harare"
 * console.log(location.address); // "123 Main St, Harare, Zimbabwe"
 */
export const detectCurrentLocationWithCity = async (options = {}) => {
  const {
    geolocationOptions = {},
    timeout = 15000
  } = options;

  // Step 1: Get coordinates from browser geolocation (fresh, no cache)
  const coords = await getCurrentLocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0, // Always get fresh location
    ...geolocationOptions
  });

  // Step 2: Reverse geocode using Google Maps Geocoding API
  if (!window.google?.maps?.Geocoder) {
    throw new Error('Google Maps Geocoder not available');
  }

  const geocoder = new window.google.maps.Geocoder();

  try {
    const result = await geocoder.geocode({
      location: { lat: coords.lat, lng: coords.lng }
    });

    if (!result.results || result.results.length === 0) {
      throw new Error('No address found for current location');
    }

    // Step 3: Extract city from the FIRST result (most accurate)
    // According to Google Maps Platform docs, results[0] is the most precise match
    const firstResult = result.results[0];
    const addressComponents = firstResult.address_components;

    let city = null;
    let country = null;

    // Extract city and country from address components
    // Priority: locality > administrative_area_level_1
    for (const component of addressComponents) {
      // Get city (locality is most specific, then administrative_area_level_1)
      if (component.types.includes('locality') && !city) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1') && !city) {
        city = component.long_name;
      }

      // Get country
      if (component.types.includes('country')) {
        country = component.long_name;
      }
    }

    return {
      coords: {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy
      },
      address: firstResult.formatted_address,
      city: city || 'Unknown',
      country: country || 'Unknown',
      fullResult: firstResult // Include full result for advanced use cases
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error(`Failed to get address for location: ${error.message}`);
  }
};

/**
 * Watch location changes in real-time
 * @param {Function} onSuccess - Callback for successful location updates
 * @param {Function} onError - Callback for errors
 * @param {Object} options - Geolocation options
 * @returns {number} Watch ID for clearing the watch
 */
export const watchLocation = (onSuccess, onError, options = {}) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by your browser'));
    return null;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000, // Update every 5 seconds
    ...options
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });
    },
    (error) => {
      onError(error);
    },
    defaultOptions
  );
};

/**
 * Clear location watch
 * @param {number} watchId - Watch ID returned from watchLocation
 */
export const clearLocationWatch = (watchId) => {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} point1 - First point {lat, lng}
 * @param {Object} point2 - Second point {lat, lng}
 * @returns {number} Distance in kilometers (rounded to 1 decimal place)
 */
export const calculateDistance = (point1, point2) => {
  if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
    console.error('Invalid coordinates for distance calculation:', { point1, point2 });
    return null;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate distance between pickup and dropoff locations
 * @param {Object} pickupCoords - Pickup coordinates {lat, lng}
 * @param {Object} dropoffCoords - Dropoff coordinates {lat, lng}
 * @returns {number} Distance in kilometers
 */
export const calculateTripDistance = (pickupCoords, dropoffCoords) => {
  return calculateDistance(pickupCoords, dropoffCoords);
};

/**
 * Convert {lat, lng} coordinates to GeoJSON Point format for PostGIS
 * GeoJSON uses [longitude, latitude] order (opposite of typical lat/lng)
 * @param {Object} coords - Coordinates {lat, lng}
 * @returns {Object} GeoJSON Point object
 */
export const toGeoJSON = (coords) => {
  if (!coords || !coords.lat || !coords.lng) {
    console.error('Invalid coordinates for GeoJSON conversion:', coords);
    return null;
  }

  return {
    type: 'Point',
    coordinates: [coords.lng, coords.lat] // [longitude, latitude]
  };
};

/**
 * Convert GeoJSON Point to {lat, lng} format
 * @param {Object} geoJson - GeoJSON Point object
 * @returns {Object} Coordinates {lat, lng}
 */
export const fromGeoJSON = (geoJson) => {
  if (!geoJson || geoJson.type !== 'Point' || !geoJson.coordinates) {
    console.error('Invalid GeoJSON for conversion:', geoJson);
    return null;
  }

  const [lng, lat] = geoJson.coordinates;
  return { lat, lng };
};

/**
 * Validate coordinates
 * @param {Object} coords - Coordinates {lat, lng}
 * @returns {boolean} True if valid
 */
export const isValidCoordinates = (coords) => {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return false;
  }

  // Latitude must be between -90 and 90
  if (coords.lat < -90 || coords.lat > 90) {
    return false;
  }

  // Longitude must be between -180 and 180
  if (coords.lng < -180 || coords.lng > 180) {
    return false;
  }

  return true;
};

/**
 * Check if a point is within a radius of another point
 * @param {Object} center - Center point {lat, lng}
 * @param {Object} point - Point to check {lat, lng}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if point is within radius
 */
export const isWithinRadius = (center, point, radiusKm) => {
  const distance = calculateDistance(center, point);
  return distance !== null && distance <= radiusKm;
};

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) {
    return 'N/A';
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Get distance and duration using Google Maps Distance Matrix API
 * More accurate than Haversine formula as it considers actual roads
 * @param {Object} origin - Origin coordinates {lat, lng}
 * @param {Object} destination - Destination coordinates {lat, lng}
 * @returns {Promise<{distance: number, duration: number}>} Distance in km and duration in minutes
 */
export const getRouteDistanceAndDuration = async (origin, destination) => {
  try {
    // Prefer Google Maps DirectionsService if available (already loaded in app)
    if (window.google?.maps?.DirectionsService) {
      const service = new window.google.maps.DirectionsService();
      const res = await service.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      });
      const leg = res?.routes?.[0]?.legs?.[0];
      if (leg?.distance?.value && leg?.duration?.value) {
        return {
          distance: leg.distance.value / 1000, // km
          duration: Math.round(leg.duration.value / 60) // minutes
        };
      }
    }
  } catch (e) {
    console.warn('DirectionsService route failed, falling back to Haversine:', e);
  }

  // Fallback to Haversine calculation if Google API not available or failed
  const distance = calculateDistance(origin, destination);
  const durationMinutes = distance ? Math.round((distance / 40) * 60) : null; // assume 40km/h
  return { distance, duration: durationMinutes };
};


/**
 * Get distance and duration for a route with optional waypoints using Google Directions, with Haversine fallback.
 * @param {Object} params
 * @param {{lat:number,lng:number}} params.origin
 * @param {{lat:number,lng:number}} params.destination
 * @param {Array<{lat:number,lng:number}>} [params.waypoints]
 * @returns {Promise<{distance: number, duration: number}>} distance (km), duration (minutes)
 */
export const getRouteWithStopsDistanceAndDuration = async ({ origin, destination, waypoints = [] }) => {
  try {
    if (window.google?.maps?.DirectionsService) {
      const svc = new window.google.maps.DirectionsService();
      const res = await svc.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
        waypoints: waypoints.map((p) => ({ location: p, stopover: true }))
      });
      const legs = res?.routes?.[0]?.legs || [];
      if (legs.length) {
        const totalMeters = legs.reduce((sum, l) => sum + (l.distance?.value || 0), 0);
        const totalSeconds = legs.reduce((sum, l) => sum + (l.duration?.value || 0), 0);
        return {
          distance: totalMeters / 1000,
          duration: Math.round(totalSeconds / 60)
        };
      }
    }
  } catch (e) {
    console.warn('DirectionsService with waypoints failed, falling back to Haversine chain:', e);
  }

  // Fallback: chain Haversine distances across origin -> waypoints -> destination
  const points = [origin, ...waypoints, destination].filter(Boolean);
  if (points.length < 2) return { distance: null, duration: null };
  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const seg = calculateDistance(points[i], points[i + 1]) || 0;
    totalKm += seg;
  }
  const durationMinutes = Math.round((totalKm / 40) * 60); // assume 40km/h
  return { distance: Math.round(totalKm * 10) / 10, duration: durationMinutes };
};

