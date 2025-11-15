import React, { useState } from 'react';
import Button from '../../shared/Button';

/**
 * Admin Analytics Page (BMTOA - Cross-Platform)
 *
 * Features:
 * - Platform analytics (TaxiCab + BMTOA)
 * - User growth charts
 * - Revenue trends
 * - Active users statistics
 *
 * Database Integration Ready:
 * - Fetch: SELECT * FROM rides, users, revenue across both platforms
 * - Analytics: Aggregate queries for cross-platform statistics
 */

const AnalyticsPage = () => {
  const [platform, setPlatform] = useState('all');
  const [timeRange, setTimeRange] = useState('month');

  const stats = {
    totalUsers: 1245,
    activeUsers: 892,
    totalRides: 3456,
    totalRevenue: 45678.50,
    taxicabUsers: 856,
    bmtoaMembers: 389,
    growthRate: '+18%'
  };

  const platformData = [
    { platform: 'TaxiCab', users: 856, rides: 2345, revenue: 32450.00, growth: '+15%' },
    { platform: 'BMTOA', users: 389, rides: 1111, revenue: 13228.50, growth: '+24%' }
  ];

  const monthlyGrowth = [
    { month: 'Aug', users: 945, rides: 2456, revenue: 35600 },
    { month: 'Sep', users: 1012, rides: 2789, revenue: 38900 },
    { month: 'Oct', users: 1098, rides: 3012, revenue: 41200 },
    { month: 'Nov', users: 1167, rides: 3234, revenue: 43500 },
    { month: 'Dec', users: 1245, rides: 3456, revenue: 45678 }
  ];

  const userBreakdown = [
    { type: 'Individual Users', count: 645, percentage: 52 },
    { type: 'Corporate Users', count: 211, percentage: 17 },
    { type: 'Drivers', count: 234, percentage: 19 },
    { type: 'Operators', count: 155, percentage: 12 }
  ];

  const topPerformers = [
    { name: 'Driver: John Doe', rides: 234, revenue: 3456.00, rating: 4.9 },
    { name: 'Operator: ABC Taxis', rides: 189, revenue: 2890.00, rating: 4.8 },
    { name: 'Corporate: XYZ Ltd', rides: 156, revenue: 4234.00, rating: 4.7 }
  ];

  const exportReport = (format) => {
    alert(`Exporting analytics report as ${format.toUpperCase()}...`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Platform Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cross-platform analytics for TaxiCab and BMTOA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            Export CSV
          </Button>
          <Button variant="primary" onClick={() => exportReport('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Platform Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'taxicab', 'bmtoa'].map(p => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              platform === p
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {p === 'all' ? 'All Platforms' : p}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border-2 border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-blue-700">{stats.totalUsers}</p>
          <p className="text-xs text-blue-600 mt-2">{stats.growthRate} this month</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border-2 border-green-200">
          <p className="text-sm text-green-700 mb-1">Active Users</p>
          <p className="text-3xl font-bold text-green-700">{stats.activeUsers}</p>
          <p className="text-xs text-green-600 mt-2">{((stats.activeUsers/stats.totalUsers)*100).toFixed(0)}% active rate</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-lg p-6 border-2 border-yellow-200">
          <p className="text-sm text-yellow-700 mb-1">Total Rides</p>
          <p className="text-3xl font-bold text-yellow-700">{stats.totalRides}</p>
          <p className="text-xs text-yellow-600 mt-2">This month</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-lg p-6 border-2 border-purple-200">
          <p className="text-sm text-purple-700 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-purple-700">${stats.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-purple-600 mt-2">This month</p>
        </div>
      </div>

      {/* Platform Comparison */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Platform Comparison</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {platformData.map((data) => (
            <div key={data.platform} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-700">{data.platform}</h3>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  {data.growth}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-slate-600">Users</p>
                  <p className="font-bold text-slate-700">{data.users}</p>
                </div>
                <div>
                  <p className="text-slate-600">Rides</p>
                  <p className="font-bold text-slate-700">{data.rides}</p>
                </div>
                <div>
                  <p className="text-slate-600">Revenue</p>
                  <p className="font-bold text-green-600">${data.revenue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Growth Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Monthly Growth Trend</h2>
        <div className="space-y-3">
          {monthlyGrowth.map((data) => (
            <div key={data.month} className="flex items-center gap-4">
              <span className="w-12 text-sm font-medium text-slate-700">{data.month}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full flex items-center justify-end pr-3"
                  style={{ width: `${(data.users / 1300) * 100}%` }}
                >
                  <span className="text-xs font-medium text-white">{data.users} users</span>
                </div>
              </div>
              <span className="w-32 text-sm font-bold text-slate-700">${data.revenue.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* User Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">User Breakdown</h2>
          <div className="space-y-3">
            {userBreakdown.map((user, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{user.type}</span>
                  <span className="font-medium text-slate-700">{user.count} ({user.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${user.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Top Performers</h2>
          <div className="space-y-3">
            {topPerformers.map((performer, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-700">{performer.name}</p>
                    <p className="text-xs text-slate-500">{performer.rides} rides</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${performer.revenue.toFixed(2)}</p>
                    <p className="text-xs text-yellow-600">⭐ {performer.rating}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
