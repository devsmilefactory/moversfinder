import React, { useEffect, useState, useMemo } from 'react';
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
import useAuthStore from '../../../stores/authStore';
import useRidesStore from '../../../stores/ridesStore';
import { supabase } from '../../../lib/supabase';

/**
 * Individual My Rides Page - PWA version with tabbed interface
 * Manages different ride states: pending, active, completed, cancelled
 */
const IndividualRidesPage = () => {
  const { user } = useAuthStore();
  const { rides, ridesLoading, loadRides } = useRidesStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showRideDetails, setShowRideDetails] = useState(false);
  const [autoOpenRating, setAutoOpenRating] = useState(false);
  const [offerCounts, setOfferCounts] = useState({});
  const [activeTab, setActiveTab] = useState('pending');
  const [filters, setFilters] = useState({ serviceType: 'all', rideTiming: 'all' });

  useEffect(() => {
    if (user?.id) {
      loadRides(user.id, 'individual');
    }
  }, [user?.id, loadRides]);

  // Set up real-time subscription separately to avoid dependency issues
  useEffect(() => {
    if (!user?.id || rides.length === 0) return;

    // Load initial offer counts
    loadOfferCounts();

    // Set up real-time subscription for offer updates
    const channel = supabase
      .channel(`user-ride-offers-${user.id}`)
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

  }, [user?.id, rides.length]);

  const loadOfferCounts = async () => {
    if (!user?.id) return;

    try {
      // Get all ride IDs for this user
      const rideIds = rides.map(r => r.id);
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

      setOfferCounts(counts);
    } catch (error) {
      console.error('Error loading offer counts:', error);
    }
  };



  const handleRideClick = (ride) => {
    setSelectedRide(ride);
    setShowRideDetails(true);
  };

  // Categorize rides by status and apply filters
  const categorizedRides = useMemo(() => {
    const pending = [];
    const active = [];
    const completed = [];
    const cancelled = [];
    const saved = [];

    // Apply filters
    const filteredRides = rides.filter(ride => {
      // Service type filter
      if (filters.serviceType !== 'all' && ride.service_type !== filters.serviceType) {
        return false;

      }

      // Ride timing filter
      if (filters.rideTiming !== 'all' && ride.ride_timing !== filters.rideTiming) {
        return false;
      }

      return true;
    });

    filteredRides.forEach(ride => {
      const status = ride.ride_status || ride.status;

      // Check if this is a saved template (TODO: Add is_saved_template field to database)
      // For now, we'll use a placeholder - no saved trips will show
      if (ride.is_saved_template) {
        saved.push(ride);
      } else if (status === 'cancelled') {
        cancelled.push(ride);
      } else if (status === 'completed') {
        completed.push(ride);
      } else if (['accepted','driver_on_way','driver_arrived','trip_started','driver_assigned','offer_accepted','driver_en_route','in_progress','journey_started'].includes(status)) {
        active.push(ride);
      } else if (status === 'pending' || status === 'awaiting_offers') {
        pending.push(ride);
      } // else: ignore unknown statuses
    });

    return { pending, active, completed, cancelled, saved };
  }, [rides, filters]);

  // Get counts for tabs
  const tabCounts = {
    pending: categorizedRides.pending.length,
    active: categorizedRides.active.length,
    completed: categorizedRides.completed.length,
    cancelled: categorizedRides.cancelled.length,
    saved: categorizedRides.saved.length
  };

  // Get rides for current tab
  // Auto-open rating modal when a ride transitions to completed and hasn't been rated
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-ride-status-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const ride = payload.new;
          const status = ride?.ride_status || ride?.status;
          if (status === 'completed' && !ride?.rating) {
            setSelectedRide(ride);
            setAutoOpenRating(true);
            setShowRideDetails(true);
          }
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  // Realtime: refresh rides list on any change for this user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-rides-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `user_id=eq.${user.id}` }, () => {
        loadRides(user.id, 'individual');
        loadOfferCounts();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id, loadRides]);


  const currentRides = categorizedRides[activeTab] || [];
  const groupedItems = useMemo(() => {
    const seen = new Set();
    const items = [];
    currentRides.forEach((r) => {
      const isBulk = r?.booking_type === 'bulk' && r?.batch_id;
      const key = isBulk ? `bulk:${r.batch_id}` : `single:${r.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (isBulk) {
        const groupRides = currentRides.filter(x => x?.booking_type === 'bulk' && x?.batch_id === r.batch_id);
        if (groupRides.length > 1) {
          items.push({ type: 'bulk_group', batch_id: r.batch_id, rides: groupRides });
        } else {
          items.push({ type: 'single', ride: r });
        }
      } else {
        items.push({ type: 'single', ride: r });
      }
    });
    return items;
  }, [currentRides]);


  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="p-3 pt-safe bg-white border-b border-slate-200 flex items-center justify-between">
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Open menu">
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="font-bold text-slate-800">My Rides</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => user?.id && loadRides(user.id, 'individual')} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Refresh">
            <RefreshCw className="w-5 h-5 text-slate-700" />
          </button>
          {tabCounts.active > 0 && (
            <button onClick={() => setActiveTab('active')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
              <span className="text-base">🚗</span>
              <span>{tabCounts.active}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <RideTabs activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />


      {/* Filter Bar */}
      <RideFilterBar filters={filters} onFilterChange={setFilters} />

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
                              onCancelled={() => { if (user?.id) loadRides(user.id, 'individual'); }}
                            />
                          );
                        } else if (activeTab === 'active') {
                          return (
                            <ActiveRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />
                          );
                        } else if (activeTab === 'completed') {
                          return (
                            <CompletedRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />
                          );
                        } else if (activeTab === 'cancelled') {
                          return (
                            <CancelledRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />
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
                      onCancelled={() => { if (user?.id) loadRides(user.id, 'individual'); }}
                    />
                  );
                } else if (activeTab === 'active') {
                  return (<ActiveRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />);
                } else if (activeTab === 'completed') {
                  return (<CompletedRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />);
                } else if (activeTab === 'cancelled') {
                  return (<CancelledRideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />);
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
          if (user?.id) loadRides(user.id, 'individual');
        }}
        onAccepted={() => {
          setActiveTab('active');
          if (user?.id) loadRides(user.id, 'individual');
        }}
        ride={selectedRide}
        autoOpenRating={autoOpenRating}
      />
    </div>
  );
};

export default IndividualRidesPage;

