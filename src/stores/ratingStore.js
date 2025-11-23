import { create } from 'zustand';

/**
 * ratingStore
 *
 * Tracks which rides have already shown an auto-triggered rating modal
 * in this session, to prevent duplicate rating modals firing from
 * multiple realtime listeners / screens.
 */

const useRatingStore = create((set, get) => ({
  // Set of ride IDs that have already shown a rating modal
  shownRatingModals: new Set(),

  /**
   * Whether we should auto-show a rating modal for this ride.
   * Only true if the ride is not yet rated and we haven't already
   * shown a rating modal for it in this session.
   */
  shouldShowRating: (rideId, ratedAt) => {
    if (!rideId) return false;
    const shown = get().shownRatingModals;
    return !ratedAt && !shown.has(rideId);
  },

  /**
   * Mark a ride as having shown its rating modal.
   */
  markRatingShown: (rideId) => {
    if (!rideId) return;
    set((state) => ({
      shownRatingModals: new Set([...state.shownRatingModals, rideId]),
    }));
  },

  /**
   * Clear all session tracking (e.g. on logout if needed).
   */
  clearShownRatings: () => {
    set({ shownRatingModals: new Set() });
  },
}));

export default useRatingStore;

