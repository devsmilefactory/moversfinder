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
 * Check if geolocation is available and has permission
 * @returns {Promise<'granted'|'denied'|'prompt'|'unsupported'>}
 */
export const checkGeolocationPermission = async () => {
  if (!navigator.geolocation) {
    return 'unsupported';
  }

  // Check permission using Permissions API if available
  if ('permissions' in navigator) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state; // 'granted', 'denied', or 'prompt'
    } catch (e) {
      // Permissions API might not be fully supported, fall through to test
      console.warn('Permissions API not fully supported:', e);
    }
  }

  // Fallback: Try a quick test (will fail fast if denied)
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve('prompt'); // Assume prompt if no response
    }, 100);

    navigator.geolocation.getCurrentPosition(
      () => {
        clearTimeout(timeout);
        resolve('granted');
      },
      (error) => {
        clearTimeout(timeout);
        if (error.code === error.PERMISSION_DENIED) {
          resolve('denied');
        } else {
          resolve('prompt'); // Other errors might be temporary
        }
      },
      { timeout: 100, maximumAge: Infinity }
    );
  });
};

/**
 * Get current location using browser Geolocation API with retry logic
 * @param {Object} options - Geolocation options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 2)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<{lat: number, lng: number, accuracy: number, timestamp: number}>} Current location coordinates
 * @throws {Error} If geolocation fails or is not supported
 */
export const getCurrentLocation = async (options = {}) => {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    enableHighAccuracy = true,
    timeout = 15000, // Increased timeout for production
    maximumAge = 0,
    ...otherOptions
  } = options;

  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser');
  }

  // Check if we're on HTTPS (required for geolocation in production)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    console.warn('Geolocation requires HTTPS in production. Current protocol:', location.protocol);
  }

  // Check permission first
  const permission = await checkGeolocationPermission();
  if (permission === 'denied') {
    throw new Error('Location permission denied. Please enable location access in your browser settings.');
  }

  const attemptLocation = (useHighAccuracy) => {
    return new Promise((resolve, reject) => {
      const geolocationOptions = {
        enableHighAccuracy: useHighAccuracy,
        timeout,
        maximumAge,
        ...otherOptions
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          // Validate coordinates
          if (!isValidCoordinates(result)) {
            reject(new Error('Invalid coordinates received from geolocation'));
            return;
          }

          resolve(result);
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
        geolocationOptions
      );
    });
  };

  // Try with high accuracy first, then fallback to low accuracy
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // First attempt: high accuracy
      if (attempt === 0 && enableHighAccuracy) {
        try {
          return await attemptLocation(true);
        } catch (error) {
          lastError = error;
          // If timeout or unavailable, try low accuracy
          if (error.message.includes('timeout') || error.message.includes('unavailable')) {
            console.warn('High accuracy location failed, trying low accuracy...');
            continue;
          }
          throw error; // Permission denied should fail immediately
        }
      }

      // Retry attempts: low accuracy
      if (attempt > 0 || !enableHighAccuracy) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return await attemptLocation(false);
      }
    } catch (error) {
      lastError = error;
      if (error.message.includes('permission denied')) {
        throw error; // Don't retry permission errors
      }
      
      if (attempt < maxRetries) {
        console.warn(`Location attempt ${attempt + 1} failed, retrying...`, error.message);
        continue;
      }
    }
  }

  // All attempts failed
  throw lastError || new Error('Failed to get location after multiple attempts');
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
  // Use retry logic for production reliability
  const coords = await getCurrentLocation({
    enableHighAccuracy: true,
    timeout: timeout - 5000, // Reserve time for geocoding
    maximumAge: 0, // Always get fresh location
    maxRetries: geolocationOptions.maxRetries || 2,
    retryDelay: geolocationOptions.retryDelay || 2000,
    ...geolocationOptions
  });

  // Step 2: Reverse geocode using Google Maps Geocoding API
  if (!window.google?.maps) {
    throw new Error('Google Maps SDK not available');
  }

  let GeocoderCtor = window.google?.maps?.Geocoder;
  if (!GeocoderCtor && typeof window.google.maps.importLibrary === 'function') {
    try {
      const geocodingLib = await window.google.maps.importLibrary('geocoding');
      GeocoderCtor = geocodingLib?.Geocoder || null;
    } catch (error) {
      console.error('Failed to import Google geocoding library:', error);
    }
  }

  if (!GeocoderCtor) {
    throw new Error('Google Maps Geocoder not available');
  }

  const geocoder = new GeocoderCtor();

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

