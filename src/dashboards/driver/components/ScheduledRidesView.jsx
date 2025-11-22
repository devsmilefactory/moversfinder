import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { Calendar, Clock, MapPin, DollarSign } from 'lucide-react';

/**
 * Scheduled Rides View Component (Driver Version)
 *
 * Displays driver's accepted scheduled rides with activation functionality
 * Shows rides ordered by scheduled time with ability to activate within 30 minutes
 *
 * Features:
 * - Load accepted scheduled rides from database
 * - Display rides ordered by scheduled time
 * - Highlight rides within 30 minutes of scheduled time
 * - Trip activation button (enabled within 30 minutes)
 * - Real-time updates via Supabase subscriptions
 */
const ScheduledRidesView = ({ onRideUpdate }) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [scheduledRides, setScheduledRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingRideId, setActivatingRideId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadScheduledRides();
      setupRealtimeSubscription();
    }
  }, [user?.id]);

  // Load scheduled rides with series information
  const loadScheduledRides = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          recurring_trip_series (
            id,
            series_name,
            recurrence_pattern,
            total_trips,
            completed_trips
          )
        `)
        .eq('driver_id', user.id)
        .eq('ride_status', 'accepted')
        .in('ride_timing', ['scheduled_single', 'scheduled_recurring'])
        .order('scheduled_datetime', { ascending: true });

      if (error) throw error;

      console.log('📅 Loaded scheduled rides:', data?.length || 0);
      setScheduledRides(data || []);
    } catch (error) {
      console.error('Error loading scheduled rides:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load scheduled rides',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime subscription for ride updates
  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    const subscription = supabase
      .channel(`driver-scheduled-rides-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Scheduled ride update:', payload);
          loadScheduledRides();
          if (onRideUpdate) onRideUpdate();
        }
      )
      .subscribe((status) => {
        console.log('🔌 Scheduled rides subscription status:', status);
        
        // Handle connection errors
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('❌ Realtime subscription error for scheduled rides');
          addToast({
            type: 'error',
            title: 'Connection Issue',
            message: 'Real-time updates temporarily unavailable. Refreshing...',
            duration: 5000
          });
          // Retry after a delay
          setTimeout(() => {
            loadScheduledRides();
          }, 3000);
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Realtime connection closed for scheduled rides');
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  };

  // Check if ride can be activated (within 30 minutes of scheduled time)
  const canActivateRide = (ride) => {
    if (!ride.scheduled_datetime) return false;

    const scheduledTime = new Date(ride.scheduled_datetime);
    const now = new Date();
    const diffMinutes = (scheduledTime - now) / (1000 * 60);

    // Can activate if within 30 minutes of scheduled time (allow 5 minutes past)
    return diffMinutes <= 30 && diffMinutes >= -5;
  };

  // Activate trip
  const handleActivateTrip = async (ride) => {
    setActivatingRideId(ride.id);

    try {
      console.log('🚀 Activating scheduled trip:', {
        rideId: ride.id,
        scheduledTime: ride.scheduled_datetime,
        currentTime: new Date().toISOString()
      });

      const { error } = await supabase
        .from('rides')
        .update({
          ride_status: 'driver_on_way',
          status_updated_at: new Date().toISOString()
        })
        .eq('id', ride.id)
        .eq('driver_id', user.id)
        .eq('ride_status', 'accepted');

      if (error) {
        console.error('❌ Database error activating trip:', {
          error,
          rideId: ride.id,
          code: error.code,
          message: error.message
        });
        throw error;
      }

      console.log('✅ Trip activated successfully:', ride.id);

      addToast({
        type: 'success',
        title: 'Trip Activated',
        message: 'You can now start heading to the pickup location',
        duration: 5000
      });

      // Reload scheduled rides
      loadScheduledRides();
      if (onRideUpdate) onRideUpdate();
    } catch (error) {
      console.error('❌ Error activating trip:', {
        error,
        rideId: ride.id,
        message: error.message,
        stack: error.stack
      });
      
      // Provide specific error messages
      let errorMessage = 'Please try again';
      if (error.message?.includes('network')) {
        errorMessage = 'Network error. Check your connection and try again.';
      } else if (error.code === 'PGRST116') {
        errorMessage = 'Database error. Please contact support.';
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Activate Trip',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setActivatingRideId(null);
    }
  };

  // Format date and time
  const formatScheduledTime = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get time until scheduled
  const getTimeUntilScheduled = (dateString) => {
    if (!dateString) return null;

    const scheduledTime = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.round((scheduledTime - now) / (1000 * 60));

    if (diffMinutes < 0) return 'Overdue';
    if (diffMinutes === 0) return 'Now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h`;
    return `${Math.round(diffMinutes / 1440)}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scheduled rides...</p>
        </div>
      </div>
    );
  }

  if (scheduledRides.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Scheduled Rides</h3>
        <p className="text-gray-600">You don't have any scheduled rides at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Scheduled Rides ({scheduledRides.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={loadScheduledRides}
        >
          Refresh
        </Button>
      </div>

      {scheduledRides.map((ride) => {
        const isActivatable = canActivateRide(ride);
        const isWithin30Min = isActivatable;
        const timeUntil = getTimeUntilScheduled(ride.scheduled_datetime);

        return (
          <div
            key={ride.id}
            className={`p-4 rounded-lg border-2 transition-all ${
              isWithin30Min
                ? 'border-yellow-400 bg-yellow-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-lg text-gray-900 capitalize">
                  {ride.service_type?.replace('_', ' ') || 'Ride'}
                </h3>
                {/* Recurring Badge */}
                {ride.series_id && ride.recurring_trip_series && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium flex items-center gap-1">
                    🔄 Recurring
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isWithin30Min && (
                  <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">
                    Ready to Start
                  </span>
                )}
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                  {timeUntil}
                </span>
              </div>
            </div>

            {/* Series Info */}
            {ride.series_id && ride.recurring_trip_series && (
              <div className="mb-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-purple-900">
                      {ride.recurring_trip_series.series_name || 'Recurring Series'}
                    </p>
                    <p className="text-xs text-purple-600 capitalize">
                      {ride.recurring_trip_series.recurrence_pattern?.replace('_', ' ')} • 
                      Trip {ride.series_trip_number} of {ride.recurring_trip_series.total_trips}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-600">Progress</p>
                    <p className="font-semibold text-purple-900">
                      {ride.recurring_trip_series.completed_trips}/{ride.recurring_trip_series.total_trips}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Time */}
            <div className="flex items-center gap-2 mb-3 text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">Scheduled:</span>
              <span className="font-semibold text-blue-600">
                {formatScheduledTime(ride.scheduled_datetime)}
              </span>
            </div>

            {/* Locations */}
            <div className="space-y-2 mb-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Pickup</p>
                  <p className="text-gray-900">{ride.pickup_address || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Dropoff</p>
                  <p className="text-gray-900">{ride.dropoff_address || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Fare */}
            {ride.estimated_cost && (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Fare:</span>
                <span className="font-semibold text-green-600">
                  ${parseFloat(ride.estimated_cost).toFixed(2)}
                </span>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-3 border-t border-gray-200">
              <Button
                variant="primary"
                onClick={() => handleActivateTrip(ride)}
                disabled={!isActivatable || activatingRideId === ride.id}
                className="w-full"
              >
                {activatingRideId === ride.id ? (
                  'Activating...'
                ) : isActivatable ? (
                  '🚀 Activate Trip'
                ) : (
                  `⏰ Available in ${timeUntil}`
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScheduledRidesView;
