/**
 * RouteDisplay Component
 * 
 * Displays pickup and dropoff locations with map pin icons.
 * Used for non-errand rides.
 */

import React from 'react';
import { MapPin } from 'lucide-react';

/**
 * RouteDisplay - Shows pickup and dropoff addresses
 * @param {Object} props
 * @param {string} props.pickupAddress - Pickup address
 * @param {string} props.dropoffAddress - Dropoff address
 * @param {Object} props.pickupCoordinates - Pickup coordinates (optional)
 * @param {Object} props.dropoffCoordinates - Dropoff coordinates (optional)
 * @param {boolean} props.compact - Use compact layout
 */
const RouteDisplay = ({
  pickupAddress,
  dropoffAddress,
  pickupCoordinates,
  dropoffCoordinates,
  compact = false
}) => {
  const containerClass = compact ? 'space-y-2' : 'space-y-3';
  const textSizeClass = compact ? 'text-xs' : 'text-sm';
  const labelSizeClass = compact ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className={containerClass}>
      {/* Pickup */}
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`${labelSizeClass} text-slate-500 uppercase tracking-wide`}>
            Pickup
          </p>
          <p className={`${textSizeClass} text-slate-800 font-medium`}>
            {pickupAddress || 'Address not provided'}
          </p>
        </div>
      </div>

      {/* Dropoff */}
      {dropoffAddress && (
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`${labelSizeClass} text-slate-500 uppercase tracking-wide`}>
              Dropoff
            </p>
            <p className={`${textSizeClass} text-slate-800 font-medium`}>
              {dropoffAddress}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteDisplay;
