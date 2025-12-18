import React from 'react';
import { FormInput, FormSelect, FormTextarea } from '../../shared/forms';

/**
 * TaxiBookingForm Component
 * 
 * Service-specific form for taxi bookings with:
 * - Vehicle type selection
 * - Passenger count
 * - Round trip option
 * - Additional stops
 */
const TaxiBookingForm = ({
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

  // Handle general form field updates
  const handleFormChange = (field, value) => {
    onFormDataUpdate({ [field]: value });
  };

  // Handle additional stops
  const handleAddStop = () => {
    const currentStops = serviceData.additionalStops || [];
    handleServiceChange('additionalStops', [
      ...currentStops,
      { location: '', instructions: '' }
    ]);
  };

  const handleRemoveStop = (index) => {
    const currentStops = serviceData.additionalStops || [];
    handleServiceChange('additionalStops', currentStops.filter((_, i) => i !== index));
  };

  const handleStopChange = (index, field, value) => {
    const currentStops = [...(serviceData.additionalStops || [])];
    currentStops[index] = { ...currentStops[index], [field]: value };
    handleServiceChange('additionalStops', currentStops);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        🚕 Taxi Details
      </h3>

      {/* Vehicle Type & Passenger Count */}
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Vehicle Type"
          value={serviceData.vehicleType || 'sedan'}
          onChange={(value) => {
            handleServiceChange('vehicleType', value);
            // Auto-set passenger count based on vehicle type
            const vehicleLimits = {
              'sedan': { min: 1, max: 2 }, // <3 passengers (max 2)
              'mpv': { min: 4, max: 5 },
              'large-mpv': { min: 5, max: 7 }
            };
            const limits = vehicleLimits[value];
            if (limits) {
              const currentPassengers = formData.passengers || 1;
              // Set to max if current is outside range, otherwise keep current if valid
              const newPassengers = currentPassengers < limits.min 
                ? limits.min 
                : currentPassengers > limits.max 
                ? limits.max 
                : currentPassengers;
              handleFormChange('passengers', newPassengers);
            }
          }}
          error={errors.vehicleType}
          options={[
            { value: 'sedan', label: 'Sedan/Hatchback (<3 passengers)' },
            { value: 'mpv', label: 'MPV/SUV (4-5 passengers)' },
            { value: 'large-mpv', label: 'Large MPV (5-7 passengers)' }
          ]}
        />

        <FormInput
          label="Number of Passengers"
          type="number"
          value={formData.passengers || 1}
          onChange={(value) => {
            const numValue = parseInt(value) || 1;
            // Validate against vehicle type limits
            const vehicleLimits = {
              'sedan': { min: 1, max: 2 },
              'mpv': { min: 4, max: 5 },
              'large-mpv': { min: 5, max: 7 }
            };
            const limits = vehicleLimits[serviceData.vehicleType || 'sedan'];
            if (limits) {
              const clampedValue = Math.max(limits.min, Math.min(limits.max, numValue));
              handleFormChange('passengers', clampedValue);
            } else {
              handleFormChange('passengers', numValue);
            }
          }}
          min={serviceData.vehicleType === 'sedan' ? 1 : serviceData.vehicleType === 'mpv' ? 4 : serviceData.vehicleType === 'large-mpv' ? 5 : 1}
          max={serviceData.vehicleType === 'sedan' ? 2 : serviceData.vehicleType === 'mpv' ? 5 : serviceData.vehicleType === 'large-mpv' ? 7 : 7}
          error={errors.passengers}
          required
        />
      </div>

      {/* Round Trip Option */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRoundTrip || false}
            onChange={(e) => handleFormChange('isRoundTrip', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-0.5"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-700 text-sm">Round Trip</div>
            <div className="text-xs text-slate-600 mt-1">
              Return to pickup location after drop-off. The return trip will be automatically scheduled.
            </div>
            {formData.isRoundTrip && (
              <div className="text-xs text-blue-600 mt-2 font-medium">
                💡 Round trip pricing: ~80% of single trip cost for return journey
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Additional Stops */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700">Additional Stops</h4>
          <button
            type="button"
            onClick={handleAddStop}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Stop
          </button>
        </div>

        {serviceData.additionalStops && serviceData.additionalStops.length > 0 ? (
          <div className="space-y-3">
            {serviceData.additionalStops.map((stop, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Stop {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStop(index)}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="space-y-2">
                  <FormInput
                    label="Location"
                    value={stop.location || ''}
                    onChange={(value) => handleStopChange(index, 'location', value)}
                    placeholder="Enter stop location..."
                  />
                  
                  <FormInput
                    label="Instructions (Optional)"
                    value={stop.instructions || ''}
                    onChange={(value) => handleStopChange(index, 'instructions', value)}
                    placeholder="Special instructions for this stop..."
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-2xl mb-2">🛑</div>
            <p className="text-sm">No additional stops</p>
            <p className="text-xs mt-1">Add stops for multi-destination trips</p>
          </div>
        )}
      </div>

      {/* Priority Booking */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={serviceData.priorityBooking || false}
            onChange={(e) => handleServiceChange('priorityBooking', e.target.checked)}
            className="w-4 h-4 text-yellow-600 border-slate-300 rounded focus:ring-yellow-500 mt-0.5"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-700 text-sm">Priority Booking</div>
            <div className="text-xs text-slate-600 mt-1">
              Get matched with drivers faster (+50% surcharge)
            </div>
          </div>
        </label>
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

export default TaxiBookingForm;