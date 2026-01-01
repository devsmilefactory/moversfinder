/**
 * RideFiltersBar Component
 * 
 * Provides ride type and schedule type filters with pagination controls.
 * Uses dropdown menus like the user rides page.
 */

import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
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

  // IMPORTANT (Instant-only phase): keep scheduling/recurring disabled unless feature flags enable them.
  const scheduleTypes = [
    { value: 'ALL', label: 'All Types' },
    { value: 'INSTANT', label: 'Instant' }
  ];
  if (FEATURE_FLAGS.SCHEDULED_RIDES_ENABLED) {
    scheduleTypes.push({ value: 'SCHEDULED', label: 'Scheduled' });
  }
  if (FEATURE_FLAGS.RECURRING_RIDES_ENABLED) {
    scheduleTypes.push({ value: 'RECURRING', label: 'Recurring' });
  }

  return (
    <div className="bg-white border-b border-gray-200 px-2 py-1">
      <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap scrollbar-hide">
        {/* Ride Type Dropdown */}
        <div className="flex-shrink-0 relative">
          <select
            value={rideTypeFilter}
            onChange={(e) => onRideTypeChange(e.target.value)}
            className="text-[11px] border border-gray-300 rounded-md pl-2 pr-7 py-0.5 bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 whitespace-nowrap h-7 appearance-none"
          >
            {rideTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        </div>

        {/* Schedule Type Dropdown */}
        <div className="flex-shrink-0 relative">
          <select
            value={scheduleFilter}
            onChange={(e) => onScheduleChange(e.target.value)}
            className="text-[11px] border border-gray-300 rounded-md pl-2 pr-7 py-0.5 bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 whitespace-nowrap h-7 appearance-none"
          >
            {scheduleTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        </div>

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

        {/* Push refresh to far right */}
        <div className="flex-1" />

        {/* Refresh Button (far right) */}
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
            aria-label="Refresh rides"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {hasNewRides && !isRefreshing && (
              <span className="absolute top-0.5 right-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
            )}
          </button>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
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
