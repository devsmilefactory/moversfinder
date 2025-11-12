import React, { useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Button from '../../shared/Button';

/**
 * Rating Modal for completed rides
 * Allows passengers to rate their driver
 */
const RatingModal = ({ isOpen, onClose, ride }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          rating: rating,
          review: review || null,
          rated_at: new Date().toISOString()
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Rate Your Ride</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Trip Summary */}
          <div className="mb-6 bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-2">
              <div className="font-medium">From: {ride.pickup_address || ride.pickup_location}</div>
              <div className="font-medium">To: {ride.dropoff_address || ride.dropoff_location}</div>
            </div>
            <div className="text-xs text-slate-500">
              {new Date(ride.trip_completed_at || ride.created_at).toLocaleString()}
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <div className="text-center mb-4">
              <div className="text-sm font-medium text-slate-700 mb-2">
                How was your experience?
              </div>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <div className="mt-2 text-sm font-medium text-slate-600">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </div>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell us more about your experience..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Rating'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;

