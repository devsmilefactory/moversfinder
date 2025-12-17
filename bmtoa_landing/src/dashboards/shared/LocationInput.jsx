import React, { useState } from 'react';
import AddressAutocomplete from '../../components/maps/AddressAutocomplete';
import LocationPicker from '../../components/maps/LocationPicker';

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

  // Mock recent locations - Replace with actual user history from database
  const recentLocations = [
    '123 Hillside, Bulawayo',
    'Ascot Shopping Centre, Bulawayo',
    'Joshua Mqabuko Airport, Bulawayo'
  ];

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

  const handleMapSelect = () => {
    setShowMapModal(true);
    // In production: Open Google Maps modal
    // User selects location on map
    // Returns coordinates and formatted address
  };

  const handleMapConfirm = (location) => {
    onChange({
      target: {
        value: location.address,
        name: 'location',
        data: {
          address: location.address,
          coordinates: location.coordinates
        }
      }
    });
    setShowMapModal(false);
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
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-700">Select Location on Map</h3>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              {/* LocationPicker Component */}
              <LocationPicker
                initialLocation={
                  value ? {
                    lat: -20.1594,
                    lng: 28.5833,
                    address: value
                  } : undefined
                }
                onConfirm={(location) => handleMapConfirm(location)}
                onCancel={() => setShowMapModal(false)}
                height="500px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationInput;

