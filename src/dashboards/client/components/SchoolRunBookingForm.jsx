import React, { useState } from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea, FormCheckbox } from '../../shared/FormInput';
import Button from '../../shared/Button';
import { useToast } from '../../../components/ui/ToastProvider';

/**
 * School/Work Run Booking Form Component
 * 
 * Features:
 * - One-way or two-way trips
 * - Different return destination option
 * - Multiple stops support
 * - Recurring schedule (daily, weekly, monthly)
 * - Vehicle type selection
 * 
 * Database Integration:
 * - INSERT INTO rides (service_type='school_run', trip_type, is_recurring, recurrence_config, ...)
 */

const SchoolRunBookingForm = ({ onBack }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    serviceType: 'school_run',
    tripType: 'one_way', // 'one_way' or 'two_way'
    firstTripTime: '',
    returnTripTime: '',
    differentReturnDest: false,
    pickupLocation: '',
    dropoffLocation: '',
    returnDestination: '',
    additionalStops: [],
    vehicleType: 'any',
    paymentMethod: 'cash',
    specialInstructions: '',
    isRecurring: false,
    recurrenceFrequency: 'daily',
    recurrenceDays: [],
    startDate: '',
    endDate: ''
  });

  const [loading, setLoading] = useState(false);

  const savedPlaces = [
    { id: 1, name: 'Home', address: '123 Hillside, Bulawayo', icon: '🏠', coordinates: { lat: -20.1234, lng: 28.5678 } },
    { id: 2, name: 'School', address: 'Lincoln Elementary, Bulawayo', icon: '🏫', coordinates: { lat: -20.1500, lng: 28.5833 } },
    { id: 3, name: 'Work', address: '456 City Center, Bulawayo', icon: '💼', coordinates: { lat: -20.1600, lng: 28.5900 } }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(day)
        ? prev.recurrenceDays.filter(d => d !== day)
        : [...prev.recurrenceDays, day]
    }));
  };

  const handleAddStop = () => {
    setFormData(prev => ({
      ...prev,
      additionalStops: [...prev.additionalStops, '']
    }));
  };

  const handleRemoveStop = (index) => {
    setFormData(prev => ({
      ...prev,
      additionalStops: prev.additionalStops.filter((_, i) => i !== index)
    }));
  };

  const handleStopChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      additionalStops: prev.additionalStops.map((stop, i) => i === index ? value : stop)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Supabase integration
    console.log('Booking school/work run:', formData);

    setTimeout(() => {
      setLoading(false);
      addToast({ type: 'success', title: 'School/Work run booked' });
      onBack();
    }, 1500);
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-slate-600 hover:text-slate-700 mb-4 flex items-center gap-2"
        >
          ← Back to services
        </button>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">🎒 Book School/Work Run</h2>
        <p className="text-slate-600">Regular transportation for school or work</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        {/* Trip Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">Trip Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, tripType: 'one_way' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.tripType === 'one_way'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-2">➡️</div>
              <div className="font-semibold text-slate-700">One-way Trip</div>
              <div className="text-xs text-slate-500">Single direction</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, tripType: 'two_way' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.tripType === 'two_way'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-2">↔️</div>
              <div className="font-semibold text-slate-700">Two-way (Round Trip)</div>
              <div className="text-xs text-slate-500">There and back</div>
            </button>
          </div>
        </div>

        {/* Trip Times */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <FormInput
            label={formData.tripType === 'one_way' ? 'Pick-up Time' : 'First Trip Pick-up Time'}
            name="firstTripTime"
            type="time"
            value={formData.firstTripTime}
            onChange={handleChange}
            required
          />

          {formData.tripType === 'two_way' && (
            <FormInput
              label="Return Trip Pick-up Time"
              name="returnTripTime"
              type="time"
              value={formData.returnTripTime}
              onChange={handleChange}
              required
            />
          )}
        </div>

        {/* Different Return Destination */}
        {formData.tripType === 'two_way' && (
          <FormCheckbox
            label="Use different destination for return trip"
            name="differentReturnDest"
            checked={formData.differentReturnDest}
            onChange={handleChange}
          />
        )}

        {/* Locations */}
        <LocationInput
          label="Pickup Location"
          value={formData.pickupLocation}
          onChange={(e) => handleChange({ target: { name: 'pickupLocation', value: e.target.value } })}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to pick up?"
        />

        <LocationInput
          label="Drop-off Location"
          value={formData.dropoffLocation}
          onChange={(e) => handleChange({ target: { name: 'dropoffLocation', value: e.target.value } })}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to drop off?"
        />

        {formData.tripType === 'two_way' && formData.differentReturnDest && (
          <LocationInput
            label="Return Trip Destination"
            value={formData.returnDestination}
            onChange={(e) => handleChange({ target: { name: 'returnDestination', value: e.target.value } })}
            savedPlaces={savedPlaces}
            required
            placeholder="Different return destination"
          />
        )}

        {/* Additional Stops */}
        {formData.additionalStops.map((stop, index) => (
          <div key={index} className="relative">
            <LocationInput
              label={`Additional Stop ${index + 1}`}
              value={stop}
              onChange={(e) => handleStopChange(index, e.target.value)}
              savedPlaces={savedPlaces}
              placeholder="Add a stop along the route"
            />
            <button
              type="button"
              onClick={() => handleRemoveStop(index)}
              className="absolute top-8 right-0 text-red-500 hover:text-red-600 text-sm"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddStop}
          className="mb-4 text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center gap-2"
        >
          + Add stop along route
        </button>

        {/* Vehicle Type & Payment */}
        <div className="grid md:grid-cols-2 gap-4">
          <FormSelect
            label="Preferred Vehicle Type"
            name="vehicleType"
            value={formData.vehicleType}
            onChange={handleChange}
            required
            options={[
              { value: 'any', label: '🚗 Any' },
              { value: 'sedan', label: '🚙 Sedan' },
              { value: 'minivan', label: '🚐 Minivan' },
              { value: 'hatchback', label: '🚗 Hatchback' }
            ]}
          />

          <FormSelect
            label="Payment Method"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            required
            options={[
              { value: 'ecocash', label: '💰 EcoCash' },
              { value: 'onemoney', label: '💳 OneMoney' },
              { value: 'cash', label: '💵 Cash' },
              { value: 'usd_card', label: '💳 USD Card' }
            ]}
          />
        </div>

        {/* Recurring Schedule */}
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <FormCheckbox
            label="Make this a recurring trip"
            name="isRecurring"
            checked={formData.isRecurring}
            onChange={handleChange}
          />

          {formData.isRecurring && (
            <div className="mt-4 space-y-4">
              <FormSelect
                label="Frequency"
                name="recurrenceFrequency"
                value={formData.recurrenceFrequency}
                onChange={handleChange}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' }
                ]}
              />

              {formData.recurrenceFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayToggle(day)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          formData.recurrenceDays.includes(day)
                            ? 'border-green-500 bg-green-100 text-green-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                <FormInput
                  label="End Date (Optional)"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate}
                />
              </div>
            </div>
          )}
        </div>

        {/* Special Instructions */}
        <FormTextarea
          label="Special Instructions (Optional)"
          name="specialInstructions"
          value={formData.specialInstructions}
          onChange={handleChange}
          placeholder="e.g., Child's name, Special needs, Preferred route"
          rows={3}
        />

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Book School/Work Run
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SchoolRunBookingForm;

