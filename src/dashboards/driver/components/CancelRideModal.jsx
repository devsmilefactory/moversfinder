import React, { useState } from 'react';
import Button from '../../../components/ui/Button';

const reasons = [
  'Passenger no-show',
  'Passenger requested cancellation',
  'Vehicle issue',
  'Traffic/delay',
  'Price issue',
  'Other',
];

const CancelRideModal = ({ open, onClose, onConfirm }) => {
  const [reason, setReason] = useState(reasons[0]);
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const finalReason = reason === 'Other' ? (otherText || 'Other') : reason;
    try {
      setSubmitting(true);
      await onConfirm?.(finalReason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-lg shadow-xl p-5">
        <div className="text-lg font-semibold mb-2">Cancel Ride</div>
        <div className="text-sm text-slate-600 mb-4">
          Please select a reason for cancelling this ride.
        </div>

        <div className="space-y-2 mb-4">
          {reasons.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="cancel-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              <span>{r}</span>
            </label>
          ))}
        </div>

        {reason === 'Other' && (
          <div className="mb-4">
            <textarea
              className="w-full border rounded-md p-2 text-sm"
              rows={3}
              placeholder="Enter reason"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Keep Ride</Button>
          <Button variant="danger" onClick={submit} loading={submitting} disabled={submitting}>
            Cancel Ride
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CancelRideModal;

