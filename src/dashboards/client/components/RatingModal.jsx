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
      const { error } = await supabase
        .from('rides')
        .update({
          rating,
          review: review || null,
          rated_at: new Date().toISOString(),
          ...(saveTrip ? { is_saved_template: true } : {}),
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

  return (
    <SharedRatingModal
      isOpen={isOpen}
      onClose={onClose}
      ride={ride}
      role="passenger"
      submitting={submitting}
      onSubmitRating={handleSubmitRating}
    />
  );
};

export default RatingModal;

