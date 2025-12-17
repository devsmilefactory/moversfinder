import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import SharedRatingModal from '../../../components/shared/SharedRatingModal';

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
      // Per spec: Transition from A3 (trip_completed) to C1 (completed) when modal closes
      const { error } = await supabase
        .from('rides')
        .update({
          rating,
          review: review || null,
          rated_at: new Date().toISOString(),
          ...(saveTrip ? { is_saved_template: true } : {}),
          // Transition from trip_completed (A3) to completed (C1) per spec
          ride_status: ride.ride_status === 'trip_completed' ? 'completed' : ride.ride_status,
          status: ride.ride_status === 'trip_completed' ? 'completed' : ride.status,
        })
        .eq('id', ride.id);

      if (error) throw error;

      alert('✅ Thank you for your feedback!');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('❌ Failed to submit rating: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle modal close: Transition from A3 (trip_completed) to C1 (completed) per spec
  const handleClose = async () => {
    // If ride is still in trip_completed state, transition to completed when modal closes
    if (ride?.ride_status === 'trip_completed') {
      try {
        await supabase
          .from('rides')
          .update({
            ride_status: 'completed',
            status: 'completed',
          })
          .eq('id', ride.id);
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

