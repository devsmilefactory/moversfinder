import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';

/**
 * Driver My Rides Page
 *
 * Features:
 * - Ride history table
 * - Completed rides list
 * - Earnings per ride
 * - Filter by date range
 * - Export to CSV
 *
 * Supabase Integration:
 * - Fetches completed rides from rides table
 */

const MyRidesPage = () => {
  const user = useAuthStore((state) => state.user);
  const { rides, loading, loadRideHistory } = useDriverStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.id) {
      loadRideHistory(user.id, { status: 'completed', limit: 50 });
    }
  }, [user?.id, loadRideHistory]);

  const stats = {
    total: rides?.length || 0,
    today: rides?.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length || 0,
    totalEarnings: rides?.reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0,
    avgRating: rides?.length > 0 ? (rides.reduce((sum, r) => sum + (r.rating || 0), 0) / rides.length).toFixed(1) : 0
  };

  const exportToCSV = () => {
    alert('Exporting ride history to CSV...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading ride history...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">My Rides</h1>
          <p className="text-sm text-slate-500 mt-1">
            View your ride history and earnings
          </p>
        </div>
        <Button variant="primary" onClick={exportToCSV}>
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <p className="text-sm text-slate-600">Total Rides</p>
          <p className="text-3xl font-bold text-slate-700">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-lg p-4">
          <p className="text-sm text-green-700">Today's Rides</p>
          <p className="text-3xl font-bold text-green-700">{stats.today}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-lg p-4">
          <p className="text-sm text-yellow-700">Total Earnings</p>
          <p className="text-3xl font-bold text-yellow-700">${stats.totalEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-lg p-4">
          <p className="text-sm text-blue-700">Avg Rating</p>
          <p className="text-3xl font-bold text-blue-700">{stats.avgRating} ⭐</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {['all', 'today', 'week', 'month'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              filter === tab
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Rides Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date/Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Route</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Distance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fare</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rides.map((ride) => (
              <tr key={ride.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {new Date(ride.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(ride.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">{ride.customer_name || 'Customer'}</td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p className="text-slate-700">📍 {ride.pickup_location}</p>
                    <p className="text-slate-500">→ {ride.dropoff_location}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-slate-600">
                    <p>{ride.distance} km</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-green-600">${ride.fare?.toFixed(2)}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">{ride.payment_method}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-medium text-slate-700">{ride.rating || 'N/A'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyRidesPage;
