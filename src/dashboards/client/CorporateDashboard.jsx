import React, { useState } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import StatsCard from '../shared/StatsCard';
import DataTable from '../shared/DataTable';
import { LineChart, BarChart, PieChart } from '../shared/Charts';
import useAuthStore from '../../stores/authStore';
import { useActiveRideCheck } from '../../hooks/useActiveRideCheck';

/**
 * Corporate User Dashboard
 * For businesses managing employee transportation
 * Features: Bulk booking, employee management, analytics, billing
 * Supabase-ready with multi-user access control
 */
const CorporateDashboard = () => {
  // Get authenticated user from store
  const { user } = useAuthStore();
  
  // Check for active rides on mount and show toast notification
  const { activeRide } = useActiveRideCheck(user?.id);

  // Mock stats - will be replaced with Supabase queries
  const stats = {
    totalRides: 342,
    activeEmployees: 45,
    monthlySpend: 8450.00,
    savings: 2115.00, // 20% discount
  };

  // Mock employee data
  const employees = [
    {
      id: 1,
      name: 'Michael Johnson',
      email: 'michael.j@company.com',
      department: 'Sales',
      ridesThisMonth: 12,
      totalSpent: 245.00,
      status: 'Active',
    },
    {
      id: 2,
      name: 'Sarah Williams',
      email: 'sarah.w@company.com',
      department: 'Marketing',
      ridesThisMonth: 8,
      totalSpent: 156.00,
      status: 'Active',
    },
    {
      id: 3,
      name: 'David Brown',
      email: 'david.b@company.com',
      department: 'Engineering',
      ridesThisMonth: 15,
      totalSpent: 312.00,
      status: 'Active',
    },
    {
      id: 4,
      name: 'Emily Davis',
      email: 'emily.d@company.com',
      department: 'HR',
      ridesThisMonth: 6,
      totalSpent: 98.00,
      status: 'Active',
    },
  ];

  // Mock scheduled rides
  const scheduledRides = [
    {
      id: 1,
      date: '2025-01-20',
      time: '08:00',
      employee: 'Michael Johnson',
      pickup: 'Home',
      dropoff: 'Client Office',
      type: 'One-time',
      status: 'Confirmed',
    },
    {
      id: 2,
      date: '2025-01-20',
      time: '17:30',
      employee: 'Multiple (5)',
      pickup: 'Office',
      dropoff: 'Various',
      type: 'Recurring',
      status: 'Confirmed',
    },
  ];

  // Mock spending data
  const monthlySpendingData = [
    { label: 'Jan', value: 7200 },
    { label: 'Feb', value: 7850 },
    { label: 'Mar', value: 6900 },
    { label: 'Apr', value: 8100 },
    { label: 'May', value: 8450 },
    { label: 'Jun', value: 8450 },
  ];

  // Department spending
  const departmentSpendingData = [
    { label: 'Sales', value: 3200 },
    { label: 'Marketing', value: 1800 },
    { label: 'Engineering', value: 2100 },
    { label: 'HR', value: 850 },
    { label: 'Operations', value: 500 },
  ];

  // Service type distribution
  const serviceTypeData = [
    { label: 'Pre-booked Trips', value: 145 },
    { label: 'Staff Transport', value: 98 },
    { label: 'Recurring Trips', value: 67 },
    { label: 'Individual Bookings', value: 32 },
  ];

  const [showBulkBookingModal, setShowBulkBookingModal] = useState(false);

  // Employee table columns
  const employeeColumns = [
    {
      key: 'name',
      label: 'Employee',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{value}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
    },
    {
      key: 'ridesThisMonth',
      label: 'Rides',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          {value} rides
        </span>
      ),
    },
    {
      key: 'totalSpent',
      label: 'Spent',
      sortable: true,
      render: (value) => <span className="font-semibold text-slate-700">${value.toFixed(2)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  // Scheduled rides table columns
  const scheduledColumns = [
    {
      key: 'date',
      label: 'Date & Time',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{value}</p>
          <p className="text-xs text-slate-500">{row.time}</p>
        </div>
      ),
    },
    {
      key: 'employee',
      label: 'Employee',
      sortable: true,
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
      key: 'type',
      label: 'Type',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Recurring' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          {value}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout userType="corporate" user={user}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">
          {user.companyName} Dashboard 🏢
        </h1>
        <p className="text-slate-600">
          Manage your corporate transportation efficiently. {user.accountTier} Plan
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setShowBulkBookingModal(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
        >
          <span className="text-2xl">📅</span>
          <span>Bulk Booking</span>
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-center space-x-2">
          <span className="text-2xl">👥</span>
          <span>Add Employee</span>
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-center space-x-2">
          <span className="text-2xl">📊</span>
          <span>View Reports</span>
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-center space-x-2">
          <span className="text-2xl">💳</span>
          <span>Billing</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Rides"
          value={stats.totalRides}
          change="+15%"
          changeType="positive"
          trend="vs last month"
          icon="🚗"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Active Employees"
          value={stats.activeEmployees}
          change="+3"
          changeType="positive"
          trend="new this month"
          icon="👥"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Monthly Spend"
          value={`$${stats.monthlySpend.toFixed(2)}`}
          change="+4%"
          changeType="neutral"
          trend="vs last month"
          icon="💰"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Total Savings"
          value={`$${stats.savings.toFixed(2)}`}
          change="20% discount"
          changeType="positive"
          trend="this month"
          icon="💎"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChart
          data={monthlySpendingData}
          title="Monthly Spending Trend"
          height={300}
        />
        <PieChart
          data={serviceTypeData}
          title="Service Type Distribution"
        />
      </div>

      {/* Department Spending */}
      <div className="mb-8">
        <BarChart
          data={departmentSpendingData}
          title="Department Spending (This Month)"
          height={300}
        />
      </div>

      {/* Scheduled Rides */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-700">Upcoming Scheduled Rides</h2>
          <button className="text-yellow-600 hover:text-yellow-700 font-medium text-sm">
            View All →
          </button>
        </div>
        <DataTable
          columns={scheduledColumns}
          data={scheduledRides}
          actions={[
            {
              label: 'Edit',
              icon: '✏️',
              onClick: (row) => console.log('Edit ride:', row),
            },
            {
              label: 'Cancel',
              icon: '❌',
              onClick: (row) => console.log('Cancel ride:', row),
              className: 'text-red-600 hover:bg-red-50',
            },
          ]}
        />
      </div>

      {/* Employee Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-700">Employee Management</h2>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Search employees..."
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button className="bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-medium px-4 py-2 rounded-lg">
              + Add Employee
            </button>
          </div>
        </div>
        <DataTable
          columns={employeeColumns}
          data={employees}
          actions={[
            {
              label: 'View',
              icon: '👁️',
              onClick: (row) => console.log('View employee:', row),
            },
            {
              label: 'Edit',
              icon: '✏️',
              onClick: (row) => console.log('Edit employee:', row),
            },
          ]}
        />
      </div>

      {/* Bulk Booking Modal Placeholder */}
      {showBulkBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-slate-700 mb-4">Bulk Booking</h3>
            <p className="text-slate-600 mb-6">
              Bulk booking interface will be implemented here with:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Multiple employee selection</li>
              <li>Service type selection (Pre-booked, Staff Transport, Recurring)</li>
              <li>Date and time scheduling</li>
              <li>Route planning</li>
              <li>Cost estimation</li>
            </ul>
            <button
              onClick={() => setShowBulkBookingModal(false)}
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

export default CorporateDashboard;

