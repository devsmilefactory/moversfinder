import React, { useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';

/**
 * SharedRatingModal
 * Role-aware rating modal used by both passenger and driver flows.
 * Delegates actual persistence to Supabase via props.
 */
const SharedRatingModal = ({
  isOpen,
  onClose,
  ride,
  role = 'passenger',
  onSubmitRating,
  submitting = false,
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [saveTrip, setSaveTrip] = useState(false); // passenger only
  const [issues, setIssues] = useState([]); // driver only

  if (!isOpen) return null;

  const isPassenger = role === 'passenger';

  const handleToggleIssue = (issueId) => {
    setIssues((prev) =>
      prev.includes(issueId)
        ? prev.filter((id) => id !== issueId)
        : [...prev, issueId]
    );
  };

  const getRatingLabel = () => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    };
    return labels[hoverRating || rating] || 'Select a rating';
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!onSubmitRating) return;

    await onSubmitRating({
      rating,
      review,
      saveTrip: isPassenger ? saveTrip : undefined,
      issues: !isPassenger ? issues : undefined,
    });
  };

  const passengerIssueTypes = [];

  const driverIssueTypes = [
    { id: 'payment', label: 'Payment Issue', icon: '💰' },
    { id: 'behavior', label: 'Inappropriate Behavior', icon: '⚠️' },
    { id: 'cleanliness', label: 'Left Mess in Vehicle', icon: '🧹' },
    { id: 'late', label: 'Customer Was Late', icon: '⏰' },
    { id: 'wrong_location', label: 'Wrong Pickup Location', icon: '📍' },
  ];

  const issueTypes = isPassenger ? passengerIssueTypes : driverIssueTypes;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {isPassenger ? 'Rate Your Ride' : 'Rate Your Trip'}
          </h2>
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
          {ride && (
            <div className="mb-6 bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-2">
                <div className="font-medium">
                  From: {ride.pickup_address || ride.pickup_location}
                </div>
                <div className="font-medium">
                  To: {ride.dropoff_address || ride.dropoff_location}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(ride.trip_completed_at || ride.created_at).toLocaleString()}
              </div>
            </div>
          )}

          {/* Star Rating */}
          <div className="mb-6">
            <div className="text-center mb-4">
              <div className="text-sm font-medium text-slate-700 mb-2">
                {isPassenger
                  ? 'How was your experience?'
                  : 'How was your experience with this customer?'}
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
                  {getRatingLabel()}
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
              placeholder={
                isPassenger
                  ? 'Tell us more about your experience...'
                  : 'Share your experience with this customer...'
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />

            {isPassenger && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  id="saveTrip"
                  type="checkbox"
                  checked={saveTrip}
                  onChange={(e) => setSaveTrip(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="saveTrip" className="text-sm text-slate-700">
                  Save this trip for quick rebooking
                </label>
              </div>
            )}
          </div>

          {/* Driver Issue Reporting */}
          {!isPassenger && issueTypes.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Report Issues (Optional)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {issueTypes.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleToggleIssue(issue.id)}
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
          )}

          {/* Actions */}
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
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Rating'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedRatingModal;

