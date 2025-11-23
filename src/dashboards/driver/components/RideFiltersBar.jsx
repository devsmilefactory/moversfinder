/**
 * RideFiltersBar Component
 * 
 * Provides ride type and schedule type filters with pagination controls.
 * Uses dropdown menus like the user rides page.
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const RideFiltersBar = ({
  rideTypeFilter,
  scheduleFilter,
  onRideTypeChange,
  onScheduleChange,
  page,
  totalPages,
  onPageChange
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
    { value: 'INSTANT', label: 'Instant' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'RECURRING', label: 'Recurring' }
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3 overflow-x-auto mb-3">
        {/* Ride Type Dropdown */}
        <div className="flex-shrink-0">
          <select
            value={rideTypeFilter}
            onChange={(e) => onRideTypeChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {rideTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule Type Dropdown */}
        <div className="flex-shrink-0">
          <select
            value={scheduleFilter}
            onChange={(e) => onScheduleChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {scheduleTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(rideTypeFilter !== 'ALL' || scheduleFilter !== 'ALL') && (
          <button
            onClick={() => {
              onRideTypeChange('ALL');
              onScheduleChange('ALL');
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <span className="text-sm text-gray-600 font-medium">
            Page {page} of {totalPages}
          </span>
          
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RideFiltersBar;
