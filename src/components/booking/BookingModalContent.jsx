import React from 'react';
import ServiceTypeSelector from './ServiceTypeSelector';
import LocationSection from './LocationSection';
import ServiceDetailsSection from './ServiceDetailsSection';
import SchedulingSection from './SchedulingSection';
import PricingDisplay from './PricingDisplay';
import { ErrorState } from '../shared/loading/ErrorState';

/**
 * BookingModalContent Component
 * 
 * Main content area of the booking modal containing all form sections.
 * Organized into logical sections with proper spacing and responsive design.
 */
const BookingModalContent = ({
  // Booking state
  selectedService,
  formData,
  currentServiceData,
  errors,
  warnings,
  
  // State handlers
  onServiceChange,
  onFormDataUpdate,
  onServiceDataUpdate,
  
  // Scheduling
  schedulingState,
  
  // Pricing
  estimate,
  isCalculating,
  calculationError,
  formattedPrice,
  
  // External data
  savedTrips,
  savedPlaces,
  mode,
  initialData
}) => {
  // Handle form field updates
  const handleFieldUpdate = (field, value) => {
    onFormDataUpdate({ [field]: value });
  };

  // Handle service-specific field updates
  const handleServiceFieldUpdate = (field, value) => {
    onServiceDataUpdate({ [field]: value });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Service Type Selection */}
        <ServiceTypeSelector
          selectedService={selectedService}
          onServiceChange={onServiceChange}
          disabled={mode === 'edit'} // Don't allow service changes when editing
        />

        {/* Location Section */}
        <LocationSection
          pickupLocation={formData.pickupLocation}
          dropoffLocation={formData.dropoffLocation}
          pickupCoordinates={formData.pickupCoordinates}
          dropoffCoordinates={formData.dropoffCoordinates}
          onPickupChange={(location, coordinates) => {
            onFormDataUpdate({
              pickupLocation: location,
              pickupCoordinates: coordinates
            });
          }}
          onDropoffChange={(location, coordinates) => {
            onFormDataUpdate({
              dropoffLocation: location,
              dropoffCoordinates: coordinates
            });
          }}
          savedPlaces={savedPlaces}
          errors={{
            pickup: errors.pickupLocation,
            dropoff: errors.dropoffLocation
          }}
        />

        {/* Service-Specific Details */}
        <ServiceDetailsSection
          selectedService={selectedService}
          serviceData={currentServiceData}
          formData={formData}
          onServiceDataUpdate={handleServiceFieldUpdate}
          onFormDataUpdate={handleFieldUpdate}
          errors={errors}
          warnings={warnings}
        />

        {/* Scheduling Section */}
        <SchedulingSection
          schedulingState={schedulingState}
          selectedService={selectedService}
          formData={formData}
          onFormDataUpdate={handleFieldUpdate}
        />

        {/* Pricing Display */}
        <PricingDisplay
          estimate={estimate}
          isCalculating={isCalculating}
          calculationError={calculationError}
          formattedPrice={formattedPrice}
          selectedService={selectedService}
          isRoundTrip={formData.isRoundTrip}
          schedulingType={schedulingState.scheduleType}
          tripCount={schedulingState.schedulingSummary?.count || 1}
        />

        {/* Payment Method */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            💳 Payment Method
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {['cash', 'card', 'mobile'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => handleFieldUpdate('paymentMethod', method)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  formData.paymentMethod === method
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {method === 'cash' && '💵'}
                    {method === 'card' && '💳'}
                    {method === 'mobile' && '📱'}
                  </span>
                  <span className="font-medium capitalize">{method}</span>
                </div>
                {method === 'mobile' && (
                  <div className="text-xs text-slate-500 mt-1">
                    EcoCash, OneMoney
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {errors.paymentMethod && (
            <p className="text-sm text-red-600">{errors.paymentMethod}</p>
          )}
        </div>

        {/* Special Instructions */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            📝 Special Instructions
            <span className="text-xs text-slate-500 font-normal">(Optional)</span>
          </label>
          
          <textarea
            value={formData.specialInstructions || ''}
            onChange={(e) => handleFieldUpdate('specialInstructions', e.target.value)}
            placeholder="Any special requests or instructions for the driver..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            maxLength={500}
          />
          
          <div className="flex justify-between text-xs text-slate-500">
            <span>Help drivers provide better service</span>
            <span>{(formData.specialInstructions || '').length}/500</span>
          </div>
        </div>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <ErrorState
            title="Please fix the following issues:"
            message={
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="text-sm">
                    <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}:</span> {error}
                  </li>
                ))}
              </ul>
            }
            variant="warning"
          />
        )}

        {/* Warnings Display */}
        {Object.keys(warnings).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-600 text-lg">⚠️</span>
              <div>
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Please note:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  {Object.entries(warnings).map(([field, warning]) => (
                    <li key={field}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModalContent;