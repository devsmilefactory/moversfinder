/**
 * usePassengerRidesFeed Hook
 * 
 * Manages passenger rides feed state including tabs, filters, pagination, and data fetching.
 * This is the single source of truth for passenger rides feed management.
 * 
 * @see Design Doc: Passenger Feed Categories section
 * @see Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.5
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchPassengerRides } from '../services/passengerRidesApi';

/**
 * Hook for managing passenger ride feeds
 * 
 * @param {string} userId - The passenger's user ID
 * @returns {Object} Feed state and actions
 * 
 * @example
 * const {
 *   rides,
 *   isLoading,
 *   error,
 *   activeTab,
 *   changeTab,
 *   refreshCurrentTab
 * } = usePassengerRidesFeed(userId);
 */
export function usePassengerRidesFeed(userId) {
  // Tab and filter state
  const [activeTab, setActiveTab] = useState('PENDING');
  const [rideTypeFilter, setRideTypeFilter] = useState('ALL');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);
  
  // Data state
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Core function to fetch rides for current tab with filters
   * This is the single source of truth for fetching rides
   */
  const fetchRidesForTab = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPassengerRides(
        userId,
        activeTab,
        rideTypeFilter,
        page,
        pageSize
      );

      if (result.error) {
        throw result.error;
      }

      setRides(result.data || []);
      setTotalCount(result.count || 0);
    } catch (err) {
      console.error('[Passenger Feed Hook] Error fetching rides:', err);
      setError(err);
      setRides([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [userId, activeTab, rideTypeFilter, page, pageSize]);

  /**
   * Fetch rides when dependencies change
   */
  useEffect(() => {
    fetchRidesForTab();
  }, [fetchRidesForTab]);

  /**
   * Change active tab
   * Resets page to 1 and fetches new data
   * Forces a fresh data load by clearing current rides
   * 
   * @param {string} newTab - PENDING | ACTIVE | COMPLETED | CANCELLED
   */
  const changeTab = useCallback((newTab) => {
    if (newTab !== activeTab) {
      setRides([]); // Clear current rides for fresh load
      setActiveTab(newTab);
      setPage(1);
    }
  }, [activeTab]);

  /**
   * Change ride type filter
   * Resets page to 1 and fetches new data
   * 
   * @param {string} newFilter - ALL | TAXI | COURIER | ERRANDS | SCHOOL_RUN
   */
  const changeRideTypeFilter = useCallback((newFilter) => {
    setRideTypeFilter(newFilter);
    setPage(1);
  }, []);

  /**
   * Change page
   * Fetches new data for the new page
   * 
   * @param {number} newPage - Page number (1-based)
   */
  const changePage = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  /**
   * Optimistically remove a ride from the current list.
   * Helps keep UI in sync with state transitions (e.g., after accepting an offer)
   * without waiting for the backend fetch to finish.
   * 
   * @param {string} rideId - UUID of the ride to remove
   */
  const removeRideFromCurrentList = useCallback((rideId) => {
    if (!rideId) return;
    setRides((prevRides) => {
      if (!Array.isArray(prevRides) || prevRides.length === 0) {
        return prevRides;
      }

      const nextRides = prevRides.filter((ride) => ride.id !== rideId);
      return nextRides;
    });
  }, []);

  /**
   * Optimistically add a ride to the current list.
   * Useful for real-time updates when a ride transitions into this feed.
   * 
   * @param {Object} ride - Ride object to add
   */
  const addRideToCurrentList = useCallback((ride) => {
    if (!ride) return;
    setRides((prevRides) => {
      // Check if ride already exists
      const exists = prevRides.some((r) => r.id === ride.id);
      if (exists) return prevRides;
      
      // Add to beginning of list (most recent first)
      return [ride, ...prevRides];
    });
  }, []);

  /**
   * Optimistically update a ride in the current list.
   * Useful for real-time updates when ride data changes.
   * 
   * @param {string} rideId - UUID of the ride to update
   * @param {Object} updates - Partial ride object with updates
   */
  const updateRideInCurrentList = useCallback((rideId, updates) => {
    if (!rideId || !updates) return;
    setRides((prevRides) => {
      return prevRides.map((ride) => 
        ride.id === rideId ? { ...ride, ...updates } : ride
      );
    });
  }, []);

  /**
   * Refresh current tab
   * Re-fetches data with current filters and page
   */
  const refreshCurrentTab = useCallback(() => {
    fetchRidesForTab();
  }, [fetchRidesForTab]);

  /**
   * Calculate total pages and hasMore for pagination
   */
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = page < totalPages;

  /**
   * Load more rides (for infinite scroll)
   * Increments page to load next batch
   */
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [hasMore, isLoading]);

  return {
    // State
    activeTab,
    rideTypeFilter,
    page,
    pageSize,
    totalPages,
    totalCount,
    rides,
    isLoading,
    error,
    hasMore,
    
    // Actions
    changeTab,
    changeRideTypeFilter,
    changePage,
    loadMore,
    removeRideFromCurrentList,
    addRideToCurrentList,
    updateRideInCurrentList,
    refreshCurrentTab
  };
}
