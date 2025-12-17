import React from 'react';
import { formatPrice } from '../../utils/formatters';

/**
 * BookingConfirmation Component
 * 
 * Shows a final review of the booking details before submission.
 * Displays all key information in a clear, scannable format.
 */
const BookingConfirmation = ({
  selectedService,
  formData,
  serviceData,
  estimate,
  computedEstimate,
  schedulingSummary,
  finalPrice,
  onEdit,
  onConfirm,
  isSubmitting = false,
  errors = {}
}) => {
  // Determine which estimate to use
  const activeEstimate = computedEstimate || estimate;

  // Get service display name
  const getServiceDisplayName = (service) => {
    const names = {
      taxi: 'Taxi',
      courier: 'Courier Service',
      errands: 'Errands & Tasks',
      school_run: 'School/Work Transport',
      bulk: 'Bulk Booking'
    };
    return names[service] || service;
  };

  // Get service icon
  const getServiceIcon = (service) => {
    const icons = {
      taxi: '🚕',
      courier: '📦',
      errands: '🛍️',
      school_run: '🎒',
      bulk: '👥'
    };
    return icons[service] || '🚗';
  };

  // Format location display
  const formatLocation = (location) => {
    if (typeof location === 'string') return location;
    if (location?.address) return location.address;
    if (location?.description) return location.description;
    return 'Location not specified';
  };

  // Get service-specific details
  const getServiceDetails = () => {
    switch (selectedService) {
      case 'taxi':
        return [
          { label: 'Vehicle Type', value: serviceData.vehicleType || 'Standard' },
          { label: 'Passengers', value: formData.passengers || 1 },
          { label: 'Priority Booking', value: serviceData.priorityBooking ? 'Yes' : 'No' }
        ];
      
      case 'courier':
        return [
          { label: 'Package Size', value: serviceData.package?.size || 'Not specified' },
          { label: 'Fragile Item', value: serviceData.package?.isFragile ? 'Yes' : 'No' },
          { label: 'Signature Required', value: serviceData.package?.requiresSignature ? 'Yes' : 'No' },
          { label: 'Recipient', value: serviceData.recipient?.name || 'Not specified' }
        ];
      
      case 'errands':
        const taskCount = serviceData.tasks?.length || 0;
        return [
          { label: 'Number of Tasks', value: taskCount },
          { label: 'Return to Start', value: serviceData.returnToStart ? 'Yes' : 'No' },
          { label: 'Max Wait Time', value: `${serviceData.maxWaitTime || 30} minutes` }
        ];
      
      case 'school_run':
        return [
          { label: 'Service Type', value: serviceData.serviceType || 'School' },
          { label: 'Passenger', value: serviceData.passenger?.name || 'Not specified' },
          { label: 'Guardian', value: serviceData.guardian?.name || 'Not specified' },
          { label: 'Child Seat Required', value: serviceData.requiresChildSeat ? 'Yes' : 'No' }
        ];
      
      case 'bulk':
        const rideCount = serviceData.rides?.length || 0;
        return [
          { label: 'Organization', value: serviceData.organizationName || 'Not specified' },
          { label: 'Number of Rides', value: rideCount },
          { label: 'Contact Person', value: serviceData.contactPerson || 'Not specified' },
          { label: 'Approval Required', value: serviceData.approvalRequired ? 'Yes' : 'No' }
        ];
      
      default:
        return [];
    }
  };

  const serviceDetails = getServiceDetails();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-2">{getServiceIcon(selectedService)}</div>
        <h2 className="text-xl font-bold text-slate-800">Confirm Your Booking</h2>
        <p className="text-sm text-slate-600 mt-1">
          Please review the details below before confirming
        </p>
      </div>

      {/* Service Type */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Service</h3>
        <p className="text-blue-700">{getServiceDisplayName(selectedService)}</p>
      </div>

      {/* Route Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Route</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
            <div>
              <p className="text-xs font-medium text-slate-600">PICKUP</p>
              <p className="text-sm text-slate-800">{formatLocation(formData.pickupLocation)}</p>
            </div>
          </div>
          
          {selectedService === 'errands' && serviceData.tasks?.length > 0 && (
            <div className="ml-6 space-y-2">
              {serviceData.tasks.slice(0, 3).map((task, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">TASK {index + 1}</p>
                    <p className="text-sm text-slate-800">{task.location || task.description}</p>
                  </div>
                </div>
              ))}
              {serviceData.tasks.length > 3 && (
                <p className="text-xs text-slate-500 ml-5">
                  +{serviceData.tasks.length - 3} more tasks
                </p>
              )}
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
            <div>
              <p className="text-xs font-medium text-slate-600">DROPOFF</p>
              <p className="text-sm text-slate-800">{formatLocation(formData.dropoffLocation)}</p>
            </div>
          </div>
        </div>

        {/* Distance and Duration */}
        {activeEstimate && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Distance:</span>
              <span className="font-medium">{activeEstimate.distance?.toFixed(1) || 0} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Duration:</span>
              <span className="font-medium">{activeEstimate.duration || 0} minutes</span>
            </div>
          </div>
        )}
      </div>

      {/* Service Details */}
      {serviceDetails.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Service Details</h3>
          <div className="space-y-2">
            {serviceDetails.map((detail, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-slate-600">{detail.label}:</span>
                <span className="font-medium text-slate-800">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduling */}
      {schedulingSummary && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-800 mb-2">Scheduling</h3>
          <div className="flex items-center gap-2">
            <span className="text-lg">{schedulingSummary.icon || '📅'}</span>
            <p className="text-purple-700">{schedulingSummary.display}</p>
          </div>
          {formData.isRoundTrip && (
            <p className="text-sm text-purple-600 mt-1">Including return journey</p>
          )}
        </div>
      )}

      {/* Payment Method */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-800 mb-2">Payment</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {formData.paymentMethod === 'cash' ? '💵' : '💳'}
          </span>
          <p className="text-slate-700 capitalize">
            {formData.paymentMethod || 'Cash'}
          </p>
        </div>
      </div>

      {/* Total Cost */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-green-800">Total Cost</h3>
          <p className="text-2xl font-bold text-green-800">
            {formatPrice(finalPrice || activeEstimate?.cost || 0)}
          </p>
        </div>
        <p className="text-xs text-green-600 mt-1">
          *Final fare based on actual distance and time
        </p>
      </div>

      {/* Error Display */}
      {errors.confirmation && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <span>❌</span>
            <p className="font-medium">{errors.confirmation}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Edit Details
        </button>
        
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting || !finalPrice}
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Booking...</span>
            </>
          ) : (
            <>
              <span>Confirm Booking</span>
              <span>✓</span>
            </>
          )}
        </button>
      </div>

      {/* Terms and Conditions */}
      <div className="text-center">
        <p className="text-xs text-slate-500">
          By confirming this booking, you agree to our{' '}
          <button type="button" className="text-blue-600 underline hover:text-blue-800">
            Terms of Service
          </button>{' '}
          and{' '}
          <button type="button" className="text-blue-600 underline hover:text-blue-800">
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
};

export default BookingConfirmation;