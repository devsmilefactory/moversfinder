import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import DataTable from '../../shared/DataTable';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';

/**
 * Admin Trips Management Page
 *
 * Features:
 * - View all trips across the platform
 * - Filter by status, service type, date range
 * - View trip details
 * - Cancel trips if needed
 * - Export trip data
 *
 * Database Integration:
 * - SELECT * FROM rides JOIN profiles ON rides.user_id = profiles.id
 * - UPDATE rides SET status = 'cancelled' WHERE id = ?
 */

const TripsPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterService, setFilterService] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'corporate'
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [tripToUpdate, setTripToUpdate] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Load trips from database
  useEffect(() => {
    loadTrips();
  }, [currentPage, pageSize]);

  const loadTrips = async () => {
    try {
      setLoading(true);

      // Calculate pagination offset
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      // Fetch trips with user, driver, company, and vehicle information
      const { data, error, count } = await supabase
        .from('rides')
        .select(`
          id,
          pickup_location,
          dropoff_location,
          service_type,
          ride_status,
          fare,
          payment_method,
          payment_status,
          created_at,
          trip_started_at,
          trip_completed_at,
          platform,
          company_id,
          vehicle_id,
          user:profiles!rides_user_id_fkey(name, user_type),
          driver:profiles!rides_driver_id_fkey(name),
          company:corporate_profiles!rides_company_id_fkey(
            company_name,
            credit_balance
          ),
          vehicle:vehicles(vehicle_number)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setTotalCount(count || 0);

      // Transform data to match UI expectations
      const transformedTrips = (data || []).map(trip => {
        const duration = trip.trip_started_at && trip.trip_completed_at
          ? Math.round((new Date(trip.trip_completed_at) - new Date(trip.trip_started_at)) / 60000) + ' mins'
          : trip.ride_status === 'trip_started' ? 'Ongoing'
          : trip.ride_status === 'pending' ? 'Pending'
          : trip.ride_status === 'cancelled' ? 'Cancelled'
          : 'N/A';

        return {
          id: trip.id,
          user: trip.user?.name || 'N/A',
          userType: trip.user?.user_type || 'N/A',
          companyName: trip.company?.company_name || 'N/A',
          companyId: trip.company_id,
          creditBalance: trip.company?.credit_balance || 0,
          serviceType: trip.service_type || 'taxi',
          pickup: trip.pickup_location || 'N/A',
          dropoff: trip.dropoff_location || 'N/A',
          driver: trip.driver?.name || 'Unassigned',
          vehicleNumber: trip.vehicle?.vehicle_number || 'N/A',
          status: trip.ride_status,
          fare: parseFloat(trip.fare || 0),
          paymentMethod: trip.payment_method || 'N/A',
          paymentStatus: trip.payment_status || 'pending',
          date: trip.created_at ? new Date(trip.created_at).toLocaleString() : 'N/A',
          duration: duration,
          platform: trip.platform
        };
      });

      setTrips(transformedTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };



  const handleViewDetails = (trip) => {
    setSelectedTrip(trip);
    setShowDetailsModal(true);
  };

  // Open status update modal
  const openStatusModal = (trip) => {
    setTripToUpdate(trip);
    setNewStatus(trip.status);
    setStatusNotes('');
    setShowStatusModal(true);
  };

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!tripToUpdate || !newStatus) return;

    if (newStatus === tripToUpdate.status) {
      alert('Please select a different status');
      return;
    }

    try {
      setUpdating(true);

      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update ride status
      const { error: updateError } = await supabase
        .from('rides')
        .update({
          ride_status: newStatus,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', tripToUpdate.id);

      if (updateError) throw updateError;

      // Create status history record
      const { error: historyError } = await supabase
        .from('ride_status_history')
        .insert({
          ride_id: tripToUpdate.id,
          old_status: tripToUpdate.status,
          new_status: newStatus,
          changed_by: user.id,
          changed_at: new Date().toISOString(),
          notes: statusNotes || null
        });

      if (historyError) throw historyError;

      alert('Trip status updated successfully!');
      setShowStatusModal(false);
      setTripToUpdate(null);
      setNewStatus('');
      setStatusNotes('');
      loadTrips(); // Reload trips
    } catch (error) {
      console.error('Error updating trip status:', error);
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const filteredTrips = trips.filter(trip => {
    // Filter by tab (corporate vs individual)
    const matchesTab = activeTab === 'individual'
      ? trip.userType === 'individual'
      : trip.userType === 'corporate';

    const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
    const matchesService = filterService === 'all' || trip.serviceType === filterService;
    const matchesCompany = filterCompany === 'all' || trip.companyId === filterCompany;
    const matchesPayment = filterPaymentMethod === 'all' || trip.paymentMethod === filterPaymentMethod;
    const matchesSearch = trip.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trip.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trip.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (trip.companyName && trip.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesStatus && matchesService && matchesCompany && matchesPayment && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const badges = {
      trip_completed: 'bg-green-100 text-green-700',
      trip_started: 'bg-blue-100 text-blue-700',
      driver_on_way: 'bg-blue-100 text-blue-700',
      driver_arrived: 'bg-blue-100 text-blue-700',
      accepted: 'bg-yellow-100 text-yellow-700',
      pending: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getServiceIcon = (service) => {
    const icons = {
      taxi: '🚕',
      courier: '📦',
      school_run: '🎒',
      errands: '🛍️'
    };
    return icons[service] || '🚗';
  };

  // Columns for individual trips
  const individualColumns = [
    { key: 'id', label: 'Trip ID' },
    {
      key: 'serviceType',
      label: 'Service',
      render: (value) => (
        <span className="flex items-center gap-2">
          {getServiceIcon(value)}
          <span className="capitalize">{value.replace('_', ' ')}</span>
        </span>
      )
    },
    { key: 'user', label: 'Customer' },
    { key: 'driver', label: 'Driver' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(value)}`}>
          {value.replace('_', ' ').charAt(0).toUpperCase() + value.replace('_', ' ').slice(1)}
        </span>
      )
    },
    {
      key: 'fare',
      label: 'Fare',
      render: (value) => `$${value.toFixed(2)}`
    },
    { key: 'date', label: 'Date/Time' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, trip) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(trip)}
          >
            👁️ View
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openStatusModal(trip)}
          >
            🔄 Update
          </Button>
        </div>
      )
    }
  ];

  // Columns for corporate trips (includes company info)
  const corporateColumns = [
    { key: 'id', label: 'Trip ID' },
    {
      key: 'companyName',
      label: 'Company',
      render: (value, trip) => (
        <div>
          <p className="font-semibold text-slate-700">{value}</p>
          <p className="text-xs text-slate-500">{trip.user}</p>
        </div>
      )
    },
    {
      key: 'serviceType',
      label: 'Service',
      render: (value) => (
        <span className="flex items-center gap-2">
          {getServiceIcon(value)}
          <span className="capitalize">{value.replace('_', ' ')}</span>
        </span>
      )
    },
    { key: 'driver', label: 'Driver' },
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (value) => (
        <span className="text-xs capitalize">{value.replace('_', ' ')}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(value)}`}>
          {value.replace('_', ' ').charAt(0).toUpperCase() + value.replace('_', ' ').slice(1)}
        </span>
      )
    },
    {
      key: 'fare',
      label: 'Fare',
      render: (value) => `$${value.toFixed(2)}`
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, trip) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(trip)}
          >
            👁️ View
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openStatusModal(trip)}
          >
            🔄 Update
          </Button>
        </div>
      )
    }
  ];

  const columns = activeTab === 'corporate' ? corporateColumns : individualColumns;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-700 mb-2">🗺️ Trips Management</h1>
        <p className="text-slate-600">Monitor and manage all trips across the platform</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-2 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'individual'
                ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            👤 Individual Trips
            <span className="ml-2 px-2 py-1 rounded-full text-xs bg-white/20">
              {trips.filter(t => t.userType === 'individual').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('corporate')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'corporate'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-slate-800 shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🏢 Corporate Trips
            <span className="ml-2 px-2 py-1 rounded-full text-xs bg-white/30">
              {trips.filter(t => t.userType === 'corporate').length}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Trips</p>
              <p className="text-2xl font-bold text-slate-700">{filteredTrips.length}</p>
              <p className="text-xs text-slate-500 mt-1 capitalize">{activeTab}</p>
            </div>
            <div className="text-3xl">🚗</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredTrips.filter(t => ['trip_started', 'driver_on_way', 'driver_arrived'].includes(t.status)).length}
              </p>
            </div>
            <div className="text-3xl">🔄</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredTrips.filter(t => t.status === 'trip_completed').length}
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Revenue</p>
              <p className="text-2xl font-bold text-yellow-600">
                ${filteredTrips.filter(t => t.status === 'trip_completed' && t.paymentStatus === 'paid').reduce((sum, t) => sum + t.fare, 0).toFixed(2)}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
      </div>

      {/* Corporate-Specific Stats */}
      {activeTab === 'corporate' && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Account Balance Payments</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {filteredTrips.filter(t => t.paymentMethod === 'account_balance').length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ${filteredTrips.filter(t => t.paymentMethod === 'account_balance' && t.status === 'completed').reduce((sum, t) => sum + t.fare, 0).toFixed(2)} total
                </p>
              </div>
              <div className="text-3xl">💳</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Cash Payments</p>
                <p className="text-2xl font-bold text-green-700">
                  {filteredTrips.filter(t => t.paymentMethod === 'cash').length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ${filteredTrips.filter(t => t.paymentMethod === 'cash' && t.status === 'completed').reduce((sum, t) => sum + t.fare, 0).toFixed(2)} total
                </p>
              </div>
              <div className="text-3xl">💵</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Companies</p>
                <p className="text-2xl font-bold text-blue-700">
                  {new Set(filteredTrips.map(t => t.companyId).filter(Boolean)).size}
                </p>
                <p className="text-xs text-slate-500 mt-1">With trips in this period</p>
              </div>
              <div className="text-3xl">🏢</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder={activeTab === 'corporate' ? "🔍 Search by trip ID, company, customer, or driver..." : "🔍 Search by trip ID, customer, or driver..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Status</option>
              <option value="trip_completed">Completed</option>
              <option value="trip_started">In Progress</option>
              <option value="accepted">Accepted</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Services</option>
              <option value="taxi">🚕 Taxi</option>
              <option value="courier">📦 Courier</option>
              <option value="school_run">🎒 School Run</option>
              <option value="errands">🛍️ Errands</option>
            </select>
            <Button>
              📊 Export Data
            </Button>
          </div>

          {/* Corporate-Specific Filters */}
          {activeTab === 'corporate' && (
            <div className="flex gap-4 items-center pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                🏢 Corporate Filters:
              </div>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Companies</option>
                {Array.from(new Set(trips.filter(t => t.userType === 'corporate' && t.companyName !== 'N/A').map(t => ({ id: t.companyId, name: t.companyName })).map(c => JSON.stringify(c)))).map(c => JSON.parse(c)).map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Payment Methods</option>
                <option value="account_balance">💳 Account Balance</option>
                <option value="cash">💵 Cash</option>
                <option value="ecocash">📱 EcoCash</option>
                <option value="onemoney">📲 OneMoney</option>
              </select>
              <button
                onClick={() => {
                  setFilterCompany('all');
                  setFilterPaymentMethod('all');
                  setFilterStatus('all');
                  setFilterService('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                🔄 Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading trips...</p>
            </div>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={filteredTrips}
              emptyMessage="No trips found"
            />
            
            {/* Pagination Controls */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} trips
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Trip Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTrip(null);
        }}
        title={`🗺️ Trip Details - ${selectedTrip?.id}`}
      >
        {selectedTrip && (
          <div className="space-y-4">
            {/* Corporate Trip - Show Company Info */}
            {selectedTrip.userType === 'corporate' && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-2">🏢 Corporate Account</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">Company</p>
                    <p className="font-semibold text-slate-700">{selectedTrip.companyName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Account Balance</p>
                    <p className="font-semibold text-green-600">${selectedTrip.creditBalance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Booked By</p>
                    <p className="font-semibold text-slate-700">{selectedTrip.user}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Payment Method</p>
                    <p className="font-semibold text-slate-700 capitalize">{selectedTrip.paymentMethod.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Customer</p>
                <p className="font-semibold text-slate-700">{selectedTrip.user}</p>
                <p className="text-xs text-slate-500 capitalize">{selectedTrip.userType}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Driver</p>
                <p className="font-semibold text-slate-700">{selectedTrip.driver}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Service Type</p>
                <p className="font-semibold text-slate-700 capitalize flex items-center gap-2">
                  {getServiceIcon(selectedTrip.serviceType)}
                  {selectedTrip.serviceType.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedTrip.status)}`}>
                  {selectedTrip.status.replace('_', ' ').charAt(0).toUpperCase() + selectedTrip.status.replace('_', ' ').slice(1)}
                </span>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-slate-600 mb-2">Route</p>
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-green-500">📍</span>
                  <span className="text-slate-700">{selectedTrip.pickup}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-red-500">📍</span>
                  <span className="text-slate-700">{selectedTrip.dropoff}</span>
                </p>
              </div>
            </div>
            <div className="border-t pt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-600">Fare</p>
                <p className="text-lg font-bold text-yellow-600">${selectedTrip.fare.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Duration</p>
                <p className="font-semibold text-slate-700">{selectedTrip.duration}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Date/Time</p>
                <p className="font-semibold text-slate-700">{selectedTrip.date}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      {tripToUpdate && (
        <Modal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setTripToUpdate(null);
            setNewStatus('');
            setStatusNotes('');
          }}
          title={`🔄 Update Trip Status - ${tripToUpdate.id}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-700 mb-2">Current Status</h4>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(tripToUpdate.status)}`}>
                {tripToUpdate.status.replace('_', ' ').charAt(0).toUpperCase() + tripToUpdate.status.replace('_', ' ').slice(1)}
              </span>
            </div>

            {/* New Status Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="driver_on_way">Driver On Way</option>
                <option value="driver_arrived">Driver Arrived</option>
                <option value="trip_started">Trip Started</option>
                <option value="trip_completed">Trip Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                rows="3"
                placeholder="Add any notes about this status change..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusModal(false);
                  setTripToUpdate(null);
                  setNewStatus('');
                  setStatusNotes('');
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateStatus}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TripsPage;

