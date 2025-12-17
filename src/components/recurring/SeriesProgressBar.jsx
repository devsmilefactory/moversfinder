import React from 'react';
import { getRideProgress } from '../../utils/rideProgressTracking';

/**
 * Series Progress Bar Component
 * 
 * Displays visual progress bar for recurring trip series
 * Shows completed vs total trips with percentage
 * 
 * @param {Object} series - Series object (preferred) or individual props
 * @param {number} totalTrips - Total number of trips in series (fallback)
 * @param {number} completedTrips - Number of completed trips (fallback)
 * @param {number} cancelledTrips - Number of cancelled trips (optional)
 * @param {boolean} showPercentage - Whether to show percentage (default: true)
 * @param {boolean} showCounts - Whether to show trip counts (default: true)
 * @param {string} size - Size variant: 'sm', 'md', 'lg' (default: 'md')
 */
const SeriesProgressBar = ({ 
  series,
  totalTrips, 
  completedTrips, 
  cancelledTrips = 0,
  showPercentage = true,
  showCounts = true,
  size = 'md'
}) => {
  // Use centralized progress tracking if series object provided
  const progress = series ? getRideProgress(series) : null;
  
  // Use centralized values or fallback to props
  const finalTotalTrips = progress?.total || totalTrips || 0;
  const finalCompletedTrips = progress?.completed || completedTrips || 0;
  const finalCancelledTrips = cancelledTrips; // Keep as prop for now
  const completedPercent = progress?.percentage || (finalTotalTrips > 0 
    ? Math.round((finalCompletedTrips / finalTotalTrips) * 100) 
    : 0);
  
  const cancelledPercent = finalTotalTrips > 0 
    ? Math.round((finalCancelledTrips / finalTotalTrips) * 100) 
    : 0;

  const tripsRemaining = progress?.remaining || (finalTotalTrips - finalCompletedTrips - finalCancelledTrips);

  // Size variants
  const sizeClasses = {
    sm: {
      bar: 'h-1.5',
      text: 'text-xs',
      gap: 'gap-1'
    },
    md: {
      bar: 'h-2',
      text: 'text-sm',
      gap: 'gap-2'
    },
    lg: {
      bar: 'h-3',
      text: 'text-base',
      gap: 'gap-2'
    }
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClass.bar} overflow-hidden`}>
        <div className="h-full flex">
          {/* Completed portion */}
          {completedPercent > 0 && (
            <div 
              className="bg-purple-600 transition-all duration-300"
              style={{ width: `${completedPercent}%` }}
              title={`${finalCompletedTrips} completed`}
            />
          )}
          {/* Cancelled portion */}
          {cancelledPercent > 0 && (
            <div 
              className="bg-red-400 transition-all duration-300"
              style={{ width: `${cancelledPercent}%` }}
              title={`${finalCancelledTrips} cancelled`}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      {(showCounts || showPercentage) && (
        <div className={`flex items-center justify-between mt-1 ${sizeClass.text} ${sizeClass.gap}`}>
          {showCounts && (
            <div className="flex items-center gap-3">
              <span className="text-gray-600">
                <span className="font-semibold text-purple-700">{finalCompletedTrips}</span>
                {' / '}
                <span className="font-semibold text-gray-900">{finalTotalTrips}</span>
                {' '}
                {progress?.label || 'trips'}
              </span>
              {finalCancelledTrips > 0 && (
                <span className="text-red-600 text-xs">
                  ({finalCancelledTrips} cancelled)
                </span>
              )}
            </div>
          )}
          
          {showPercentage && (
            <span className="font-semibold text-purple-700">
              {completedPercent}%
            </span>
          )}
        </div>
      )}

      {/* Trips Remaining */}
      {showCounts && tripsRemaining > 0 && (
        <p className={`${sizeClass.text} text-gray-600 mt-0.5`}>
          {tripsRemaining} trip{tripsRemaining !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  );
};

export default SeriesProgressBar;
