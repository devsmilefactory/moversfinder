import React, { useState } from 'react';
import DashboardLayout from '../shared/DashboardLayout';
import StatsCard from '../shared/StatsCard';
import DataTable from '../shared/DataTable';
import { LineChart, BarChart } from '../shared/Charts';

/**
 * Driver Dashboard
 * For drivers on both TaxiCab and BMTOA platforms
 * Features: Earnings, ride requests, documents (Zimbabwean requirements), performance
 * Supabase-ready with real-time ride matching
 */
const DriverDashboard = () => {
  // Mock user data - will be replaced with Supabase auth
  const user = {
    id: 1,
    name: 'Michael Ncube',
    email: 'michael.ncube@example.com',
    userType: 'driver',
    phone: '+263 912 345 678',
    memberSince: '2024-01-15',
    taxiOperator: 'City Cabs Ltd', // Selected operator
    vehicleNumber: 'ABC 1234',
    rating: 4.8,
    totalTrips: 1247,
  };

  // Mock stats - will be replaced with Supabase queries
  const stats = {
    todayEarnings: 145.50,
    weekEarnings: 687.25,
    monthEarnings: 2845.00,
    activeRequests: 3,
  };

  // Zimbabwean driver documents - will be stored in Supabase Storage
  const documents = [
    {
      id: 1,
      type: 'Driver\'s License',
      number: 'DL-123456',
      expiryDate: '2026-03-15',
      status: 'Valid',
      fileUrl: '/documents/license.pdf',
    },
    {
      id: 2,
      type: 'Public Service Vehicle Permit',
      number: 'PSV-789012',
      expiryDate: '2025-06-30',
      status: 'Valid',
      fileUrl: '/documents/psv-permit.pdf',
    },
    {
      id: 3,
      type: 'Vehicle Registration',
      number: 'ABC 1234',
      expiryDate: '2025-12-31',
      status: 'Valid',
      fileUrl: '/documents/vehicle-reg.pdf',
    },
    {
      id: 4,
      type: 'Vehicle Fitness Certificate',
      number: 'VFC-345678',
      expiryDate: '2025-04-20',
      status: 'Expiring Soon',
      fileUrl: '/documents/fitness-cert.pdf',
    },
    {
      id: 5,
      type: 'Insurance Certificate',
      number: 'INS-901234',
      expiryDate: '2025-08-15',
      status: 'Valid',
      fileUrl: '/documents/insurance.pdf',
    },
    {
      id: 6,
      type: 'Tax Clearance',
      number: 'TAX-567890',
      expiryDate: '2025-12-31',
      status: 'Valid',
      fileUrl: '/documents/tax-clearance.pdf',
    },
    {
      id: 7,
      type: 'BMTOA Membership Card',
      number: 'BMTOA-2024-1234',
      expiryDate: '2025-12-31',
      status: 'Valid',
      fileUrl: '/documents/bmtoa-card.pdf',
    },
  ];

  // Mock ride requests - will be replaced with Supabase real-time subscriptions
  const rideRequests = [
    {
      id: 1,
      passenger: 'Sarah Moyo',
      pickup: 'City Center Mall',
      dropoff: 'Airport',
      distance: '15 km',
      estimatedFare: 35.00,
      requestTime: '2 min ago',
      priority: 'High',
    },
    {
      id: 2,
      passenger: 'David Sibanda',
      pickup: 'Ascot Shopping Centre',
      dropoff: 'Hillside',
      distance: '8 km',
      estimatedFare: 18.00,
      requestTime: '5 min ago',
      priority: 'Medium',
    },
    {
      id: 3,
      passenger: 'Grace Dube',
      pickup: 'Bulawayo Central Hospital',
      dropoff: 'Suburbs',
      distance: '12 km',
      estimatedFare: 25.00,
      requestTime: '8 min ago',
      priority: 'Medium',
    },
  ];

  // Recent trips
  const recentTrips = [
    {
      id: 1,
      date: '2025-01-15',
      time: '14:30',
      passenger: 'John Doe',
      route: 'City Center → Airport',
      distance: '15 km',
      fare: 35.00,
      rating: 5,
      status: 'Completed',
    },
    {
      id: 2,
      date: '2025-01-15',
      time: '12:15',
      passenger: 'Jane Smith',
      route: 'Home → Office',
      distance: '8 km',
      fare: 18.00,
      rating: 5,
      status: 'Completed',
    },
    {
      id: 3,
      date: '2025-01-15',
      time: '09:45',
      passenger: 'Bob Wilson',
      route: 'Shopping Mall → Home',
      distance: '10 km',
      fare: 22.00,
      rating: 4,
      status: 'Completed',
    },
  ];

  // Earnings data
  const weeklyEarningsData = [
    { label: 'Mon', value: 125 },
    { label: 'Tue', value: 98 },
    { label: 'Wed', value: 142 },
    { label: 'Thu', value: 115 },
    { label: 'Fri', value: 156 },
    { label: 'Sat', value: 189 },
    { label: 'Sun', value: 145 },
  ];

  // Service type earnings
  const serviceEarningsData = [
    { label: 'Standard Rides', value: 1850 },
    { label: 'Scheduled Rides', value: 645 },
    { label: 'Package Delivery', value: 250 },
    { label: 'Corporate Contracts', value: 100 },
  ];

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Document table columns
  const documentColumns = [
    {
      key: 'type',
      label: 'Document Type',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-slate-700">{value}</span>
      ),
    },
    {
      key: 'number',
      label: 'Number',
      sortable: true,
    },
    {
      key: 'expiryDate',
      label: 'Expiry Date',
      sortable: true,
      render: (value) => {
        const daysUntilExpiry = Math.floor((new Date(value) - new Date()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <p className="text-sm text-slate-700">{value}</p>
            {daysUntilExpiry < 30 && (
              <p className="text-xs text-orange-600">Expires in {daysUntilExpiry} days</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Valid' ? 'bg-green-100 text-green-700' :
          value === 'Expiring Soon' ? 'bg-orange-100 text-orange-700' :
          'bg-red-100 text-red-700'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  // Trip table columns
  const tripColumns = [
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
      key: 'passenger',
      label: 'Passenger',
      sortable: true,
    },
    {
      key: 'route',
      label: 'Route',
    },
    {
      key: 'distance',
      label: 'Distance',
      sortable: true,
    },
    {
      key: 'fare',
      label: 'Fare',
      sortable: true,
      render: (value) => <span className="font-semibold text-slate-700">${value.toFixed(2)}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (value) => (
        <div className="flex items-center">
          <span className="text-yellow-400">⭐</span>
          <span className="ml-1 text-sm font-medium">{value}</span>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout userType="driver" user={user}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">
          Welcome, {user.name.split(' ')[0]}! 🚗
        </h1>
        <div className="flex items-center space-x-4 text-slate-600">
          <span>⭐ {user.rating} Rating</span>
          <span>•</span>
          <span>🚕 {user.totalTrips} Total Trips</span>
          <span>•</span>
          <span>🏢 {user.taxiOperator}</span>
        </div>
      </div>

      {/* Online Status Toggle */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Driver Status</h3>
            <p className="text-sm text-slate-600">Toggle your availability to receive ride requests</p>
          </div>
          <button className="relative inline-flex h-12 w-24 items-center rounded-full bg-green-500 transition-colors">
            <span className="absolute right-2 text-white text-sm font-medium">Online</span>
            <span className="inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform translate-x-12"></span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Today's Earnings"
          value={`$${stats.todayEarnings.toFixed(2)}`}
          change="+12%"
          changeType="positive"
          trend="vs yesterday"
          icon="💵"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Week Earnings"
          value={`$${stats.weekEarnings.toFixed(2)}`}
          change="+8%"
          changeType="positive"
          trend="vs last week"
          icon="💰"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Month Earnings"
          value={`$${stats.monthEarnings.toFixed(2)}`}
          change="+15%"
          changeType="positive"
          trend="vs last month"
          icon="📊"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Active Requests"
          value={stats.activeRequests}
          icon="🔔"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>

      {/* Ride Requests */}
      {rideRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            Active Ride Requests 🔔
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rideRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl p-6 shadow-sm border-2 border-yellow-400">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-700">{request.passenger}</p>
                    <p className="text-xs text-slate-500">{request.requestTime}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    request.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {request.priority}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-500">📍</span>
                    <span className="text-sm text-slate-700">{request.pickup}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-red-500">📍</span>
                    <span className="text-sm text-slate-700">{request.dropoff}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-sm text-slate-600">{request.distance}</span>
                    <span className="text-lg font-bold text-green-600">
                      ${request.estimatedFare.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded-lg">
                    Accept
                  </button>
                  <button className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 rounded-lg">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChart
          data={weeklyEarningsData}
          title="Weekly Earnings"
          height={300}
        />
        <BarChart
          data={serviceEarningsData}
          title="Earnings by Service Type (This Month)"
          height={300}
        />
      </div>

      {/* Documents Section - Zimbabwean Requirements */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-700">
            Documents & Compliance 📄
          </h2>
          <button
            onClick={() => setShowDocumentModal(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-700 font-medium px-4 py-2 rounded-lg"
          >
            + Upload Document
          </button>
        </div>
        <DataTable
          columns={documentColumns}
          data={documents}
          actions={[
            {
              label: 'View',
              icon: '👁️',
              onClick: (row) => {
                setSelectedDocument(row);
                setShowDocumentModal(true);
              },
            },
            {
              label: 'Renew',
              icon: '🔄',
              onClick: (row) => console.log('Renew document:', row),
            },
          ]}
        />
      </div>

      {/* Recent Trips */}
      <div>
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Recent Trips</h2>
        <DataTable
          columns={tripColumns}
          data={recentTrips}
          actions={[
            {
              label: 'Details',
              icon: '📋',
              onClick: (row) => console.log('View trip details:', row),
            },
          ]}
        />
      </div>

      {/* Document Modal Placeholder */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-slate-700 mb-4">
              {selectedDocument ? 'Document Details' : 'Upload Document'}
            </h3>
            <p className="text-slate-600 mb-6">
              Document management interface will be implemented here with Supabase Storage integration.
            </p>
            <button
              onClick={() => {
                setShowDocumentModal(false);
                setSelectedDocument(null);
              }}
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

export default DriverDashboard;

