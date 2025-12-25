/**
 * Location Services Utility
 * Simple, reliable location detection - let the browser handle permission prompts
 */

/**
 * Get current location using browser Geolocation API
 * @param {Object} options - Geolocation options
 * @returns {Promise<{lat: number, lng: number, accuracy: number, timestamp: number}>}
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
        let isPermissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
          case 1: // PERMISSION_DENIED constant
            isPermissionDenied = true;
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
          case 2: // POSITION_UNAVAILABLE constant
            errorMessage = 'Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
          case 3: // TIMEOUT constant
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        const locationError = new Error(errorMessage);
        locationError.code = error.code;
        locationError.isPermissionDenied = isPermissionDenied;
        reject(locationError);
      },
      defaultOptions
    );
  });
};

/**
 * Detect current location with reverse geocoding using Google Maps
 */
export const detectCurrentLocationWithCity = async (options = {}) => {
  const {
    geolocationOptions = {},
    timeout = 15000
  } = options;

  // Step 1: Get coordinates from browser geolocation
  const coords = await getCurrentLocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...geolocationOptions
  });

  // Step 2: Reverse geocode if Google Maps is available
  if (!window.google?.maps) {
    // Return just coordinates if Google Maps not available
    return {
      coords: {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy
      },
      address: null,
      city: null,
      country: null
    };
  }

  try {
    let GeocoderCtor = window.google.maps.Geocoder;
    
    // Try to use importLibrary if available (new API)
    if (!GeocoderCtor && typeof window.google.maps.importLibrary === 'function') {
      const geocodingLib = await window.google.maps.importLibrary('geocoding');
      GeocoderCtor = geocodingLib?.Geocoder || null;
    }

    if (!GeocoderCtor) {
      throw new Error('Geocoder not available');
    }

    const geocoder = new GeocoderCtor();
    
    // Use promise-based API
    let result;
    try {
      const geocodeResult = await geocoder.geocode({
        location: { lat: coords.lat, lng: coords.lng }
      });
      
      if (Array.isArray(geocodeResult)) {
        result = { results: geocodeResult };
      } else if (geocodeResult.results) {
        result = geocodeResult;
      } else {
        result = { results: geocodeResult };
      }
    } catch (geocodeError) {
      // Fallback to callback-based API
      result = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { location: { lat: coords.lat, lng: coords.lng } },
          (results, status) => {
            if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
              resolve({ results });
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          }
        );
      });
    }

    if (!result.results || result.results.length === 0) {
      throw new Error('No address found');
    }

    const firstResult = result.results[0];
    const addressComponents = firstResult.address_components;

    let city = null;
    let country = null;

    for (const component of addressComponents) {
      if (component.types.includes('locality') && !city) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1') && !city) {
        city = component.long_name;
      }
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
      fullResult: firstResult
    };
  } catch (error) {
    // Return coordinates only if geocoding fails
    return {
      coords: {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy
      },
      address: null,
      city: null,
      country: null
    };
  }
};

/**
 * Watch location changes in real-time
 */
export const watchLocation = (onSuccess, onError, options = {}) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by your browser'));
    return null;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
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
    onError,
    defaultOptions
  );
};

/**
 * Clear location watch
 */
export const clearLocationWatch = (watchId) => {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (point1, point2) => {
  if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
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

  return Math.round(distance * 10) / 10;
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert {lat, lng} coordinates to GeoJSON Point format for PostGIS
 */
export const toGeoJSON = (coords) => {
  if (!coords || !coords.lat || !coords.lng) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [coords.lng, coords.lat] // [longitude, latitude]
  };
};

/**
 * Convert GeoJSON Point to {lat, lng} format
 */
export const fromGeoJSON = (geoJson) => {
  if (!geoJson || geoJson.type !== 'Point' || !geoJson.coordinates) {
    return null;
  }

  const [lng, lat] = geoJson.coordinates;
  return { lat, lng };
};

/**
 * Validate coordinates
 */
export const isValidCoordinates = (coords) => {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return false;
  }

  if (coords.lat < -90 || coords.lat > 90) {
    return false;
  }

  if (coords.lng < -180 || coords.lng > 180) {
    return false;
  }

  return true;
};

/**
 * Calculate distance between pickup and dropoff locations
 */
export const calculateTripDistance = (pickupCoords, dropoffCoords) => {
  return calculateDistance(pickupCoords, dropoffCoords);
};

/**
 * Get distance and duration using Google Maps Distance Matrix API
 */
export const getRouteDistanceAndDuration = async (origin, destination) => {
  try {
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
    // Fallback to Haversine
  }

  const distance = calculateDistance(origin, destination);
  const durationMinutes = distance ? Math.round((distance / 40) * 60) : null;
  return { distance, duration: durationMinutes };
};

/**
 * Get distance and duration for a route with optional waypoints
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
    // Fallback to Haversine
  }

  const points = [origin, ...waypoints, destination].filter(Boolean);
  if (points.length < 2) return { distance: null, duration: null };
  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const seg = calculateDistance(points[i], points[i + 1]) || 0;
    totalKm += seg;
  }
  const durationMinutes = Math.round((totalKm / 40) * 60);
  return { distance: Math.round(totalKm * 10) / 10, duration: durationMinutes };
};
