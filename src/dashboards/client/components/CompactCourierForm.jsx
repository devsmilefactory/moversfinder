import React from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';

/**
 * Compact Courier Booking Form
 * 
 * Designed for use within UnifiedBookingModal
 * Single-screen, compact layout for package delivery
 */

const CompactCourierForm = ({ formData, onChange, savedPlaces = [] }) => {
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

  const handleAddDelivery = () => {
    const additionalDeliveries = formData.additionalDeliveries || [];
    onChange({ 
      ...formData, 
      additionalDeliveries: [...additionalDeliveries, { 
        location: '', 
        recipientName: '', 
        recipientPhone: '',
        packageDetails: ''
      }] 
    });
  };

  const handleRemoveDelivery = (index) => {
    const additionalDeliveries = formData.additionalDeliveries || [];
    onChange({ 
      ...formData, 
      additionalDeliveries: additionalDeliveries.filter((_, i) => i !== index) 
    });
  };

  const handleDeliveryChange = (index, field, value) => {
    const additionalDeliveries = [...(formData.additionalDeliveries || [])];
    additionalDeliveries[index] = { ...additionalDeliveries[index], [field]: value };
    onChange({ ...formData, additionalDeliveries });
  };

  return (
    <div className="space-y-4">
      {/* Pickup Location - Flat design without shadows */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <LocationInput
          label="Pickup Location"
          value={typeof formData.pickupLocation === 'string' ? formData.pickupLocation : (formData.pickupLocation?.data?.address || '')}
          onChange={handleLocationChange('pickupLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to pick up the package?"
        />
      </div>

      {/* Primary Delivery - Flat design without shadows */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Primary Delivery</h3>

        <LocationInput
          label="Drop-off Location"
          value={typeof formData.dropoffLocation === 'string' ? formData.dropoffLocation : (formData.dropoffLocation?.data?.address || '')}
          onChange={handleLocationChange('dropoffLocation')}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to deliver?"
        />

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Recipient Name"
            name="recipientName"
            value={formData.recipientName || ''}
            onChange={handleChange}
            placeholder="Full name"
            required
          />

          <FormInput
            label="Recipient Phone"
            name="recipientPhone"
            type="tel"
            value={formData.recipientPhone || ''}
            onChange={handleChange}
            placeholder="+263..."
            required
          />
        </div>

        <FormTextarea
          label="Package Details"
          name="packageDetails"
          value={formData.packageDetails || ''}
          onChange={handleChange}
          placeholder="What's being delivered?"
          rows={2}
          required
        />
      </div>

      {/* Additional Deliveries */}
      {formData.additionalDeliveries && formData.additionalDeliveries.length > 0 && (
        <div className="space-y-3">
          {formData.additionalDeliveries.map((delivery, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-3 relative">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-700 text-sm">Delivery {index + 2}</h4>
                <button
                  type="button"
                  onClick={() => handleRemoveDelivery(index)}
                  className="text-red-500 hover:text-red-600 text-sm font-medium"
                >
                  Remove
                </button>
              </div>

              <LocationInput
                label="Location"
                value={delivery.location}
                onChange={(e) => handleDeliveryChange(index, 'location', e.target.value)}
                savedPlaces={savedPlaces}
                placeholder="Delivery address..."
              />

              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Recipient"
                  value={delivery.recipientName}
                  onChange={(e) => handleDeliveryChange(index, 'recipientName', e.target.value)}
                  placeholder="Name"
                />

                <FormInput
                  label="Phone"
                  type="tel"
                  value={delivery.recipientPhone}
                  onChange={(e) => handleDeliveryChange(index, 'recipientPhone', e.target.value)}
                  placeholder="+263..."
                />
              </div>

              <FormInput
                label="Package Details"
                value={delivery.packageDetails}
                onChange={(e) => handleDeliveryChange(index, 'packageDetails', e.target.value)}
                placeholder="What's being delivered?"
              />
            </div>
          ))}
        </div>
      )}


      {/* Vehicle Type & Package Size */}
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Preferred Vehicle"
          name="vehicleType"
          value={formData.vehicleType || 'motorcycle'}
          onChange={handleChange}
          required
          options={[
            { value: 'motorcycle', label: 'Motorcycle' },
            { value: 'sedan', label: 'Sedan' },
            { value: 'mpv', label: 'MPV/SUV' },
            { value: 'van', label: 'Van' }
          ]}
        />

        <FormSelect
          label="Package Size"
          name="packageSize"
          value={formData.packageSize || 'small'}
          onChange={handleChange}
          required
          options={[
            { value: 'small', label: 'Small (Envelope)' },
            { value: 'medium', label: 'Medium (Box)' },
            { value: 'large', label: 'Large (Multiple boxes)' }
          ]}
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
        placeholder="Handling instructions, access codes, etc..."
        rows={2}
      />
    </div>
  );
};

export default CompactCourierForm;

