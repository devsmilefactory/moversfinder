import React from 'react';

/**
 * Series Progress Bar Component
 * 
 * Displays visual progress bar for recurring trip series
 * Shows completed vs total trips with percentage
 * 
 * @param {number} totalTrips - Total number of trips in series
 * @param {number} completedTrips - Number of completed trips
 * @param {number} cancelledTrips - Number of cancelled trips (optional)
 * @param {boolean} showPercentage - Whether to show percentage (default: true)
 * @param {boolean} showCounts - Whether to show trip counts (default: true)
 * @param {string} size - Size variant: 'sm', 'md', 'lg' (default: 'md')
 */
const SeriesProgressBar = ({ 
  totalTrips, 
  completedTrips, 
  cancelledTrips = 0,
  showPercentage = true,
  showCounts = true,
  size = 'md'
}) => {
  // Calculate percentages
  const completedPercent = totalTrips > 0 
    ? Math.round((completedTrips / totalTrips) * 100) 
    : 0;
  
  const cancelledPercent = totalTrips > 0 
    ? Math.round((cancelledTrips / totalTrips) * 100) 
    : 0;

  const tripsRemaining = totalTrips - completedTrips - cancelledTrips;

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
              title={`${completedTrips} completed`}
            />
          )}
          {/* Cancelled portion */}
          {cancelledPercent > 0 && (
            <div 
              className="bg-red-400 transition-all duration-300"
              style={{ width: `${cancelledPercent}%` }}
              title={`${cancelledTrips} cancelled`}
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
                <span className="font-semibold text-purple-700">{completedTrips}</span>
                {' / '}
                <span className="font-semibold text-gray-900">{totalTrips}</span>
                {' trips'}
              </span>
              {cancelledTrips > 0 && (
                <span className="text-red-600 text-xs">
                  ({cancelledTrips} cancelled)
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
