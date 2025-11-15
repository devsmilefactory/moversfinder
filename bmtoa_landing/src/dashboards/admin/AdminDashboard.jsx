import React, { useState } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import StatsCard from '../shared/StatsCard';
import DataTable from '../shared/DataTable';
import { LineChart, BarChart, PieChart } from '../shared/Charts';

/**
 * Admin Dashboard
 * For platform administrators managing both TaxiCab and BMTOA
 * Features: User management, analytics, content management, system settings
 * Supabase-ready with full platform oversight
 */
const AdminDashboard = () => {
  // Mock user data - will be replaced with Supabase auth
  const user = {
    id: 1,
    name: 'Admin User',
    email: 'admin@bmtoa.co.zw',
    userType: 'admin',
    phone: '+263 912 345 678',
    role: 'Super Admin',
  };

  // Mock platform stats - will be replaced with Supabase queries
  const stats = {
    totalUsers: 2847,
    activeDrivers: 342,
    totalOperators: 45,
    monthlyRevenue: 125450.00,
  };

  // Mock user data by type
  const usersByType = [
    { label: 'Individual Users', value: 1850 },
    { label: 'Corporate Users', value: 125 },
    { label: 'Drivers', value: 342 },
    { label: 'Taxi Operators', value: 45 },
    { label: 'Admins', value: 5 },
  ];

  // Mock revenue data
  const monthlyRevenueData = [
    { label: 'Jan', value: 98500 },
    { label: 'Feb', value: 105200 },
    { label: 'Mar', value: 112800 },
    { label: 'Apr', value: 118900 },
    { label: 'May', value: 125450 },
    { label: 'Jun', value: 125450 },
  ];

  // Platform activity
  const platformActivityData = [
    { label: 'Rides Completed', value: 8450 },
    { label: 'Scheduled Rides', value: 1250 },
    { label: 'Package Deliveries', value: 680 },
    { label: 'Cancelled', value: 320 },
  ];

  // Recent users
  const recentUsers = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      userType: 'individual',
      platform: 'TaxiCab',
      joinDate: '2025-01-15',
      status: 'Active',
      totalSpent: 245.00,
    },
    {
      id: 2,
      name: 'Tech Solutions Ltd',
      email: 'contact@techsolutions.com',
      userType: 'corporate',
      platform: 'TaxiCab',
      joinDate: '2025-01-14',
      status: 'Active',
      totalSpent: 8450.00,
    },
    {
      id: 3,
      name: 'Michael Ncube',
      email: 'michael.ncube@example.com',
      userType: 'driver',
      platform: 'Both',
      joinDate: '2025-01-12',
      status: 'Active',
      totalEarned: 2845.00,
    },
    {
      id: 4,
      name: 'City Cabs Ltd',
      email: 'robert@citycabs.co.zw',
      userType: 'taxi_operator',
      platform: 'BMTOA',
      joinDate: '2025-01-10',
      status: 'Active',
      fleetSize: 12,
    },
  ];

  // Support tickets
  const supportTickets = [
    {
      id: 1,
      ticketNumber: 'TKT-001',
      user: 'John Doe',
      subject: 'Payment issue',
      priority: 'High',
      status: 'Open',
      created: '2025-01-15 14:30',
    },
    {
      id: 2,
      ticketNumber: 'TKT-002',
      user: 'Sarah Williams',
      subject: 'Driver rating dispute',
      priority: 'Medium',
      status: 'In Progress',
      created: '2025-01-15 12:15',
    },
    {
      id: 3,
      ticketNumber: 'TKT-003',
      user: 'Michael Ncube',
      subject: 'Document verification',
      priority: 'Low',
      status: 'Resolved',
      created: '2025-01-14 16:45',
    },
  ];

  // System alerts
  const systemAlerts = [
    {
      id: 1,
      type: 'warning',
      message: '15 driver documents expiring in next 30 days',
      time: '10 min ago',
    },
    {
      id: 2,
      type: 'info',
      message: 'Database backup completed successfully',
      time: '1 hour ago',
    },
    {
      id: 3,
      type: 'success',
      message: '3 new taxi operators registered today',
      time: '2 hours ago',
    },
  ];

  const [activeTab, setActiveTab] = useState('overview');

  // User table columns
  const userColumns = [
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{value}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'userType',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
          {value.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'platform',
      label: 'Platform',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'TaxiCab' ? 'bg-green-100 text-green-700' :
          value === 'BMTOA' ? 'bg-yellow-100 text-yellow-700' :
          'bg-purple-100 text-purple-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'joinDate',
      label: 'Join Date',
      sortable: true,
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

  // Support ticket columns
  const ticketColumns = [
    {
      key: 'ticketNumber',
      label: 'Ticket',
      sortable: true,
    },
    {
      key: 'user',
      label: 'User',
      sortable: true,
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: true,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'High' ? 'bg-red-100 text-red-700' :
          value === 'Medium' ? 'bg-orange-100 text-orange-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Open' ? 'bg-yellow-100 text-yellow-700' :
          value === 'In Progress' ? 'bg-blue-100 text-blue-700' :
          'bg-green-100 text-green-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      sortable: true,
    },
  ];

  return (
    <DashboardLayout userType="admin" user={user}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">
          Admin Dashboard 🛡️
        </h1>
        <p className="text-slate-600">
          Platform overview and management for TaxiCab & BMTOA
        </p>
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">System Alerts</h3>
        <div className="space-y-3">
          {systemAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start space-x-3 p-3 rounded-lg ${
                alert.type === 'warning' ? 'bg-orange-50' :
                alert.type === 'success' ? 'bg-green-50' :
                'bg-blue-50'
              }`}
            >
              <span className="text-xl">
                {alert.type === 'warning' ? '⚠️' :
                 alert.type === 'success' ? '✅' : 'ℹ️'}
              </span>
              <div className="flex-1">
                <p className="text-sm text-slate-700">{alert.message}</p>
                <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change="+12%"
          changeType="positive"
          trend="vs last month"
          icon="👥"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Active Drivers"
          value={stats.activeDrivers}
          change="+8%"
          changeType="positive"
          trend="vs last month"
          icon="🚗"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Taxi Operators"
          value={stats.totalOperators}
          change="+3"
          changeType="positive"
          trend="new this month"
          icon="🏢"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          change="+15%"
          changeType="positive"
          trend="vs last month"
          icon="💰"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6 border-b border-slate-200">
        {['overview', 'users', 'support', 'analytics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-slate-600 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <LineChart
              data={monthlyRevenueData}
              title="Platform Revenue Trend"
              height={300}
            />
            <PieChart
              data={usersByType}
              title="User Distribution"
            />
          </div>

          {/* Platform Activity */}
          <div className="mb-8">
            <BarChart
              data={platformActivityData}
              title="Platform Activity (This Month)"
              height={300}
            />
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-700">Recent Users</h2>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Search users..."
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <select className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">All Types</option>
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
                <option value="driver">Driver</option>
                <option value="taxi_operator">Taxi Operator</option>
              </select>
            </div>
          </div>
          <DataTable
            columns={userColumns}
            data={recentUsers}
            actions={[
              {
                label: 'View',
                icon: '👁️',
                onClick: (row) => console.log('View user:', row),
              },
              {
                label: 'Edit',
                icon: '✏️',
                onClick: (row) => console.log('Edit user:', row),
              },
              {
                label: 'Suspend',
                icon: '🚫',
                onClick: (row) => console.log('Suspend user:', row),
                className: 'text-red-600 hover:bg-red-50',
              },
            ]}
          />
        </div>
      )}

      {activeTab === 'support' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-700">Support Tickets</h2>
            <div className="flex items-center space-x-3">
              <select className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <select className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <DataTable
            columns={ticketColumns}
            data={supportTickets}
            actions={[
              {
                label: 'View',
                icon: '👁️',
                onClick: (row) => console.log('View ticket:', row),
              },
              {
                label: 'Assign',
                icon: '👤',
                onClick: (row) => console.log('Assign ticket:', row),
              },
            ]}
          />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="text-center py-12">
          <p className="text-slate-600 text-lg">
            Advanced analytics dashboard will be implemented here with:
          </p>
          <ul className="list-disc list-inside text-slate-600 mt-4 space-y-2">
            <li>Real-time platform metrics</li>
            <li>User growth trends</li>
            <li>Revenue analytics</li>
            <li>Geographic distribution</li>
            <li>Performance indicators</li>
            <li>Custom report generation</li>
          </ul>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;

