/**
 * CardActions Component
 * 
 * Renders role and status-specific call-to-action buttons.
 * Handles driver actions (Place Bid, Start Trip, Complete Trip) and
 * passenger actions (Cancel, Rebook, Rate Driver, etc.)
 */

import React from 'react';
import { 
  DollarSign, 
  Play, 
  CheckCircle, 
  X, 
  RotateCcw, 
  Star, 
  Trash2,
  Calendar
} from 'lucide-react';

/**
 * Card actions component for role-specific CTAs
 * @param {Object} props - Component props
 * @param {Object} props.ride - Ride object
 * @param {'driver'|'passenger'} props.role - User role
 * @param {string} props.context - Context (available, my_bids, in_progress, etc.)
 * @param {Function} props.onAction - Action handler function
 * @param {boolean} props.disabled - Whether actions are disabled
 */
export default function CardActions({
  ride,
  role = 'passenger',
  context,
  onAction,
  disabled = false
}) {
  if (!ride || !onAction) return null;

  const handleAction = (actionType) => {
    if (disabled) return;
    onAction(actionType, ride);
  };

  // Base button classes
  const baseButtonClasses = 'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Button variants
  const buttonVariants = {
    primary: `${baseButtonClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed`,
    secondary: `${baseButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed`,
    success: `${baseButtonClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed`,
    danger: `${baseButtonClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed`,
    warning: `${baseButtonClasses} bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed`
  };

  // Driver actions
  if (role === 'driver') {
    switch (context) {
      case 'available':
      case 'AVAILABLE':
        return (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleAction('place_bid')}
              disabled={disabled}
              className={buttonVariants.primary}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Place Bid
            </button>
          </div>
        );

      case 'my_bids':
      case 'BID':
        // Show bid status without action button
        return (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Bid Status:</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-sm font-medium text-yellow-700">Pending</span>
                {ride.bid_amount && (
                  <span className="text-sm font-medium text-gray-900">
                    {typeof ride.bid_amount === 'number' ? `$${ride.bid_amount.toFixed(2)}` : ride.bid_amount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      case 'in_progress':
      case 'ACTIVE':
      case 'active':
        // Determine CTA based on execution sub-state
        const subState = (ride.execution_sub_state || ride.ride_status || '').toLowerCase();
        
        // If it's just accepted but no execution sub-state yet, show "Start Trip"
        if (subState === 'accepted' || subState === 'driver_on_the_way' || subState === 'driver_on_way' || subState === 'driver_arrived' || subState === 'driver_en_route') {
          return (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleAction('start_trip')}
                disabled={disabled}
                className={buttonVariants.primary}
              >
                <Play className="h-4 w-4 mr-2" />
                {subState === 'accepted' ? 'Start Trip' : 'Continue Trip'}
              </button>
            </div>
          );
        }
        
        if (subState === 'trip_started' || subState === 'in_progress') {
          return (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleAction('start_trip')}
                disabled={disabled}
                className={buttonVariants.success}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Manage Trip
              </button>
            </div>
          );
        }
        
        return (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleAction('start_trip')}
              disabled={disabled}
              className={buttonVariants.primary}
            >
              <Play className="h-4 w-4 mr-2" />
              View Active Trip
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  // Passenger actions
  if (role === 'passenger') {
    switch (context) {
      case 'pending':
        return (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleAction('cancel')}
              disabled={disabled}
              className={buttonVariants.danger}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </div>
        );

      case 'active':
        // Show driver info, no action buttons
        return (
          <div className="mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Driver Info</span>
                {ride.driver_name && (
                  <span className="text-sm text-blue-700">{ride.driver_name}</span>
                )}
              </div>
              {ride.driver_phone && (
                <div className="mt-1">
                  <span className="text-xs text-blue-600">{ride.driver_phone}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => handleAction('rebook')}
              disabled={disabled}
              className={buttonVariants.secondary}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rebook
            </button>
            <button
              onClick={() => handleAction('rate_driver')}
              disabled={disabled}
              className={buttonVariants.primary}
            >
              <Star className="h-4 w-4 mr-2" />
              Rate Driver
            </button>
          </div>
        );

      case 'cancelled':
        return (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleAction('rebook')}
              disabled={disabled}
              className={buttonVariants.primary}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rebook
            </button>
          </div>
        );

      case 'saved':
        return (
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => handleAction('delete')}
              disabled={disabled}
              className={buttonVariants.danger}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
            <button
              onClick={() => handleAction('book_again')}
              disabled={disabled}
              className={buttonVariants.primary}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Book Again
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  return null;
}
