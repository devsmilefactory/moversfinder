import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, RefreshCw } from 'lucide-react';
import PWALeftDrawer from '../../../components/layouts/PWALeftDrawer';
import RideDetailsModal from '../components/RideDetailsModal';
import RideTabs from '../components/RideTabs';
import RideFilterBar from '../components/RideFilterBar';
import PendingRideCard from '../components/PendingRideCard';
import ActiveRideCard from '../components/ActiveRideCard';
import CompletedRideCard from '../components/CompletedRideCard';
import CancelledRideCard from '../components/CancelledRideCard';
import SavedTripCard from '../components/SavedTripCard';
import RecurringSeriesCard from '../components/RecurringSeriesCard';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/ToastProvider';
import useRatingStore from '../../../stores/ratingStore';
import { groupRidesForDisplay } from '../../../utils/rideSeries';
import { getRideStatusCategory } from '../../../hooks/useRideStatus';
import { usePassengerRidesFeed } from '../../../hooks/usePassengerRidesFeed';
import { useSmartRealtimeFeed } from '../../../hooks/useSmartRealtimeFeed';
import RefreshIndicator from '../../../components/shared/RefreshIndicator';

/**
 * Individual My Rides Page - PWA version with tabbed interface
 * Manages different ride states: pending, active, completed, cancelled
 */
