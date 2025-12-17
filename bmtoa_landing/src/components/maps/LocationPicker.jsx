import React, { useState, useCallback } from 'react';
import { Marker } from '@react-google-maps/api';
import MapView from './MapView';

/**
 * LocationPicker Component
 * 
 * Interactive map for selecting a location with:
 * - Draggable marker
 * - Click to select location
 * - Reverse geocoding (coordinates → address)
 * - Confirm/Cancel buttons
 * - Loading states
 * - Error handling
 * 
 * Props:
 * - initialLocation: { lat, lng, address } - Starting location
 * - onConfirm: function - Callback with selected location { lat, lng, address }
 * - onCancel: function - Callback when cancelled
 * - height: string - Map height (default: '400px')
 */

const defaultLocation = {
  lat: -20.1594, // Bulawayo, Zimbabwe
  lng: 28.5833,
  address: 'Bulawayo, Zimbabwe'
};

const LocationPicker = ({
  initialLocation = defaultLocation,
  onConfirm,
  onCancel,
  height = '400px',
  className = ''
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(async (lat, lng) => {
    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat, lng }
      });

      if (response.results && response.results.length > 0) {
        const address = response.results[0].formatted_address;
        setSelectedLocation({ lat, lng, address });
      } else {
        setGeocodeError('No address found for this location');
        setSelectedLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeError('Failed to get address');
      setSelectedLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Handle map click
  const handleMapClick = useCallback((event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // Handle marker drag
  const handleMarkerDrag = useCallback((event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setSelectedLocation({ lat, lng, address: selectedLocation.address });
  }, [selectedLocation.address]);

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback((event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // Handle confirm
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(selectedLocation);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className={className}>
      {/* Map */}
      <MapView
        center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
        zoom={15}
        onMapClick={handleMapClick}
        height={height}
        showCurrentLocation={true}
      >
        {/* Draggable marker */}
        <Marker
          position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          draggable={true}
          onDrag={handleMarkerDrag}
          onDragEnd={handleMarkerDragEnd}
          icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
                <path fill="#FFC107" stroke="#000" stroke-width="1" d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 32 16 32s16-23.2 16-32C32 7.2 24.8 0 16 0z"/>
                <circle cx="16" cy="16" r="6" fill="#000"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 48),
            anchor: new window.google.maps.Point(16, 48)
          }}
        />
      </MapView>

      {/* Selected Location Info */}
      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📍</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 mb-1">Selected Location</p>
            {isGeocoding ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                <p className="text-sm text-slate-500">Getting address...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-900">{selectedLocation.address}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </>
            )}
            {geocodeError && (
              <p className="text-xs text-red-500 mt-1">{geocodeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Click anywhere on the map or drag the marker to select a location
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isGeocoding}
          className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeocoding ? 'Loading...' : 'Confirm Location'}
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;

