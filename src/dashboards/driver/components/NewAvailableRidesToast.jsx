/**
 * NewAvailableRidesToast Component
 * 
 * Toast notification for new available rides in the driver's area.
 * Allows manual refresh without auto-reloading the list.
 */

import React from 'react';
import { RefreshCw, X } from 'lucide-react';

const NewAvailableRidesToast = ({ visible, onRefresh, onDismiss }) => {
  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 animate-slide-down">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[320px] max-w-md">
        <div className="flex-shrink-0">
          <span className="text-2xl">🔔</span>
        </div>
        
        <div className="flex-1">
          <p className="font-semibold text-sm">New Rides Available</p>
          <p className="text-xs text-blue-100">
            New rides are available in your area
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
            aria-label="Refresh to see new rides"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewAvailableRidesToast;
