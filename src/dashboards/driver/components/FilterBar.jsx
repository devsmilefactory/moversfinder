import React from 'react';

/**
 * FilterBar Component
 * 
 * Provides ride timing filters within each tab of the Driver Rides Hub.
 * Allows drivers to filter rides by: All, Instant, Scheduled, or Recurring.
 * 
 * Features:
 * - Horizontal scrollable on mobile
 * - Active filter highlighting
 * - Optional count badges for each filter
 * - Smooth transitions
 * - Accessible keyboard navigation
 */
const FilterBar = ({ activeFilter = 'all', onFilterChange, counts }) => {
  const filters = [
    { 
      id: 'all', 
      label: 'All', 
      icon: '🔍',
      color: 'gray'
    },
    { 
      id: 'instant', 
      label: 'Instant', 
      icon: '⚡',
      color: 'blue'
    },
    { 
      id: 'scheduled', 
      label: 'Scheduled', 
      icon: '📅',
      color: 'purple'
    },
    { 
      id: 'recurring', 
      label: 'Recurring', 
      icon: '🔄',
      color: 'green'
    }
  ];

  const getButtonClasses = (filter) => {
    const isActive = activeFilter === filter.id;
    const baseClasses = 'flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap';
    
    if (isActive) {
      const activeColors = {
        gray: 'bg-gray-600 text-white shadow-md',
        blue: 'bg-blue-600 text-white shadow-md',
        purple: 'bg-purple-600 text-white shadow-md',
        green: 'bg-green-600 text-white shadow-md'
      };
      return `${baseClasses} ${activeColors[filter.color]}`;
    }
    
    const inactiveColors = {
      gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
      green: 'bg-green-50 text-green-700 hover:bg-green-100'
    };
    return `${baseClasses} ${inactiveColors[filter.color]}`;
  };

  const getCount = (filterId) => {
    if (!counts) return null;
    return counts[filterId];
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {filters.map((filter) => {
          const count = getCount(filter.id);
          const showCount = count !== null && count !== undefined;
          
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={getButtonClasses(filter)}
              aria-label={`Filter by ${filter.label}`}
              aria-pressed={activeFilter === filter.id}
            >
              <span className="text-base" aria-hidden="true">{filter.icon}</span>
              <span>{filter.label}</span>
              {showCount && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeFilter === filter.id 
                    ? 'bg-white bg-opacity-30' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;
