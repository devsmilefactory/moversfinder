import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import Button from '../../../components/ui/Button';

/**
 * FilterControls Component
 * 
 * Provides filtering controls for ride requests including
 * service type, status, price range, distance, and time filters.
 */
const FilterControls = ({
  filters,
  filterStats,
  hasActiveFilters,
  quickFilters,
  onUpdateFilter,
  onUpdateFilters,
  onApplyQuickFilter,
  onResetFilters,
  disabled = false
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const serviceTypes = [
    { value: 'all', label: 'All Services', icon: '🚗' },
    { value: 'taxi', label: 'Taxi', icon: '🚕' },
    { value: 'courier', label: 'Courier', icon: '📦' },
    { value: 'errands', label: 'Errands', icon: '🛍️' },
    { value: 'school_run', label: 'School Run', icon: '🎒' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'next_hour', label: 'Next Hour' },
    { value: 'next_4_hours', label: 'Next 4 Hours' },
    { value: 'today', label: 'Today' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const quickFilterOptions = [
    { key: 'all', label: 'All Rides', icon: '🚗' },
    { key: 'available', label: 'Available', icon: '🟢' },
    { key: 'nearby', label: 'Nearby', icon: '📍' },
    { key: 'highValue', label: 'High Value', icon: '💰' },
    { key: 'urgent', label: 'Urgent', icon: '⚡' }
  ];

  const handlePriceRangeChange = (type, value) => {
    const newRange = { ...filters.priceRange };
    newRange[type] = parseInt(value) || 0;
    onUpdateFilter('priceRange', newRange);
  };

  const handleDistanceRangeChange = (type, value) => {
    const newRange = { ...filters.distance };
    newRange[type] = parseInt(value) || 0;
    onUpdateFilter('distance', newRange);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Quick Filters Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
          </div>
          
          {quickFilterOptions.map((option) => (
            <Button
              key={option.key}
              variant={filters.serviceType === option.key || 
                      (option.key === 'available' && filters.status === 'pending') ||
                      (option.key === 'nearby' && filters.showOnlyNearby) ||
                      (option.key === 'highValue' && filters.priceRange.min >= 50) ||
                      (option.key === 'urgent' && filters.timeRange === 'next_hour')
                      ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onApplyQuickFilter(option.key)}
              disabled={disabled}
              className="flex items-center gap-1"
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </Button>
          ))}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              disabled={disabled}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <X className="w-3 h-3" />
              <span>Clear All</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            disabled={disabled}
            className="flex items-center gap-1 ml-auto"
          >
            <span>Advanced</span>
            {showFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Service Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <select
                value={filters.serviceType}
                onChange={(e) => onUpdateFilter('serviceType', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {serviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => onUpdateFilter('status', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => onUpdateFilter('timeRange', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeRangeOptions.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onUpdateFilter('sortBy', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Created Time</option>
                <option value="pickup_time">Pickup Time</option>
                <option value="price">Price</option>
                <option value="distance">Distance</option>
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range (${filters.priceRange.min} - ${filters.priceRange.max})
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={filters.priceRange.min}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  disabled={disabled}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">Min: ${filters.priceRange.min}</div>
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={filters.priceRange.max}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  disabled={disabled}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">Max: ${filters.priceRange.max}</div>
              </div>
            </div>
          </div>

          {/* Distance Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distance Range ({filters.distance.min}km - {filters.distance.max}km)
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={filters.distance.min}
                  onChange={(e) => handleDistanceRangeChange('min', e.target.value)}
                  disabled={disabled}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">Min: {filters.distance.min}km</div>
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={filters.distance.max}
                  onChange={(e) => handleDistanceRangeChange('max', e.target.value)}
                  disabled={disabled}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">Max: {filters.distance.max}km</div>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.showOnlyBiddable}
                onChange={(e) => onUpdateFilter('showOnlyBiddable', e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Only biddable rides</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.showOnlyNearby}
                onChange={(e) => onUpdateFilter('showOnlyNearby', e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Only nearby rides</span>
            </label>
          </div>

          {/* Filter Stats */}
          {filterStats && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filterStats.filtered} of {filterStats.total} rides
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onResetFilters}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterControls;