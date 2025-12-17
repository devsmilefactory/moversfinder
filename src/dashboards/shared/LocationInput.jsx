import React, { useState } from 'react';
import AddressAutocomplete from '../../components/maps/AddressAutocomplete';
import LocationPicker from '../../components/maps/LocationPicker';
import { getCurrentLocation } from '../../utils/locationServices';

/**
 * LocationInput Component
 *
 * Provides 3 methods for location input:
 * 1. Type address (autocomplete) - Using Google Places API
 * 2. Choose on map - Using Google Maps with LocationPicker
 * 3. Select saved place
 *
 * Database Integration Ready:
 * - Autocomplete: Google Places API ✅
 * - Saved Places: SELECT * FROM saved_places WHERE user_id = current_user
 * - Map: Google Maps API ✅
 */

const LocationInput = ({
  label,
  value,
  onChange,
  required = false,
  error,
  savedPlaces = [],
  showSavedPlaces = true,
  placeholder = "Enter address or select below...",
  className = ''
}) => {
  const [inputMethod, setInputMethod] = useState('type'); // 'type', 'map', 'saved'
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [currentMapLocation, setCurrentMapLocation] = useState(null);

  // Mock recent locations - TODO: Replace with actual user history from database
  // For now, hide recent locations to avoid showing hardcoded data
  const recentLocations = [];

  const handleSavedPlaceSelect = (place) => {
    const coordsFromRecord = place?.coordinates;
    const coordsFromLatLng = (place?.latitude !== undefined && place?.longitude !== undefined)
      ? { lat: Number(place.latitude), lng: Number(place.longitude) }
      : null;

    const coordinates = coordsFromRecord || coordsFromLatLng || null;

    if (!coordinates) {
      console.warn('Saved place is missing coordinates. Please ensure latitude/longitude are set.', place);
    }

    onChange({
      target: {
        value: place.address,
        name: 'location',
        data: {
          address: place.address,
          coordinates,
          placeId: place.id,
          name: place.name
        }
      }
    });
    setShowSavedDropdown(false);
  };

  const handleMapSelect = async () => {
    // Try to get current location for map center (fresh, no cache)
    try {
      const coords = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Always get fresh location
      });
      setCurrentMapLocation(coords);
      console.log('📍 Map centered on fresh location:', coords);
    } catch (error) {
      console.log('Could not get current location for map:', error);
      // Will use fallback location in LocationPicker
    }
    setShowMapModal(true);
  };

  const handleMapConfirm = (location) => {
    onChange({
      target: {
        value: location.address,
        name: 'location',
        data: {
          address: location.address,
          // Ensure coordinates are provided as { lat, lng }
          coordinates: { lat: location.lat, lng: location.lng }
        }
      }
    });
    setShowMapModal(false);
  };

  const handleCurrentLocation = async () => {
    setIsDetectingLocation(true);
    try {
      // Get current coordinates (fresh, no cache)
      const coords = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Always get fresh location
      });

      console.log('📍 Fresh location detected:', coords);

      // Wait for Google Maps to load if not already loaded
      let attempts = 0;
      while (!window.google?.maps?.Geocoder && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // Reverse geocode to get address
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();

        try {
          const result = await geocoder.geocode({
            location: { lat: coords.lat, lng: coords.lng }
          });

          if (result.results?.[0]) {
            const address = result.results[0].formatted_address;
            console.log('✅ Geocoded address:', address);

            onChange({
              target: {
                value: address,
                name: 'location',
                data: {
                  address: address,
                  coordinates: { lat: coords.lat, lng: coords.lng },
                  placeId: result.results[0].place_id,
                  timestamp: coords.timestamp
                }
              }
            });
          } else {
            // Fallback: Try to get city name at least
            console.warn('⚠️ No geocoding results, using fallback');
            const cityName = await getCityFromCoords(coords);
            onChange({
              target: {
                value: cityName,
                name: 'location',
                data: {
                  address: cityName,
                  coordinates: { lat: coords.lat, lng: coords.lng },
                  timestamp: coords.timestamp
                }
              }
            });
          }
        } catch (geocodeError) {
          console.error('❌ Geocoding error:', geocodeError);
          // Fallback: Try to get city name
          const cityName = await getCityFromCoords(coords);
          onChange({
            target: {
              value: cityName,
              name: 'location',
              data: {
                address: cityName,
                coordinates: { lat: coords.lat, lng: coords.lng },
                timestamp: coords.timestamp
              }
            }
          });
        }
      } else {
        // If Google Maps not available, use OpenStreetMap Nominatim as fallback
        console.warn('⚠️ Google Maps not available, using OpenStreetMap');
        const cityName = await getCityFromCoords(coords);
        onChange({
          target: {
            value: cityName,
            name: 'location',
            data: {
              address: cityName,
              coordinates: { lat: coords.lat, lng: coords.lng },
              timestamp: coords.timestamp
            }
          }
        });
      }
    } catch (error) {
      console.error('❌ Location detection error:', error);
      alert(error.message || 'Unable to detect your location. Please enter it manually.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Helper function to get city name from coordinates using OpenStreetMap
  const getCityFromCoords = async (coords) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
      );
      const data = await response.json();

      // Try to build a meaningful address
      const city = data.address?.city || data.address?.town || data.address?.village;
      const suburb = data.address?.suburb;
      const road = data.address?.road;

      if (road && suburb && city) {
        return `${road}, ${suburb}, ${city}`;
      } else if (suburb && city) {
        return `${suburb}, ${city}`;
      } else if (city) {
        return city;
      } else {
        return data.display_name || 'Current location';
      }
    } catch (error) {
      console.error('Error getting city from coords:', error);
      return 'Current location';
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Main Input Field - Using AddressAutocomplete */}
      <div className="relative mb-2">
        <AddressAutocomplete
          value={value}
          onChange={(location) => {
            onChange({
              target: {
                value: location.address,
                name: 'location',
                data: {
                  address: location.address,
                  coordinates: { lat: location.lat, lng: location.lng },
                  placeId: location.placeId
                }
              }
            });
          }}
          placeholder={placeholder}
          required={required}
          error={error}
          label=""
        />

        {/* Saved Places Dropdown */}
        {showSavedDropdown && savedPlaces.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            <div className="p-2">
              <p className="text-xs font-medium text-slate-500 px-2 py-1">SAVED PLACES</p>
              {savedPlaces.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSavedPlaceSelect(place)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{place.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{place.name}</p>
                      <p className="text-xs text-slate-500">{place.address}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Locations Dropdown - Scrollable */}
        {showRecentDropdown && !showSavedDropdown && value === '' && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <div className="p-2">
              <p className="text-xs font-medium text-slate-500 px-2 py-1">RECENT LOCATIONS</p>
              {recentLocations.map((location, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: location } });
                    setShowRecentDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  • {location}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Method Buttons - Under Input with Text Labels */}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isDetectingLocation}
          className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-blue-700 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2 border border-blue-200"
        >
          {isDetectingLocation ? (
            <>
              <span className="animate-spin text-sm">⌛</span>
              <span>Detecting...</span>
            </>
          ) : (
            <>
              <span className="text-sm">📍</span>
              <span>Current Location</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleMapSelect}
          className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 transition-colors flex items-center justify-center gap-2 border border-slate-200"
        >
          <span className="text-sm">🗺️</span>
          <span>Select on Map</span>
        </button>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden">
            {/* LocationPicker Component with built-in header */}
            <LocationPicker
              initialLocation={
                currentMapLocation ? {
                  lat: currentMapLocation.lat,
                  lng: currentMapLocation.lng,
                  address: value || 'Current location'
                } : undefined
              }
              onConfirm={(location) => handleMapConfirm(location)}
              onCancel={() => setShowMapModal(false)}
              showHeader={true}
              title="Select Location on Map"
              height="100%"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationInput;

