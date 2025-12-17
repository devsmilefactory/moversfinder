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
      // Per spec: Transition from A3 (trip_completed) to C1 (completed) when modal closes
      const { error: rideError } = await supabase
        .from('rides')
        .update({
          passenger_rating: rating,
          driver_review: review || null,
          driver_reported_issues: issues && issues.length > 0 ? issues : null,
          driver_rated_at: new Date().toISOString(),
          // Transition from trip_completed (A3) to completed (C1) per spec
          ride_status: trip.ride_status === 'trip_completed' ? 'completed' : trip.ride_status,
          status: trip.ride_status === 'trip_completed' ? 'completed' : trip.status,
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

  // Handle modal close: Transition from A3 (trip_completed) to C1 (completed) per spec
  const handleClose = async () => {
    // If ride is still in trip_completed state, transition to completed when modal closes
    if (trip?.ride_status === 'trip_completed') {
      try {
        await supabase
          .from('rides')
          .update({
            ride_status: 'completed',
            status: 'completed',
          })
          .eq('id', trip.id);
      } catch (error) {
        console.error('Error transitioning ride to completed state:', error);
      }
    }
    onClose();
  };

  return (
    <SharedRatingModal
      isOpen={!!trip}
      onClose={handleClose}
      ride={trip}
      role="driver"
      submitting={submitting}
      onSubmitRating={handleSubmitRating}
    />
  );
};

export default RatingModal;

