import React from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';

/**
 * Compact School/Work Run Booking Form
 * 
 * Designed for use within UnifiedBookingModal
 * Single-screen, compact layout for recurring trips
 */

const CompactSchoolRunForm = ({ formData, onChange, savedPlaces = [] }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleLocationChange = (field) => (e) => {
    // Support both plain strings and structured data from LocationInput
    if (e?.target?.data) {
      onChange(prev => ({ ...prev, [field]: { data: e.target.data } }));
    } else {
      onChange(prev => ({ ...prev, [field]: e?.target?.value ?? '' }));
    }
  };

  const handleDayToggle = (day) => {
    const recurrenceDays = formData.recurrenceDays || [];
    const newDays = recurrenceDays.includes(day)
      ? recurrenceDays.filter(d => d !== day)
      : [...recurrenceDays, day];
    onChange({ ...formData, recurrenceDays: newDays });
  };

  const weekDays = [
    { id: 'mon', label: 'Mon' },
    { id: 'tue', label: 'Tue' },
    { id: 'wed', label: 'Wed' },
    { id: 'thu', label: 'Thu' },
    { id: 'fri', label: 'Fri' },
    { id: 'sat', label: 'Sat' },
    { id: 'sun', label: 'Sun' }
  ];

  return (
    <div className="space-y-4">
      {/* Round Trip Option (standardized with Taxi) */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRoundTrip || formData.tripDirection === 'round-trip' || false}
            onChange={(e) => onChange({ ...formData, isRoundTrip: e.target.checked, tripDirection: e.target.checked ? 'round-trip' : 'one-way' })}
            className="w-4 h-4 text-yellow-600 border-slate-300 rounded focus:ring-yellow-500"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-700 text-sm">Round Trip</div>
            <div className="text-xs text-slate-600">Return to pickup location (doubles the fare)</div>
          </div>
        </label>
      </div>

      {/* Locations - Flat design without shadows */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <LocationInput
          label="Pickup Location"
          value={typeof formData.pickupLocation === 'string' ? formData.pickupLocation : (formData.pickupLocation?.data?.address || '')}
          onChange={handleLocationChange('pickupLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to pick up?"
        />
      </div>

      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <LocationInput
          label="Drop-off Location"
          value={typeof formData.dropoffLocation === 'string' ? formData.dropoffLocation : (formData.dropoffLocation?.data?.address || '')}
          onChange={handleLocationChange('dropoffLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to drop off?"
        />
      </div>

      {/* Passenger Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Passenger Name"
          name="passengerName"
          value={formData.passengerName || ''}
          onChange={handleChange}
          placeholder="Student/Employee name"
          required
        />

        <FormInput
          label="Contact Number"
          name="contactNumber"
          type="tel"
          value={formData.contactNumber || ''}
          onChange={handleChange}
          placeholder="+263..."
          required
        />
      </div>


      {/* Payment */}
      <div className="grid grid-cols-1 gap-4">
        <FormSelect
          label="Payment Method"
          name="paymentMethod"
          value={formData.paymentMethod || 'cash'}
          onChange={handleChange}
          required
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'ecocash', label: 'EcoCash' },
            { value: 'onemoney', label: 'OneMoney' },
            { value: 'card', label: 'Card' }
          ]}
        />
      </div>

      {/* Special Instructions */}
      <FormTextarea
        label="Special Instructions (Optional)"
        name="specialInstructions"
        value={formData.specialInstructions || ''}
        onChange={handleChange}
        placeholder="Special requirements, access codes, etc..."
        rows={2}
      />
    </div>
  );
};

export default CompactSchoolRunForm;

