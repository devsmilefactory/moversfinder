import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';

/**
 * Driver Earnings Page
 *
 * Features:
 * - Earnings overview (today, week, month, total)
 * - Earnings breakdown by ride
 * - Payout history table
 * - Request payout button
 * - Pending payouts display
 * - Payment method selection
 * - Earnings charts (visual representation)
 *
 * Supabase Integration:
 * - Fetches earnings from rides table (aggregated by period)
 * - Fetches ride history with earnings
 * - Fetches payout history from payments table
 * - Creates payout requests via driver store
 */

const EarningsPage = () => {
  const user = useAuthStore((state) => state.user);
  const { earnings, rides, payouts, loading, loadEarnings, loadRideHistory, loadPayouts, requestPayout } = useDriverStore();

  useEffect(() => {
    if (user?.id) {
      loadEarnings(user.id);
      loadRideHistory(user.id, { limit: 20 });
      loadPayouts(user.id);
    }
  }, [user?.id, loadEarnings, loadRideHistory, loadPayouts]);

  // State management
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('ecocash');
  const [payoutAmount, setPayoutAmount] = useState('');

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
    };
    const badge = badges[status];
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  // Request payout
  const handleRequestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      alert('Please enter a valid payout amount');
      return;
    }

    if (parseFloat(payoutAmount) > (earnings?.available || 0)) {
      alert('Payout amount exceeds available balance');
      return;
    }

    try {
      await requestPayout(parseFloat(payoutAmount), paymentMethod);
      setShowPayoutModal(false);
      setPayoutAmount('');
      alert(`Payout request submitted!\n\nAmount: $${parseFloat(payoutAmount).toFixed(2)}\nMethod: ${paymentMethod}\n\nYour payout will be processed within 1-2 business days.`);
    } catch (error) {
      alert(`Failed to request payout: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading earnings...</div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Earnings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your earnings and request payouts
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowPayoutModal(true)}
            disabled={(earnings?.available || 0) === 0}
          >
            Request Payout
          </Button>
        </div>

        {/* Earnings Overview Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border-2 border-green-200">
            <p className="text-sm text-green-700 mb-1">Today's Earnings</p>
            <p className="text-3xl font-bold text-green-700">${(earnings?.today || 0).toFixed(2)}</p>
            {earnings?.todayTrend && (
              <p className="text-xs text-green-600 mt-2">
                {earnings.todayTrend.isPositive ? '↑' : '↓'} {earnings.todayTrend.value}% from yesterday
              </p>
            )}
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border-2 border-blue-200">
            <p className="text-sm text-blue-700 mb-1">This Week</p>
            <p className="text-3xl font-bold text-blue-700">${(earnings?.week || 0).toFixed(2)}</p>
            {earnings?.weekTrend && (
              <p className="text-xs text-blue-600 mt-2">
                {earnings.weekTrend.isPositive ? '↑' : '↓'} {earnings.weekTrend.value}% from last week
              </p>
            )}
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-lg p-6 border-2 border-yellow-200">
            <p className="text-sm text-yellow-700 mb-1">This Month</p>
            <p className="text-3xl font-bold text-yellow-700">${(earnings?.month || 0).toFixed(2)}</p>
            {earnings?.monthTrend && (
              <p className="text-xs text-yellow-600 mt-2">
                {earnings.monthTrend.isPositive ? '↑' : '↓'} {earnings.monthTrend.value}% from last month
              </p>
            )}
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-lg p-6 border-2 border-purple-200">
            <p className="text-sm text-purple-700 mb-1">Total Earnings</p>
            <p className="text-3xl font-bold text-purple-700">${(earnings?.total || 0).toFixed(2)}</p>
            <p className="text-xs text-purple-600 mt-2">All time</p>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-2">Available for Payout</h2>
              <p className="text-4xl font-bold text-yellow-600">${(earnings?.available || 0).toFixed(2)}</p>
              <p className="text-sm text-slate-500 mt-2">
                Pending: ${(earnings?.pending || 0).toFixed(2)} (will be available after ride completion)
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowPayoutModal(true)}
              disabled={(earnings?.available || 0) === 0}
            >
              Request Payout
            </Button>
          </div>
        </div>

        {/* Recent Rides Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Recent Rides</h2>
          {rides && rides.length > 0 ? (
            <div className="space-y-3">
              {rides.map((ride) => (
                <div key={ride.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {new Date(ride.created_at).toLocaleDateString()} at {new Date(ride.created_at).toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-slate-500">• {ride.distance} km</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-green-500">📍</span>
                      <span>{ride.pickup_location}</span>
                      <span>→</span>
                      <span className="text-red-500">📍</span>
                      <span>{ride.dropoff_location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">+${ride.fare?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No rides yet
            </div>
          )}
        </div>

        {/* Payout History */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700">Payout History</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!payouts || payouts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No payout history yet
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{payout.transaction_id || payout.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-green-600">${payout.amount?.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{payout.payment_method}</td>
                    <td className="px-6 py-4">{getStatusBadge(payout.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Payout Modal */}
      <Modal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Request Payout"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
            <p className="text-sm text-yellow-700 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-yellow-700">${(earnings?.available || 0).toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Payout Amount
            </label>
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="Enter amount"
              max={earnings?.available || 0}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="ecocash">EcoCash</option>
              <option value="onemoney">OneMoney</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="telecash">TeleCash</option>
            </select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Payouts are processed within 1-2 business days. You will receive a confirmation once the payout is complete.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowPayoutModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRequestPayout}>
              Confirm Payout Request
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EarningsPage;

