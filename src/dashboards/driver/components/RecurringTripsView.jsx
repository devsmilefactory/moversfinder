import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import RecurringTripCard from '../../../components/recurring/RecurringTripCard';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { Calendar, Filter } from 'lucide-react';
import { getRideProgress } from '../../../utils/rideProgressTracking';

/**
 * Recurring Trips View Component (Driver Version)
 * 
 * Displays driver's recurring trip series with real-time updates
 * Shows series cards with progress tracking and next trip information
 * 
 * Features:
 * - Load driver's recurring series from database
 * - Display series cards in grid layout
 * - Filter by status (active, paused, completed)
 * - Real-time updates via Supabase subscriptions
 * - Series details modal
 */
const RecurringTripsView = ({ onSeriesSelected }) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(['active', 'paused']);
  const [selectedSeries, setSelectedSeries] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadRecurringSeries();
      setupRealtimeSubscription();
    }
  }, [user?.id, statusFilter]);

  // Load recurring series for driver
  const loadRecurringSeries = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      console.log('📅 Loading recurring series for driver:', user.id);

      let query = supabase
        .from('recurring_trip_series')
        .select('*')
        .eq('driver_id', user.id);

      // Apply status filter
      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      query = query.order('next_trip_date', { ascending: true, nullsFirst: false });

      const { data, error } = await query;

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
      .channel(`driver-recurring-series-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_trip_series',
          filter: `driver_id=eq.${user.id}`
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
    if (onSeriesSelected) {
      onSeriesSelected(seriesData);
    }
  };

  // Toggle status filter
  const toggleStatusFilter = (status) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recurring trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Recurring Trips ({series.length})
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRecurringSeries}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">Filter:</span>
        {['active', 'paused', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => toggleStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              statusFilter.includes(status)
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Series Grid */}
      {series.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Recurring Trips
          </h3>
          <p className="text-gray-600 mb-4">
            {statusFilter.length === 0 
              ? 'You don\'t have any recurring trips.'
              : `No ${statusFilter.join(' or ')} recurring trips found.`}
          </p>
          {statusFilter.length > 0 && statusFilter.length < 3 && (
            <Button
              variant="outline"
              onClick={() => setStatusFilter(['active', 'paused', 'completed'])}
            >
              Show All Statuses
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.map(s => (
            <RecurringTripCard
              key={s.id}
              series={s}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecurringTripsView;
