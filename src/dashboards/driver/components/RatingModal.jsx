import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * RatingModal Component
 * 
 * Modal for drivers to rate customers after trip completion
 * Features:
 * - 5-star rating system
 * - Optional review text
 * - Issue reporting (payment, behavior, cleanliness)
 * - Submit rating to database
 */
const RatingModal = ({ trip, onClose, onRatingSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [issues, setIssues] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Available issue types
  const issueTypes = [
    { id: 'payment', label: 'Payment Issue', icon: '💰' },
    { id: 'behavior', label: 'Inappropriate Behavior', icon: '⚠️' },
    { id: 'cleanliness', label: 'Left Mess in Vehicle', icon: '🧹' },
    { id: 'late', label: 'Customer Was Late', icon: '⏰' },
    { id: 'wrong_location', label: 'Wrong Pickup Location', icon: '📍' },
  ];

  // Toggle issue selection
  const toggleIssue = (issueId) => {
    setIssues(prev =>
      prev.includes(issueId)
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  // Submit rating
  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Update ride with rating
      const { error: rideError } = await supabase
        .from('rides')
        .update({
          rating: rating,
          driver_review: review || null,
          driver_reported_issues: issues.length > 0 ? issues : null,
          rated_at: new Date().toISOString()
        })
        .eq('id', trip.id);

      if (rideError) throw rideError;

      // If there are issues, create a complaint record
      if (issues.length > 0) {
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
            status: 'pending'
          });

        // Don't fail if complaints table doesn't exist yet
        if (complaintError && !complaintError.message.includes('does not exist')) {
          console.error('Error creating complaint:', complaintError);
        }
      }

      alert('✅ Thank you for your feedback!');
      
      // Call callback
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

  // Star rating component
  const StarRating = () => {
    return (
      <div className="flex items-center justify-center gap-2 my-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-5xl transition-transform hover:scale-110 focus:outline-none"
          >
            {star <= (hoverRating || rating) ? (
              <span className="text-yellow-400">⭐</span>
            ) : (
              <span className="text-gray-300">☆</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  // Rating labels
  const getRatingLabel = () => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return labels[hoverRating || rating] || 'Select a rating';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Rate Your Trip</h2>
          <p className="text-slate-200 mt-1">How was your experience with this customer?</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Trip Info */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🚕</div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">
                  {trip.service_type === 'taxi' ? 'Taxi Ride' : 
                   trip.service_type === 'courier' ? 'Courier Delivery' :
                   trip.service_type === 'school_run' ? 'School Run' : 'Errand Service'}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  <div>📍 {trip.pickup_address || 'Pickup location'}</div>
                  <div>📍 {trip.dropoff_address || 'Dropoff location'}</div>
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  Fare: ${parseFloat(trip.fare || trip.estimated_cost || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="text-center">
            <StarRating />
            <p className="text-lg font-semibold text-slate-700 mb-6">
              {getRatingLabel()}
            </p>
          </div>

          {/* Review Text */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience with this customer..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
              rows="3"
            />
          </div>

          {/* Issue Reporting */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Report Issues (Optional)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {issueTypes.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => toggleIssue(issue.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                    issues.includes(issue.id)
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">{issue.icon}</span>
                  <span className="font-medium">{issue.label}</span>
                  {issues.includes(issue.id) && (
                    <span className="ml-auto text-red-500">✓</span>
                  )}
                </button>
              ))}
            </div>
            {issues.length > 0 && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Selected issues will be reported to support for review
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;

