import React from 'react';
import { FormInput, FormSelect, FormTextarea } from '../../shared/forms';

/**
 * CourierBookingForm Component
 * 
 * Service-specific form for courier/package delivery with:
 * - Package details and sizing
 * - Recipient information
 * - Multiple delivery support
 * - Special handling options
 */
const CourierBookingForm = ({
  serviceData = {},
  formData = {},
  onServiceDataUpdate,
  onFormDataUpdate,
  errors = {},
  warnings = {}
}) => {
  // Handle service-specific field updates
  const handleServiceChange = (field, value) => {
    onServiceDataUpdate({ [field]: value });
  };

  // Handle package field updates
  const handlePackageChange = (field, value) => {
    const currentPackage = serviceData.package || {};
    handleServiceChange('package', { ...currentPackage, [field]: value });
  };

  // Handle recipient field updates
  const handleRecipientChange = (field, value) => {
    const currentRecipient = serviceData.recipient || {};
    handleServiceChange('recipient', { ...currentRecipient, [field]: value });
  };

  // Handle additional deliveries
  const handleAddDelivery = () => {
    const currentDeliveries = serviceData.additionalDeliveries || [];
    handleServiceChange('additionalDeliveries', [
      ...currentDeliveries,
      {
        location: '',
        recipientName: '',
        recipientPhone: '',
        packageDescription: '',
        instructions: ''
      }
    ]);
  };

  const handleRemoveDelivery = (index) => {
    const currentDeliveries = serviceData.additionalDeliveries || [];
    handleServiceChange('additionalDeliveries', currentDeliveries.filter((_, i) => i !== index));
  };

  const handleDeliveryChange = (index, field, value) => {
    const currentDeliveries = [...(serviceData.additionalDeliveries || [])];
    currentDeliveries[index] = { ...currentDeliveries[index], [field]: value };
    handleServiceChange('additionalDeliveries', currentDeliveries);
  };

  const packageInfo = serviceData.package || {};
  const recipientInfo = serviceData.recipient || {};

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        📦 Package Details
      </h3>

      {/* Package Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-slate-700 text-sm">Package Information</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <FormSelect
            label="Package Size"
            value={packageInfo.size || 'small'}
            onChange={(value) => handlePackageChange('size', value)}
            error={errors.packageSize}
            options={[
              { value: 'envelope', label: 'Envelope/Document' },
              { value: 'small', label: 'Small Package' },
              { value: 'medium', label: 'Medium Box' },
              { value: 'large', label: 'Large Package' },
              { value: 'extra_large', label: 'Extra Large' }
            ]}
          />

          <FormInput
            label="Weight (Optional)"
            value={packageInfo.weight || ''}
            onChange={(value) => handlePackageChange('weight', value)}
            placeholder="e.g., 2kg"
            error={errors.packageWeight}
          />
        </div>

        <FormTextarea
          label="Package Description"
          value={packageInfo.description || ''}
          onChange={(value) => handlePackageChange('description', value)}
          placeholder="What's being delivered? (e.g., documents, electronics, food)"
          rows={2}
          error={errors.packageDescription}
          required
        />

        {/* Special Handling */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={packageInfo.isFragile || false}
              onChange={(e) => handlePackageChange('isFragile', e.target.checked)}
              className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-slate-700">Fragile Item</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={packageInfo.requiresSignature || false}
              onChange={(e) => handlePackageChange('requiresSignature', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Signature Required</span>
          </label>
        </div>
      </div>

      {/* Recipient Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-slate-700 text-sm">Recipient Information</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Recipient Name"
            value={recipientInfo.name || ''}
            onChange={(value) => handleRecipientChange('name', value)}
            placeholder="Full name"
            error={errors.recipientName}
            required
          />

          <FormInput
            label="Phone Number"
            type="tel"
            value={recipientInfo.phone || ''}
            onChange={(value) => handleRecipientChange('phone', value)}
            placeholder="+263..."
            error={errors.recipientPhone}
            required
          />
        </div>

        <FormInput
          label="Email (Optional)"
          type="email"
          value={recipientInfo.email || ''}
          onChange={(value) => handleRecipientChange('email', value)}
          placeholder="recipient@example.com"
          error={errors.recipientEmail}
        />

        <FormTextarea
          label="Delivery Instructions"
          value={recipientInfo.instructions || ''}
          onChange={(value) => handleRecipientChange('instructions', value)}
          placeholder="Building access, apartment number, best delivery time, etc."
          rows={2}
        />
      </div>

      {/* Vehicle Preference */}
      <div className="space-y-3">
        <FormSelect
          label="Preferred Vehicle"
          value={serviceData.vehicleType || 'motorcycle'}
          onChange={(value) => handleServiceChange('vehicleType', value)}
          error={errors.vehicleType}
          options={[
            { value: 'motorcycle', label: 'Motorcycle (Fast, small packages)' },
            { value: 'sedan', label: 'Sedan (Medium packages)' },
            { value: 'mpv', label: 'MPV/SUV (Large packages)' },
            { value: 'van', label: 'Van (Bulk deliveries)' }
          ]}
        />
      </div>

      {/* Additional Deliveries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700">Additional Deliveries</h4>
          <button
            type="button"
            onClick={handleAddDelivery}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Delivery
          </button>
        </div>

        {serviceData.additionalDeliveries && serviceData.additionalDeliveries.length > 0 ? (
          <div className="space-y-3">
            {serviceData.additionalDeliveries.map((delivery, index) => (
              <div key={index} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">Delivery {index + 2}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDelivery(index)}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="space-y-3">
                  <FormInput
                    label="Delivery Address"
                    value={delivery.location || ''}
                    onChange={(value) => handleDeliveryChange(index, 'location', value)}
                    placeholder="Enter delivery address..."
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput
                      label="Recipient Name"
                      value={delivery.recipientName || ''}
                      onChange={(value) => handleDeliveryChange(index, 'recipientName', value)}
                      placeholder="Full name"
                    />
                    
                    <FormInput
                      label="Phone Number"
                      type="tel"
                      value={delivery.recipientPhone || ''}
                      onChange={(value) => handleDeliveryChange(index, 'recipientPhone', value)}
                      placeholder="+263..."
                    />
                  </div>
                  
                  <FormInput
                    label="Package Description"
                    value={delivery.packageDescription || ''}
                    onChange={(value) => handleDeliveryChange(index, 'packageDescription', value)}
                    placeholder="What's being delivered?"
                  />
                  
                  <FormTextarea
                    label="Special Instructions"
                    value={delivery.instructions || ''}
                    onChange={(value) => handleDeliveryChange(index, 'instructions', value)}
                    placeholder="Delivery instructions for this location..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-2xl mb-2">📦</div>
            <p className="text-sm">Single delivery</p>
            <p className="text-xs mt-1">Add more deliveries for multi-drop service</p>
          </div>
        )}
      </div>

      {/* Warnings */}
      {Object.keys(warnings).length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-orange-600 text-lg">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-orange-800 mb-1">Please note:</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {Object.entries(warnings).map(([field, warning]) => (
                  <li key={field}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierBookingForm;