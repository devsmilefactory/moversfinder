import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../components/ui/ToastProvider';
import { getUpcomingRecurringRides, cancelRecurringSeries } from '../../../utils/recurringRides';

const RecurringSeriesControls = ({ userId }) => {
  const { addToast } = useToast();
  const [patternInput, setPatternInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState([]);

  const parsedPattern = useMemo(() => {
    const trimmed = (patternInput || '').trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed); } catch { return trimmed; }
    }
    return trimmed; // treat as primitive string pattern
  }, [patternInput]);

  const loadUpcoming = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { success, data, error } = await getUpcomingRecurringRides(userId, parsedPattern || undefined);
      if (!success) throw new Error(error || 'Failed to load recurring rides');
      setRides(data || []);
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to load recurring rides', message: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  const onCancelSeries = async () => {
    if (!userId) return;
    if (!parsedPattern) { addToast({ type: 'warn', title: 'Pattern required', message: 'Enter the recurrence pattern to cancel.' }); return; }
    const confirmed = window.confirm('Cancel all upcoming rides matching this recurring pattern? This cannot be undone.');
    if (!confirmed) return;
    setLoading(true);
    try {
      const { success, count, error } = await cancelRecurringSeries(userId, parsedPattern);
      if (!success) throw new Error(error || 'Failed to cancel series');
      addToast({ type: 'success', title: 'Recurring series cancelled', message: `Cancelled ${count} upcoming rides.` });
      await loadUpcoming();
    } catch (e) {
      addToast({ type: 'error', title: 'Cancel failed', message: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-2">Manage Recurring Series</h2>
      <p className="text-sm text-slate-600 mb-4">Enter the recurrence pattern to view/cancel upcoming rides. Paste JSON or a simple string (e.g., "daily").</p>

      <textarea
        className="w-full border rounded-md p-2 text-sm mb-3"
        rows={3}
        placeholder='e.g. "daily" or {"type":"weekdays","month":"2025-11","time":"08:00"}'
        value={patternInput}
        onChange={(e) => setPatternInput(e.target.value)}
      />

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={loadUpcoming} disabled={loading || !userId}
          className="px-3 py-2 bg-slate-800 text-white rounded disabled:opacity-50">{loading ? 'Loading…' : 'Load upcoming'}</button>
        <button type="button" onClick={onCancelSeries} disabled={loading || !userId || !parsedPattern}
          className="px-3 py-2 bg-red-600 text-white rounded disabled:opacity-50">Cancel series</button>
      </div>

      {!!rides.length && (
        <div className="border rounded-md p-3 max-h-48 overflow-auto">
          <div className="text-xs text-slate-600 mb-2">Upcoming rides matching pattern: {rides.length}</div>
          <ul className="space-y-1 text-sm">
            {rides.slice(0, 50).map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span className="text-slate-700">{new Date(r.scheduled_datetime).toLocaleString()}</span>
                <span className="text-slate-500">{r.status || r.ride_status}</span>
              </li>
            ))}
          </ul>
          {rides.length > 50 && <div className="text-xs text-slate-500 mt-2">Showing first 50…</div>}
        </div>
      )}
    </div>
  );
};

export default RecurringSeriesControls;

