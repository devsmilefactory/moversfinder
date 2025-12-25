import React, { useState, useEffect } from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';
import { useCorporateInvoiceApproval } from '../../../hooks/useCorporateInvoiceApproval';
import { useAuthStore } from '../../../stores';
import { FEATURE_FLAGS, normalizeRoundTripSelection } from '../../../config/featureFlags';

/**
 * Compact Taxi Booking Form
 * 
 * Designed for use within UnifiedBookingModal
 * Single-screen, compact layout with all essential fields
 */

const CompactTaxiForm = ({ formData, onChange, savedPlaces = [] }) => {
  const user = useAuthStore((state) => state.user);
  const { isApproved, isLoading } = useCorporateInvoiceApproval();
  const roundTripEnabled = FEATURE_FLAGS.ROUND_TRIPS_ENABLED;
  const normalizedRoundTrip = normalizeRoundTripSelection(formData.isRoundTrip || false);

  useEffect(() => {
    if (!roundTripEnabled && formData.isRoundTrip && onChange) {
      onChange((prev) => ({ ...prev, isRoundTrip: false }));
    }
  }, [roundTripEnabled, formData.isRoundTrip, onChange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Check approval if invoice payment method is selected
    if (name === 'paymentMethod' && value === 'invoice') {
      if (!isLoading && !isApproved) {
        alert('⚠️ Corporate Invoice payment requires an approved corporate account. Please apply for one in your Profile under Payment Methods.');
        return; // Prevent selection
      }
    }
    
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
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
        <LocationInput
          label="Passenger Pick-up"
          value={typeof formData.pickupLocation === 'string' ? formData.pickupLocation : (formData.pickupLocation?.data?.address || '')}
          onChange={handleLocationChange('pickupLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Enter passenger pickup location..."
        />
      </div>

      <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
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
      {roundTripEnabled && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={normalizedRoundTrip}
              onChange={(e) => onChange((prev) => ({ ...prev, isRoundTrip: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-700 text-sm">Round Trip</div>
              <div className="text-xs text-slate-600">Return to pickup location (doubles the fare)</div>
            </div>
          </label>
        </div>
      )}

      {/* Vehicle Type & Passenger Count */}
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Vehicle Type"
          name="vehicleType"
          value={formData.vehicleType || 'sedan'}
          onChange={handleChange}
          required
          options={[
            { value: 'sedan', label: 'Sedan/Hatchback (<3 passengers)' },
            { value: 'mpv', label: 'MPV/SUV (4-5 passengers)' },
            { value: 'large-mpv', label: 'Large MPV (5-7 passengers)' }
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
      <div>
        <FormSelect
          label="Payment Method"
          name="paymentMethod"
          value={formData.paymentMethod || 'invoice'}
          onChange={handleChange}
          required
          options={[
            { value: 'invoice', label: 'Corporate Invoice' + (!isLoading && !isApproved ? ' (Requires Approval)' : '') },
            { value: 'ecocash', label: 'EcoCash' },
            { value: 'onemoney', label: 'OneMoney' },
            { value: 'cash', label: 'Cash' },
            { value: 'card', label: 'Card' }
          ]}
        />
        {formData.paymentMethod === 'invoice' && !isLoading && !isApproved && (
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Corporate Invoice requires approval. Please contact support or select another payment method.
          </p>
        )}
      </div>

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

