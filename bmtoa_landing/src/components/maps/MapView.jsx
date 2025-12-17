import React, { useState, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';

/**
 * MapView Component
 * 
 * Core Google Maps component with:
 * - Centered on Bulawayo, Zimbabwe by default
 * - Zoom controls
 * - Current location button
 * - Loading skeleton
 * - Error handling
 * - Responsive design
 * 
 * Props:
 * - center: { lat, lng } - Map center coordinates
 * - zoom: number - Initial zoom level (default: 13)
 * - markers: array - Array of marker objects { lat, lng, label, icon }
 * - onMapClick: function - Callback when map is clicked
 * - onMarkerClick: function - Callback when marker is clicked
 * - height: string - Map container height (default: '400px')
 * - className: string - Additional CSS classes
 */

const libraries = ['places', 'geometry'];

const defaultCenter = {
  lat: -20.1594, // Bulawayo, Zimbabwe
  lng: 28.5833
};

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

const MapView = ({
  center = defaultCenter,
  zoom = 13,
  markers = [],
  onMapClick,
  onMarkerClick,
  height = '400px',
  className = '',
  showCurrentLocation = true,
  children
}) => {
  const [map, setMap] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(pos);
          if (map) {
            map.panTo(pos);
            map.setZoom(15);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (loadError) {
    return (
      <div 
        className={`bg-red-50 border border-red-200 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center p-6">
          <p className="text-4xl mb-2">⚠️</p>
          <p className="text-red-600 font-medium">Error loading maps</p>
          <p className="text-sm text-red-500 mt-1">
            {loadError.message || 'Please check your API key and internet connection'}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-3"></div>
          <p className="text-slate-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onMapClick}
        options={mapOptions}
      >
        {/* Render markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={{ lat: marker.lat, lng: marker.lng }}
            label={marker.label}
            icon={marker.icon}
            onClick={() => onMarkerClick && onMarkerClick(marker, index)}
          />
        ))}

        {/* Current location marker */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }}
          />
        )}

        {/* Render children (additional map components) */}
        {children}
      </GoogleMap>

      {/* Current Location Button */}
      {showCurrentLocation && (
        <button
          onClick={handleGetCurrentLocation}
          className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 hover:bg-slate-50 transition-colors"
          title="Get current location"
        >
          <svg 
            className="w-5 h-5 text-slate-700" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MapView;

