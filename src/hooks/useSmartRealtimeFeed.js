/**
 * Smart Realtime Feed Hook
 * 
 * Manages realtime subscriptions with feed-aware optimistic updates.
 * - Uses optimistic updates for same-tab changes (instant UI)
 * - Triggers full refresh for tab changes (manual or automated)
 * - Provides "new data available" indicator
 * - Prevents infinite loops with debouncing
 * - Consolidates subscriptions to avoid duplicates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getDriverFeed, getPassengerFeed } from '../services/feedHelpers';
import { getRideStatusCategory } from '../hooks/useRideStatus';
import { subscribePostgresChanges } from '../lib/realtimeRegistry';

/**
 * Map UI tab names to feed categories (context-aware)
 */
const getFeedCategoryForTab = (tab, userType) => {
  if (userType === 'driver') {
    const driverMap = {
      'AVAILABLE': 'available',
      'BID': 'my_bids',
      'ACTIVE': 'in_progress',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled'
    };
    return driverMap[tab] || null;
  } else {
    const passengerMap = {
      'PENDING': 'pending',
      'ACTIVE': 'active',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled'
    };
    return passengerMap[tab] || null;
  }
};

/**
 * Map feed categories to UI tab names (context-aware)
 */
const getTabForFeedCategory = (feedCategory, userType) => {
  if (userType === 'driver') {
    const driverMap = {
      'available': 'AVAILABLE',
      'my_bids': 'BID',
      'in_progress': 'ACTIVE',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED'
    };
    return driverMap[feedCategory] || null;
  } else {
    const passengerMap = {
      'pending': 'PENDING',
      'active': 'ACTIVE',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED'
    };
    return passengerMap[feedCategory] || null;
  }
};

/**
 * Smart realtime feed hook
 * 
 * @param {Object} config - Configuration
 * @param {string} config.userId - User ID
 * @param {string} config.userType - 'driver' | 'passenger'
 * @param {string} config.activeTab - Current active tab
 * @param {Function} config.changeTab - Function to change tab
 * @param {Function} config.refreshCurrentTab - Function to refresh current tab
 * @param {Function} config.removeRideFromCurrentList - Remove ride optimistically
 * @param {Function} config.addRideToCurrentList - Add ride optimistically
 * @param {Function} config.updateRideInCurrentList - Update ride optimistically
 * @param {Array} config.driverOffers - Driver offers (for driver feed logic)
 * @param {Function} config.onNewDataAvailable - Callback when new data available for other tabs
 */
