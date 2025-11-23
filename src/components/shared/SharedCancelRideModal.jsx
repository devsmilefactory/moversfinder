import React, { useState } from 'react';
import Button from '../ui/Button';

/**
 * SharedCancelRideModal
 *
 * Role-aware cancel modal that delegates the actual cancellation to caller.
 * Caller is responsible for invoking useCancelRide with the provided reason.
 */
const SharedCancelRideModal = ({
  open,
  onClose,
  onConfirm,
  role = 'passenger',
  initialReason,
}) => {
  const passengerReasons = [
    'Change of plans',
    'Booked by mistake',
    'Found alternative transport',
    'Driver taking too long',
    'Price too high',
    'Other',
  ];

  const driverReasons = [
    'Passenger no-show',
    'Passenger requested cancellation',
    'Vehicle issue',
    'Traffic/delay',
    'Price issue',
    'Trip Completed',
    'Other',
  ];

  const options = role === 'driver' ? driverReasons : passengerReasons;

  const [reason, setReason] = useState(initialReason || options[0]);
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const isOther = reason === 'Other';

  const handleSubmit = async () => {
    const finalReason = isOther ? (otherText || 'Other') : reason;
    try {
      setSubmitting(true);
      await onConfirm?.(finalReason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Cancel ride</h3>
          <p className="text-sm text-gray-500 mt-1">
            Please tell us why you're cancelling. This helps improve the service.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {role === 'driver' ? (
            <div className="space-y-2">
              {options.map((r) => (
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
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {options.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-sm px-3 py-2 rounded border ${
                    reason === r
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {isOther && (
            <textarea
              rows={3}
              placeholder="Briefly describe..."
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          )}
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Close
          </Button>
          <Button variant="danger" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Cancelling…' : 'Confirm cancel'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedCancelRideModal;

