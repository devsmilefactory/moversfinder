import React from 'react';
import { Filter, Car, Package, ShoppingBag, GraduationCap, Briefcase, Zap, Calendar, Repeat } from 'lucide-react';

/**
 * Filter bar for rides - allows filtering by service type and ride timing
 */
const RideFilterBar = ({ filters, onFilterChange }) => {
  const serviceTypes = [
    { value: 'all', label: 'All Categories', icon: Filter },
    { value: 'taxi', label: 'Taxi', icon: Car },
    { value: 'courier', label: 'Courier', icon: Package },
    { value: 'errand', label: 'Errand', icon: ShoppingBag },
    { value: 'school_run', label: 'School Run', icon: GraduationCap },
    { value: 'work_run', label: 'Work Run', icon: Briefcase }
  ];

  const rideTimings = [
    { value: 'all', label: 'All Types', icon: Filter },
    { value: 'instant', label: 'Instant', icon: Zap },
    { value: 'scheduled_single', label: 'Scheduled', icon: Calendar },
    { value: 'scheduled_recurring', label: 'Recurring', icon: Repeat }
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center gap-3 overflow-x-auto">
        {/* Service Type Filter */}
        <div className="flex-shrink-0">
          <select
            value={filters.serviceType || 'all'}
            onChange={(e) => onFilterChange({ ...filters, serviceType: e.target.value })}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {serviceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ride Timing Filter */}
        <div className="flex-shrink-0">
          <select
            value={filters.rideTiming || 'all'}
            onChange={(e) => onFilterChange({ ...filters, rideTiming: e.target.value })}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {rideTimings.map(timing => (
              <option key={timing.value} value={timing.value}>
                {timing.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters Indicator */}
        {(filters.serviceType !== 'all' || filters.rideTiming !== 'all') && (
          <button
            onClick={() => onFilterChange({ serviceType: 'all', rideTiming: 'all' })}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default RideFilterBar;