const IndividualRidesPage = () => {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showRideDetails, setShowRideDetails] = useState(false);
  const [autoOpenRating, setAutoOpenRating] = useState(false);
  const [offerCounts, setOfferCounts] = useState({});
  const [filters, setFilters] = useState({ serviceType: 'all', rideTiming: 'all' });
  const previousOfferCountsRef = useRef({});
  const pendingAutoOpenRef = useRef(null); // 'active' | 'pending' | null
  const didAutoOpenRef = useRef(false);

  // Initialize passenger rides feed hook
  const feedHook = usePassengerRidesFeed(user?.id);
  
  // Destructure hook properties
  const {
    rides: feedRides,
    isLoading: feedLoading,
    activeTab: feedActiveTab,
    changeTab: feedChangeTab,
    refreshCurrentTab,
    removeRideFromCurrentList,
    addRideToCurrentList,
    updateRideInCurrentList,
    totalCount
  } = feedHook;
  
  // Map hook's uppercase tab names to component's lowercase names
  const TAB_MAP = {
    'PENDING': 'pending',
    'ACTIVE': 'active',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled'
  };
  
  const REVERSE_TAB_MAP = {
    'pending': 'PENDING',
    'active': 'ACTIVE',
    'completed': 'COMPLETED',
    'cancelled': 'CANCELLED'
  };
  
  // Use hook's tab state (converted to lowercase for UI)
  const activeTab = TAB_MAP[feedActiveTab] || 'pending';
  const rides = feedRides;
  const ridesLoading = feedLoading;

  // Handle tab query parameter from ride status indicator
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const openActive = params.get('openActive') === '1';
    const openPending = params.get('openPending') === '1';
    if (tabParam && REVERSE_TAB_MAP[tabParam]) {
      feedChangeTab(REVERSE_TAB_MAP[tabParam]);
    }

    // If coming from the green indicator, request auto-opening the primary ride modal
    if (openActive) pendingAutoOpenRef.current = 'active';
    if (openPending) pendingAutoOpenRef.current = 'pending';
  }, [location.search]);
  
  // Map service type filter to hook's rideTypeFilter
  const SERVICE_TYPE_MAP = {
    'all': 'ALL',
    'taxi': 'TAXI',
    'courier': 'COURIER',
    'errand': 'ERRANDS',
    'errands': 'ERRANDS',
    'school_run': 'SCHOOL_RUN',
    'work_run': 'WORK_RUN'
  };

  // Shared rating store to prevent duplicate auto rating modals per ride
  const { shouldShowRating, markRatingShown } = useRatingStore();

  // Hook automatically fetches rides when user ID changes
  // No need for manual loadRides call

  // Smart realtime feed with optimistic updates
  const realtimeFeed = useSmartRealtimeFeed({
    userId: user?.id,
    userType: 'passenger',
    activeTab: feedActiveTab,
    changeTab: (newTab, meta) => {
      // IMPORTANT: feedChangeTab already triggers a single fetch via the feed hook useEffect.
      // Do NOT call refreshCurrentTab() here or you'll double-fetch on realtime-driven tab switches.
      feedChangeTab(newTab, meta);
    },
    refreshCurrentTab,
    removeRideFromCurrentList,
    addRideToCurrentList,
    updateRideInCurrentList,
    onNewDataAvailable: (tab, ride) => {
      console.log(`[Realtime] New data available in ${tab} tab`);
    }
  });

  // Separate subscription for offer counts (for notifications)
  useEffect(() => {
    if (!user?.id || feedRides.length === 0) return;

    // Load initial offer counts
    loadOfferCounts();

    // Set up real-time subscription for offer updates only
    const channel = supabase
      .channel(`user-offer-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_offers'
        },
        () => {
          loadOfferCounts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };

  }, [user?.id, feedRides.length]);

  const loadOfferCounts = async () => {
    if (!user?.id) return;

    try {
      // Get all ride IDs for this user
      const rideIds = feedRides.map(r => r.id);
      if (rideIds.length === 0) return;

      // Get offer counts for each ride
      const { data, error } = await supabase
        .from('ride_offers')
        .select('ride_id, offer_status')
        .in('ride_id', rideIds);

      if (error) throw error;

      // Count pending offers for each ride
      const counts = {};
      data.forEach(offer => {
        if (!counts[offer.ride_id]) {
          counts[offer.ride_id] = { pending: 0, total: 0 };
        }
        counts[offer.ride_id].total++;
        if (offer.offer_status === 'pending') {
          counts[offer.ride_id].pending++;
        }
      });

      // Check for new offers and show toast notification
      Object.keys(counts).forEach(rideId => {
        const previousCount = previousOfferCountsRef.current[rideId]?.pending || 0;
        const currentCount = counts[rideId].pending;
        
        if (currentCount > previousCount) {
          const newOffersCount = currentCount - previousCount;
          const ride = feedRides.find(r => r.id === rideId);
          
          // Show toast notification for new offers
          addToast({
            type: 'success',
            title: '🎉 New Driver Offer!',
            message: `${newOffersCount} new offer${newOffersCount > 1 ? 's' : ''} received for your ${ride?.service_type || 'ride'}. Tap to view!`,
            duration: 10000,
            onClick: () => {
              setSelectedRide(ride);
              setShowRideDetails(true);
            }
          });
          
          // Play notification sound (optional)
          try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          } catch (e) {}
        }
      });

      previousOfferCountsRef.current = counts;
      setOfferCounts(counts);
    } catch (error) {
      console.error('Error loading offer counts:', error);
    }
  };



  const handleRideClick = (ride) => {
    setSelectedRide(ride);
    setShowRideDetails(true);
  };

  const openPrimaryRideForTab = (tab) => {
    // Use the same function as the feed cards (opens the RideDetails modal)
    const statusList =
      tab === 'active'
        ? ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started', 'trip_completed']
        : ['pending'];
    const primary = (feedRides || []).find((r) => statusList.includes((r.ride_status || r.status || '').toLowerCase()));
    if (primary) {
      handleRideClick(primary);
      return true;
    }
    return false;
  };

  // Auto-open modal when navigated from the green indicator (once data is available)
  useEffect(() => {
    if (didAutoOpenRef.current) return;
    const requested = pendingAutoOpenRef.current;
    if (!requested) return;
    if (ridesLoading) return;

    // Ensure correct tab first, then open
    if (requested === 'active' && activeTab !== 'active') return;
    if (requested === 'pending' && activeTab !== 'pending') return;

    const opened = openPrimaryRideForTab(requested);
    if (opened) {
      didAutoOpenRef.current = true;
      pendingAutoOpenRef.current = null;
    }
  }, [activeTab, ridesLoading, feedRides]);

  // Hook already returns rides filtered by tab - no manual categorization needed
  // Just use the rides directly from the hook

  // Get counts for tabs - use totalCount from hook for current tab
  // Note: We only have count for the active tab from the hook
  const tabCounts = {
    pending: activeTab === 'pending' ? totalCount : 0,
    active: activeTab === 'active' ? totalCount : 0,
    completed: activeTab === 'completed' ? totalCount : 0,
    cancelled: activeTab === 'cancelled' ? totalCount : 0,
    saved: 0 // Saved trips not supported by feed hook yet
  };

  // Auto-open rating modal when a ride transitions to completed and hasn't been rated
  // This is separate from feed updates - just for rating UX
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-rating-check-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const ride = payload.new;
          const status = ride?.ride_status || ride?.status;
          if ((status === 'trip_completed' || status === 'completed') && shouldShowRating(ride.id, ride.rated_at)) {
            setSelectedRide(ride);
            setAutoOpenRating(true);
            setShowRideDetails(true);
            markRatingShown(ride.id);
          }
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id, shouldShowRating, markRatingShown]);


  // Use rides directly from hook (already filtered by active tab)
  const currentRides = rides || [];
  const groupedItems = useMemo(() => groupRidesForDisplay(currentRides), [currentRides]);


  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      {/* Compact Header */}
      <div className="p-2 pt-safe bg-white border-b border-slate-200 flex items-center justify-between">
        <button onClick={() => setIsDrawerOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Open menu">
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="font-bold text-slate-800 text-base">My Rides</h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => refreshCurrentTab()} 
            disabled={ridesLoading}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed" 
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-700 ${ridesLoading ? 'animate-spin' : ''}`} />
          </button>
          {tabCounts.active > 0 && (
            <button
              onClick={() => {
                // Match feed-card behavior: open the active ride modal (RideDetailsModal)
                if (activeTab !== 'active') {
                  pendingAutoOpenRef.current = 'active';
                  didAutoOpenRef.current = false;
                  feedChangeTab('ACTIVE');
                  return;
                }
                openPrimaryRideForTab('active');
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium"
            >
              <span className="text-sm">🚗</span>
              <span>{tabCounts.active}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <RideTabs 
        activeTab={activeTab} 
        onTabChange={(tab) => feedChangeTab(REVERSE_TAB_MAP[tab], { source: 'ui_tab_click' })} 
        counts={tabCounts} 
      />


      {/* Filter Bar */}
      <RideFilterBar 
        filters={filters} 
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          // Map service type to hook's filter format
          const mappedServiceType = SERVICE_TYPE_MAP[newFilters.serviceType] || 'ALL';
          feedHook.changeRideTypeFilter(mappedServiceType);
        }} 
      />

      {/* Refresh Indicator - Shows when new data available in other tabs */}
      {realtimeFeed.hasNewDataAvailable && (
        <div className="px-4 pt-2">
          <RefreshIndicator
            hasNewData={realtimeFeed.hasNewDataAvailable}
            affectedTabs={realtimeFeed.newDataTabs}
            onRefresh={realtimeFeed.manualRefresh}
          />
        </div>
      )}

      {/* Rides List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
        {ridesLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-slate-500 mt-2">Loading rides...</div>
          </div>
        ) : currentRides.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-400 text-lg mb-2">No {activeTab} rides</div>
            <div className="text-slate-500 text-sm">
              {activeTab === 'pending' && 'Book a ride to get started!'}
              {activeTab === 'active' && 'No active rides at the moment'}
              {activeTab === 'completed' && 'Your completed rides will appear here'}
              {activeTab === 'cancelled' && 'No cancelled rides'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedItems.map((item) => {
              if (item.type === 'bulk_group') {
                const total = item.rides.reduce((sum, rr) => sum + (parseFloat(rr.estimated_cost) || 0), 0);
                return (
                  <div key={item.batch_id} className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-indigo-800">Bulk Trip ({item.rides.length} trips)</div>
                      <div className="text-sm text-indigo-700">Total: ${total.toFixed(2)}</div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {item.rides.map((ride) => {
                        const rideOffers = offerCounts[ride.id] || { pending: 0, total: 0 };
                        if (activeTab === 'pending') {
                          return (
                            <PendingRideCard
                              key={ride.id}
                              ride={ride}
                              offerCount={rideOffers.pending}
                              onClick={() => handleRideClick(ride)}
                              onCancelled={() => refreshCurrentTab()}
                              tabContext={activeTab}
                            />
                          );
                        } else if (activeTab === 'active') {
                          return (
                            <ActiveRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} tabContext={activeTab} />
                          );
                        } else if (activeTab === 'completed') {
                          return (
                            <CompletedRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} tabContext={activeTab} />
                          );
                        } else if (activeTab === 'cancelled') {
                          return (
                            <CancelledRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} tabContext={activeTab} />
                          );
                        } else if (activeTab === 'saved') {
                          return (
                            <SavedTripCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                );
              } else if (item.type === 'recurring_series') {
                const totalOffers = item.rides.reduce(
                  (sum, ride) => sum + (offerCounts[ride.id]?.pending || 0),
                  0
                );
                
                // For recurring series, filter rides based on active tab context
                // Active tab: show only active/pending rides (remaining/in-progress)
                // Completed tab: show only completed rides
                // Pending tab: show only pending rides
                let filteredSeriesRides = item.rides;
                
                if (activeTab === 'active') {
                  filteredSeriesRides = item.rides.filter(r => {
                    const s = getRideStatusCategory(r.ride_status || r.status);
                    return s === 'active';
                  });
                } else if (activeTab === 'completed') {
                  filteredSeriesRides = item.rides.filter(r => getRideStatusCategory(r.ride_status || r.status) === 'completed');
                } else if (activeTab === 'pending') {
                  filteredSeriesRides = item.rides.filter(r => getRideStatusCategory(r.ride_status || r.status) === 'pending');
                }
                
                // Only render if there are rides for this tab
                if (filteredSeriesRides.length === 0) {
                  return null;
                }
                
                return (
                  <RecurringSeriesCard
                    key={item.seriesKey}
                    rides={filteredSeriesRides}
                    offerCount={totalOffers}
                    tabContext={activeTab}
                    onClick={() => handleRideClick(item.rides[0])}
                  />
                );
              } else {
                const ride = item.ride;
                const rideOffers = offerCounts[ride.id] || { pending: 0, total: 0 };
                if (activeTab === 'pending') {
                  return (
                    <PendingRideCard
                      key={ride.id}
                      ride={ride}
                      offerCount={rideOffers.pending}
                      onClick={() => handleRideClick(ride)}
                      onCancelled={() => refreshCurrentTab()}
                      tabContext={activeTab}
                    />
                  );
                } else if (activeTab === 'active') {
                  return (<ActiveRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} tabContext={activeTab} />);
                } else if (activeTab === 'completed') {
                  return (<CompletedRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} tabContext={activeTab} />);
                } else if (activeTab === 'cancelled') {
                  return (<CancelledRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} tabContext={activeTab} />);
                } else if (activeTab === 'saved') {
                  return (<SavedTripCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />);
                }
                return null;
              }
            })}
          </div>
        )}
      </div>

      {/* Drawer */}
      <PWALeftDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} profileType="individual" />

      {/* Ride Details Modal */}
      <RideDetailsModal
        isOpen={showRideDetails}
        onClose={() => {
          setShowRideDetails(false);
          setSelectedRide(null);
          setAutoOpenRating(false);
          // Reload rides to get updated status
          refreshCurrentTab();
        }}
        onAccepted={() => {
          feedChangeTab('ACTIVE');
        }}
        ride={selectedRide}
        autoOpenRating={autoOpenRating}
      />
    </div>
  );
};

export default IndividualRidesPage;

