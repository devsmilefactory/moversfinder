import React, { useState } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';

/**
 * Admin Financial Page (BMTOA - Cross-Platform)
 *
 * Features:
 * - Financial overview
 * - Commission tracking
 * - Payout management
 * - Revenue breakdown
 *
 * Database Integration Ready:
 * - Fetch: SELECT * FROM transactions, commissions, payouts
 * - Update: UPDATE payouts SET status = 'processed' WHERE id = ?
 */

const FinancialPage = () => {
  const [filter, setFilter] = useState('all');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);

  const financialStats = {
    totalRevenue: 45678.50,
    platformCommission: 6851.78,
    pendingPayouts: 3245.00,
    processedPayouts: 38586.72,
    taxicabRevenue: 32450.00,
    bmtoaRevenue: 13228.50
  };

  const pendingPayouts = [
    {
      id: 1,
      recipient: 'Driver: John Doe',
      platform: 'TaxiCab',
      amount: 456.00,
      rides: 34,
      period: 'Dec 15-31, 2024',
      requestDate: '2025-01-01',
      method: 'EcoCash'
    },
    {
      id: 2,
      recipient: 'Operator: ABC Taxis',
      platform: 'BMTOA',
      amount: 1234.00,
      rides: 89,
      period: 'Dec 15-31, 2024',
      requestDate: '2025-01-01',
      method: 'Bank Transfer'
    },
    {
      id: 3,
      recipient: 'Driver: Sarah Moyo',
      platform: 'TaxiCab',
      amount: 389.00,
      rides: 28,
      period: 'Dec 15-31, 2024',
      requestDate: '2025-01-02',
      method: 'OneMoney'
    },
    {
      id: 4,
      recipient: 'Operator: XYZ Transport',
      platform: 'BMTOA',
      amount: 1166.00,
      rides: 76,
      period: 'Dec 15-31, 2024',
      requestDate: '2025-01-02',
      method: 'Bank Transfer'
    }
  ];

  const recentTransactions = [
    { date: '2025-01-02', type: 'Ride Payment', platform: 'TaxiCab', amount: 25.00, commission: 5.00 },
    { date: '2025-01-02', type: 'Ride Payment', platform: 'BMTOA', amount: 18.50, commission: 2.78 },
    { date: '2025-01-02', type: 'Membership Fee', platform: 'BMTOA', amount: 50.00, commission: 50.00 },
    { date: '2025-01-01', type: 'Ride Payment', platform: 'TaxiCab', amount: 32.00, commission: 6.40 },
    { date: '2025-01-01', type: 'Corporate Billing', platform: 'TaxiCab', amount: 450.00, commission: 90.00 }
  ];

  const commissionBreakdown = [
    { category: 'Individual Rides', revenue: 15234.00, commission: 3046.80, rate: '20%' },
    { category: 'Corporate Rides', revenue: 12450.00, commission: 2490.00, rate: '20%' },
    { category: 'BMTOA Member Rides', revenue: 8994.50, commission: 1349.18, rate: '15%' },
    { category: 'Membership Fees', revenue: 9000.00, commission: 9000.00, rate: '100%' }
  ];

  const processPayout = (payout) => {
    setSelectedPayout(payout);
    setShowPayoutModal(true);
  };

  const confirmPayout = () => {
    // Database integration:
    // await supabase
    //   .from('payouts')
    //   .update({
    //     status: 'processed',
    //     processed_date: new Date(),
    //     processed_by: currentAdminId
    //   })
    //   .eq('id', selectedPayout.id);

    setShowPayoutModal(false);
    setSelectedPayout(null);
    alert(`Payout of $${selectedPayout.amount.toFixed(2)} processed successfully!`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Financial Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage revenue, commissions, and payouts across both platforms
          </p>
        </div>
        <Button variant="primary">
          Generate Report
        </Button>
      </div>

      {/* Financial Overview */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border-2 border-green-200">
          <p className="text-sm text-green-700 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-700">${financialStats.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-2">This month</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-lg p-6 border-2 border-yellow-200">
          <p className="text-sm text-yellow-700 mb-1">Platform Commission</p>
          <p className="text-3xl font-bold text-yellow-700">${financialStats.platformCommission.toFixed(2)}</p>
          <p className="text-xs text-yellow-600 mt-2">15-20% of revenue</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-lg p-6 border-2 border-red-200">
          <p className="text-sm text-red-700 mb-1">Pending Payouts</p>
          <p className="text-3xl font-bold text-red-700">${financialStats.pendingPayouts.toFixed(2)}</p>
          <p className="text-xs text-red-600 mt-2">{pendingPayouts.length} requests</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border-2 border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Processed Payouts</p>
          <p className="text-3xl font-bold text-blue-700">${financialStats.processedPayouts.toFixed(2)}</p>
          <p className="text-xs text-blue-600 mt-2">This month</p>
        </div>
      </div>

      {/* Pending Payouts */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Pending Payouts ({pendingPayouts.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Recipient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rides</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pendingPayouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{payout.recipient}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      payout.platform === 'TaxiCab' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payout.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{payout.period}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{payout.rides}</td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">${payout.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{payout.method}</td>
                  <td className="px-6 py-4">
                    <Button variant="primary" size="sm" onClick={() => processPayout(payout)}>
                      Process
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Commission Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Commission Breakdown</h2>
          <div className="space-y-3">
            {commissionBreakdown.map((item, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-700">{item.category}</p>
                    <p className="text-xs text-slate-500">Commission Rate: {item.rate}</p>
                  </div>
                  <span className="font-bold text-green-600">${item.commission.toFixed(2)}</span>
                </div>
                <div className="text-xs text-slate-600">
                  Revenue: ${item.revenue.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {recentTransactions.map((transaction, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-medium text-slate-700">{transaction.type}</p>
                    <p className="text-xs text-slate-500">{transaction.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    transaction.platform === 'TaxiCab' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {transaction.platform}
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-slate-600">Amount: ${transaction.amount.toFixed(2)}</span>
                  <span className="font-medium text-green-600">Commission: ${transaction.commission.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Process Payout Modal */}
      {selectedPayout && (
        <Modal
          isOpen={showPayoutModal}
          onClose={() => {
            setShowPayoutModal(false);
            setSelectedPayout(null);
          }}
          title="Process Payout"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-3">Payout Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Recipient:</span>
                  <span className="font-medium">{selectedPayout.recipient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Platform:</span>
                  <span className="font-medium">{selectedPayout.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Period:</span>
                  <span className="font-medium">{selectedPayout.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Rides:</span>
                  <span className="font-medium">{selectedPayout.rides}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Method:</span>
                  <span className="font-medium">{selectedPayout.method}</span>
                </div>
                <div className="border-t border-yellow-300 pt-2 mt-2 flex justify-between">
                  <span className="font-semibold text-slate-700">Payout Amount:</span>
                  <span className="font-bold text-green-600">${selectedPayout.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-700">
                ⚠️ Please verify all details before processing. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedPayout(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={confirmPayout}>
                Confirm & Process
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FinancialPage;
