import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatPrice } from '../../../utils/pricingCalculator';

const PlaceBidModal = ({ open, ride, onClose, onSubmit }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open && ride) {
      setBidAmount(ride.estimated_cost ? parseFloat(ride.estimated_cost).toFixed(2) : '');
      setError(null);
    }
  }, [open, ride]);

  if (!open || !ride) return null;

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
      // Modal will be closed by parent component on success
    } catch (err) {
      setError(err.message || 'Failed to place bid. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Place Your Bid" size="md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Ride Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">
                {ride.service_type === 'taxi' ? '🚕' : 
                 ride.service_type === 'courier' ? '📦' :
                 ride.service_type === 'school_run' ? '🎒' : '🛒'}
              </span>
              <span className="font-bold text-gray-900 capitalize">
                {ride.service_type?.replace('_', ' ')}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Pickup:</span>
                <p className="font-medium text-gray-900">{ride.pickup_address || ride.pickup_location}</p>
              </div>
              
              {ride.dropoff_address && (
                <div>
                  <span className="text-gray-500">Dropoff:</span>
                  <p className="font-medium text-gray-900">{ride.dropoff_address || ride.dropoff_location}</p>
                </div>
              )}
              
              {ride.estimated_cost && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Estimated Fare:</span>
                  <p className="font-bold text-green-700">{formatPrice(parseFloat(ride.estimated_cost))}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bid Amount Input */}
          <div>
            <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Your Bid Amount
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
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="0.00"
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Enter your competitive bid amount. The passenger will review all bids.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !!error || !bidAmount}
              loading={submitting}
            >
              {submitting ? 'Placing Bid...' : 'Place Bid'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default PlaceBidModal;
