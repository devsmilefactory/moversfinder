import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import SharedRatingModal from '../../../components/shared/SharedRatingModal';

/**
 * Driver RatingModal wrapper around SharedRatingModal.
 * Persists driver's rating of the passenger and optional complaints.
 */
const RatingModal = ({ trip, onClose, onRatingSubmitted }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRating = async ({ rating, review, issues }) => {
    if (rating === 0) {
      alert('Please select a rating before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Update ride with driver's rating of passenger
      const { error: rideError } = await supabase
        .from('rides')
        .update({
          passenger_rating: rating,
          driver_review: review || null,
          driver_reported_issues: issues && issues.length > 0 ? issues : null,
          driver_rated_at: new Date().toISOString(),
        })
        .eq('id', trip.id);

      if (rideError) throw rideError;

      // If there are issues, create a complaint record
      if (issues && issues.length > 0) {
        const { error: complaintError } = await supabase
          .from('complaints')
          .insert({
            ride_id: trip.id,
            complainant_id: trip.driver_id,
            complainant_type: 'driver',
            against_id: trip.user_id,
            against_type: 'customer',
            complaint_type: issues.join(', '),
            description: review || 'Issues reported during trip completion',
            status: 'pending',
          });

        // Don't fail if complaints table doesn't exist yet
        if (complaintError && !complaintError.message.includes('does not exist')) {
          console.error('Error creating complaint:', complaintError);
        }
      }

      alert('✅ Thank you for your feedback!');

      if (onRatingSubmitted) {
        onRatingSubmitted(trip.id, rating);
      }

      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('❌ Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SharedRatingModal
      isOpen={!!trip}
      onClose={onClose}
      ride={trip}
      role="driver"
      submitting={submitting}
      onSubmitRating={handleSubmitRating}
    />
  );
};

export default RatingModal;

