import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores';
import { 
  calculateDriverEarnings, 
  getEarningsTrend, 
  getTopEarningHours,
  getPendingPayouts 
} from '../../../utils/earningsCalculator';
import Button from '../../shared/Button';

/**
 * Earnings View Component (Driver)
 * 
 * Displays driver earnings with:
 * - Period selection (today, week, month, all)
 * - Earnings breakdown (gross, commission, net)
 * - Payment method breakdown
 * - Earnings trend chart
 * - Top earning hours
 * - Pending payouts
 */
const EarningsView = () => {
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState('week');
  const [earnings, setEarnings] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topHours, setTopHours] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadEarningsData();
    }
  }, [user?.id, period]);

  const loadEarningsData = async () => {
    setLoading(true);
    try {
      // Load all earnings data in parallel
      const [earningsData, trendData, hoursData, payoutsData] = await Promise.all([
        calculateDriverEarnings(user.id, period),
        getEarningsTrend(user.id, period === 'week' ? 7 : period === 'month' ? 30 : 7),
        getTopEarningHours(user.id),
        getPendingPayouts(user.id)
      ]);

      setEarnings(earningsData);
      setTrend(trendData);
      setTopHours(hoursData.slice(0, 5)); // Top 5 hours
      setPendingPayouts(payoutsData);
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Earnings Overview</h2>
          <div className="flex gap-2">
            {['today', 'week', 'month', 'all'].map((p) => (
              <Button
                key={p}
                variant={period === p ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gross Earnings */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm font-medium">Gross Earnings</p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold mb-1">${earnings?.grossEarnings || '0.00'}</p>
          <p className="text-blue-100 text-sm">{earnings?.totalRides || 0} rides</p>
        </div>

        {/* Commission */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm font-medium">Platform Commission</p>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold mb-1">${earnings?.commission || '0.00'}</p>
          <p className="text-orange-100 text-sm">{earnings?.commissionRate || '15%'} rate</p>
        </div>

        {/* Net Earnings */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm font-medium">Net Earnings</p>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-bold mb-1">${earnings?.netEarnings || '0.00'}</p>
          <p className="text-green-100 text-sm">After commission</p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings by Payment Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cash */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Cash</p>
              <span className="text-xl">💵</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${earnings?.byPaymentMethod?.cash?.earnings || '0.00'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {earnings?.byPaymentMethod?.cash?.rides || 0} rides
            </p>
          </div>

          {/* EcoCash */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">EcoCash</p>
              <span className="text-xl">📱</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${earnings?.byPaymentMethod?.ecocash?.earnings || '0.00'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {earnings?.byPaymentMethod?.ecocash?.rides || 0} rides
            </p>
          </div>

          {/* Card */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Card</p>
              <span className="text-xl">💳</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${earnings?.byPaymentMethod?.card?.earnings || '0.00'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {earnings?.byPaymentMethod?.card?.rides || 0} rides
            </p>
          </div>
        </div>
      </div>

      {/* Earnings Trend */}
      {trend.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Trend</h3>
          <div className="space-y-3">
            {trend.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{day.date}</p>
                  <p className="text-xs text-gray-500">{day.rides} rides</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((parseFloat(day.earnings) / parseFloat(earnings.grossEarnings)) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 w-20 text-right">
                    ${day.earnings}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Earning Hours */}
      {topHours.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Earning Hours</h3>
          <div className="space-y-3">
            {topHours.map((hourData, index) => (
              <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{hourData.hour}</p>
                    <p className="text-xs text-gray-500">{hourData.rides} rides</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">${hourData.earnings}</p>
                  <p className="text-xs text-gray-500">${hourData.avgPerRide}/ride</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Payouts */}
      {pendingPayouts && pendingPayouts.pendingRides > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Pending Payouts</h3>
              <p className="text-sm text-yellow-700 mb-4">
                You have {pendingPayouts.pendingRides} completed rides awaiting payout
              </p>
              <p className="text-3xl font-bold text-yellow-900 mb-2">
                ${pendingPayouts.pendingAmount}
              </p>
              {pendingPayouts.oldestPendingDate && (
                <p className="text-xs text-yellow-600">
                  Oldest pending: {pendingPayouts.oldestPendingDate}
                </p>
              )}
            </div>
            <Button variant="primary">
              Request Payout
            </Button>
          </div>
        </div>
      )}

      {/* No Earnings Message */}
      {earnings && earnings.totalRides === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Earnings Yet</h3>
          <p className="text-gray-600 mb-6">
            Complete your first ride to start earning money!
          </p>
          <Button variant="primary" onClick={() => window.location.href = '/driver/dashboard'}>
            View Ride Requests
          </Button>
        </div>
      )}
    </div>
  );
};

export default EarningsView;

