import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import SharedRatingModal from '../../../components/shared/SharedRatingModal';
import { confirmPayment } from '../../../services/rideStateService';

/**
 * Passenger RatingModal wrapper around SharedRatingModal.
 * Persists rating data for rides.
 */
const RatingModal = ({ isOpen, onClose, ride }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRating = async ({ rating, review, saveTrip }) => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update rating metadata
      const { error: metaError } = await supabase
        .from('rides')
        .update({
          rating,
          review: review || null,
          rated_at: new Date().toISOString(),
          ...(saveTrip ? { is_saved_template: true } : {}),
        })
        .eq('id', ride.id);

      if (metaError) throw metaError;

      // 2. Transition state to COMPLETED_FINAL via RPC (Single Source of Truth)
      // This will update ride_status to 'completed' and categories to 'completed'
      await confirmPayment(ride.id, ride.user_id);

      alert('✅ Thank you for your feedback!');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('❌ Failed to submit rating: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle modal close: Transition to finalized state if not already done
  const handleClose = async () => {
    // If ride is still in trip_completed state, transition to completed when modal closes
    if (ride?.ride_status === 'trip_completed' || ride?.state === 'COMPLETED_INSTANCE') {
      try {
        await confirmPayment(ride.id, ride.user_id);
      } catch (error) {
        console.error('Error transitioning ride to completed state:', error);
      }
    }
    onClose();
  };

  return (
    <SharedRatingModal
      isOpen={isOpen}
      onClose={handleClose}
      ride={ride}
      role="passenger"
      submitting={submitting}
      onSubmitRating={handleSubmitRating}
    />
  );
};

export default RatingModal;