export function useSmartRealtimeFeed({
  userId,
  userType,
  activeTab,
  changeTab,
  refreshCurrentTab,
  removeRideFromCurrentList,
  addRideToCurrentList,
  updateRideInCurrentList,
  driverOffers = [],
  onNewDataAvailable = null
}) {
  const [hasNewDataAvailable, setHasNewDataAvailable] = useState(false);
  const [newDataTabs, setNewDataTabs] = useState(new Set());
  
  // Refs to prevent stale closures and infinite loops
  const activeTabRef = useRef(activeTab);
  const lastUpdateTimeRef = useRef({});
  const debounceTimerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const unsubscribersRef = useRef([]);
  const handleRideUpdateRef = useRef(null);
  const handleOfferUpdateRef = useRef(null);
  const getFeedCategoryForRideRef = useRef(null);

  // Keep latest function props in refs so realtime handlers stay stable (no re-subscribe loops)
  const changeTabRef = useRef(changeTab);
  const refreshCurrentTabRef = useRef(refreshCurrentTab);
  const removeRideFromCurrentListRef = useRef(removeRideFromCurrentList);
  const addRideToCurrentListRef = useRef(addRideToCurrentList);
  const updateRideInCurrentListRef = useRef(updateRideInCurrentList);
  const onNewDataAvailableRef = useRef(onNewDataAvailable);

  useEffect(() => { changeTabRef.current = changeTab; }, [changeTab]);
  useEffect(() => { refreshCurrentTabRef.current = refreshCurrentTab; }, [refreshCurrentTab]);
  useEffect(() => { removeRideFromCurrentListRef.current = removeRideFromCurrentList; }, [removeRideFromCurrentList]);
  useEffect(() => { addRideToCurrentListRef.current = addRideToCurrentList; }, [addRideToCurrentList]);
  useEffect(() => { updateRideInCurrentListRef.current = updateRideInCurrentList; }, [updateRideInCurrentList]);
  useEffect(() => { onNewDataAvailableRef.current = onNewDataAvailable; }, [onNewDataAvailable]);
  
  // Update refs when props change
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  /**
   * Debounced refresh to prevent infinite loops
   */
  const debouncedRefresh = useCallback((tab, delay = 300) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (tab === activeTabRef.current) {
        // IMPORTANT: avoid duplicate fetches. Tab changes already trigger a fetch via feed hooks.
        // This is only for "same tab" updates where we need a refresh.
        refreshCurrentTabRef.current?.({ source: 'realtime_debounced', tab });
      }
    }, delay);
  }, []);

  // Fetch driver offers for feed logic (only for drivers)
  const [driverOffersState, setDriverOffersState] = useState([]);
  
  useEffect(() => {
    if (userType === 'driver' && userId) {
      // Fetch driver's offers for feed category determination
      supabase
        .from('ride_offers')
        .select('id, ride_id, driver_id, offer_status')
        .eq('driver_id', userId)
        .then(({ data, error }) => {
          if (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:132',message:'Error fetching driver offers',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            return;
          }
          if (data) {
            setDriverOffersState(data);
          }
        });
    }
  }, [userId, userType]);

  // Use provided driverOffers or fetched state
  const effectiveDriverOffers = driverOffers.length > 0 ? driverOffers : driverOffersState;

  /**
   * Determine feed category for a ride
   * Handles both 'state' and 'ride_status' fields
   */
  const getFeedCategoryForRide = useCallback((ride) => {
    if (!ride) return null;
    
    // Normalize ride object - use state if available, otherwise derive from ride_status
    const normalizedRide = {
      ...ride,
      state: ride.state || (
        ride.ride_status === 'pending'
          ? (ride.driver_id ? 'ACTIVE_EXECUTION' : 'PENDING')
          : ride.ride_status === 'accepted' || ride.ride_status === 'driver_on_way' || 
            ride.ride_status === 'driver_arrived' || ride.ride_status === 'trip_started' ? 'ACTIVE_EXECUTION' :
            ride.ride_status === 'trip_completed' || ride.ride_status === 'completed' ? 'COMPLETED_FINAL' :
            ride.ride_status === 'cancelled' ? 'CANCELLED' : null)
    };
    
    if (userType === 'driver') {
      return getDriverFeed(normalizedRide, userId, effectiveDriverOffers);
    } else {
      return getPassengerFeed(normalizedRide, userId);
    }
  }, [userId, userType, effectiveDriverOffers]);

  useEffect(() => {
    getFeedCategoryForRideRef.current = getFeedCategoryForRide;
  }, [getFeedCategoryForRide]);

  /**
   * Handle ride update with feed-aware logic
   */
  const handleRideUpdate = useCallback((payload) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const updatedRide = payload.new;
      const oldRide = payload.old;
      const rideId = updatedRide?.id;
      
      if (!rideId) {
        isProcessingRef.current = false;
        return;
      }

      // Prevent duplicate processing
      const updateKey = `${rideId}-${updatedRide.ride_status}`;
      const now = Date.now();
      if (lastUpdateTimeRef.current[updateKey] && (now - lastUpdateTimeRef.current[updateKey]) < 500) {
        isProcessingRef.current = false;
        return;
      }
      lastUpdateTimeRef.current[updateKey] = now;

      // Short-circuit for terminal statuses to enforce mutual exclusivity client-side
      const terminalStatus = ['trip_completed', 'completed', 'cancelled'].includes((updatedRide.ride_status || '').toLowerCase());
      if (terminalStatus) {
        const targetFeed = getFeedCategoryForRide({ ...updatedRide, state: updatedRide.state || 'COMPLETED_FINAL' });
        const targetTab = targetFeed ? getTabForFeedCategory(targetFeed, userType) : null;
        const currentFeedCategory = getFeedCategoryForTab(activeTabRef.current, userType);

        // Remove from current ACTIVE feed immediately to prevent overlay/blocks (driver in_progress or passenger active)
        if ((currentFeedCategory === 'in_progress' || currentFeedCategory === 'active') && removeRideFromCurrentListRef.current) {
          removeRideFromCurrentListRef.current(rideId);
        }

        // Flag new data on the destination tab
        if (targetTab && targetTab !== activeTabRef.current) {
          setHasNewDataAvailable(true);
          setNewDataTabs(prev => new Set([...prev, targetTab]));
          if (onNewDataAvailableRef.current) {
            onNewDataAvailableRef.current(targetTab, updatedRide);
          }
        }

        // If ride landed in current tab (e.g., completed tab), update it optimistically
        if (targetTab === activeTabRef.current && updateRideInCurrentListRef.current) {
          updateRideInCurrentListRef.current(rideId, updatedRide);
        }

        isProcessingRef.current = false;
        return;
      }

      // Determine which feed this ride belongs to now
      const newFeedCategory = getFeedCategoryForRide(updatedRide);
      const newTab = newFeedCategory ? getTabForFeedCategory(newFeedCategory, userType) : null;
      
      // Determine which feed it belonged to before (if we have old data)
      let oldFeedCategory = null;
      if (oldRide) {
        oldFeedCategory = getFeedCategoryForRide(oldRide);
      }

      const currentFeedCategory = getFeedCategoryForTab(activeTabRef.current, userType);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:205',message:'Ride update received',data:{rideId,oldFeed:oldFeedCategory,newFeed:newFeedCategory,currentTab:activeTabRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Case 1: Ride belongs to current tab - use optimistic update
      if (newFeedCategory === currentFeedCategory && newTab === activeTabRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:215',message:'Same feed optimistic update',data:{rideId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (updateRideInCurrentListRef.current) {
          updateRideInCurrentListRef.current(rideId, updatedRide);
        }
        isProcessingRef.current = false;
        return;
      }

      // Case 2: Ride moved from current tab to different tab - remove optimistically
      if (oldFeedCategory === currentFeedCategory && newFeedCategory !== currentFeedCategory) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:225',message:'Ride moved out of feed',data:{rideId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (removeRideFromCurrentListRef.current) {
          removeRideFromCurrentListRef.current(rideId);
        }
        
        // Show "new data available" indicator for the new tab
        if (newTab && newTab !== activeTabRef.current) {
          setHasNewDataAvailable(true);
          setNewDataTabs(prev => new Set([...prev, newTab]));
          if (onNewDataAvailableRef.current) {
            onNewDataAvailableRef.current(newTab, updatedRide);
          }
        }
        isProcessingRef.current = false;
        return;
      }

      // Case 3: Ride moved into current tab from different tab - add optimistically
      if (oldFeedCategory !== currentFeedCategory && newFeedCategory === currentFeedCategory) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:244',message:'Ride moved into feed',data:{rideId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (addRideToCurrentListRef.current) {
          addRideToCurrentListRef.current(updatedRide);
        }
        isProcessingRef.current = false;
        return;
      }

      // Case 4: Status change that requires tab switch (automated navigation)
      const statusCategory = getRideStatusCategory(updatedRide.ride_status);
      const requiresTabSwitch = 
        (statusCategory === 'active' && activeTabRef.current !== 'ACTIVE') ||
        (statusCategory === 'completed' && activeTabRef.current !== 'COMPLETED') ||
        (statusCategory === 'cancelled' && activeTabRef.current !== 'CANCELLED') ||
        (statusCategory === 'pending' && activeTabRef.current !== 'PENDING');

      if (requiresTabSwitch && newTab) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:261',message:'Tab switch required',data:{rideId,newTab},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Automated tab switch - always load latest data
        // NOTE: changeTab triggers the feed hook fetch via useEffect. Do not double-fetch here.
        changeTabRef.current?.(newTab, { source: 'realtime_tab_switch', rideId, rideStatus: updatedRide.ride_status });
        isProcessingRef.current = false;
        return;
      }

      // Case 5: Ride doesn't affect current tab - just show indicator
      if (newTab && newTab !== activeTabRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:272',message:'Update affects different tab',data:{rideId,newTab},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setHasNewDataAvailable(true);
        setNewDataTabs(prev => new Set([...prev, newTab]));
        if (onNewDataAvailableRef.current) {
          onNewDataAvailableRef.current(newTab, updatedRide);
        }
        isProcessingRef.current = false;
        return;
      }

      // Default: Debounced refresh for safety
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:283',message:'Default debounced refresh',data:{rideId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      debouncedRefresh(activeTabRef.current, 500);
    } catch (error) {
      console.error('[Smart Realtime] Error handling ride update:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    getFeedCategoryForRide,
    debouncedRefresh,
  ]);

  useEffect(() => {
    handleRideUpdateRef.current = handleRideUpdate;
  }, [handleRideUpdate]);

  /**
   * Handle offer update
   */
  const handleOfferUpdate = useCallback((payload) => {
    if (isProcessingRef.current) return;
    
    const updatedOffer = payload.new;
    const offerStatus = updatedOffer?.offer_status;
    
    // Keep driver offers state in sync so feed categorization can hide items from available
    setDriverOffersState(prev => {
      if (!updatedOffer?.id) return prev;
      const idx = prev.findIndex(o => o.id === updatedOffer.id);
      if (idx === -1) {
        return [...prev, updatedOffer];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...updatedOffer };
      return next;
    });
    
    // If offer was accepted and we're on BID tab, switch to ACTIVE
    if (offerStatus === 'accepted' && activeTabRef.current === 'BID' && userType === 'driver') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:312',message:'Offer accepted switch to ACTIVE',data:{offerId:updatedOffer?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // NOTE: changeTab triggers the feed hook fetch via useEffect. Do not double-fetch here.
      changeTabRef.current?.('ACTIVE', { source: 'offer_accepted', offerId: updatedOffer?.id, rideId: updatedOffer?.ride_id });
      return;
    }
    
    // If offer was rejected and we're on BID tab, refresh to remove it
    if (offerStatus === 'rejected' && activeTabRef.current === 'BID' && userType === 'driver') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:319',message:'Offer rejected refresh BID',data:{offerId:updatedOffer?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      debouncedRefresh('BID', 300);
      return;
    }
    
    // For other cases, just refresh current tab with debounce
    debouncedRefresh(activeTabRef.current, 500);
  }, [debouncedRefresh, userType]);

  useEffect(() => {
    handleOfferUpdateRef.current = handleOfferUpdate;
  }, [handleOfferUpdate]);

  /**
   * Set up consolidated realtime subscriptions
   */
  useEffect(() => {
    if (!userId) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:335',message:'Setting up subscriptions',data:{userType,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Cleanup any previous subs for this hook instance
    unsubscribersRef.current.forEach((unsub) => {
      try { unsub?.(); } catch (e) {}
    });
    unsubscribersRef.current = [];

    const channelName = `smart-realtime-${userType}-${userId}`;

    const rideFilter = userType === 'driver'
      ? `driver_id=eq.${userId}`
      : `user_id=eq.${userId}`;

    const unsubRideUpdates = subscribePostgresChanges({
      channelName,
      table: 'rides',
      event: 'UPDATE',
      filter: rideFilter,
      listener: (payload) => handleRideUpdateRef.current?.(payload),
    });

    const unsubRideInsert = subscribePostgresChanges({
      channelName,
      table: 'rides',
      event: 'INSERT',
      filter: rideFilter,
      listener: (payload) => {
        const ride = payload.new;
        const feedCategory = getFeedCategoryForRideRef.current?.(ride);
        const newTab = feedCategory ? getTabForFeedCategory(feedCategory, userType) : null;
        if (newTab === activeTabRef.current) {
          addRideToCurrentListRef.current?.(ride);
        } else if (newTab) {
          setHasNewDataAvailable(true);
          setNewDataTabs(prev => new Set([...prev, newTab]));
        }
      },
    });

    // For drivers, also listen to ride_offers
    if (userType === 'driver') {
      const unsubOfferUpdate = subscribePostgresChanges({
        channelName,
        table: 'ride_offers',
        event: 'UPDATE',
        filter: `driver_id=eq.${userId}`,
        listener: (payload) => handleOfferUpdateRef.current?.(payload),
      });
      const unsubOfferInsert = subscribePostgresChanges({
        channelName,
        table: 'ride_offers',
        event: 'INSERT',
        filter: `driver_id=eq.${userId}`,
        listener: (payload) => handleOfferUpdateRef.current?.(payload),
      });
      unsubscribersRef.current.push(unsubOfferUpdate, unsubOfferInsert);
    }

    // For drivers, listen to pending rides being accepted (to remove from available feed)
    // This is handled by the main ride update handler, but we keep this for immediate removal
    if (userType === 'driver') {
      const unsubPendingUpdates = subscribePostgresChanges({
        channelName,
        table: 'rides',
        event: 'UPDATE',
        filter: `ride_status=eq.pending`,
        listener: (payload) => {
          const updatedRide = payload.new;
          const oldRide = payload.old;
          
          // If ride was just accepted (driver_id changed from NULL to value) and we're on AVAILABLE tab
          if (!oldRide?.driver_id && updatedRide.driver_id && activeTabRef.current === 'AVAILABLE') {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:410',message:'Ride accepted by another driver',data:{rideId:updatedRide.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            if (removeRideFromCurrentListRef.current) {
              removeRideFromCurrentListRef.current(updatedRide.id);
            }
            
            // Show indicator if this was assigned to current driver
            if (updatedRide.driver_id === userId) {
              setHasNewDataAvailable(true);
              setNewDataTabs(prev => new Set([...prev, 'ACTIVE']));
            }
          }
        },
      });
      unsubscribersRef.current.push(unsubPendingUpdates);
    }

    unsubscribersRef.current.push(unsubRideUpdates, unsubRideInsert);

    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSmartRealtimeFeed.js:430',message:'Cleaning up subscriptions',data:{userType,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      unsubscribersRef.current.forEach((unsub) => {
        try { unsub?.(); } catch (e) {}
      });
      unsubscribersRef.current = [];
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    userId,
    userType,
  ]);

  /**
   * Clear new data indicator when user switches to that tab
   */
  useEffect(() => {
    setNewDataTabs(prev => {
      if (prev.has(activeTab)) {
        const next = new Set(prev);
        next.delete(activeTab);
        if (next.size === 0) {
          setHasNewDataAvailable(false);
        }
        return next;
      }
      return prev;
    });
  }, [activeTab]);

  /**
   * Manual refresh - clears indicators and loads latest data
   */
  const manualRefresh = useCallback(() => {
    setHasNewDataAvailable(false);
    setNewDataTabs(new Set());
    refreshCurrentTab({ source: 'manual_refresh_indicator' });
  }, [refreshCurrentTab]);

  return {
    hasNewDataAvailable,
    newDataTabs: Array.from(newDataTabs),
    manualRefresh
  };
}

