import React, { useState } from 'react';
import { useToast } from '../../../components/ui/ToastProvider';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores';

/**
 * ComplaintModal Component
 * 
 * Modal for drivers to submit complaints about customers or rides
 * Features:
 * - Complaint type selection
 * - Detailed description
 * - Optional ride association
 * - Submit to admin for review
 */
const ComplaintModal = ({ ride, onClose, onComplaintSubmitted }) => {
  const { addToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const [complaintType, setComplaintType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Complaint types
  const complaintTypes = [
    { id: 'payment_issue', label: 'Payment Issue', icon: '💰', description: 'Customer refused to pay or payment dispute' },
    { id: 'inappropriate_behavior', label: 'Inappropriate Behavior', icon: '⚠️', description: 'Rude, aggressive, or inappropriate conduct' },
    { id: 'safety_concern', label: 'Safety Concern', icon: '🚨', description: 'Felt unsafe or threatened during ride' },
    { id: 'property_damage', label: 'Property Damage', icon: '🔧', description: 'Customer damaged vehicle or belongings' },
    { id: 'no_show', label: 'No Show', icon: '👻', description: 'Customer did not show up at pickup location' },
    { id: 'wrong_location', label: 'Wrong Location', icon: '📍', description: 'Provided incorrect pickup/dropoff address' },
    { id: 'other', label: 'Other', icon: '📝', description: 'Other complaint not listed above' },
  ];

  // Submit complaint
  const handleSubmit = async () => {
    if (!complaintType) {
      addToast({ type: 'warn', title: 'Select a complaint type' });
      return;
    }

    if (!description.trim()) {
      addToast({ type: 'warn', title: 'Add complaint description' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .insert({
          ride_id: ride?.id || null,
          complainant_id: user.id,
          complainant_type: 'driver',
          against_id: ride?.user_id || null,
          against_type: ride?.user_id ? 'customer' : null,
          complaint_type: complaintType,
          description: description.trim(),
          status: 'pending'
        });

      if (error) throw error;

      addToast({ type: 'success', title: 'Complaint submitted', message: 'Support will review it shortly' });
      
      if (onComplaintSubmitted) {
        onComplaintSubmitted();
      }

      onClose();
    } catch (error) {
      console.error('Error submitting complaint:', error);
      addToast({ type: 'error', title: 'Failed to submit complaint' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Submit Complaint</h2>
          <p className="text-red-100 mt-1">Report an issue with a customer or ride</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Ride Info (if provided) */}
          {ride && (
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🚕</div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">
                    Ride #{ride.id.slice(0, 8)}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    <div>📍 {ride.pickup_address || 'Pickup location'}</div>
                    <div>📍 {ride.dropoff_address || 'Dropoff location'}</div>
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    {new Date(ride.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Complaint Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Complaint Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {complaintTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setComplaintType(type.id)}
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                    complaintType === type.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div className="flex-1">
                    <div className={`font-semibold ${complaintType === type.id ? 'text-red-700' : 'text-slate-800'}`}>
                      {type.label}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {type.description}
                    </div>
                  </div>
                  {complaintType === type.id && (
                    <span className="text-red-500 text-xl">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed information about the complaint. Include dates, times, and any relevant details..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
              rows="6"
            />
            <p className="text-xs text-slate-500 mt-2">
              Be as specific as possible. This information will be reviewed by our support team.
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800">Important Notice</p>
                <p className="text-sm text-yellow-700 mt-1">
                  False or malicious complaints may result in account suspension. Please ensure all information provided is accurate and truthful.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !complaintType || !description.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintModal;

