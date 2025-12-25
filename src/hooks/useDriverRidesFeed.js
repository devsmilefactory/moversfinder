/**
 * useDriverRidesFeed Hook
 * 
 * Manages driver rides feed state including tabs, filters, pagination, and data fetching.
 * This is the single source of truth for driver rides feed management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDriverRides } from '../services/driverRidesApi';

export function useDriverRidesFeed(driverId) {
  // Tab and filter state
  const [activeTab, setActiveTab] = useState('AVAILABLE');
  const [rideTypeFilter, setRideTypeFilter] = useState('ALL');
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10; // Constant - not in dependencies
  const [totalCount, setTotalCount] = useState(0);
  
  // Data state
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const nextFetchMetaRef = useRef(null);

  /**
   * Core function to fetch rides for current tab with filters
   * This is the single source of truth for fetching rides
   */
  const fetchRidesForTab = useCallback(async () => {
    if (!driverId) return;
    const fetchMeta = nextFetchMetaRef.current;
    nextFetchMetaRef.current = null;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDriverRidesFeed.js:31',message:'fetchRidesForTab called',data:{driverId,activeTab,rideTypeFilter,scheduleFilter,page},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Optional: inspect refresh origins without affecting production UX.
    // Enable via localStorage.setItem('FEED_REFRESH_DEBUG','1')
    try {
      if (typeof window !== 'undefined' && window?.localStorage?.getItem('FEED_REFRESH_DEBUG') === '1') {
        // eslint-disable-next-line no-console
        console.debug('[DriverFeed] fetchRidesForTab', { driverId, activeTab, rideTypeFilter, scheduleFilter, page, fetchMeta });
      }
    } catch (_) {}

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDriverRides(
        driverId,
        activeTab,
        rideTypeFilter,
        scheduleFilter,
        page,
        PAGE_SIZE
      );

      if (result.error) {
        throw result.error;
      }

      setRides(result.data || []);
      setTotalCount(result.count || 0);
    } catch (err) {
      console.error('Error fetching rides:', err);
      setError(err);
      setRides([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [driverId, activeTab, rideTypeFilter, scheduleFilter, page]); // pageSize is constant, not in deps

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
   * ALWAYS loads latest data from server (for manual and automated navigation)
   */
  const changeTab = useCallback((newTab, meta = null) => {
    if (newTab !== activeTab) {
      nextFetchMetaRef.current = { reason: 'tab_change', requestedTab: newTab, ...meta };
      setRides([]); // Clear current rides for fresh load
      setActiveTab(newTab);
      setPage(1);
      // Tab change will trigger fetchRidesForTab via useEffect dependency
    }
  }, [activeTab]);

  /**
   * Change ride type filter
   * Resets page to 1 and fetches new data
   */
  const changeRideTypeFilter = useCallback((newFilter) => {
    setRideTypeFilter(newFilter);
    setPage(1);
  }, []);

  /**
   * Change schedule filter
   * Resets page to 1 and fetches new data
   */
  const changeScheduleFilter = useCallback((newFilter) => {
    setScheduleFilter(newFilter);
    setPage(1);
  }, []);

  /**
   * Change page
   * Fetches new data for the new page
   */
  const changePage = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  /**
   * Optimistically remove a ride from the current list.
   * Helps keep UI in sync with state transitions (e.g., after placing a bid)
   * without waiting for the backend fetch to finish.
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
   * Always loads latest data from server
   */
  const refreshCurrentTab = useCallback((meta = null) => {
    nextFetchMetaRef.current = { reason: 'refresh_current_tab', activeTab, ...meta };
    fetchRidesForTab();
  }, [fetchRidesForTab]);

  /**
   * Calculate total pages and hasMore for pagination
   */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
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
    scheduleFilter,
    page,
    pageSize: PAGE_SIZE, // Export constant as pageSize for API compatibility
    totalPages,
    totalCount,
    rides,
    isLoading,
    error,
    hasMore,
    
    // Actions
    changeTab,
    changeRideTypeFilter,
    changeScheduleFilter,
    changePage,
    loadMore,
    removeRideFromCurrentList,
    addRideToCurrentList,
    updateRideInCurrentList,
    refreshCurrentTab
  };
}
