/**
 * RideFiltersBar Component
 * 
 * Provides ride type and schedule type filters with pagination controls.
 * Uses dropdown menus like the user rides page.
 * Respects feature flags - only shows enabled ride timing options
 */

import React from 'react';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { FEATURE_FLAGS } from '../../../config/featureFlags';

const RideFiltersBar = ({
  rideTypeFilter,
  scheduleFilter,
  onRideTypeChange,
  onScheduleChange,
  page,
  totalPages,
  onPageChange,
  onRefresh,
  isRefreshing = false,
  hasNewRides = false
}) => {
  const rideTypes = [
    { value: 'ALL', label: 'All Categories' },
    { value: 'TAXI', label: 'Taxi' },
    { value: 'COURIER', label: 'Courier' },
    { value: 'ERRANDS', label: 'Errands' },
    { value: 'SCHOOL_RUN', label: 'School/Work Run' }
  ];

  const scheduleTypes = [
    { value: 'ALL', label: 'All Types' },
    { value: 'INSTANT', label: 'Instant' }
  ];
  
  // Only add scheduled/recurring if feature flags are enabled
  if (FEATURE_FLAGS.SCHEDULED_RIDES_ENABLED) {
    scheduleTypes.push({ value: 'SCHEDULED', label: 'Scheduled' });
  }
  if (FEATURE_FLAGS.RECURRING_RIDES_ENABLED) {
    scheduleTypes.push({ value: 'RECURRING', label: 'Recurring' });
  }

  return (
    <div className="bg-white border-b border-gray-200 px-2 py-1">
      <div className="flex items-center gap-1.5 overflow-x-auto mb-1 flex-nowrap scrollbar-hide">
        {/* Ride Type Dropdown */}
        <div className="flex-shrink-0 min-w-[120px]">
          <select
            value={rideTypeFilter}
            onChange={(e) => onRideTypeChange(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 whitespace-nowrap"
          >
            {rideTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule Type Dropdown */}
        <div className="flex-shrink-0 min-w-[120px]">
          <select
            value={scheduleFilter}
            onChange={(e) => onScheduleChange(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 whitespace-nowrap"
          >
            {scheduleTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`relative flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full border transition-colors ${
              hasNewRides
                ? 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100'
                : 'border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-slate-900 hover:bg-yellow-50'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            title={hasNewRides ? 'New rides available - refresh to load' : 'Refresh rides'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {hasNewRides && !isRefreshing && (
              <span className="absolute top-0.5 right-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
            )}
          </button>
        )}

        {/* Clear Filters Button */}
        {(rideTypeFilter !== 'ALL' || scheduleFilter !== 'ALL') && (
          <button
            onClick={() => {
              onRideTypeChange('ALL');
              onScheduleChange('ALL');
            }}
            className="flex-shrink-0 text-[10px] text-yellow-600 hover:text-yellow-700 font-medium whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-0.5 border-t border-gray-100">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>Prev</span>
          </button>
          
          <span className="text-xs text-gray-600 font-medium">
            {page}/{totalPages}
          </span>
          
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RideFiltersBar;
