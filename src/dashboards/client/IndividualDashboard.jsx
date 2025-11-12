import React, { useState } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import StatsCard from '../shared/StatsCard';
import DataTable from '../shared/DataTable';
import { LineChart } from '../shared/Charts';

/**
 * Individual User Dashboard
 * For service seekers using the TaxiCab platform
 * Features: Ride booking, history, payments, saved places
 * Supabase-ready with real-time ride tracking
 */
const IndividualDashboard = () => {
  // Mock user data - will be replaced with Supabase auth
  const user = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    userType: 'individual',
    phone: '+263 912 345 678',
    memberSince: '2024-01-15',
  };

  // Mock stats - will be replaced with Supabase queries
  const stats = {
    totalRides: 47,
    totalSpent: 1245.50,
    savedPlaces: 5,
    upcomingRides: 2,
  };

  // Mock recent rides - will be replaced with Supabase real-time data
  const recentRides = [
    {
      id: 1,
      date: '2025-01-15',
      time: '14:30',
      pickup: 'City Center',
      dropoff: 'Airport',
      driver: 'Michael Ncube',
      status: 'Completed',
      amount: 35.00,
      rating: 5,
    },
    {
      id: 2,
      date: '2025-01-14',
      time: '09:15',
      pickup: 'Home',
      dropoff: 'Office',
      driver: 'Sarah Moyo',
      status: 'Completed',
      amount: 12.50,
      rating: 5,
    },
    {
      id: 3,
      date: '2025-01-12',
      time: '18:45',
      pickup: 'Shopping Mall',
      dropoff: 'Home',
      driver: 'David Sibanda',
      status: 'Completed',
      amount: 15.00,
      rating: 4,
    },
  ];

  // Mock upcoming rides
  const upcomingRides = [
    {
      id: 4,
      date: '2025-01-20',
      time: '08:00',
      pickup: 'Home',
      dropoff: 'Airport',
      status: 'Scheduled',
      estimatedAmount: 35.00,
    },
    {
      id: 5,
      date: '2025-01-22',
      time: '15:30',
      pickup: 'Office',
      dropoff: 'City Center',
      status: 'Scheduled',
      estimatedAmount: 18.00,
    },
  ];

  // Mock spending chart data
  const spendingData = [
    { label: 'Jan', value: 245 },
    { label: 'Feb', value: 312 },
    { label: 'Mar', value: 198 },
    { label: 'Apr', value: 267 },
    { label: 'May', value: 289 },
    { label: 'Jun', value: 334 },
  ];

  // Saved places
  const savedPlaces = [
    { id: 1, name: 'Home', address: '123 Main Street, Bulawayo', icon: '🏠' },
    { id: 2, name: 'Work', address: '456 Business Ave, Bulawayo', icon: '💼' },
    { id: 3, name: 'Gym', address: '789 Fitness Road, Bulawayo', icon: '💪' },
    { id: 4, name: 'Airport', address: 'Joshua Mqabuko Nkomo International Airport', icon: '✈️' },
    { id: 5, name: 'Shopping', address: 'Ascot Shopping Centre', icon: '🛍️' },
  ];

  const [showBookingModal, setShowBookingModal] = useState(false);

  // Table columns for recent rides
  const rideColumns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{value}</p>
          <p className="text-xs text-slate-500">{row.time}</p>
        </div>
      ),
    },
    {
      key: 'pickup',
      label: 'Route',
      render: (value, row) => (
        <div>
          <p className="text-sm text-slate-700">📍 {value}</p>
          <p className="text-sm text-slate-700">📍 {row.dropoff}</p>
        </div>
      ),
    },
    {
      key: 'driver',
      label: 'Driver',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Completed' ? 'bg-green-100 text-green-700' :
          value === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value) => <span className="font-semibold text-slate-700">${value.toFixed(2)}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (value) => (
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={i < value ? 'text-yellow-400' : 'text-slate-300'}>
              ⭐
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout userType="individual" user={user}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">
          Welcome back, {user.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-slate-600">
          Ready for your next ride? Book now or manage your upcoming trips.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setShowBookingModal(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
        >
          <span className="text-2xl">🚕</span>
          <span>Book a Ride Now</span>
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-center space-x-2">
          <span className="text-2xl">📅</span>
          <span>Schedule for Later</span>
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-center space-x-2">
          <span className="text-2xl">📦</span>
          <span>Send a Package</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Rides"
          value={stats.totalRides}
          change="+12%"
          changeType="positive"
          trend="vs last month"
          icon="🚗"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Total Spent"
          value={`$${stats.totalSpent.toFixed(2)}`}
          change="+8%"
          changeType="positive"
          trend="vs last month"
          icon="💰"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Saved Places"
          value={stats.savedPlaces}
          icon="📍"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Upcoming Rides"
          value={stats.upcomingRides}
          icon="📅"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Spending Chart */}
        <div className="lg:col-span-2">
          <LineChart
            data={spendingData}
            title="Monthly Spending"
            height={300}
          />
        </div>

        {/* Saved Places */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-700">Saved Places</h3>
            <button className="text-yellow-600 hover:text-yellow-700 text-sm font-medium">
              + Add New
            </button>
          </div>
          <div className="space-y-3">
            {savedPlaces.map((place) => (
              <div
                key={place.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <span className="text-2xl">{place.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{place.name}</p>
                  <p className="text-xs text-slate-500 truncate">{place.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Rides */}
      {upcomingRides.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Upcoming Rides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingRides.map((ride) => (
              <div key={ride.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500">Scheduled for</p>
                    <p className="text-lg font-semibold text-slate-700">
                      {ride.date} at {ride.time}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    {ride.status}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-500">📍</span>
                    <span className="text-sm text-slate-700">{ride.pickup}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-red-500">📍</span>
                    <span className="text-sm text-slate-700">{ride.dropoff}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">
                    Est. ${ride.estimatedAmount.toFixed(2)}
                  </span>
                  <div className="space-x-2">
                    <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                      Edit
                    </button>
                    <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Rides Table */}
      <div>
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Recent Rides</h2>
        <DataTable
          columns={rideColumns}
          data={recentRides}
          actions={[
            {
              label: 'View',
              icon: '👁️',
              onClick: (row) => console.log('View ride:', row),
            },
            {
              label: 'Rebook',
              icon: '🔄',
              onClick: (row) => console.log('Rebook:', row),
            },
          ]}
        />
      </div>

      {/* Booking Modal Placeholder */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-slate-700 mb-4">Book a Ride</h3>
            <p className="text-slate-600 mb-6">
              Booking interface will be implemented here with pickup/dropoff selection,
              vehicle type, and payment options.
            </p>
            <button
              onClick={() => setShowBookingModal(false)}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-semibold py-3 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default IndividualDashboard;

