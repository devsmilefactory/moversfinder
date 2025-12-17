import React, { useState } from 'react';
import { MapPin, Navigation, Star, Clock } from 'lucide-react';

/**
 * LocationSection Component
 * 
 * Handles pickup and dropoff location selection with:
 * - Address autocomplete
 * - Saved places integration
 * - Current location detection
 * - Location validation and error display
 */
const LocationSection = ({
  pickupLocation,
  dropoffLocation,
  pickupCoordinates,
  dropoffCoordinates,
  onPickupChange,
  onDropoffChange,
  savedPlaces = [],
  errors = {},
  showSwapButton = true,
  allowCurrentLocation = true
}) => {
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'pickup' or 'dropoff'

  // Handle current location detection
  const handleCurrentLocation = async (field) => {
    if (!allowCurrentLocation) return;
    
    setIsDetectingLocation(true);
    
    try {
      const position = await getCurrentPosition();
      const coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      // Reverse geocode to get address
      const address = await reverseGeocode(coordinates);
      
      if (field === 'pickup') {
        onPickupChange(address, coordinates);
      } else {
        onDropoffChange(address, coordinates);
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      // Show user-friendly error message
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Handle saved place selection
  const handleSavedPlaceSelect = (place) => {
    const coordinates = {
      lat: place.latitude,
      lng: place.longitude
    };
    
    if (activeField === 'pickup') {
      onPickupChange(place.address, coordinates);
    } else if (activeField === 'dropoff') {
      onDropoffChange(place.address, coordinates);
    }
    
    setShowSavedPlaces(false);
    setActiveField(null);
  };

  // Handle location swap
  const handleSwapLocations = () => {
    if (!showSwapButton || !pickupLocation || !dropoffLocation) return;
    
    // Swap the locations
    const tempLocation = pickupLocation;
    const tempCoordinates = pickupCoordinates;
    
    onPickupChange(dropoffLocation, dropoffCoordinates);
    onDropoffChange(tempLocation, tempCoordinates);
  };

  // Handle address input change
  const handleAddressChange = (field, value) => {
    if (field === 'pickup') {
      onPickupChange(value, null); // Clear coordinates when typing
    } else {
      onDropoffChange(value, null);
    }
  };

  // Show saved places for field
  const showSavedPlacesFor = (field) => {
    setActiveField(field);
    setShowSavedPlaces(true);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        📍 Locations
      </h3>

      {/* Pickup Location */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-600" />
          Pickup Location
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={pickupLocation || ''}
            onChange={(e) => handleAddressChange('pickup', e.target.value)}
            placeholder="Enter pickup address..."
            className={`w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.pickup ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          />
          
          {/* Action buttons */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            {allowCurrentLocation && (
              <button
                type="button"
                onClick={() => handleCurrentLocation('pickup')}
                disabled={isDetectingLocation}
                className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                title="Use current location"
              >
                <Navigation className={`w-4 h-4 ${isDetectingLocation ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {savedPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => showSavedPlacesFor('pickup')}
                className="p-1 text-slate-500 hover:text-yellow-600 transition-colors"
                title="Choose from saved places"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {errors.pickup && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span>⚠️</span>
            {errors.pickup}
          </p>
        )}
      </div>

      {/* Swap Button */}
      {showSwapButton && (pickupLocation || dropoffLocation) && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSwapLocations}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            title="Swap pickup and dropoff locations"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
      )}

      {/* Dropoff Location */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-600" />
          Dropoff Location
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={dropoffLocation || ''}
            onChange={(e) => handleAddressChange('dropoff', e.target.value)}
            placeholder="Enter destination address..."
            className={`w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.dropoff ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          />
          
          {/* Action buttons */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            {allowCurrentLocation && (
              <button
                type="button"
                onClick={() => handleCurrentLocation('dropoff')}
                disabled={isDetectingLocation}
                className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                title="Use current location"
              >
                <Navigation className={`w-4 h-4 ${isDetectingLocation ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {savedPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => showSavedPlacesFor('dropoff')}
                className="p-1 text-slate-500 hover:text-yellow-600 transition-colors"
                title="Choose from saved places"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {errors.dropoff && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span>⚠️</span>
            {errors.dropoff}
          </p>
        )}
      </div>

      {/* Saved Places Modal */}
      {showSavedPlaces && savedPlaces.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-700">Saved Places</h4>
                <button
                  onClick={() => setShowSavedPlaces(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-64">
              {savedPlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleSavedPlaceSelect(place)}
                  className="w-full p-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <Star className="w-4 h-4 text-yellow-500 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-700">{place.name}</div>
                      <div className="text-sm text-slate-500">{place.address}</div>
                      {place.category && (
                        <div className="text-xs text-slate-400 mt-1">{place.category}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Status */}
      {(pickupCoordinates || dropoffCoordinates) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span>✅</span>
            <span>
              {pickupCoordinates && dropoffCoordinates 
                ? 'Both locations confirmed - ready to calculate route'
                : 'Location confirmed - add destination to continue'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get current position
const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    });
  });
};

// Helper function for reverse geocoding
const reverseGeocode = async (coordinates) => {
  // This would integrate with your geocoding service
  // For now, return a placeholder
  return `Location at ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
};

export default LocationSection;