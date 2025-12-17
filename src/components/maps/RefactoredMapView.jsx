import React, { useCallback } from 'react';
import useMapState from '../../hooks/useMapState';
import useLocationTracking from '../../hooks/useLocationTracking';
import MapControls from './components/MapControls';
import MarkerManager from './components/MarkerManager';

/**
 * RefactoredMapView Component
 * 
 * Modular version of MapView broken down into focused components and hooks.
 * Reduced from 517+ lines to a manageable container component.
 */
const RefactoredMapView = ({
  center = null,
  zoom = 13,
  markers = [],
  onMapClick,
  onMarkerClick,
  height = '400px',
  className = '',
  showCurrentLocation = true,
  showCurrentLocationButton = true,
  showZoomControls = false,
  // Draggable marker support
  draggableMarkerPosition,
  onDraggableMarkerDrag,
  onDraggableMarkerDragEnd,
  draggableMarkerIcon,
  // Route polyline support
  routePath,
  routePolylineOptions,
  fitBoundsToRoute = false,
  children
}) => {
  // Custom hooks
  const { 
    mapRef, 
    mapInstance, 
    isLoaded, 
    loadError, 
    currentLocation 
  } = useMapState({ center, zoom, showCurrentLocation });

  const { 
    getCurrentLocationOnce,
    locationError: trackingError 
  } = useLocationTracking({});

  // Handle current location button click
  const handleCurrentLocationClick = useCallback(async () => {
    if (!mapInstance) return;

    try {
      const location = await getCurrentLocationOnce();
      
      // Center map on current location
      mapInstance.setCenter(location);
      mapInstance.setZoom(15);
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  }, [mapInstance, getCurrentLocationOnce]);

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() + 1);
    }
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() - 1);
    }
  }, [mapInstance]);

  // Add map click listener
  React.useEffect(() => {
    if (!mapInstance || !onMapClick) return;

    const clickListener = mapInstance.addListener('click', onMapClick);
    
    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [mapInstance, onMapClick]);

  // Loading state
  if (!isLoaded && !loadError) {
    return (
      <div 
        className={`relative bg-gray-100 rounded-lg flex items-center justify-center ${className}`} 
        style={{ height, width: '100%' }}
      >
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div 
        className={`relative bg-red-50 border border-red-200 rounded-lg flex items-center justify-center p-6 ${className}`} 
        style={{ height, width: '100%' }}
      >
        <div className="text-center max-w-md">
          <div className="text-red-600 text-4xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Map Loading Error
          </h3>
          
          {loadError.message?.includes('API key') ? (
            <div className="text-left bg-white rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-700 mb-3">
                Google Maps API configuration issue:
              </p>
              <div className="text-xs text-red-600 space-y-2">
                <p><strong>Possible solutions:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Check that VITE_GOOGLE_MAPS_API_KEY is set in your .env file</li>
                  <li>Verify your API key is valid in Google Cloud Console</li>
                  <li>Ensure the Maps JavaScript API is enabled</li>
                  <li>Check API key restrictions and allowed domains</li>
                  <li>Verify billing is enabled for your Google Cloud project</li>
                </ol>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500 mt-1">
              {loadError.message || 'Please check your internet connection and try again'}
            </p>
          )}

          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height, width: '100%' }}>
      {/* Map Container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
      />

      {/* Map Controls */}
      <MapControls
        onCurrentLocation={handleCurrentLocationClick}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        currentLocation={currentLocation}
        loadingLocation={false}
        showCurrentLocationButton={showCurrentLocationButton}
        showZoomControls={showZoomControls}
      />

      {/* Marker Manager */}
      <MarkerManager
        mapInstance={mapInstance}
        markers={markers}
        onMarkerClick={onMarkerClick}
        draggableMarkerPosition={draggableMarkerPosition}
        onDraggableMarkerDrag={onDraggableMarkerDrag}
        onDraggableMarkerDragEnd={onDraggableMarkerDragEnd}
        draggableMarkerIcon={draggableMarkerIcon}
      />

      {/* Location Error Display */}
      {trackingError && (
        <div className="absolute bottom-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <p className="text-sm text-yellow-800">{trackingError}</p>
          </div>
        </div>
      )}

      {/* Children (for custom overlays) */}
      {children}
    </div>
  );
};

export default RefactoredMapView;