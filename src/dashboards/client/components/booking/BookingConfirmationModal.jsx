import React from 'react';
import Button from '../../../shared/Button';
import { formatPrice } from '../../../../utils/formatters';
import { getTaskAddressValue } from '../../../../utils/errandTasks';

/**
 * BookingConfirmationModal Component
 * 
 * Displays booking summary before confirmation.
 * Extracted from UnifiedBookingModal for better organization.
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Handler to close the modal
 * @param {function} props.onConfirm - Handler to confirm booking (async function)
 * @param {object} props.bookingData - Booking data object
 * @param {string} props.bookingData.selectedService - Selected service type
 * @param {object} props.bookingData.formData - Form data object
 * @param {number} props.bookingData.totalCost - Total cost estimate
 * @param {object} props.bookingData.fareBreakdown - Fare breakdown object
 * @param {object} props.bookingData.computedEstimate - Computed estimate with distance/duration
 * @param {object} props.bookingData.estimate - Alternative estimate object
 * @param {object} props.bookingData.errandsTasksSummary - Errands tasks summary (for errands service)
 * @param {array} props.bookingData.services - Services configuration array
 * @param {boolean} props.loading - Whether booking is in progress
 */
const BookingConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  bookingData,
  loading = false
}) => {
  if (!isOpen || !bookingData) return null;

  const {
    selectedService,
    formData,
    totalCost,
    fareBreakdown,
    computedEstimate,
    estimate,
    errandsTasksSummary,
    services = [
      { id: 'taxi', name: 'Taxi', icon: '🚕' },
      { id: 'courier', name: 'Courier', icon: '📦' },
      { id: 'errands', name: 'Errands', icon: '🛍️' },
      { id: 'school_run', name: 'School/Work', icon: '🎒' },
      { id: 'bulk', name: 'Bulk', icon: '👥' }
    ]
  } = bookingData;

  // Helper functions
  const getLocationAddress = (location) => {
    if (!location) return 'Not specified';
    if (typeof location === 'string') return location;
    return location?.data?.address || location?.address || 'Not specified';
  };

  const getServiceIcon = () => {
    const service = services.find(s => s.id === selectedService);
    return service ? service.icon : '🚕';
  };

  const getServiceName = () => {
    const service = services.find(s => s.id === selectedService);
    return service ? service.name : 'Taxi';
  };

  const getScheduleDisplay = () => {
    if (formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 0) {
      if (formData.selectedDates.length === 1) {
        // Single scheduled ride
        const date = new Date(formData.selectedDates[0]);
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        return `${formattedDate} at ${formData.tripTime || 'Not set'}`;
      }
      // Multiple specific dates (recurring)
      return `${formData.selectedDates.length} rides on specific dates starting ${formData.selectedDates[0]} at ${formData.tripTime || 'Not set'}`;
    }

    if (formData.scheduleType === 'weekdays' && formData.scheduleMonth) {
      const [year, month] = formData.scheduleMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `All weekdays (Mon-Fri) in ${monthName} at ${formData.tripTime || 'Not set'} (${formData.tripCount || 0} trips)`;
    }

    if (formData.scheduleType === 'weekends' && formData.scheduleMonth) {
      const [year, month] = formData.scheduleMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `All weekends (Sat-Sun) in ${monthName} at ${formData.tripTime || 'Not set'} (${formData.tripCount || 0} trips)`;
    }

    return 'Not scheduled';
  };

  const calculateCost = () => {
    return totalCost || 0;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Confirmation Modal Container */}
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getServiceIcon()}</span>
              <h2 className="text-xl font-bold text-slate-800">Confirm Your Booking</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-150">
          <div className="space-y-4">
            {/* Service Type */}
            <div className="bg-slate-150 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Service Type</p>
              <p className="text-lg font-semibold text-slate-800">{getServiceName()}</p>
            </div>

            {/* Locations */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">📍 Pickup Location</p>
                <p className="text-sm text-slate-700">{getLocationAddress(formData.pickupLocation)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">📍 Dropoff Location</p>
                <p className="text-sm text-slate-700">{getLocationAddress(formData.dropoffLocation)}</p>
              </div>
            </div>

            {/* Additional Stops (Taxi) */}
            {selectedService === 'taxi' && formData.additionalStops && formData.additionalStops.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">🛑 Additional Stops</p>
                <div className="space-y-1">
                  {formData.additionalStops.map((stop, index) => (
                    <p key={index} className="text-sm text-slate-700 pl-4">
                      {index + 1}. {getLocationAddress(stop.location || stop)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Deliveries (Courier) */}
            {selectedService === 'courier' && formData.additionalDeliveries && formData.additionalDeliveries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">📦 Additional Deliveries</p>
                <div className="space-y-2">
                  {formData.additionalDeliveries.map((delivery, index) => (
                    <div key={index} className="text-sm text-slate-700 pl-4 border-l-2 border-blue-300">
                      <p className="font-medium">{index + 1}. {getLocationAddress(delivery.location)}</p>
                      {delivery.recipientName && <p className="text-xs">Recipient: {delivery.recipientName}</p>}
                      {delivery.recipientPhone && <p className="text-xs">Phone: {delivery.recipientPhone}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks (Errands) */}
            {selectedService === 'errands' && formData.tasks && formData.tasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">🛍️ Tasks</p>
                {errandsTasksSummary && (
                  <p className="text-xs text-slate-500 mb-2">
                    {errandsTasksSummary.totalTasks} task{errandsTasksSummary.totalTasks === 1 ? '' : 's'} •{' '}
                    {Number(errandsTasksSummary.totalDistanceKm ?? 0).toFixed(1)} km combined •{' '}
                    {errandsTasksSummary.totalDurationMinutes ?? 0} min estimated
                  </p>
                )}
                <div className="space-y-2">
                  {formData.tasks.map((task, index) => {
                    const pickup = getTaskAddressValue(task?.startPoint);
                    const dropoff = getTaskAddressValue(task?.destinationPoint);
                    const summary = errandsTasksSummary?.perTask?.[index];
                    return (
                      <div key={index} className="text-sm text-slate-700 pl-4 border-l-2 border-purple-200">
                        <p className="font-medium">{index + 1}. {task.description || `Task ${index + 1}`}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Pickup: {pickup || 'Not set'}</p>
                        <p className="text-xs text-slate-500">Drop-off: {dropoff || 'Not set'}</p>
                        {summary && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            ≈ {Number(summary.distanceKm ?? 0).toFixed(1)} km • {summary.durationMinutes ?? 0} min • {formatPrice(summary.cost)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {formData.returnToStart && (
                  <p className="text-xs text-blue-600 mt-2 pl-4">↩️ Return to starting point</p>
                )}
              </div>
            )}

            {/* Schedule */}
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase mb-2">⏰ Schedule</p>
              <p className="text-sm font-medium text-blue-900 mb-2">{getScheduleDisplay()}</p>

              {/* Show all dates for specific dates recurring rides */}
              {formData.scheduleType === 'specific_dates' && formData.selectedDates.length > 1 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-2">All Scheduled Dates:</p>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {formData.selectedDates.map((date, index) => (
                      <div key={index} className="text-xs bg-white rounded px-2 py-1 text-blue-800">
                        {new Date(date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show trip count for weekdays/weekends */}
              {(formData.scheduleType === 'weekdays' || formData.scheduleType === 'weekends') && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">Total Rides:</span> {formData.tripCount || 0} trips
                  </p>
                </div>
              )}
            </div>

            {/* Service-Specific Details */}
            <div className="grid grid-cols-2 gap-3">
              {(selectedService === 'taxi' || selectedService === 'school_run') && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">👥 Passengers</p>
                  <p className="text-sm text-slate-700">{formData.passengers || 1}</p>
                </div>
              )}

              {selectedService === 'courier' && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">📦 Package Size</p>
                    <p className="text-sm text-slate-700 capitalize">{(formData.packages && formData.packages[0]?.packageSize) || 'Small'}</p>
                  </div>
                  {formData.packageDetails && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Package Details</p>
                      <p className="text-sm text-slate-700">{formData.packageDetails}</p>
                    </div>
                  )}
                  {formData.recipientName && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Recipient</p>
                      <p className="text-sm text-slate-700">{formData.recipientName}</p>
                    </div>
                  )}
                  {formData.recipientPhone && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Recipient Phone</p>
                      <p className="text-sm text-slate-700">{formData.recipientPhone}</p>
                    </div>
                  )}
                </>
              )}

              {selectedService === 'school_run' && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Direction</p>
                    <p className="text-sm text-slate-700 capitalize">{formData.tripDirection || 'One-way'}</p>
                  </div>
                  {formData.passengerName && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Passenger Name</p>
                      <p className="text-sm text-slate-700">{formData.passengerName}</p>
                    </div>
                  )}
                  {formData.contactNumber && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Contact Number</p>
                      <p className="text-sm text-slate-700">{formData.contactNumber}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Estimate Details */}
            <div className="bg-green-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-green-700 uppercase mb-2">💰 Estimate</p>
              <div className="grid grid-cols-3 gap-3">
                {(computedEstimate?.distanceKm ?? estimate?.distanceKm) != null && (
                  <div>
                    <p className="text-xs text-green-600">Distance</p>
                    <p className="text-lg font-bold text-green-800">
                      {(computedEstimate?.distanceKm ?? estimate.distanceKm).toFixed(1)} km
                    </p>
                  </div>
                )}
                {(computedEstimate?.durationMinutes ?? estimate?.durationMinutes) != null && (
                  <div>
                    <p className="text-xs text-green-600">Duration</p>
                    <p className="text-lg font-bold text-green-800">
                      {Math.round(computedEstimate?.durationMinutes ?? estimate.durationMinutes)} min
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-green-600">Estimated Cost</p>
                  <p className="text-2xl font-bold text-green-800">{formatPrice(calculateCost())}</p>
                </div>
                {selectedService === 'bulk' && computedEstimate?.perTripEstimates?.length > 0 && (
                  <div className="text-[11px] text-green-700 mt-1">
                    {computedEstimate.tripCount} trips: {computedEstimate.perTripEstimates.slice(0,3).map((t) => `$${((t.cost || 0)).toFixed(0)}`).join(' + ')}
                    {computedEstimate.tripCount > 3 ? ' + …' : ''} = ${calculateCost().toFixed(0)}
                  </div>
                )}
              </div>
              <p className="text-xs text-green-600 mt-2">
                * Final fare calculated based on actual distance
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">💳 Payment Method</p>
              <p className="text-sm text-slate-700 capitalize">{formData.paymentMethod || 'Cash'}</p>
            </div>

            {/* Special Instructions */}
            {formData.specialInstructions && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">📝 Special Instructions</p>
                <p className="text-sm text-slate-700 bg-slate-150 rounded p-3">{formData.specialInstructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-200 rounded-b-xl">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              ← Go Back
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              loading={loading}
              className="flex-1"
            >
              ✓ Confirm & Book
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationModal;

