import { useCallback, useState } from 'react';
import useRatingStore from '../stores/ratingStore';

/**
 * useDriverPostRideFlow
 *
 * Modularizes driver post-ride UX (rating modal + tab switch) so large pages
 * (e.g. DriverRidesPage) don’t grow as features are added.
 *
 * This is intentionally "policy + UI state" only; DB transitions are handled elsewhere.
 */
export function useDriverPostRideFlow({ refreshFeed, changeTab } = {}) {
  const { shouldShowRating, markRatingShown } = useRatingStore();

  const [showDriverRatingModal, setShowDriverRatingModal] = useState(false);
  const [driverRideToRate, setDriverRideToRate] = useState(null);

  const handleRideCompleted = useCallback(
    (completedRide) => {
      if (!completedRide?.id) return;
      if (shouldShowRating(completedRide.id, completedRide.driver_rated_at)) {
        markRatingShown(completedRide.id);
        setDriverRideToRate(completedRide);
        setShowDriverRatingModal(true);
      }
    },
    [shouldShowRating, markRatingShown]
  );

  const handleCloseRatingModal = useCallback(async () => {
    try {
      await refreshFeed?.();
    } catch {}
    setShowDriverRatingModal(false);
    setDriverRideToRate(null);
    changeTab?.('COMPLETED');
  }, [refreshFeed, changeTab]);

  const handleRatingSubmitted = useCallback(() => {
    changeTab?.('COMPLETED');
  }, [changeTab]);

  return {
    showDriverRatingModal,
    driverRideToRate,
    handleRideCompleted,
    handleCloseRatingModal,
    handleRatingSubmitted,
  };
}


