import React, { useState, useCallback } from 'react';
import MapView from './MapView';

/**
 * LocationPicker Component
 *
 * Interactive map for selecting a location with:
 * - Fixed three-section layout (header, scrollable map, fixed footer)
 * - Draggable marker
 * - Click to select location
 * - Reverse geocoding (coordinates → address)
 * - Compact footer with location info and action buttons
 * - Loading states
 * - Error handling
 *
 * Props:
 * - initialLocation: { lat, lng, address } - Starting location (required)
 * - onConfirm: function - Callback with selected location { lat, lng, address }
 * - onCancel: function - Callback when cancelled
 * - showHeader: boolean - Show/hide header section (default: true)
 * - title: string - Header title (default: 'Select Location')
 * - height: string - Map height (default: '400px')
 */

const LocationPicker = ({
  initialLocation,
  onConfirm,
  onCancel,
  showHeader = true,
  title = 'Select Location',
  height = '400px',
  className = ''
}) => {
  // Use initialLocation or null if not provided
  const defaultLocation = initialLocation || null;

  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(async (lat, lng) => {
    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const { Geocoder } = await window.google.maps.importLibrary('geocoding');
      const geocoder = new Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });

      if (result.results && result.results.length > 0) {
        const address = result.results[0].formatted_address;
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
  const handleMarkerDrag = useCallback(({ lat, lng }) => {
    setSelectedLocation({ lat, lng, address: selectedLocation.address });
  }, [selectedLocation.address]);

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback(({ lat, lng }) => {
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
    <div className={`flex flex-col ${className}`} style={{ height: '100%' }}>
      {/* SECTION 1: Fixed Top Header */}
      {showHeader && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: Scrollable Center - Map View */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <MapView
          center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          zoom={15}
          onMapClick={handleMapClick}
          height={height}
          showCurrentLocation={true}
          draggableMarkerPosition={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          onDraggableMarkerDrag={handleMarkerDrag}
          onDraggableMarkerDragEnd={handleMarkerDragEnd}
        />
      </div>

      {/* SECTION 3: Fixed Bottom Footer - Compact Layout */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white">
        {/* Selected Location Display */}
        <div className="px-4 py-3 bg-slate-50">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">📍</span>
            <div className="flex-1 min-w-0">
              {isGeocoding ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                  <p className="text-sm text-slate-500">Getting address...</p>
                </div>
              ) : (
                <>
                  {/* Plus Code / Address */}
                  <p className="text-sm text-slate-900 font-medium truncate" title={selectedLocation.address}>
                    {selectedLocation.address}
                  </p>
                  {/* Coordinates */}
                  <p className="text-xs text-slate-500 mt-0.5">
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

        {/* Tip Text */}
        <div className="px-4 py-2 bg-blue-50 border-y border-blue-100">
          <p className="text-xs text-blue-800">
            💡 <span className="font-medium">Tip:</span> Click anywhere on the map or drag the marker to select a location
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isGeocoding}
            className="flex-1 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isGeocoding ? 'Loading...' : 'Confirm Location'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;

