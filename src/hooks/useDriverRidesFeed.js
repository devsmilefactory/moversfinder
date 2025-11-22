/**
 * useDriverRidesFeed Hook
 * 
 * Manages driver rides feed state including tabs, filters, pagination, and data fetching.
 * This is the single source of truth for driver rides feed management.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchDriverRides } from '../services/driverRidesApi';

export function useDriverRidesFeed(driverId) {
  // Tab and filter state
  const [activeTab, setActiveTab] = useState('AVAILABLE');
  const [rideTypeFilter, setRideTypeFilter] = useState('ALL');
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  
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
    if (!driverId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDriverRides(
        driverId,
        activeTab,
        rideTypeFilter,
        scheduleFilter,
        page,
        pageSize
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
  }, [driverId, activeTab, rideTypeFilter, scheduleFilter, page, pageSize]);

  /**
   * Fetch rides when dependencies change
   */
  useEffect(() => {
    fetchRidesForTab();
  }, [fetchRidesForTab]);

  /**
   * Change active tab
   * Resets page to 1 and fetches new data
   */
  const changeTab = useCallback((newTab) => {
    setActiveTab(newTab);
    setPage(1);
  }, []);

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
   * Refresh current tab
   * Re-fetches data with current filters and page
   */
  const refreshCurrentTab = useCallback(() => {
    fetchRidesForTab();
  }, [fetchRidesForTab]);

  /**
   * Calculate total pages
   */
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    // State
    activeTab,
    rideTypeFilter,
    scheduleFilter,
    page,
    pageSize,
    totalPages,
    totalCount,
    rides,
    isLoading,
    error,
    
    // Actions
    changeTab,
    changeRideTypeFilter,
    changeScheduleFilter,
    changePage,
    refreshCurrentTab
  };
}
