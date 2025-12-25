import React from 'react';
import LocationInput from '../../../shared/LocationInput';

/**
 * LocationInputSection Component
 * 
 * Handles pickup and dropoff location inputs with coordinate extraction.
 * Extracted from UnifiedBookingModal for reusability.
 * 
 * @param {object} props
 * @param {string|object} props.pickupLocation - Current pickup location value
 * @param {string|object} props.dropoffLocation - Current dropoff location value
 * @param {function} props.onPickupChange - Handler for pickup location changes
 * @param {function} props.onDropoffChange - Handler for dropoff location changes
 * @param {array} props.savedPlaces - Array of saved places for autocomplete
 * @param {object} props.errors - Validation errors object { pickup?: string, dropoff?: string }
 * @param {string} props.selectedService - Selected service type (for conditional rendering)
 */
const LocationInputSection = ({
  pickupLocation,
  dropoffLocation,
  onPickupChange,
  onDropoffChange,
  savedPlaces = [],
  errors = {},
  selectedService = 'taxi'
}) => {
  // Helper to extract coordinates from location value
  const getLocationValue = (location) => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    return location?.data?.address || location?.address || '';
  };

  // Handle location change with proper data structure
  const handleLocationChange = (field) => (e) => {
    // Support both plain strings and structured data from LocationInput
    if (e?.target?.data) {
      const handler = field === 'pickupLocation' ? onPickupChange : onDropoffChange;
      handler({ data: e.target.data });
    } else {
      const handler = field === 'pickupLocation' ? onPickupChange : onDropoffChange;
      handler(e?.target?.value ?? '');
    }
  };

  return (
    <div className="space-y-4">
      {/* Pickup Location */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
        <LocationInput
          label="Passenger Pick-up"
          value={getLocationValue(pickupLocation)}
          onChange={handleLocationChange('pickupLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Enter passenger pickup location..."
          error={errors.pickup}
        />
      </div>

      {/* Dropoff Location */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
        <LocationInput
          label="Drop-off Location"
          value={getLocationValue(dropoffLocation)}
          onChange={handleLocationChange('dropoffLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to?"
          error={errors.dropoff}
        />
      </div>
    </div>
  );
};

/**
 * Helper function to extract coordinates from location value
 * Can be used by parent components for coordinate extraction
 * 
 * @param {string|object} location - Location value (string or object with data.coordinates)
 * @returns {object|null} Coordinates object { lat: number, lng: number } or null
 */
export const extractLocationCoords = (location) => {
  if (!location) return null;
  if (location?.data?.coordinates?.lat && location?.data?.coordinates?.lng) {
    return { lat: location.data.coordinates.lat, lng: location.data.coordinates.lng };
  }
  if (location?.coordinates?.lat && location?.coordinates?.lng) {
    return { lat: location.coordinates.lat, lng: location.coordinates.lng };
  }
  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return { lat: location.lat, lng: location.lng };
  }
  return null;
};

export default LocationInputSection;

