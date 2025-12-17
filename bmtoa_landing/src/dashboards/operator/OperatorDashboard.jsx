import React, { useState } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import StatsCard from '../shared/StatsCard';
import DataTable from '../shared/DataTable';
import { LineChart, BarChart, PieChart } from '../shared/Charts';

/**
 * Taxi Operator Dashboard
 * For taxi operators managing fleets on BMTOA platform
 * Features: Fleet management, driver management, revenue analytics, membership
 * Supabase-ready with multi-vehicle and multi-driver support
 */
const OperatorDashboard = () => {
  // Mock user data - will be replaced with Supabase auth
  const user = {
    id: 1,
    name: 'Robert Ndlovu',
    email: 'robert@citycabs.co.zw',
    userType: 'taxi_operator',
    companyName: 'City Cabs Ltd',
    phone: '+263 912 345 678',
    memberSince: '2024-01-15',
    membershipTier: 'Premium', // Basic or Premium
    bmtoaMemberNumber: 'BMTOA-2024-5678',
  };

  // Mock stats - will be replaced with Supabase queries
  const stats = {
    totalVehicles: 12,
    activeDrivers: 15,
    monthlyRevenue: 18450.00,
    totalTrips: 1247,
  };

  // Mock fleet data
  const fleet = [
    {
      id: 1,
      vehicleNumber: 'ABC 1234',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      driver: 'Michael Ncube',
      status: 'Active',
      tripsToday: 8,
      revenueToday: 145.50,
      lastMaintenance: '2025-01-10',
      nextMaintenance: '2025-04-10',
    },
    {
      id: 2,
      vehicleNumber: 'DEF 5678',
      make: 'Honda',
      model: 'Fit',
      year: 2019,
      driver: 'Sarah Moyo',
      status: 'Active',
      tripsToday: 6,
      revenueToday: 98.00,
      lastMaintenance: '2025-01-05',
      nextMaintenance: '2025-04-05',
    },
    {
      id: 3,
      vehicleNumber: 'GHI 9012',
      make: 'Nissan',
      model: 'Tiida',
      year: 2021,
      driver: 'David Sibanda',
      status: 'Maintenance',
      tripsToday: 0,
      revenueToday: 0,
      lastMaintenance: '2025-01-15',
      nextMaintenance: '2025-04-15',
    },
    {
      id: 4,
      vehicleNumber: 'JKL 3456',
      make: 'Toyota',
      model: 'Vitz',
      year: 2018,
      driver: 'Grace Dube',
      status: 'Active',
      tripsToday: 10,
      revenueToday: 178.00,
      lastMaintenance: '2024-12-20',
      nextMaintenance: '2025-03-20',
    },
  ];

  // Mock driver data
  const drivers = [
    {
      id: 1,
      name: 'Michael Ncube',
      phone: '+263 912 111 111',
      vehicle: 'ABC 1234',
      status: 'Active',
      rating: 4.8,
      tripsThisMonth: 145,
      revenueThisMonth: 2845.00,
      joinDate: '2024-01-15',
    },
    {
      id: 2,
      name: 'Sarah Moyo',
      phone: '+263 912 222 222',
      vehicle: 'DEF 5678',
      status: 'Active',
      rating: 4.9,
      tripsThisMonth: 132,
      revenueThisMonth: 2567.00,
      joinDate: '2024-02-01',
    },
    {
      id: 3,
      name: 'David Sibanda',
      phone: '+263 912 333 333',
      vehicle: 'GHI 9012',
      status: 'Offline',
      rating: 4.7,
      tripsThisMonth: 98,
      revenueThisMonth: 1890.00,
      joinDate: '2024-03-10',
    },
    {
      id: 4,
      name: 'Grace Dube',
      phone: '+263 912 444 444',
      vehicle: 'JKL 3456',
      status: 'Active',
      rating: 4.9,
      tripsThisMonth: 156,
      revenueThisMonth: 3124.00,
      joinDate: '2024-01-20',
    },
  ];

  // Revenue data
  const monthlyRevenueData = [
    { label: 'Jan', value: 15200 },
    { label: 'Feb', value: 16850 },
    { label: 'Mar', value: 14900 },
    { label: 'Apr', value: 17100 },
    { label: 'May', value: 18450 },
    { label: 'Jun', value: 18450 },
  ];

  // Vehicle performance
  const vehiclePerformanceData = [
    { label: 'ABC 1234', value: 4850 },
    { label: 'DEF 5678', value: 3920 },
    { label: 'GHI 9012', value: 3150 },
    { label: 'JKL 3456', value: 5240 },
  ];

  // Fleet status distribution
  const fleetStatusData = [
    { label: 'Active', value: 9 },
    { label: 'Maintenance', value: 2 },
    { label: 'Offline', value: 1 },
  ];

  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);

  // Fleet table columns
  const fleetColumns = [
    {
      key: 'vehicleNumber',
      label: 'Vehicle',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{value}</p>
          <p className="text-xs text-slate-500">{row.make} {row.model} ({row.year})</p>
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
          value === 'Active' ? 'bg-green-100 text-green-700' :
          value === 'Maintenance' ? 'bg-orange-100 text-orange-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'tripsToday',
      label: 'Trips Today',
      sortable: true,
    },
    {
      key: 'revenueToday',
      label: 'Revenue Today',
      sortable: true,
      render: (value) => <span className="font-semibold text-slate-700">${value.toFixed(2)}</span>,
    },
    {
      key: 'nextMaintenance',
      label: 'Next Maintenance',
      sortable: true,
      render: (value) => {
        const daysUntil = Math.floor((new Date(value) - new Date()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <p className="text-sm text-slate-700">{value}</p>
            {daysUntil < 30 && (
              <p className="text-xs text-orange-600">In {daysUntil} days</p>
            )}
          </div>
        );
      },
    },
  ];

  // Driver table columns
  const driverColumns = [
    {
      key: 'name',
      label: 'Driver',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{value}</p>
          <p className="text-xs text-slate-500">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Active' ? 'bg-green-100 text-green-700' :
          value === 'Offline' ? 'bg-slate-100 text-slate-700' :
          'bg-orange-100 text-orange-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <span className="text-yellow-400">⭐</span>
          <span className="ml-1 text-sm font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'tripsThisMonth',
      label: 'Trips',
      sortable: true,
    },
    {
      key: 'revenueThisMonth',
      label: 'Revenue',
      sortable: true,
      render: (value) => <span className="font-semibold text-slate-700">${value.toFixed(2)}</span>,
    },
  ];

  return (
    <DashboardLayout userType="taxi_operator" user={user}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">
          {user.companyName} Dashboard 🚕
        </h1>
        <div className="flex items-center space-x-4 text-slate-600">
          <span>🏆 {user.membershipTier} Member</span>
          <span>•</span>
          <span>🎫 {user.bmtoaMemberNumber}</span>
          <span>•</span>
          <span>📅 Member since {new Date(user.memberSince).getFullYear()}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setShowAddVehicleModal(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
        >
          <span className="text-2xl">🚗</span>
          <span>Add Vehicle</span>
        </button>
        <button
          onClick={() => setShowAddDriverModal(true)}
          className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-center space-x-2"
        >
          <span className="text-2xl">👤</span>
          <span>Add Driver</span>
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-center space-x-2">
          <span className="text-2xl">🔧</span>
          <span>Schedule Maintenance</span>
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-center space-x-2">
          <span className="text-2xl">📊</span>
          <span>View Reports</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Vehicles"
          value={stats.totalVehicles}
          change="+2"
          changeType="positive"
          trend="new this month"
          icon="🚗"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Active Drivers"
          value={stats.activeDrivers}
          change="+3"
          changeType="positive"
          trend="new this month"
          icon="👥"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toFixed(2)}`}
          change="+12%"
          changeType="positive"
          trend="vs last month"
          icon="💰"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Total Trips"
          value={stats.totalTrips}
          change="+8%"
          changeType="positive"
          trend="vs last month"
          icon="📈"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChart
          data={monthlyRevenueData}
          title="Monthly Revenue Trend"
          height={300}
        />
        <PieChart
          data={fleetStatusData}
          title="Fleet Status Distribution"
        />
      </div>

      {/* Vehicle Performance */}
      <div className="mb-8">
        <BarChart
          data={vehiclePerformanceData}
          title="Top Performing Vehicles (This Month)"
          height={300}
        />
      </div>

      {/* BMTOA Membership Status */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl p-6 shadow-lg mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">BMTOA {user.membershipTier} Membership</h3>
            <p className="text-slate-200 mb-4">
              Enjoy exclusive benefits and better operating conditions
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-300">E-hailing Access</p>
                <p className="font-semibold">✓ Active</p>
              </div>
              <div>
                <p className="text-xs text-slate-300">Fleet Management</p>
                <p className="font-semibold">✓ Advanced</p>
              </div>
              <div>
                <p className="text-xs text-slate-300">Support</p>
                <p className="font-semibold">✓ Priority</p>
              </div>
              <div>
                <p className="text-xs text-slate-300">Analytics</p>
                <p className="font-semibold">✓ Full Access</p>
              </div>
            </div>
          </div>
          <button className="bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-semibold px-6 py-3 rounded-lg">
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Fleet Management */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-700">Fleet Management</h2>
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-medium px-4 py-2 rounded-lg"
          >
            + Add Vehicle
          </button>
        </div>
        <DataTable
          columns={fleetColumns}
          data={fleet}
          actions={[
            {
              label: 'View',
              icon: '👁️',
              onClick: (row) => console.log('View vehicle:', row),
            },
            {
              label: 'Edit',
              icon: '✏️',
              onClick: (row) => console.log('Edit vehicle:', row),
            },
            {
              label: 'Maintenance',
              icon: '🔧',
              onClick: (row) => console.log('Schedule maintenance:', row),
            },
          ]}
        />
      </div>

      {/* Driver Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-700">Driver Management</h2>
          <button
            onClick={() => setShowAddDriverModal(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-medium px-4 py-2 rounded-lg"
          >
            + Add Driver
          </button>
        </div>
        <DataTable
          columns={driverColumns}
          data={drivers}
          actions={[
            {
              label: 'View',
              icon: '👁️',
              onClick: (row) => console.log('View driver:', row),
            },
            {
              label: 'Edit',
              icon: '✏️',
              onClick: (row) => console.log('Edit driver:', row),
            },
          ]}
        />
      </div>

      {/* Add Vehicle Modal Placeholder */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-slate-700 mb-4">Add New Vehicle</h3>
            <p className="text-slate-600 mb-6">
              Vehicle registration form will be implemented here with fields for:
              registration number, make, model, year, insurance, etc.
            </p>
            <button
              onClick={() => setShowAddVehicleModal(false)}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-semibold py-3 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Driver Modal Placeholder */}
      {showAddDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-slate-700 mb-4">Add New Driver</h3>
            <p className="text-slate-600 mb-6">
              Driver registration form will be implemented here with Zimbabwean document requirements.
            </p>
            <button
              onClick={() => setShowAddDriverModal(false)}
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

export default OperatorDashboard;

