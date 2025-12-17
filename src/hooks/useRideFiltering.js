import { useState, useCallback, useMemo } from 'react';
import { isWithinInterval, parseISO, addHours, subHours } from 'date-fns';

/**
 * useRideFiltering Hook
 * Manages filtering logic for ride requests
 */
const useRideFiltering = ({
  rides = [],
  initialFilters = {}
} = {}) => {
  // Filter state
  const [filters, setFilters] = useState({
    serviceType: 'all',
    status: 'all',
    priceRange: { min: 0, max: 1000 },
    distance: { min: 0, max: 50 },
    timeRange: 'all', // 'all', 'next_hour', 'next_4_hours', 'today', 'custom'
    customTimeRange: { start: null, end: null },
    location: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    showOnlyBiddable: false,
    showOnlyNearby: false,
    maxDistance: 10, // km
    ...initialFilters
  });
  
  // Quick filter presets
  const quickFilters = {
    all: { status: 'all', serviceType: 'all', timeRange: 'all' },
    available: { status: 'pending', serviceType: 'all', timeRange: 'all' },
    taxi: { status: 'all', serviceType: 'taxi', timeRange: 'all' },
    courier: { status: 'all', serviceType: 'courier', timeRange: 'all' },
    errands: { status: 'all', serviceType: 'errands', timeRange: 'all' },
    nearby: { status: 'all', serviceType: 'all', showOnlyNearby: true },
    highValue: { status: 'all', serviceType: 'all', priceRange: { min: 50, max: 1000 } },
    urgent: { status: 'pending', timeRange: 'next_hour' }
  };
  
  // Update a single filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Update multiple filters at once
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  // Apply a quick filter preset
  const applyQuickFilter = useCallback((presetName) => {
    const preset = quickFilters[presetName];
    if (preset) {
      updateFilters(preset);
    }
  }, [updateFilters]);
  
  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      serviceType: 'all',
      status: 'all',
      priceRange: { min: 0, max: 1000 },
      distance: { min: 0, max: 50 },
      timeRange: 'all',
      customTimeRange: { start: null, end: null },
      location: '',
      sortBy: 'created_at',
      sortOrder: 'desc',
      showOnlyBiddable: false,
      showOnlyNearby: false,
      maxDistance: 10
    });
  }, []);
  
  // Check if a ride matches the time range filter
  const matchesTimeRange = useCallback((ride, timeRange, customRange) => {
    if (timeRange === 'all') return true;
    
    const rideTime = parseISO(ride.pickup_time || ride.created_at);
    const now = new Date();
    
    switch (timeRange) {
      case 'next_hour':
        return isWithinInterval(rideTime, { start: now, end: addHours(now, 1) });
      case 'next_4_hours':
        return isWithinInterval(rideTime, { start: now, end: addHours(now, 4) });
      case 'today':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return isWithinInterval(rideTime, { start: startOfDay, end: endOfDay });
      case 'custom':
        if (customRange.start && customRange.end) {
          return isWithinInterval(rideTime, {
            start: parseISO(customRange.start),
            end: parseISO(customRange.end)
          });
        }
        return true;
      default:
        return true;
    }
  }, []);
  
  // Check if a ride matches location filter
  const matchesLocation = useCallback((ride, locationFilter) => {
    if (!locationFilter) return true;
    
    const searchTerm = locationFilter.toLowerCase();
    const pickup = (ride.pickup_location || '').toLowerCase();
    const dropoff = (ride.dropoff_location || '').toLowerCase();
    
    return pickup.includes(searchTerm) || dropoff.includes(searchTerm);
  }, []);
  
  // Calculate distance between two points (simplified)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);
  
  // Check if a ride is nearby (requires driver location)
  const isRideNearby = useCallback((ride, driverLocation, maxDistance) => {
    if (!driverLocation || !ride.pickup_coordinates) return true;
    
    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      ride.pickup_coordinates.lat,
      ride.pickup_coordinates.lng
    );
    
    return distance <= maxDistance;
  }, [calculateDistance]);
  
  // Filter rides based on current filters
  const filteredRides = useMemo(() => {
    let filtered = [...rides];
    
    // Service type filter
    if (filters.serviceType !== 'all') {
      filtered = filtered.filter(ride => ride.service_type === filters.serviceType);
    }
    
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(ride => ride.status === filters.status);
    }
    
    // Price range filter
    filtered = filtered.filter(ride => {
      const price = ride.estimated_cost || ride.final_cost || 0;
      return price >= filters.priceRange.min && price <= filters.priceRange.max;
    });
    
    // Distance filter
    filtered = filtered.filter(ride => {
      const distance = ride.distance_km || 0;
      return distance >= filters.distance.min && distance <= filters.distance.max;
    });
    
    // Time range filter
    filtered = filtered.filter(ride => 
      matchesTimeRange(ride, filters.timeRange, filters.customTimeRange)
    );
    
    // Location filter
    if (filters.location) {
      filtered = filtered.filter(ride => matchesLocation(ride, filters.location));
    }
    
    // Biddable only filter
    if (filters.showOnlyBiddable) {
      filtered = filtered.filter(ride => 
        ride.allows_bidding && ride.status === 'pending'
      );
    }
    
    // Nearby only filter (requires driver location)
    if (filters.showOnlyNearby) {
      // This would need driver location from context or props
      // For now, we'll skip this filter if no location is available
    }
    
    // Sort rides
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'pickup_time':
          aValue = new Date(a.pickup_time || a.created_at);
          bValue = new Date(b.pickup_time || b.created_at);
          break;
        case 'price':
          aValue = a.estimated_cost || a.final_cost || 0;
          bValue = b.estimated_cost || b.final_cost || 0;
          break;
        case 'distance':
          aValue = a.distance_km || 0;
          bValue = b.distance_km || 0;
          break;
        default:
          aValue = a[filters.sortBy] || 0;
          bValue = b[filters.sortBy] || 0;
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [rides, filters, matchesTimeRange, matchesLocation]);
  
  // Get filter statistics
  const filterStats = useMemo(() => {
    const stats = {
      total: rides.length,
      filtered: filteredRides.length,
      byServiceType: {},
      byStatus: {},
      priceRange: { min: 0, max: 0, avg: 0 },
      distanceRange: { min: 0, max: 0, avg: 0 }
    };
    
    // Calculate service type distribution
    rides.forEach(ride => {
      const serviceType = ride.service_type || 'unknown';
      stats.byServiceType[serviceType] = (stats.byServiceType[serviceType] || 0) + 1;
    });
    
    // Calculate status distribution
    rides.forEach(ride => {
      const status = ride.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });
    
    // Calculate price statistics
    const prices = rides.map(ride => ride.estimated_cost || ride.final_cost || 0).filter(p => p > 0);
    if (prices.length > 0) {
      stats.priceRange.min = Math.min(...prices);
      stats.priceRange.max = Math.max(...prices);
      stats.priceRange.avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
    
    // Calculate distance statistics
    const distances = rides.map(ride => ride.distance_km || 0).filter(d => d > 0);
    if (distances.length > 0) {
      stats.distanceRange.min = Math.min(...distances);
      stats.distanceRange.max = Math.max(...distances);
      stats.distanceRange.avg = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
    }
    
    return stats;
  }, [rides, filteredRides]);
  
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.serviceType !== 'all' ||
      filters.status !== 'all' ||
      filters.priceRange.min > 0 ||
      filters.priceRange.max < 1000 ||
      filters.distance.min > 0 ||
      filters.distance.max < 50 ||
      filters.timeRange !== 'all' ||
      filters.location !== '' ||
      filters.showOnlyBiddable ||
      filters.showOnlyNearby
    );
  }, [filters]);
  
  return {
    // State
    filters,
    filteredRides,
    filterStats,
    hasActiveFilters,
    quickFilters: Object.keys(quickFilters),
    
    // Actions
    updateFilter,
    updateFilters,
    applyQuickFilter,
    resetFilters,
    
    // Utilities
    matchesTimeRange,
    matchesLocation,
    isRideNearby,
    calculateDistance
  };
};

export default useRideFiltering;