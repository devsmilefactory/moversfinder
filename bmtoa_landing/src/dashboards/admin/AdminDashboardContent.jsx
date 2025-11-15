import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../shared/StatsCard';
import Button from '../shared/Button';
import { useAdminStore } from '../../stores';

/**
 * Admin Dashboard Content (without layout wrapper)
 * This is the content that appears on the /admin/dashboard route
 *
 * UNIFIED ADMIN PORTAL: Manages both TaxiCab and BMTOA platforms
 *
 * Architecture:
 * - TaxiCab (taxicab.co.zw): Customer-facing platform (Individual + Corporate)
 * - BMTOA (bmtoa.co.zw): Service provider platform (Operators + Drivers)
 * - Admin Portal: Unified management for BOTH platforms
 *
 * Database: Shared Supabase with platform-aware queries
 * Uses Zustand for state management - data fetched from stores
 */
const AdminDashboardContent = () => {
  const navigate = useNavigate();

  // Get stats from Zustand store
  const {
    taxicabStats,
    bmtoaStats,
    ecosystemStats,
    statsLoading,
    loadAllStats,
  } = useAdminStore();

  // Load stats on mount
  useEffect(() => {
    loadAllStats();
  }, [loadAllStats]);

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">
          Unified Admin Portal 🛡️
        </h1>
        <p className="text-slate-600">
          Centralized management for <strong>TaxiCab</strong> (customer platform) and <strong>BMTOA</strong> (service provider platform)
        </p>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* TaxiCab Platform - Customer Facing */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-blue-900">TaxiCab Platform</h3>
              <p className="text-xs text-blue-700 mt-1">Customer-Facing Platform</p>
            </div>
            <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
              taxicab.co.zw
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700">Individual Users</p>
              <p className="text-2xl font-bold text-blue-900">{taxicabStats.individualUsers}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Corporate Users</p>
              <p className="text-2xl font-bold text-blue-900">{taxicabStats.corporateUsers}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Total Rides</p>
              <p className="text-2xl font-bold text-blue-900">{taxicabStats.activeRides.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Revenue (Commissions)</p>
              <p className="text-2xl font-bold text-blue-900">${taxicabStats.monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/users')}
              className="w-full text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              Manage TaxiCab Users →
            </Button>
          </div>
        </div>

        {/* BMTOA Platform - Service Providers */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border-2 border-yellow-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-700">BMTOA Platform</h3>
              <p className="text-xs text-slate-600 mt-1">Service Provider Platform</p>
            </div>
            <span className="px-3 py-1 bg-yellow-400 text-slate-700 rounded-full text-xs font-medium">
              bmtoa.co.zw
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Taxi Operators</p>
              <p className="text-2xl font-bold text-slate-700">{bmtoaStats.operators}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Drivers</p>
              <p className="text-2xl font-bold text-slate-700">{bmtoaStats.drivers}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Active Fleet</p>
              <p className="text-2xl font-bold text-slate-700">{bmtoaStats.activeFleet}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Revenue (Subscriptions)</p>
              <p className="text-2xl font-bold text-slate-700">${bmtoaStats.subscriptionRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-yellow-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/members')}
              className="w-full text-slate-700 border-yellow-400 hover:bg-yellow-50"
            >
              Manage BMTOA Members →
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/admin/users')}
        >
          👥 Manage Users
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/admin/analytics')}
        >
          📊 View Analytics
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => navigate('/admin/support-tickets')}
        >
          🎫 Support Tickets
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => navigate('/admin/settings')}
        >
          ⚙️ Settings
        </Button>
      </div>

      {/* Ecosystem-Wide Stats */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-700">Ecosystem Overview</h2>
        <p className="text-sm text-slate-500">Combined statistics across both platforms</p>
      </div>
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={ecosystemStats.totalUsers.toLocaleString()}
          icon="👥"
          trend={{ value: 12, isPositive: true }}
          subtitle="across both platforms"
        />
        <StatsCard
          title="Active Drivers"
          value={ecosystemStats.activeDrivers}
          icon="🚗"
          trend={{ value: 8, isPositive: true }}
          subtitle="serving customers"
        />
        <StatsCard
          title="Total Rides"
          value={ecosystemStats.totalRides.toLocaleString()}
          icon="📍"
          trend={{ value: 15, isPositive: true }}
          subtitle="this month"
        />
        <StatsCard
          title="Total Revenue"
          value={`$${ecosystemStats.totalRevenue.toLocaleString()}`}
          icon="💰"
          trend={{ value: 10, isPositive: true }}
          subtitle="combined revenue"
        />
      </div>

      {/* Recent Activity - TODO: Implement with real-time data from database */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Recent Activity</h2>
        <div className="flex items-center justify-center h-32">
          <p className="text-slate-500">Activity feed will be populated from database</p>
        </div>
      </div>

      {/* System Status */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Platform Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Operational
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Database</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Payment Gateway</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">SMS Service</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-4">Pending Actions</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Driver Verifications</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                5 pending
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Support Tickets</span>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                12 open
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Refund Requests</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                3 pending
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Content Reports</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                0 pending
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboardContent;

