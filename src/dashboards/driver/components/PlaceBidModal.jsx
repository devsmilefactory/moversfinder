import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatPrice } from '../../../utils/pricingCalculator';
import { normalizeServiceType } from '../../../utils/serviceTypes';
import { summarizeErrandTasks } from '../../../utils/errandTasks';
import { getRideCostDisplay } from '../../../utils/rideCostDisplay';

const PlaceBidModal = ({ open, ride, onClose, onSubmit }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isRecurring = ride?.is_series || ride?.ride_timing === 'scheduled_recurring';
  const isErrand = ride?.service_type === 'errands';
  const isCourier = ride?.service_type === 'courier';
  
  // Use centralized cost display utility
  const costDisplay = getRideCostDisplay(ride);
  const perTripCost = costDisplay.perTrip || costDisplay.total || 0;
  const totalPrice = costDisplay.total || 0;

  useEffect(() => {
    if (open && ride) {
      setBidAmount(perTripCost ? perTripCost.toFixed(2) : '');
      setError(null);
    }
  }, [open, ride, perTripCost]);

  if (!open || !ride) return null;

  const normalizedServiceType = normalizeServiceType(ride.service_type || 'taxi');
  const errandSummary = isErrand ? summarizeErrandTasks(ride.errand_tasks) : null;

  const getServiceIcon = () => {
    switch (normalizedServiceType) {
      case 'taxi': return '🚗';
      case 'courier': return '📦';
      case 'school_run': return '🚌';
      case 'errands': return '🛒';
      default: return '🚗';
    }
  };

  const validateBidAmount = (value) => {
    const amount = parseFloat(value);
    if (isNaN(amount)) return 'Please enter a valid amount';
    if (amount < 1) return 'Minimum bid is $1.00';
    if (amount > 9999.99) return 'Maximum bid is $9999.99';
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return 'Please use up to 2 decimal places';
    return null;
  };

  const handleBidChange = (e) => {
    const value = e.target.value;
    setBidAmount(value);
    setError(validateBidAmount(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateBidAmount(bidAmount);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(parseFloat(bidAmount));
    } catch (err) {
      setError(err.message || 'Failed to place bid. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Place Your Bid" size="md">
      <div className="flex flex-col h-full max-h-[70vh]">
        {/* Scrollable Details Section */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Service Type Header */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-3xl">{getServiceIcon()}</span>
            <div>
              <p className="font-bold text-gray-900 capitalize text-lg">
                {(normalizedServiceType || '').replace('_', ' ')}
              </p>
              {isRecurring && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  Recurring Series
                </span>
              )}
            </div>
          </div>

          {/* Route Information */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Route</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <p className="text-xs text-gray-500">Pickup</p>
                  <p className="text-sm font-medium text-gray-900">{ride.pickup_address || 'Not specified'}</p>
                </div>
              </div>
              {ride.dropoff_address && (
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs text-gray-500">Dropoff</p>
                    <p className="text-sm font-medium text-gray-900">{ride.dropoff_address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Distance Info */}
          {ride.distance_km && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Total Distance</span>
              <span className="font-semibold text-blue-900">{parseFloat(ride.distance_km).toFixed(1)} km</span>
            </div>
          )}

          {/* Errand Tasks Breakdown */}
          {isErrand && errandSummary && errandSummary.allTasks && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">
                Tasks ({errandSummary.total})
              </p>
              <div className="space-y-2">
                {errandSummary.allTasks.map((task, idx) => (
                  <div key={task.id || idx} className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-sm font-medium text-gray-900">
                      {idx + 1}. {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courier Package Details */}
          {isCourier && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Package Details</p>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm font-medium text-gray-900">
                  {ride.courier_package_details || 'Package delivery'}
                </p>
                {ride.package_size && (
                  <p className="text-xs text-gray-600 mt-1">Size: {ride.package_size}</p>
                )}
              </div>
            </div>
          )}

          {/* Recurring Series Info */}
          {isRecurring && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Series Details</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <p className="text-xs text-purple-600">Per Trip</p>
                  <p className="text-lg font-bold text-purple-900">{formatPrice(perTripCost)}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <p className="text-xs text-purple-600">Total Trips</p>
                  <p className="text-lg font-bold text-purple-900">{totalTrips}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <p className="text-xs text-purple-600">Total Price</p>
                  <p className="text-lg font-bold text-purple-900">{formatPrice(totalPrice)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {(ride.special_requests || ride.special_instructions) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Special Instructions</p>
              <p className="text-sm text-gray-700 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                {ride.special_requests || ride.special_instructions}
              </p>
            </div>
          )}

          {/* Scheduled Time */}
          {ride.scheduled_datetime && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Scheduled For</span>
              <span className="font-semibold text-blue-900">
                {new Date(ride.scheduled_datetime).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Fixed Bottom - Price Summary & Bid Input */}
        <div className="border-t border-gray-200 pt-4 space-y-4 bg-white">
          {/* Price Summary */}
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-green-700">
              {isRecurring ? 'Total Series Price' : 'Estimated Fare'}
            </span>
            <span className="text-xl font-bold text-green-700">
              {formatPrice(totalPrice)}
            </span>
          </div>

          {/* Bid Input */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">
                Your Bid {isRecurring && '(per trip)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  id="bidAmount"
                  type="text"
                  value={bidAmount}
                  onChange={handleBidChange}
                  disabled={submitting}
                  className={`w-full pl-8 pr-4 py-3 text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 ${
                    error 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || !!error || !bidAmount}
                  loading={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Placing...' : 'Place Bid'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default PlaceBidModal;
