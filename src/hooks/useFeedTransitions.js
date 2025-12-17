/**
 * useFeedTransitions Hook
 * 
 * Manages ride transitions between feeds when state changes occur.
 * Handles feed categorization, optimistic updates, and auto-navigation.
 * 
 * @see Design Doc: Feed Transitions section
 * @see Requirements: 16.1-16.5, 17.1-17.5
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPassengerFeed, getDriverFeed } from '../services/feedHelpers';
import { useToast } from '../components/ui/ToastProvider';

/**
 * Hook for managing feed transitions on ride state changes
 * 
 * @param {string} userId - Current user ID
 * @param {string} userType - 'passenger' or 'driver'
 * @param {Object} feedActions - Feed management actions from usePassengerRidesFeed or useDriverRidesFeed
 * @param {Array} driverOffers - Array of driver offers (for driver feed categorization)
 * @returns {Object} Transition handlers
 * 
 * @example
 * const { handleStateChange, navigateToRide } = useFeedTransitions(
 *   userId,
 *   'passenger',
 *   { removeRideFromCurrentList, addRideToCurrentList, refreshCurrentTab }
 * );
 */
export function useFeedTransitions(userId, userType, feedActions = {}, driverOffers = []) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  /**
   * Handle ride state change and update feeds accordingly
   * 
   * @param {Object} rideBefore - Ride object before state change
   * @param {Object} rideAfter - Ride object after state change
   */
  const handleStateChange = useCallback((rideBefore, rideAfter) => {
    if (!rideBefore || !rideAfter || !userId) return;

    // Calculate old and new feed categories
    const oldFeed = userType === 'passenger'
      ? getPassengerFeed(rideBefore, userId)
      : getDriverFeed(rideBefore, userId, driverOffers);

    const newFeed = userType === 'passenger'
      ? getPassengerFeed(rideAfter, userId)
      : getDriverFeed(rideAfter, userId, driverOffers);

    console.log('[Feed Transitions] State change detected:', {
      rideId: rideAfter.id,
      oldState: rideBefore.state,
      newState: rideAfter.state,
      oldFeed,
      newFeed,
      userType
    });

    // If feed changed, update UI
    if (oldFeed !== newFeed) {
      // Remove from old feed (if we're currently viewing it)
      if (feedActions.removeRideFromCurrentList) {
        feedActions.removeRideFromCurrentList(rideAfter.id);
      }

      // Add to new feed (if we're currently viewing it)
      if (newFeed && feedActions.addRideToCurrentList) {
        feedActions.addRideToCurrentList(rideAfter);
      }

      // Trigger auto-navigation if needed
      handleAutoNavigation(oldFeed, newFeed, rideAfter, userType);
    } else {
      // Same feed, just update the ride data
      if (feedActions.updateRideInCurrentList) {
        feedActions.updateRideInCurrentList(rideAfter.id, rideAfter);
      }
    }
  }, [userId, userType, driverOffers, feedActions, navigate]);

  /**
   * Handle auto-navigation based on feed transitions
   * 
   * @param {string|null} oldFeed - Previous feed category
   * @param {string|null} newFeed - New feed category
   * @param {Object} ride - Ride object
   * @param {string} userType - 'passenger' or 'driver'
   */
  const handleAutoNavigation = useCallback((oldFeed, newFeed, ride, userType) => {
    if (userType === 'passenger') {
      // Passenger: Pending → Active (offer accepted)
      if (oldFeed === 'pending' && newFeed === 'active') {
        console.log('[Feed Transitions] Auto-navigating to active ride');
        addToast({
          type: 'success',
          title: '🎉 Offer Accepted!',
          message: 'Your ride is now active. Driver is on the way!',
          duration: 5000
        });
        navigate(`/rides/${ride.id}/active`);
      }

      // Passenger: Active → Completed (payment done)
      if (oldFeed === 'active' && newFeed === 'completed') {
        console.log('[Feed Transitions] Ride completed, navigating to completed view');
        addToast({
          type: 'success',
          title: '✅ Ride Completed',
          message: 'Thank you for riding with us!',
          duration: 4000
        });
        navigate(`/rides/${ride.id}/completed`);
      }

      // Passenger: Any → Cancelled (ride cancelled)
      if (newFeed === 'cancelled' && oldFeed !== 'cancelled') {
        console.log('[Feed Transitions] Ride cancelled');
        addToast({
          type: 'warn',
          title: '❌ Ride Cancelled',
          message: 'This ride has been cancelled.',
          duration: 5000
        });
        // Navigate back to list after a short delay
        setTimeout(() => navigate('/rides'), 2000);
      }
    }

    if (userType === 'driver') {
      // Driver: My Bids → In Progress (offer accepted)
      if (oldFeed === 'my_bids' && newFeed === 'in_progress') {
        console.log('[Feed Transitions] Offer accepted! Auto-navigating to active ride');
        addToast({
          type: 'success',
          title: '🎉 Your Offer Was Accepted!',
          message: 'The passenger accepted your offer. Start the ride!',
          duration: 5000
        });
        navigate(`/driver/rides/${ride.id}/active`);
      }

      // Driver: My Bids → null (another driver accepted)
      if (oldFeed === 'my_bids' && newFeed === null) {
        console.log('[Feed Transitions] Offer not accepted (another driver got it)');
        addToast({
          type: 'info',
          title: 'Offer Not Accepted',
          message: 'The passenger chose another driver for this ride.',
          duration: 4000
        });
      }

      // Driver: Any → Cancelled (ride cancelled)
      if (newFeed === 'cancelled' && oldFeed !== 'cancelled') {
        console.log('[Feed Transitions] Ride cancelled');
        addToast({
          type: 'warn',
          title: '❌ Ride Cancelled',
          message: 'This ride has been cancelled.',
          duration: 5000
        });
        // Navigate back to list after a short delay
        setTimeout(() => navigate('/driver/rides'), 2000);
      }
    }
  }, [navigate, addToast]);

  /**
   * Navigate to a specific ride detail page
   * 
   * @param {string} rideId - UUID of the ride
   * @param {string} feedCategory - Feed category (for determining route)
   */
  const navigateToRide = useCallback((rideId, feedCategory) => {
    if (!rideId) return;

    const basePath = userType === 'passenger' ? '/rides' : '/driver/rides';
    
    // Determine route based on feed category
    if (feedCategory === 'active' || feedCategory === 'in_progress') {
      navigate(`${basePath}/${rideId}/active`);
    } else if (feedCategory === 'completed') {
      navigate(`${basePath}/${rideId}/completed`);
    } else {
      navigate(`${basePath}/${rideId}`);
    }
  }, [userType, navigate]);

  /**
   * Handle ride cancellation
   * Shows message and navigates back to list
   * 
   * @param {string} rideId - UUID of the cancelled ride
   * @param {string} reason - Cancellation reason
   */
  const handleRideCancellation = useCallback((rideId, reason) => {
    console.log('[Feed Transitions] Ride cancelled:', { rideId, reason });
    
    // Remove from current list
    if (feedActions.removeRideFromCurrentList) {
      feedActions.removeRideFromCurrentList(rideId);
    }

    // Navigate back to list
    const listPath = userType === 'passenger' ? '/rides' : '/driver/rides';
    navigate(listPath);
  }, [userType, feedActions, navigate]);

  /**
   * Handle offer acceptance (passenger accepting driver offer)
   * Transitions ride from pending to active
   * 
   * @param {Object} ride - Ride object
   */
  const handleOfferAcceptance = useCallback((ride) => {
    console.log('[Feed Transitions] Offer accepted, transitioning to active');
    
    // Remove from pending list
    if (feedActions.removeRideFromCurrentList) {
      feedActions.removeRideFromCurrentList(ride.id);
    }

    // Navigate to active ride view
    navigateToRide(ride.id, 'active');
  }, [feedActions, navigateToRide]);

  /**
   * Handle ride completion
   * Transitions ride from active to completed
   * 
   * @param {Object} ride - Ride object
   */
  const handleRideCompletion = useCallback((ride) => {
    console.log('[Feed Transitions] Ride completed');
    
    // Remove from active list
    if (feedActions.removeRideFromCurrentList) {
      feedActions.removeRideFromCurrentList(ride.id);
    }

    // Navigate to completed view
    navigateToRide(ride.id, 'completed');
  }, [feedActions, navigateToRide]);

  return {
    handleStateChange,
    navigateToRide,
    handleRideCancellation,
    handleOfferAcceptance,
    handleRideCompletion
  };
}
