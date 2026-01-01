import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import SharedRatingModal from '../../../components/shared/SharedRatingModal';
import { finalizeRideAsDriver } from '../../../services/rideStateService';
import { useToast } from '../../../components/ui/ToastProvider';

/**
 * Driver RatingModal wrapper around SharedRatingModal.
 * Persists driver's rating of the passenger and optional complaints.
 */
const RatingModal = ({ trip, onClose, onRatingSubmitted }) => {
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

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
          // Do NOT force ride_status here; prefer canonical RPC finalization below.
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

      // Canonical finalization: move state from COMPLETED_INSTANCE -> COMPLETED_FINAL via RPC (if allowed).
      // If server rejects driver finalization, do NOT write ride_status directly (avoid mixed truth).
      // Passenger can still finalize via their post-ride flow.
      if (trip?.ride_status === 'trip_completed') {
        try {
          await finalizeRideAsDriver(trip.id, trip.driver_id);
        } catch (e) {
          addToast?.({
            type: 'info',
            title: 'Waiting for passenger confirmation',
            message: 'Ride is completed. Passenger will confirm to finalize.',
            duration: 6000
          });
        }
      }

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
        // Prefer canonical RPC finalization (state -> COMPLETED_FINAL) where allowed.
        await finalizeRideAsDriver(trip.id, trip.driver_id);
      } catch (error) {
        addToast?.({
          type: 'info',
          title: 'Waiting for passenger confirmation',
          message: 'Ride is completed. Passenger will confirm to finalize.',
          duration: 6000
        });
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

