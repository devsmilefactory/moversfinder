/**
 * Bid Acceptance Service
 * 
 * Handles atomic bid acceptance with driver availability checks.
 * Uses Supabase RPC function to ensure drivers cannot accept multiple concurrent instant rides.
 */

import { supabase } from '../lib/supabase';

/**
 * Accept a driver's bid for a ride
 * 
 * @param {string} rideId - The ride ID
 * @param {string} offerId - The offer ID to accept
 * @param {string} driverId - The driver's user ID
 * @param {string} passengerId - The passenger's user ID
 * @returns {Promise<{success: boolean, error?: string, message: string}>}
 */
export const acceptDriverBid = async (rideId, offerId, driverId, passengerId) => {
  try {
    console.log('🔄 Accepting driver bid:', {
      rideId,
      offerId,
      driverId,
      passengerId,
      timestamp: new Date().toISOString()
    });
    
    // Call RPC function for atomic bid acceptance with availability check
    const { data, error } = await supabase.rpc('accept_driver_bid', {
      p_ride_id: rideId,
      p_offer_id: offerId,
      p_driver_id: driverId,
      p_passenger_id: passengerId
    });
    
    if (error) {
      console.error('❌ RPC error:', error);
      
      // Handle specific RPC errors
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'function_not_found',
          message: 'Bid acceptance function not available. Please contact support.'
        };
      }
      
      throw error;
    }
    
    console.log('📡 Bid acceptance response:', data);
    
    // Check if the operation was successful
    if (!data || !data.success) {
      // Handle specific error cases
      if (data?.error === 'driver_unavailable') {
        console.warn('⚠️ Driver is unavailable');
        return {
          success: false,
          error: 'driver_unavailable',
          message: data.message || 'This driver is currently engaged in another trip'
        };
      }
      
      if (data?.error === 'ride_not_available') {
        console.warn('⚠️ Ride is no longer available');
        return {
          success: false,
          error: 'ride_not_available',
          message: data.message || 'This ride is no longer available'
        };
      }
      
      if (data?.error === 'transaction_failed') {
        console.error('❌ Transaction failed:', data.message);
        return {
          success: false,
          error: 'transaction_failed',
          message: 'Failed to accept bid due to a database error. Please try again.'
        };
      }
      
      // Generic error
      return {
        success: false,
        error: data?.error || 'unknown_error',
        message: data?.message || 'Failed to accept bid'
      };
    }
    
    console.log('✅ Bid accepted successfully');
    
    return {
      success: true,
      message: data.message || 'Bid accepted successfully',
      rideId: data.ride_id
    };
    
  } catch (error) {
    console.error('❌ Error accepting bid:', error);
    
    // Handle network errors
    if (error.message && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'network_error',
        message: 'Network error. Please check your connection and try again.'
      };
    }
    
    // Generic error
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'An unexpected error occurred. Please try again.'
    };
  }
};

/**
 * Get user-friendly error message for bid acceptance errors
 * 
 * @param {string} errorType - The error type from acceptDriverBid
 * @returns {{title: string, message: string, action: string}}
 */
export const getBidAcceptanceErrorMessage = (errorType) => {
  const errorMessages = {
    driver_unavailable: {
      title: 'Driver Unavailable',
      message: 'This driver is currently engaged in another trip. Please try another driver or wait a few moments.',
      action: 'refresh_offers'
    },
    ride_not_available: {
      title: 'Ride Not Available',
      message: 'This ride is no longer available. It may have been cancelled or accepted by another driver.',
      action: 'refresh_page'
    },
    transaction_failed: {
      title: 'Transaction Failed',
      message: 'Failed to accept bid due to a database error. Please try again.',
      action: 'retry'
    },
    network_error: {
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your connection and try again.',
      action: 'retry'
    },
    function_not_found: {
      title: 'Service Unavailable',
      message: 'Bid acceptance service is temporarily unavailable. Please contact support.',
      action: 'contact_support'
    },
    unexpected_error: {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      action: 'retry'
    }
  };
  
  return errorMessages[errorType] || errorMessages.unexpected_error;
};
