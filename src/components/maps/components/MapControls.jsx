import React from 'react';

/**
 * MapControls Component
 * 
 * Provides map control buttons (current location, zoom, etc.)
 */
const MapControls = ({ 
  onCurrentLocation, 
  onZoomIn, 
  onZoomOut, 
  currentLocation, 
  loadingLocation,
  showCurrentLocationButton = true,
  showZoomControls = false 
}) => {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      {/* Current Location Button */}
      {showCurrentLocationButton && (
        <button
          onClick={onCurrentLocation}
          disabled={loadingLocation}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-3 shadow-sm transition-colors disabled:opacity-50"
          title="Go to current location"
        >
          {loadingLocation ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : currentLocation ? (
            <span className="text-blue-600 text-lg">📍</span>
          ) : (
            <span className="text-gray-600 text-lg">📍</span>
          )}
        </button>
      )}

      {/* Zoom Controls */}
      {showZoomControls && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={onZoomIn}
            className="block w-full px-3 py-2 hover:bg-gray-50 border-b border-gray-200 text-gray-700 font-medium"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={onZoomOut}
            className="block w-full px-3 py-2 hover:bg-gray-50 text-gray-700 font-medium"
            title="Zoom out"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
};

export default MapControls;