import React from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';

/**
 * Compact Bulk Booking Form
 * Modes:
 * - multi_pickup: multiple pickups -> single dropoff
 * - multi_dropoff: single pickup -> multiple dropoffs
 */
const CompactBulkForm = ({ formData, onChange, savedPlaces = [] }) => {
  const mode = formData.bulkMode || 'multi_pickup';

  const setMode = (m) => onChange({ ...formData, bulkMode: m });

  const hasSingleDropoff = Boolean(
    formData.dropoffLocation && (
      typeof formData.dropoffLocation === 'string'
        ? formData.dropoffLocation.trim()
        : formData.dropoffLocation?.data?.address
    )
  );
  const hasSinglePickup = Boolean(
    formData.pickupLocation && (
      typeof formData.pickupLocation === 'string'
        ? formData.pickupLocation.trim()
        : formData.pickupLocation?.data?.address
    )
  );

  const handleLocationChange = (field) => (e) => {
    if (e?.target?.data) {
      onChange(prev => ({ ...prev, [field]: { data: e.target.data } }));
    } else {
      onChange(prev => ({ ...prev, [field]: e?.target?.value ?? '' }));
    }
  };

  const changeArrayItem = (arrField, index, next) => {
    const arr = [...(formData[arrField] || [])];
    let value = next;
    if (next?.target?.data) {
      value = { data: next.target.data };
    } else if (next?.target) {
      value = next.target.value ?? '';
    }
    arr[index] = value;
    onChange({ ...formData, [arrField]: arr });
  };

  const addArrayItem = (arrField) => {
    const arr = [...(formData[arrField] || [])];
    arr.push('');
    onChange({ ...formData, [arrField]: arr });
  };

  const removeArrayItem = (arrField, index) => {
    const arr = [...(formData[arrField] || [])];
    onChange({ ...formData, [arrField]: arr.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode('multi_pickup')}
          className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
            mode === 'multi_pickup' ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          Multiple Pickups → One Drop-off
        </button>
        <button
          type="button"
          onClick={() => setMode('multi_dropoff')}
          className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
            mode === 'multi_dropoff' ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          One Pickup → Multiple Drop-offs
        </button>
      </div>

      {/* Locations */}
      {mode === 'multi_pickup' ? (
        <>
          {/* Single Drop-off (required first) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <LocationInput
              label="Drop-off Location"
              value={typeof formData.dropoffLocation === 'string' ? formData.dropoffLocation : (formData.dropoffLocation?.data?.address || '')}
              onChange={handleLocationChange('dropoffLocation')}
              savedPlaces={savedPlaces}
              required
              placeholder="Where to drop off?"
            />
            {!hasSingleDropoff && (
              <p className="text-xs text-slate-500 mt-2">Set a drop-off first to add multiple pickups.</p>
            )}
          </div>

          {/* Pickups list (scrollable) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Pickup Locations</label>
              <button
                type="button"
                onClick={() => addArrayItem('bulkPickups')}
                disabled={!hasSingleDropoff}
                className={`text-xs px-2 py-1 rounded ${!hasSingleDropoff ? 'opacity-50 cursor-not-allowed bg-yellow-100 text-yellow-700' : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'}`}
              >
                + Add Pickup
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto pr-1 -mr-1 space-y-3">
              {(formData.bulkPickups || []).map((val, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
                  <LocationInput
                    label={`Pickup ${idx + 1}`}
                    value={typeof val === 'string' ? val : (val?.data?.address || '')}
                    onChange={(e) => changeArrayItem('bulkPickups', idx, e)}
                    savedPlaces={savedPlaces}
                    placeholder="Enter pickup location..."
                  />
                  {idx > 0 && (
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('bulkPickups', idx)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Single Pickup */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <LocationInput
              label="Pickup Location"
              value={typeof formData.pickupLocation === 'string' ? formData.pickupLocation : (formData.pickupLocation?.data?.address || '')}
              onChange={handleLocationChange('pickupLocation')}
              savedPlaces={savedPlaces}
              required
              placeholder="Where to pick up?"
            />
          </div>

          {/* Dropoffs list (scrollable) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Drop-off Locations</label>
              <button
                type="button"
                onClick={() => addArrayItem('bulkDropoffs')}
                disabled={!hasSinglePickup}
                className={`text-xs px-2 py-1 rounded ${!hasSinglePickup ? 'opacity-50 cursor-not-allowed bg-yellow-100 text-yellow-700' : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'}`}
              >
                + Add Drop-off
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto pr-1 -mr-1 space-y-3">
              {(formData.bulkDropoffs || []).map((val, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
                  <LocationInput
                    label={`Drop-off ${idx + 1}`}
                    value={typeof val === 'string' ? val : (val?.data?.address || '')}
                    onChange={(e) => changeArrayItem('bulkDropoffs', idx, e)}
                    savedPlaces={savedPlaces}
                    placeholder="Enter drop-off location..."
                  />
                  {idx > 0 && (
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('bulkDropoffs', idx)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Payment and Notes */}
      <div className="grid grid-cols-1 gap-4">
        <FormSelect
          label="Payment Method"
          name="paymentMethod"
          value={formData.paymentMethod || 'cash'}
          onChange={(e) => onChange({ ...formData, paymentMethod: e.target.value })}
          required
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'ecocash', label: 'EcoCash' },
            { value: 'onemoney', label: 'OneMoney' },
            { value: 'card', label: 'Card' }
          ]}
        />

        <FormTextarea
          label="Special Instructions (Optional)"
          name="specialInstructions"
          value={formData.specialInstructions || ''}
          onChange={(e) => onChange({ ...formData, specialInstructions: e.target.value })}
          placeholder="Any important details for the driver..."
          rows={2}
        />
      </div>
    </div>
  );
};

export default CompactBulkForm;

