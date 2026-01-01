import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Ride Status Indicator
 * 
 * Shows pending and active ride counts in the top right corner
 * - Green pulsing badge when there are active rides
 * - Navigates to rides page with appropriate tab when clicked
 */
const RideStatusIndicator = ({ userId }) => {
  const navigate = useNavigate();
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch ride counts
  const fetchRideCounts = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      // Get active rides count
      const { count: active } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started']);

      // Get pending rides count
      const { count: pending } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('ride_status', 'pending');

      setActiveCount(active || 0);
      setPendingCount(pending || 0);
    } catch (error) {
      console.error('Error fetching ride counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRideCounts();
  }, [userId]);

  // Real-time subscription for ride status changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`passenger-ride-counts-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Ride change detected:', payload);
          // Refresh counts when any ride changes
          fetchRideCounts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const handleClick = () => {
    // Navigate to rides page with appropriate tab
    if (activeCount > 0) {
      // Ask rides page to auto-open the active ride modal (same UX as tapping a ride card)
      navigate('/user/rides?tab=active&openActive=1');
    } else if (pendingCount > 0) {
      navigate('/user/rides?tab=pending&openPending=1');
    } else {
      navigate('/user/rides');
    }
  };

  const totalCount = activeCount + pendingCount;

  // Show loading state
  if (loading) {
    return (
      <button
        className="relative p-2 rounded-lg bg-gray-50 cursor-wait"
        disabled
        aria-label="Loading rides..."
      >
        <Car className="w-6 h-6 text-gray-400" />
        
        {/* Loading spinner badge */}
        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center bg-gray-300">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
        </div>
      </button>
    );
  }

  // Don't show if no rides
  if (totalCount === 0) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label={`${totalCount} ride${totalCount === 1 ? '' : 's'}`}
    >
      <Car className="w-6 h-6 text-gray-700" />
      
      {/* Badge with count */}
      <div
        className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
          activeCount > 0 ? 'bg-green-500' : 'bg-blue-500'
        }`}
      >
        {totalCount}
      </div>

      {/* Pulsing animation for active rides */}
      {activeCount > 0 && (
        <>
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          </span>
        </>
      )}
    </button>
  );
};

export default RideStatusIndicator;
