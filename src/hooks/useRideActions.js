import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores';

/**
 * useRideActions Hook
 * Manages ride-related actions like accepting, declining, and bidding
 */
const useRideActions = ({
  onRideUpdate = () => {},
  onError = () => {}
} = {}) => {
  const { user } = useAuthStore();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  
  // Place bid on a ride
  const placeBid = useCallback(async (rideId, bidAmount, message = '') => {
    if (!user?.id || !rideId) {
      const error = 'Missing required parameters for bid placement';
      setActionError(error);
      onError(error);
      return { success: false, error };
    }
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { data, error } = await supabase
        .from('ride_offers')
        .insert({
          ride_id: rideId,
          driver_id: user.id,
          offer_amount: bidAmount,
          message: message || '',
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Notify parent component of successful bid
      onRideUpdate({ type: 'bid_placed', rideId, bidData: data });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error placing bid:', error);
      const errorMessage = error.message || 'Failed to place bid';
      setActionError(errorMessage);
      onError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, onRideUpdate, onError]);
  
  // Accept a ride (for direct assignments)
  const acceptRide = useCallback(async (rideId) => {
    if (!user?.id || !rideId) {
      const error = 'Missing required parameters for ride acceptance';
      setActionError(error);
      onError(error);
      return { success: false, error };
    }
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { data, error } = await supabase.rpc('accept_ride_assignment', {
        p_ride_id: rideId,
        p_driver_id: user.id
      });
      
      if (error) throw error;
      
      // Notify parent component of successful acceptance
      onRideUpdate({ type: 'ride_accepted', rideId, data });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error accepting ride:', error);
      const errorMessage = error.message || 'Failed to accept ride';
      setActionError(errorMessage);
      onError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, onRideUpdate, onError]);
  
  // Decline a ride
  const declineRide = useCallback(async (rideId, reason = '') => {
    if (!user?.id || !rideId) {
      const error = 'Missing required parameters for ride decline';
      setActionError(error);
      onError(error);
      return { success: false, error };
    }
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { data, error } = await supabase
        .from('ride_declines')
        .insert({
          ride_id: rideId,
          driver_id: user.id,
          reason: reason || '',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Notify parent component of successful decline
      onRideUpdate({ type: 'ride_declined', rideId, data });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error declining ride:', error);
      const errorMessage = error.message || 'Failed to decline ride';
      setActionError(errorMessage);
      onError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, onRideUpdate, onError]);
  
  // Cancel a bid
  const cancelBid = useCallback(async (offerId) => {
    if (!user?.id || !offerId) {
      const error = 'Missing required parameters for bid cancellation';
      setActionError(error);
      onError(error);
      return { success: false, error };
    }
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { data, error } = await supabase
        .from('ride_offers')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', offerId)
        .eq('driver_id', user.id) // Ensure driver can only cancel their own bids
        .select()
        .single();
      
      if (error) throw error;
      
      // Notify parent component of successful cancellation
      onRideUpdate({ type: 'bid_cancelled', offerId, data });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error cancelling bid:', error);
      const errorMessage = error.message || 'Failed to cancel bid';
      setActionError(errorMessage);
      onError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, onRideUpdate, onError]);
  
  // Start a ride (when driver arrives at pickup)
  const startRide = useCallback(async (rideId) => {
    if (!user?.id || !rideId) {
      const error = 'Missing required parameters for starting ride';
      setActionError(error);
      onError(error);
      return { success: false, error };
    }
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { data, error } = await supabase.rpc('start_ride', {
        p_ride_id: rideId,
        p_driver_id: user.id
      });
      
      if (error) throw error;
      
      // Notify parent component of successful ride start
      onRideUpdate({ type: 'ride_started', rideId, data });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error starting ride:', error);
      const errorMessage = error.message || 'Failed to start ride';
      setActionError(errorMessage);
      onError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, onRideUpdate, onError]);
  
  // Complete a ride
  const completeRide = useCallback(async (rideId, completionData = {}) => {
    if (!user?.id || !rideId) {
      const error = 'Missing required parameters for completing ride';
      setActionError(error);
      onError(error);
      return { success: false, error };
    }
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { data, error } = await supabase.rpc('complete_ride', {
        p_ride_id: rideId,
        p_driver_id: user.id,
        p_completion_data: completionData
      });
      
      if (error) throw error;
      
      // Notify parent component of successful ride completion
      onRideUpdate({ type: 'ride_completed', rideId, data });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error completing ride:', error);
      const errorMessage = error.message || 'Failed to complete ride';
      setActionError(errorMessage);
      onError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(false);
    }
  }, [user?.id, onRideUpdate, onError]);
  
  // Clear action error
  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);
  
  return {
    // State
    actionLoading,
    actionError,
    
    // Actions
    placeBid,
    acceptRide,
    declineRide,
    cancelBid,
    startRide,
    completeRide,
    clearActionError
  };
};

export default useRideActions;