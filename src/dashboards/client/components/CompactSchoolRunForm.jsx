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
    onChange({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleLocationChange = (field) => (e) => {
    // Support both plain strings and structured data from LocationInput
    if (e?.target?.data) {
      onChange({ ...formData, [field]: { data: e.target.data } });
    } else {
      onChange({ ...formData, [field]: e?.target?.value ?? '' });
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
      {/* Trip Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Trip Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...formData, tripDirection: 'one-way' })}
            className={`p-3 rounded-lg border-2 transition-all ${
              formData.tripDirection === 'one-way'
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xl mb-1">➡️</div>
            <div className="font-semibold text-slate-700 text-sm">One-Way</div>
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...formData, tripDirection: 'round-trip' })}
            className={`p-3 rounded-lg border-2 transition-all ${
              formData.tripDirection === 'round-trip'
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xl mb-1">🔄</div>
            <div className="font-semibold text-slate-700 text-sm">Round Trip</div>
          </button>
        </div>
      </div>

      {/* Locations */}
      <LocationInput
        label="Pickup Location"
        value={typeof formData.pickupLocation === 'string' ? formData.pickupLocation : (formData.pickupLocation?.data?.address || '')}
        onChange={handleLocationChange('pickupLocation')}
        savedPlaces={savedPlaces}
        required
        placeholder="Where to pick up?"
      />

      <LocationInput
        label="Drop-off Location"
        value={typeof formData.dropoffLocation === 'string' ? formData.dropoffLocation : (formData.dropoffLocation?.data?.address || '')}
        onChange={handleLocationChange('dropoffLocation')}
        savedPlaces={savedPlaces}
        required
        placeholder="Where to drop off?"
      />

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
            { value: 'cash', label: 'Cash' },
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

