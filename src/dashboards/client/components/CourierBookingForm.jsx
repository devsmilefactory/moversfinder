import React, { useState } from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';
import Button from '../../shared/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import ScheduleModal from './ScheduleModal';

/**
 * Courier Booking Form Component
 * 
 * Features:
 * - Package description, weight, dimensions
 * - Vehicle type selection
 * - Multiple drop-off points
 * - Instant or scheduled delivery
 * 
 * Database Integration:
 * - INSERT INTO rides (service_type='courier', package_description, package_weight, ...)
 */

const CourierBookingForm = ({ rideType, onBack }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    serviceType: 'courier',
    rideType: rideType,
    pickupLocation: '',
    dropoffLocation: '',
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    packageDescription: '',
    packageWeight: '',
    weightUnit: 'kg',
    packageSize: 'medium',
    vehicleType: 'sedan',
    specialInstructions: '',
    paymentMethod: 'cash',
    scheduleType: 'instant',
    selectedDates: [],
    tripTime: '',
    numberOfTrips: 1
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [loading, setLoading] = useState(false);

  const savedPlaces = [
    { id: 1, name: 'Home', address: '123 Hillside, Bulawayo', icon: '🏠', coordinates: { lat: -20.1234, lng: 28.5678 } },
    { id: 2, name: 'Work', address: '456 City Center, Bulawayo', icon: '💼', coordinates: { lat: -20.1500, lng: 28.5833 } }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleConfirm = (scheduleData) => {
    setFormData(prev => ({
      ...prev,
      scheduleType: scheduleData.scheduleType,
      selectedDates: scheduleData.selectedDates || [],
      tripTime: scheduleData.tripTime || '',
      numberOfTrips: scheduleData.numberOfTrips || 1
    }));
  };

  const calculatePrice = () => {
    // Base price by vehicle type
    const vehiclePrices = {
      'motorcycle': 5,
      'sedan': 8,
      'suv': 12,
      'van': 15,
      'truck': 20
    };

    // Size multiplier
    const sizeMultipliers = {
      'small': 1,
      'medium': 1.5,
      'large': 2,
      'extra_large': 3
    };

    const basePrice = vehiclePrices[formData.vehicleType] || 8;
    const sizeMultiplier = sizeMultipliers[formData.packageSize] || 1.5;

    return (basePrice * sizeMultiplier).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Supabase integration
    console.log('Booking courier service:', formData);

    setTimeout(() => {
      setLoading(false);
      addToast({ type: 'success', title: 'Courier service booked', message: 'A driver will pick up your package shortly' });
      onBack();
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-slate-600 hover:text-slate-700 mb-4 flex items-center gap-2"
        >
          ← Back to services
        </button>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">📦 Book Courier Service</h2>
        <p className="text-slate-600">Fast and reliable package delivery</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        {/* Ride Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">Delivery Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, rideType: 'instant' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.rideType === 'instant'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold text-slate-700">Instant Delivery</div>
              <div className="text-xs text-slate-500">Pick up now</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, rideType: 'scheduled' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                formData.rideType === 'scheduled'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold text-slate-700">Scheduled</div>
              <div className="text-xs text-slate-500">Schedule pickup</div>
            </button>
          </div>
        </div>



        {/* Pickup Location */}
        <LocationInput
          label="Pickup Location"
          value={formData.pickupLocation}
          onChange={(e) => handleChange({ target: { name: 'pickupLocation', value: e.target.value } })}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to pick up the package(s)?"
        />

        {/* Package Details */}
        <div className="mb-6">
          <h3 className="font-semibold text-slate-700 mb-4">📦 Package Details</h3>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            {/* Drop-off Location */}
            <LocationInput
              label="Drop-off Location"
              value={formData.dropoffLocation}
              onChange={(e) => handleChange({ target: { name: 'dropoffLocation', value: e.target.value } })}
              savedPlaces={savedPlaces}
              required
              placeholder="Where to deliver this package?"
            />

            {/* Recipient Details */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <FormInput
                label="Recipient Name"
                name="recipientName"
                value={formData.recipientName}
                onChange={handleChange}
                placeholder="Full name"
                required
              />

              <FormInput
                label="Recipient Phone"
                type="tel"
                name="recipientPhone"
                value={formData.recipientPhone}
                onChange={handleChange}
                placeholder="+263 71 234 5678"
                required
              />
            </div>

            <FormInput
              label="Recipient Email (Optional)"
              type="email"
              name="recipientEmail"
              value={formData.recipientEmail}
              onChange={handleChange}
              placeholder="recipient@example.com"
            />

            {/* Package Details */}
            <FormInput
              label="Package Description"
              name="packageDescription"
              value={formData.packageDescription}
              onChange={handleChange}
              placeholder="e.g., Documents, Electronics, Clothing"
              required
            />

            <div className="grid md:grid-cols-2 gap-4">
              <FormSelect
                label="Package Size"
                name="packageSize"
                value={formData.packageSize}
                onChange={handleChange}
                required
                options={[
                  { value: 'small', label: '📦 Small (fits in hand)' },
                  { value: 'medium', label: '📦 Medium (shoebox size)' },
                  { value: 'large', label: '📦 Large (suitcase size)' },
                  { value: 'extra_large', label: '📦 Extra Large (furniture)' }
                ]}
              />

              <FormSelect
                label="Preferred Vehicle Type"
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                required
                options={[
                  { value: 'motorcycle', label: '🏍️ Motorcycle' },
                  { value: 'sedan', label: '🚙 Sedan' },
                  { value: 'suv', label: '🚙 SUV' },
                  { value: 'van', label: '🚐 Van' },
                  { value: 'truck', label: '🚚 Truck' }
                ]}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                label="Package Weight (Optional)"
                type="number"
                name="packageWeight"
                min="0"
                max="50"
                step="0.1"
                value={formData.packageWeight}
                onChange={handleChange}
                placeholder="0.0"
              />

              <FormSelect
                label="Weight Unit"
                name="weightUnit"
                value={formData.weightUnit}
                onChange={handleChange}
                options={[
                  { value: 'kg', label: 'Kilograms (kg)' },
                  { value: 'lbs', label: 'Pounds (lbs)' }
                ]}
              />
            </div>

            <FormTextarea
              label="Special Instructions (Optional)"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              placeholder="Any special handling instructions..."
              rows={2}
            />
          </div>
        </div>

        {/* Payment Method */}
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

        {/* Schedule */}
        {formData.rideType === 'scheduled' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Delivery Schedule
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScheduleModal(true)}
              className="w-full"
            >
              {formData.scheduleType === 'instant' ? (
                '📅 Select Delivery Dates'
              ) : formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 0 ? (
                `📅 ${formData.selectedDates.length} Date(s) Selected`
              ) : (
                '📅 Select Delivery Dates'
              )}
            </Button>

            {/* Show selected dates */}
            {formData.selectedDates.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Selected Delivery Dates ({formData.selectedDates.length}):
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {formData.selectedDates.map((date, index) => (
                    <div key={index} className="text-sm text-slate-600">
                      📦 {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })} at {formData.tripTime || 'Not set'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Total Price Summary */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-slate-700 mb-3">Price Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Package ({formData.packageSize}, {formData.vehicleType}):</span>
              <span className="font-semibold text-slate-700">${calculatePrice()}</span>
            </div>
            {formData.numberOfTrips > 1 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Number of deliveries:</span>
                <span className="font-semibold text-slate-700">× {formData.numberOfTrips}</span>
              </div>
            )}
            <div className="border-t border-yellow-300 pt-2 flex justify-between items-center">
              <span className="font-bold text-slate-700">Total Estimated Cost:</span>
              <span className="text-xl font-bold text-slate-700">
                ${(parseFloat(calculatePrice()) * formData.numberOfTrips).toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Based on vehicle type, package size{formData.numberOfTrips > 1 ? `, and ${formData.numberOfTrips} deliveries` : ''}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {formData.rideType === 'instant' ? 'Book Courier Now' : 'Schedule Courier'}
          </Button>
        </div>
      </form>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={handleScheduleConfirm}
        initialData={{
          scheduleType: formData.scheduleType,
          selectedDates: formData.selectedDates,
          tripTime: formData.tripTime
        }}
      />
    </div>
  );
};

export default CourierBookingForm;

