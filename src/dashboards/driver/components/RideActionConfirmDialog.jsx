import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

/**
 * RideActionConfirmDialog Component
 * 
 * Provides confirmation dialogs for ride actions like accept, decline, etc.
 * Handles different action types with appropriate messaging and options.
 */
const RideActionConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  action, // 'accept' | 'decline' | 'cancel_bid' | 'start' | 'complete'
  ride,
  loading = false
}) => {
  const [declineReason, setDeclineReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !action || !ride) return null;

  const getActionConfig = () => {
    switch (action) {
      case 'accept':
        return {
          title: 'Accept Ride Request',
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          message: `Are you sure you want to accept this ${ride.service_type} request?`,
          details: [
            `Pickup: ${ride.pickup_location}`,
            ride.dropoff_location && `Dropoff: ${ride.dropoff_location}`,
            ride.estimated_cost && `Estimated fare: $${ride.estimated_cost}`
          ].filter(Boolean),
          confirmText: 'Accept Ride',
          confirmVariant: 'success',
          cancelText: 'Cancel'
        };

      case 'decline':
        return {
          title: 'Decline Ride Request',
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          message: `Why are you declining this ${ride.service_type} request?`,
          details: [
            `Pickup: ${ride.pickup_location}`,
            ride.dropoff_location && `Dropoff: ${ride.dropoff_location}`
          ].filter(Boolean),
          confirmText: 'Decline Ride',
          confirmVariant: 'danger',
          cancelText: 'Cancel',
          showReasonSelect: true
        };

      case 'cancel_bid':
        return {
          title: 'Cancel Bid',
          icon: <AlertTriangle className="w-6 h-6 text-orange-600" />,
          message: 'Are you sure you want to cancel your bid for this ride?',
          details: [
            `Pickup: ${ride.pickup_location}`,
            ride.your_bid_amount && `Your bid: $${ride.your_bid_amount}`
          ].filter(Boolean),
          confirmText: 'Cancel Bid',
          confirmVariant: 'warning',
          cancelText: 'Keep Bid'
        };

      case 'start':
        return {
          title: 'Start Ride',
          icon: <CheckCircle className="w-6 h-6 text-blue-600" />,
          message: 'Confirm that you have arrived at the pickup location and are ready to start the ride.',
          details: [
            `Pickup: ${ride.pickup_location}`,
            ride.dropoff_location && `Dropoff: ${ride.dropoff_location}`
          ].filter(Boolean),
          confirmText: 'Start Ride',
          confirmVariant: 'primary',
          cancelText: 'Not Yet'
        };

      case 'complete':
        return {
          title: 'Complete Ride',
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          message: 'Confirm that you have completed the ride and the passenger has been dropped off.',
          details: [
            `Dropoff: ${ride.dropoff_location}`,
            ride.final_cost && `Final fare: $${ride.final_cost}`
          ].filter(Boolean),
          confirmText: 'Complete Ride',
          confirmVariant: 'success',
          cancelText: 'Not Yet'
        };

      default:
        return {
          title: 'Confirm Action',
          icon: <AlertTriangle className="w-6 h-6 text-gray-600" />,
          message: 'Are you sure you want to perform this action?',
          details: [],
          confirmText: 'Confirm',
          confirmVariant: 'primary',
          cancelText: 'Cancel'
        };
    }
  };

  const config = getActionConfig();

  const declineReasons = [
    'Too far away',
    'Not available at that time',
    'Vehicle not suitable',
    'Route not preferred',
    'Price too low',
    'Other'
  ];

  const handleConfirm = () => {
    let data = {};

    if (action === 'decline') {
      const reason = declineReason === 'Other' ? customReason : declineReason;
      data = { reason };
    }

    onConfirm(data);
  };

  const isConfirmDisabled = () => {
    if (loading) return true;
    
    if (action === 'decline') {
      if (!declineReason) return true;
      if (declineReason === 'Other' && !customReason.trim()) return true;
    }

    return false;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      size="md"
    >
      <div className="space-y-4">
        {/* Icon and Message */}
        <div className="flex items-start gap-3">
          {config.icon}
          <div className="flex-1">
            <p className="text-gray-900 mb-2">{config.message}</p>
            
            {/* Ride Details */}
            {config.details.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                {config.details.map((detail, index) => (
                  <p key={index} className="text-sm text-gray-600">{detail}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decline Reason Selection */}
        {config.showReasonSelect && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Reason for declining:
            </label>
            <div className="space-y-2">
              {declineReasons.map((reason) => (
                <label key={reason} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="declineReason"
                    value={reason}
                    checked={declineReason === reason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{reason}</span>
                </label>
              ))}
            </div>

            {/* Custom Reason Input */}
            {declineReason === 'Other' && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Please specify..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {config.cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
            loading={loading}
            className="flex-1"
          >
            {config.confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RideActionConfirmDialog;