import React from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';

/**
 * Compact Taxi Booking Form
 * 
 * Designed for use within UnifiedBookingModal
 * Single-screen, compact layout with all essential fields
 */

const CompactTaxiForm = ({ formData, onChange, savedPlaces = [] }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (field) => (e) => {
    // Support both plain strings and structured data from LocationInput
    if (e?.target?.data) {
      onChange(prev => ({ ...prev, [field]: { data: e.target.data } }));
    } else {
      onChange(prev => ({ ...prev, [field]: e?.target?.value ?? '' }));
    }
  };



  return (
    <div className="space-y-4">
      {/* Locations - Flat design without shadows */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <LocationInput
          label="Passenger Pick-up"
          value={typeof formData.pickupLocation === 'string' ? formData.pickupLocation : (formData.pickupLocation?.data?.address || '')}
          onChange={handleLocationChange('pickupLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Enter passenger pickup location..."
        />
      </div>

      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <LocationInput
          label="Drop-off Location"
          value={typeof formData.dropoffLocation === 'string' ? formData.dropoffLocation : (formData.dropoffLocation?.data?.address || '')}
          onChange={handleLocationChange('dropoffLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to?"
        />
      </div>

      {/* Round Trip Option */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRoundTrip || false}
            onChange={(e) => onChange({ ...formData, isRoundTrip: e.target.checked })}
            className="w-4 h-4 text-yellow-600 border-slate-300 rounded focus:ring-yellow-500"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-700 text-sm">Round Trip</div>
            <div className="text-xs text-slate-600">Return to pickup location (doubles the fare)</div>
          </div>
        </label>
      </div>

      {/* Vehicle Type & Passenger Count */}
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Vehicle Type"
          name="vehicleType"
          value={formData.vehicleType || 'sedan'}
          onChange={handleChange}
          required
          options={[
            { value: 'sedan', label: 'Sedan (3 passengers)' },
            { value: 'mpv', label: 'MPV/SUV (5 passengers)' },
            { value: 'large-mpv', label: 'Large MPV (7 passengers)' },
            { value: 'combi', label: 'Combi/Hiace (14 passengers)' }
          ]}
        />

        <FormInput
          label="Passengers"
          type="number"
          name="passengers"
          value={formData.passengers || 1}
          onChange={handleChange}
          min="1"
          max="14"
          required
        />
      </div>

      {/* Payment Method */}
      <FormSelect
        label="Payment Method"
        name="paymentMethod"
        value={formData.paymentMethod || 'invoice'}
        onChange={handleChange}
        required
        options={[
          { value: 'invoice', label: 'Corporate Invoice' },
          { value: 'ecocash', label: 'EcoCash' },
          { value: 'onemoney', label: 'OneMoney' },
          { value: 'cash', label: 'Cash' },
          { value: 'card', label: 'Card' }
        ]}
      />

      {/* Special Instructions */}
      <FormTextarea
        label="Special Instructions (Optional)"
        name="specialInstructions"
        value={formData.specialInstructions || ''}
        onChange={handleChange}
        placeholder="Any special requests for the driver..."
        rows={3}
      />
    </div>
  );
};

export default CompactTaxiForm;

