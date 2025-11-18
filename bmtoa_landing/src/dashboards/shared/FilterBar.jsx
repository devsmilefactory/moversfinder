import React from 'react';

/**
 * Reusable Filter Bar Component for Admin Pages
 * 
 * Provides consistent filtering UI across all admin pages
 * Supports multiple filter types: select, search, date range
 */
const FilterBar = ({
  filters = [],
  searchConfig = null,
  onFilterChange,
  onSearchChange,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 ${className}`}>
      <div className="flex flex-col gap-4">
        {/* Search Input (if configured) */}
        {searchConfig && (
          <div className="flex-1">
            <input
              type="text"
              placeholder={searchConfig.placeholder || '🔍 Search...'}
              value={searchConfig.value || ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        )}

        {/* Filter Controls */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-4 items-center">
            {filters.map((filter) => (
              <div key={filter.key} className="flex-1 min-w-[200px]">
                {filter.type === 'select' && (
                  <select
                    value={filter.value || 'all'}
                    onChange={(e) => onFilterChange && onFilterChange(filter.key, e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="all">{filter.allLabel || `All ${filter.label}`}</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.icon && `${option.icon} `}
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={filter.value || ''}
                    onChange={(e) => onFilterChange && onFilterChange(filter.key, e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder={filter.label}
                  />
                )}

                {filter.type === 'dateRange' && (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filter.value?.start || ''}
                      onChange={(e) => onFilterChange && onFilterChange(filter.key, {
                        ...filter.value,
                        start: e.target.value
                      })}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={filter.value?.end || ''}
                      onChange={(e) => onFilterChange && onFilterChange(filter.key, {
                        ...filter.value,
                        end: e.target.value
                      })}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="End date"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
