import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import RecurringTripCard from '../../../components/recurring/RecurringTripCard';
import RecurringSeriesModal from '../../../components/modals/RecurringSeriesModal';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { Calendar } from 'lucide-react';
import { getRideProgress } from '../../../utils/rideProgressTracking';

/**
 * Passenger Series View Component
 * 
 * Displays passenger's recurring trip series with progress tracking
 * Shows series cards with next trip information and management options
 * 
 * Features:
 * - Load passenger's recurring series from database
 * - Display series progress and next trip date
 * - View full series schedule
 * - Cancel future trips option
 * - Real-time updates via Supabase subscriptions
 */
const PassengerSeriesView = () => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadRecurringSeries();
      setupRealtimeSubscription();
    }
  }, [user?.id]);

  // Load recurring series for passenger
  const loadRecurringSeries = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      console.log('📅 Loading recurring series for passenger:', user.id);

      const { data, error } = await supabase
        .from('recurring_trip_series')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'paused'])
        .order('next_trip_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Add trips_remaining to each series
      const seriesWithRemaining = (data || []).map(s => {
        const progressInfo = getRideProgress(s);
        return {
          ...s,
          trips_remaining: progressInfo.remaining
        };
      });

      console.log('✅ Loaded recurring series:', seriesWithRemaining.length);
      setSeries(seriesWithRemaining);
    } catch (error) {
      console.error('❌ Error loading recurring series:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load recurring trips',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime subscription for series updates
  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    const subscription = supabase
      .channel(`passenger-recurring-series-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_trip_series',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Recurring series update:', payload);
          loadRecurringSeries();
        }
      )
      .subscribe((status) => {
        console.log('🔌 Recurring series subscription status:', status);
        
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('❌ Realtime subscription error for recurring series');
          addToast({
            type: 'error',
            title: 'Connection Issue',
            message: 'Real-time updates temporarily unavailable',
            duration: 5000
          });
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  };

  // Handle view details
  const handleViewDetails = (seriesData) => {
    setSelectedSeries(seriesData);
    setShowModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedSeries(null);
  };

  // Handle series updated
  const handleSeriesUpdated = () => {
    loadRecurringSeries();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your recurring trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Recurring Trips</h2>
          <p className="text-gray-600 mt-1">
            Track your scheduled recurring trips and their progress
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadRecurringSeries}
        >
          Refresh
        </Button>
      </div>

      {/* Series Grid */}
      {series.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Recurring Trips
          </h3>
          <p className="text-gray-600 mb-6">
            You don't have any active recurring trips at the moment.
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.href = '/client/book-ride'}
          >
            Book a Recurring Trip
          </Button>
        </div>
      ) : (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-purple-600 font-medium mb-1">Active Series</p>
              <p className="text-3xl font-bold text-purple-700">
                {series.filter(s => s.status === 'active').length}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-600 font-medium mb-1">Total Trips Completed</p>
              <p className="text-3xl font-bold text-green-700">
                {series.reduce((sum, s) => sum + s.completed_trips, 0)}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-1">Upcoming Trips</p>
              <p className="text-3xl font-bold text-blue-700">
                {series.reduce((sum, s) => sum + s.trips_remaining, 0)}
              </p>
            </div>
          </div>

          {/* Series Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {series.map(s => (
              <RecurringTripCard
                key={s.id}
                series={s}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        </>
      )}

      {/* Series Details Modal */}
      {selectedSeries && (
        <RecurringSeriesModal
          isOpen={showModal}
          onClose={handleModalClose}
          series={selectedSeries}
          userId={user?.id}
          onSeriesUpdated={handleSeriesUpdated}
        />
      )}
    </div>
  );
};

export default PassengerSeriesView;
