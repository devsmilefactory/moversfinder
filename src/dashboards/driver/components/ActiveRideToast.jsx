/**
 * ActiveRideToast Component
 * 
 * Non-blocking toast notification for active instant rides.
 * Fixed at top of page but doesn't prevent interaction with content below.
 */

import React from 'react';
import { X, Eye } from 'lucide-react';

const ActiveRideToast = ({ ride, onView, onDismiss }) => {
  if (!ride) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 animate-slide-down">
      <div className="bg-green-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[320px] max-w-md">
        <div className="flex-shrink-0">
          <span className="text-2xl">🚗</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Active Trip in Progress</p>
          <p className="text-xs text-green-100 truncate">
            {ride.pickup_address || 'Ongoing trip'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-green-600 rounded-md text-sm font-medium hover:bg-green-50 transition-colors"
            aria-label="View active ride details"
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </button>
          
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-green-700 rounded transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveRideToast;
