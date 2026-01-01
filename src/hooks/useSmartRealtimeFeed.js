/**
 * useSmartRealtimeFeed
 *
 * Lightweight realtime bridge between Supabase `postgres_changes` and the
 * feed state managed by `usePassengerRidesFeed` / `useDriverRidesFeed`.
 *
 * This hook exists to:
 * - Optimistically keep the *current tab* list updated for INSERT/UPDATE/DELETE
 * - Track "new data available in other tabs" and surface a refresh indicator
 * - Preserve mutual exclusivity rules by using `getPassengerFeed` / `getDriverFeed`
 *
 * IMPORTANT (Phase constraints):
 * - Does NOT enable scheduled/recurring flows (instant-only remains enforced elsewhere)
 * - Does NOT create or mutate rides beyond local UI list updates
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getPassengerFeed, getDriverFeed } from '../services/feedHelpers';

const PASSENGER_TAB_MAP = {
  pending: 'PENDING',
  active: 'ACTIVE',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

const DRIVER_TAB_MAP = {
  available: 'AVAILABLE',
  my_bids: 'MY_BIDS',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

function normalizeUserType(userType) {
  return (userType || 'passenger').toLowerCase();
}

function getTabForRide({ ride, userId, userType, driverOffers = [] }) {
  if (!ride || !userId) return null;
  const type = normalizeUserType(userType);

  if (type === 'driver') {
    const category = getDriverFeed(ride, userId, driverOffers);
    return category ? (DRIVER_TAB_MAP[category] || null) : null;
  }

  const category = getPassengerFeed(ride, userId);
  return category ? (PASSENGER_TAB_MAP[category] || null) : null;
}

/**
 * @param {object} args
 * @param {string} args.userId
 * @param {'passenger'|'driver'} args.userType
 * @param {string} args.activeTab - e.g. 'PENDING' | 'ACTIVE'...
 * @param {(tab:string, meta?:object)=>void} args.changeTab
 * @param {(meta?:object)=>void} args.refreshCurrentTab
 * @param {(rideId:string)=>void} args.removeRideFromCurrentList
 * @param {(ride:object)=>void} args.addRideToCurrentList
 * @param {(rideId:string, updates:object)=>void} args.updateRideInCurrentList
 * @param {(tab:string, ride:object)=>void} args.onNewDataAvailable
 * @param {Array} args.driverOffers - optional, driver feed needs offers to categorize available vs my_bids
 */
export function useSmartRealtimeFeed(args = {}) {
  const {
    userId,
    userType = 'passenger',
    activeTab,
    changeTab,
    refreshCurrentTab,
    removeRideFromCurrentList,
    addRideToCurrentList,
    updateRideInCurrentList,
    onNewDataAvailable,
    driverOffers = [],
  } = args;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [hasNewDataAvailable, setHasNewDataAvailable] = useState(false);
  const newDataTabsRef = useRef(new Set());
  const lastEventAtRef = useRef(null);

  const newDataTabs = useMemo(() => Array.from(newDataTabsRef.current), [hasNewDataAvailable]);

  const markNewDataInTab = useCallback(
    (tab, ride) => {
      if (!tab || tab === activeTab) return;
      newDataTabsRef.current.add(tab);
      setHasNewDataAvailable(true);
      if (onNewDataAvailable) onNewDataAvailable(tab, ride);
    },
    [activeTab, onNewDataAvailable]
  );

  const clearNewDataFlags = useCallback(() => {
    newDataTabsRef.current.clear();
    setHasNewDataAvailable(false);
  }, []);

  const manualRefresh = useCallback(() => {
    // Refresh only the current tab list; other tabs are refreshed when the user views them.
    refreshCurrentTab?.({ source: 'smart_realtime_manual_refresh' });
    clearNewDataFlags();
  }, [clearNewDataFlags, refreshCurrentTab]);

  const handleRideChange = useCallback(
    (payload) => {
      try {
        lastEventAtRef.current = Date.now();
        const evt = payload?.eventType;
        const rideNew = payload?.new;
        const rideOld = payload?.old;

        if (evt === 'DELETE') {
          const id = rideOld?.id;
          if (id) removeRideFromCurrentList?.(id);
          return;
        }

        // INSERT / UPDATE
        const ride = rideNew;
        if (!ride?.id) return;

        const newTab = getTabForRide({ ride, userId, userType, driverOffers });
        const oldTab = rideOld ? getTabForRide({ ride: rideOld, userId, userType, driverOffers }) : null;

        // If this update affects a different tab than the one user is viewing,
        // mark it as new data available.
        if (newTab && newTab !== activeTab) {
          markNewDataInTab(newTab, ride);
        }

        // Keep current tab list consistent and mutually exclusive.
        // - If ride moved OUT of current tab, remove it
        // - If ride is IN current tab, add/update it
        const movedOutOfCurrent =
          (oldTab === activeTab && newTab && newTab !== activeTab) ||
          (oldTab === activeTab && !newTab);

        if (movedOutOfCurrent) {
          removeRideFromCurrentList?.(ride.id);
          return;
        }

        if (newTab === activeTab) {
          if (oldTab === activeTab) {
            updateRideInCurrentList?.(ride.id, ride);
          } else {
            addRideToCurrentList?.(ride);
          }
          return;
        }

        // If we don't know the category, do nothing.
      } catch (e) {
        console.error('[useSmartRealtimeFeed] handleRideChange error', e);
      }
    },
    [
      activeTab,
      addRideToCurrentList,
      driverOffers,
      markNewDataInTab,
      removeRideFromCurrentList,
      updateRideInCurrentList,
      userId,
      userType,
    ]
  );

  useEffect(() => {
    if (!userId) {
      setIsConnected(false);
      setError(null);
      clearNewDataFlags();
      return undefined;
    }

    const type = normalizeUserType(userType);
    const table = 'rides';
    const filter =
      type === 'driver'
        ? `driver_id=eq.${userId}`
        : `user_id=eq.${userId}`;

    const channel = supabase
      .channel(`smart-feed-${type}-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        handleRideChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setError(new Error(`Realtime subscription error: ${status}`));
        }
      });

    return () => {
      try {
        channel?.unsubscribe?.();
      } catch {
        // ignore
      }
      setIsConnected(false);
    };
  }, [userId, userType, handleRideChange, clearNewDataFlags]);

  // If user navigates to a tab that had queued "new data", clear just that tab
  // so the indicator doesn't keep nagging after they’re already viewing it.
  useEffect(() => {
    if (!activeTab) return;
    if (newDataTabsRef.current.has(activeTab)) {
      newDataTabsRef.current.delete(activeTab);
      if (newDataTabsRef.current.size === 0) {
        setHasNewDataAvailable(false);
      } else {
        // Trigger re-render for newDataTabs useMemo
        setHasNewDataAvailable(true);
      }
    }
  }, [activeTab]);

  return {
    isConnected,
    error,
    hasNewDataAvailable,
    newDataTabs,
    manualRefresh,
    // Optional: expose last event timestamp for debugging
    lastEventAt: lastEventAtRef.current,
    // Optional: allow callers to clear indicator (e.g. after switching tabs)
    clearNewDataFlags,
    // Optional: give caller a way to force a tab change when they want
    changeTab,
  };
}

export default useSmartRealtimeFeed;


