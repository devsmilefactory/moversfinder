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
    onChange({
      target: {
        value: place.address,
        name: 'location',
        data: {
          address: place.address,
          coordinates: place.coordinates,
          placeId: place.id,
          name: place.name
        }
      }
    });
    setShowSavedDropdown(false);
  };

  const handleMapSelect = async () => {
    // Try to get current location for map center
    try {
      const coords = await getCurrentLocation();
      setCurrentMapLocation(coords);
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
      // Get current coordinates
      const coords = await getCurrentLocation();

      // Reverse geocode to get address
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ location: coords });

        if (result.results?.[0]) {
          const address = result.results[0].formatted_address;
          onChange({
            target: {
              value: address,
              name: 'location',
              data: {
                address: address,
                coordinates: coords
              }
            }
          });
        } else {
          // Fallback to coordinates if no address found
          onChange({
            target: {
              value: 'Current location',
              name: 'location',
              data: {
                address: 'Current location',
                coordinates: coords
              }
            }
          });
        }
      } else {
        // If Google Maps not available, just use coordinates
        onChange({
          target: {
            value: 'Current location',
            name: 'location',
            data: {
              address: 'Current location',
              coordinates: coords
            }
          }
        });
      }
    } catch (error) {
      console.error('Location detection error:', error);
      alert(error.message || 'Unable to detect your location. Please enter it manually.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Main Input Field - Using AddressAutocomplete */}
      <div className="relative">
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
        />

        {/* Input Method Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isDetectingLocation}
            className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-slate-100 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-blue-700 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2"
          >
            {isDetectingLocation ? (
              <>
                <span className="animate-spin">⌛</span>
                <span>Detecting...</span>
              </>
            ) : (
              <>
                <span>📍</span>
                <span>Current</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleMapSelect}
            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>🗺️</span>
            <span>Map</span>
          </button>

          {showSavedPlaces && savedPlaces.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowSavedDropdown(!showSavedDropdown);
                setShowRecentDropdown(false);
              }}
              className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>📌</span>
              <span>Saved</span>
            </button>
          )}
        </div>

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

