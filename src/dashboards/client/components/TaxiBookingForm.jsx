import React, { useState } from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';
import Button from '../../shared/Button';

/**
 * Taxi Booking Form Component
 * 
 * Features:
 * - Pickup/dropoff location with 3 input methods
 * - Multiple destinations support
 * - Passenger count
 * - Payment method selection
 * - Instant or scheduled rides
 * - Special instructions
 * 
 * Database Integration:
 * - INSERT INTO rides (user_id, service_type, ride_type, ...)
 * - Fetch saved places from saved_places table
 */

const TaxiBookingForm = ({ rideType, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    serviceType: 'taxi',
    rideType: rideType,
    pickupLocation: '',
    dropoffLocation: '',
    isRoundTrip: false,
    passengers: 1,
    paymentMethod: 'cash',
    specialInstructions: '',
    scheduledDate: '',
    scheduledTime: ''
  });

  const [loading, setLoading] = useState(false);

  // Mock saved places - Replace with database query
  const savedPlaces = [
    { id: 1, name: 'Home', address: '123 Hillside, Bulawayo', icon: '🏠', coordinates: { lat: -20.1234, lng: 28.5678 } },
    { id: 2, name: 'Work', address: '456 City Center, Bulawayo', icon: '💼', coordinates: { lat: -20.1500, lng: 28.5833 } },
    { id: 3, name: 'Gym', address: 'Ascot Shopping Centre, Bulawayo', icon: '💪', coordinates: { lat: -20.1234, lng: 28.5678 } }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Replace with Supabase mutation
    // const { data, error } = await supabase
    //   .from('rides')
    //   .insert([{
    //     user_id: currentUser.id,
    //     service_type: formData.serviceType,
    //     ride_type: formData.rideType,
    //     pickup_location: { address: formData.pickupLocation },
    //     dropoff_location: { address: formData.dropoffLocation },
    //     additional_stops: formData.additionalStops,
    //     passengers: formData.passengers,
    //     payment_method: formData.paymentMethod,
    //     special_instructions: formData.specialInstructions,
    //     scheduled_date: formData.scheduledDate,
    //     scheduled_time: formData.scheduledTime,
    //     status: 'pending'
    //   }]);

    console.log('Booking taxi ride:', formData);

    setTimeout(() => {
      setLoading(false);
      alert('🎉 Ride booked successfully! A driver will be assigned shortly.');
      onBack();
    }, 1500);
  };

  const estimatedFare = () => {
    const basePrice = 10;
    const roundTripMultiplier = formData.isRoundTrip ? 2 : 1;
    return basePrice * roundTripMultiplier;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-slate-600 hover:text-slate-700 mb-4 flex items-center gap-2"
        >
          ← Back to services
        </button>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">🚕 Book a Taxi Ride</h2>
        <p className="text-slate-600">
          {rideType === 'instant' ? 'Get a ride immediately' : 'Schedule a ride for later'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        {/* Ride Type Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">Ride Type</label>
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
              <div className="font-semibold text-slate-700">Instant Ride</div>
              <div className="text-xs text-slate-500">Get picked up now</div>
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
              <div className="text-xs text-slate-500">Book for later</div>
            </button>
          </div>
        </div>

        {/* Locations */}
        <LocationInput
          label="Pickup Location"
          value={formData.pickupLocation}
          onChange={(e) => handleChange({ target: { name: 'pickupLocation', value: e.target.value } })}
          savedPlaces={savedPlaces}
          required
          placeholder="Where are you?"
        />

        <LocationInput
          label="Drop-off Location"
          value={formData.dropoffLocation}
          onChange={(e) => handleChange({ target: { name: 'dropoffLocation', value: e.target.value } })}
          savedPlaces={savedPlaces}
          required
          placeholder="Where to?"
        />

        {/* Round Trip Option */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isRoundTrip"
              checked={formData.isRoundTrip}
              onChange={(e) => setFormData(prev => ({ ...prev, isRoundTrip: e.target.checked }))}
              className="w-5 h-5 text-yellow-600 border-slate-300 rounded focus:ring-yellow-500"
            />
            <div>
              <div className="font-semibold text-slate-700">Round Trip</div>
              <div className="text-xs text-slate-600">Return to pickup location (doubles the fare)</div>
            </div>
          </label>
        </div>

        {/* Passenger Count & Payment */}
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Number of Passengers"
            name="passengers"
            type="number"
            min="1"
            max="4"
            value={formData.passengers}
            onChange={handleChange}
            required
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

        {/* Schedule (if scheduled) */}
        {formData.rideType === 'scheduled' && (
          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="Date"
              name="scheduledDate"
              type="date"
              value={formData.scheduledDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <FormInput
              label="Time"
              name="scheduledTime"
              type="time"
              value={formData.scheduledTime}
              onChange={handleChange}
              required
            />
          </div>
        )}

        {/* Special Instructions */}
        <FormTextarea
          label="Special Instructions (Optional)"
          name="specialInstructions"
          value={formData.specialInstructions}
          onChange={handleChange}
          placeholder="e.g., Call when you arrive, Gate code: 1234"
          rows={3}
        />

        {/* Fare Estimate */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-700 mb-1">
            <strong>Estimated Fare:</strong> ${estimatedFare()}.00
          </p>
          <p className="text-xs text-slate-500">
            Final fare calculated based on actual distance and time
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {formData.rideType === 'instant' ? 'Book Now' : 'Schedule Ride'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaxiBookingForm;

