/**
 * ScheduledAlertToast Component
 * 
 * Toast notification for upcoming scheduled/recurring rides.
 * Shows count and allows viewing/activating each ride.
 */

import React, { useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';

const ScheduledAlertToast = ({ rides, onViewAndActivate, onDismiss }) => {
  if (!rides || rides.length === 0) return null;

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-slide-down">
      <div className="bg-purple-600 text-white rounded-lg shadow-lg px-4 py-3 min-w-[320px] max-w-md">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <p className="font-semibold text-sm">
              {rides.length} Upcoming Trip{rides.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-purple-700 rounded transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-2">
          {rides.map((ride) => (
            <div 
              key={ride.id}
              className="bg-purple-700 bg-opacity-50 rounded p-2 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {ride.pickup_address || 'Scheduled trip'}
                </p>
                <div className="flex items-center gap-1 text-xs text-purple-200 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(ride.start_time)}</span>
                </div>
              </div>
              
              <button
                onClick={() => onViewAndActivate(ride)}
                className="ml-2 px-3 py-1 bg-white text-purple-600 rounded text-xs font-medium hover:bg-purple-50 transition-colors whitespace-nowrap"
              >
                View & Activate
              </button>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-purple-200 mt-2">
          Auto-dismisses in 30 seconds
        </p>
      </div>
    </div>
  );
};

export default ScheduledAlertToast;
