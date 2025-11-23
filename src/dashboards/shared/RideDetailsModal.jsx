import React from 'react';
import Button from '../shared/Button';

/**
 * Reusable Ride Details Modal
 * 
 * Used across:
 * - Individual Dashboard (upcoming rides)
 * - My Rides page (ride history)
 * - Corporate Dashboard (employee rides)
 * 
 * Features:
 * - Display full ride information
 * - Customizable action buttons
 * - Service-specific details
 * - Status-based UI
 */

const RideDetailsModal = ({ 
  isOpen, 
  onClose, 
  ride,
  actions = [] // Array of { label, onClick, variant, icon }
}) => {
  if (!isOpen || !ride) return null;

  // Service type icons
  const serviceIcons = {
    taxi: '🚕',
    courier: '📦',
    school_run: '🎒',
    errands: '🛍️',
  };

  // Status colors
  const statusColors = {
    // Canonical ride_status values
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-blue-100 text-blue-800',
    driver_on_way: 'bg-purple-100 text-purple-800',
    driver_arrived: 'bg-indigo-100 text-indigo-800',
    trip_started: 'bg-green-100 text-green-800',
    trip_completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    // Legacy values (kept for backward compatibility in UI-only data)
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    scheduled: 'bg-indigo-100 text-indigo-800',
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format schedule type
  const formatScheduleType = () => {
    switch (ride.scheduleType) {
      case 'instant':
        return 'Instant Booking';
      case 'specific_dates':
        return `Specific Dates (${ride.selectedDates?.length || 0} dates)`;
      case 'weekdays':
        return `Weekdays in ${ride.scheduleMonth}`;
      case 'weekends':
        return `Weekends in ${ride.scheduleMonth}`;
      default:
        return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{serviceIcons[ride.serviceType]}</div>
            <div>
              <h3 className="text-xl font-bold text-slate-700">Ride Details</h3>
              <p className="text-sm text-slate-500">ID: {ride.id}</p>
            </div>
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

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Status</label>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[ride.ride_status || ride.status]}`}>
              {(ride.ride_status || ride.status).replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Location Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Pickup Location</label>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-1">📍</span>
                <p className="text-slate-700">{ride.pickupLocation || 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Drop-off Location</label>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-1">📍</span>
                <p className="text-slate-700">{ride.dropoffLocation || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Additional Stops */}
          {ride.additionalStops && ride.additionalStops.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Additional Stops</label>
              <div className="space-y-2">
                {ride.additionalStops.map((stop, index) => (
                  <div key={index} className="flex items-start gap-2 pl-4">
                    <span className="text-blue-500 mt-1">📍</span>
                    <p className="text-slate-700">{stop}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Schedule Type</label>
              <p className="text-slate-700">{formatScheduleType()}</p>
            </div>
            {ride.scheduledFor && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Scheduled For</label>
                <p className="text-slate-700">{formatDate(ride.scheduledFor)}</p>
              </div>
            )}
          </div>

          {/* Service-Specific Details */}
          {ride.serviceType === 'taxi' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Passengers</label>
              <p className="text-slate-700">{ride.passengers || 1}</p>
            </div>
          )}

          {ride.serviceType === 'courier' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Recipient Name</label>
                <p className="text-slate-700">{ride.recipientName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Recipient Phone</label>
                <p className="text-slate-700">{ride.recipientPhone || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-2">Package Details</label>
                <p className="text-slate-700">{ride.packageDetails || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Package Size</label>
                <p className="text-slate-700 capitalize">{ride.packageSize || 'N/A'}</p>
              </div>
            </div>
          )}

          {ride.serviceType === 'school_run' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Passenger Name</label>
                <p className="text-slate-700">{ride.passengerName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Contact Number</label>
                <p className="text-slate-700">{ride.contactNumber || 'N/A'}</p>
              </div>
            </div>
          )}

          {ride.serviceType === 'errands' && ride.tasks && ride.tasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Tasks</label>
              <div className="space-y-3">
                {ride.tasks.map((task, index) => (
                  <div key={index} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                      <span>📍 {task.startPoint || 'N/A'}</span>
                      <span>→</span>
                      <span>{task.destinationPoint || 'N/A'}</span>
                    </div>
                    <p className="text-sm text-slate-700">{task.description}</p>
                    {task.startTime && (
                      <p className="text-xs text-slate-500 mt-1">Time: {task.startTime}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Payment Method</label>
              <p className="text-slate-700 capitalize">{ride.paymentMethod || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Payment Status</label>
              <p className="text-slate-700 capitalize">{ride.paymentStatus || 'N/A'}</p>
            </div>
          </div>

          {/* Cost Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Estimated Cost</label>
              <p className="text-2xl font-bold text-slate-700">${ride.estimatedCost?.toFixed(2) || '0.00'}</p>
            </div>
            {ride.actualCost && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Actual Cost</label>
                <p className="text-2xl font-bold text-green-600">${ride.actualCost.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Special Instructions */}
          {ride.specialInstructions && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Special Instructions</label>
              <p className="text-slate-700 bg-slate-50 rounded-lg p-3">{ride.specialInstructions}</p>
            </div>
          )}

          {/* Driver Information */}
          {ride.driverName && (
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-blue-900 mb-2">Driver Information</label>
              <p className="text-blue-800 font-medium">{ride.driverName}</p>
              {ride.vehicleInfo && (
                <p className="text-sm text-blue-700 mt-1">{ride.vehicleInfo}</p>
              )}
            </div>
          )}

          {/* Rating */}
          {ride.rating && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Your Rating</label>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < ride.rating ? 'text-yellow-400' : 'text-slate-300'}>
                    ⭐
                  </span>
                ))}
              </div>
              {ride.feedback && (
                <p className="text-sm text-slate-600 mt-2">{ride.feedback}</p>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Created At</label>
              <p className="text-slate-600">{formatDate(ride.createdAt)}</p>
            </div>
            {ride.completedAt && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Completed At</label>
                <p className="text-slate-600">{formatDate(ride.completedAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Action Buttons */}
        {actions.length > 0 && (
          <div className="p-6 border-t border-slate-200 flex gap-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                className="flex-1"
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RideDetailsModal;

