import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import FormInput, { FormSelect } from '../../shared/FormInput';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

/**
 * Operator Drivers Management Page
 *
 * Features:
 * - Table of all drivers with search/filter
 * - Add new driver
 * - View driver details
 * - Online/Offline status indicator
 * - Performance metrics link
 * - Document verification status
 * - Assign/unassign vehicle
 * - Zimbabwe phone format (+263)
 *
 * State Management:
 * - drivers: Array of driver objects
 * - searchQuery: Search filter
 * - statusFilter: Filter by status (all, online, offline, pending)
 * - showAddModal: Boolean for add driver modal
 * - showDetailsModal: Boolean for driver details modal
 * - selectedDriver: Currently selected driver
 * - formData: Form data for adding driver
 *
 * Database Integration Ready:
 * - Fetch: SELECT * FROM drivers WHERE operator_id = current_operator
 * - Add: INSERT INTO drivers (operator_id, name, phone, email, license_number, ...)
 * - Update: UPDATE drivers SET ... WHERE id = driver_id
 * - Status: UPDATE drivers SET status = 'online/offline' WHERE id = driver_id
 */

const DriversPage = () => {
  const user = useAuthStore((state) => state.user);

  // State management
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    licenseNumber: '',
    nationalId: '',
    licensePlate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Load drivers from Supabase
  useEffect(() => {
    if (user) {
      loadDrivers();
    }
  }, [user]);

  const loadDrivers = async () => {
    try {
      setLoading(true);

      // Fetch drivers associated with this operator
      const { data: driverProfiles, error } = await supabase
        .from('driver_profiles')
        .select(`
          user_id,
          full_name,
          license_number,
          license_plate,
          vehicle_make,
          vehicle_model,
          status,
          rating,
          total_trips,
          operator_approval_status,
          profiles!driver_profiles_user_id_fkey (
            email,
            phone,
            created_at,
            verification_status
          )
        `)
        .eq('operator_id', user.id)
        .eq('operator_approval_status', 'approved');

      if (error) throw error;

      // Transform data to match component structure
      const transformedDrivers = (driverProfiles || []).map(profile => ({
        id: profile.user_id,
        name: profile.full_name || 'N/A',
        phone: profile.profiles?.phone || 'N/A',
        email: profile.profiles?.email || 'N/A',
        licenseNumber: profile.license_number || 'N/A',
        status: profile.status || 'offline',
        rating: parseFloat(profile.rating) || 0,
        totalRides: profile.total_trips || 0,
        assignedVehicle: profile.license_plate || null,
        vehicleId: profile.vehicle_make ? `${profile.vehicle_make} ${profile.vehicle_model}` : null,
        documentsVerified: profile.profiles?.verification_status === 'verified',
        joinedDate: profile.profiles?.created_at ? new Date(profile.profiles.created_at).toISOString().split('T')[0] : 'N/A',
        todayEarnings: 0, // TODO: Calculate from rides table
        weekEarnings: 0, // TODO: Calculate from rides table
      }));

      setDrivers(transformedDrivers);
    } catch (error) {
      console.error('Error loading drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      online: { bg: 'bg-green-100', text: 'text-green-700', label: 'Online', icon: '🟢' },
      offline: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Offline', icon: '⚪' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Verification', icon: '⏳' },
    };
    const badge = badges[status] || badges.offline;
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  // Filter drivers
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         driver.phone.includes(searchQuery) ||
                         driver.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle add driver
  const handleAddDriver = async (e) => {
    e.preventDefault();

    // Validate Zimbabwe phone format
    const phonePattern = /^\+263\s?7[1378]\d{7}$/;
    if (!phonePattern.test(formData.phone)) {
      alert('Invalid phone format. Use format: +263 7XX XXX XXX');
      return;
    }

    try {
      setSubmitting(true);

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            user_type: 'driver',
            platform: 'bmtoa'
          }
        }
      });

      if (authError) throw new Error(`Failed to create auth user: ${authError.message}`);
      if (!authData.user) throw new Error('No user data returned from auth');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          user_type: 'driver',
          platform: 'bmtoa',
          auth_method: 'password',
          verification_status: 'approved', // Operator-created drivers are pre-approved
          profile_completion_status: 'incomplete',
          profile_completion_percentage: 30,
          login_count: 0
        });

      if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

      // Create driver profile
      const { error: driverError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: authData.user.id,
          operator_id: user.id, // Link to current operator
          operator_approval_status: 'approved', // Auto-approved since operator is creating
          operator_approved_at: new Date().toISOString(),
          operator_approved_by: user.id,
          full_name: formData.name,
          national_id: formData.nationalId,
          license_number: formData.licenseNumber,
          license_plate: formData.licensePlate,
          status: 'offline'
        });

      if (driverError) throw new Error(`Failed to create driver profile: ${driverError.message}`);

      // Show success message with credentials
      alert(`✅ Driver created successfully!\n\nEmail: ${formData.email}\nTemporary Password: ${tempPassword}\n\n⚠️ IMPORTANT: Save this password and share it securely with the driver. They should change it on first login.`);

      // Reload drivers list
      await loadDrivers();

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding driver:', error);
      alert(`Failed to add driver: ${error.message}\n\nPlease try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      licenseNumber: '',
      nationalId: '',
      licensePlate: '',
    });
  };

  // View driver details
  const viewDriverDetails = (driver) => {
    setSelectedDriver(driver);
    setShowDetailsModal(true);
  };

  // Toggle driver status
  const toggleDriverStatus = async (driverId, currentStatus) => {
    if (currentStatus === 'pending') {
      alert('Driver must complete document verification first');
      return;
    }

    const newStatus = currentStatus === 'online' ? 'offline' : 'online';

    try {
      // Update driver status in database
      const { error } = await supabase
        .from('driver_profiles')
        .update({ status: newStatus })
        .eq('user_id', driverId);

      if (error) throw error;

      // Update local state
      const updatedDrivers = drivers.map(d =>
        d.id === driverId ? { ...d, status: newStatus } : d
      );
      setDrivers(updatedDrivers);
    } catch (error) {
      console.error('Error updating driver status:', error);
      alert('Failed to update driver status. Please try again.');
    }
  };

  // Calculate stats
  const stats = {
    total: drivers.length,
    online: drivers.filter(d => d.status === 'online').length,
    offline: drivers.filter(d => d.status === 'offline').length,
    pending: drivers.filter(d => d.status === 'pending').length,
  };

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Drivers Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your {drivers.length} driver{drivers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            + Add Driver
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-slate-600">Total Drivers</p>
            <p className="text-3xl font-bold text-slate-700">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-green-700">Online Now</p>
            <p className="text-3xl font-bold text-green-700">{stats.online}</p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-700">Offline</p>
            <p className="text-3xl font-bold text-gray-700">{stats.offline}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-yellow-700">Pending Verification</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading drivers...</p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rides</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      No drivers found matching your criteria
                    </td>
                  </tr>
                ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-700">
                            {driver.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{driver.name}</p>
                          <p className="text-xs text-slate-500">License: {driver.licenseNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{driver.phone}</p>
                      <p className="text-xs text-slate-500">{driver.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {driver.assignedVehicle || <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(driver.status)}</td>
                    <td className="px-6 py-4">
                      {driver.rating > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-medium text-slate-700">{driver.rating}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {driver.totalRides.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewDriverDetails(driver)}
                        >
                          View
                        </Button>
                        {driver.status !== 'pending' && (
                          <Button
                            variant={driver.status === 'online' ? 'danger' : 'primary'}
                            size="sm"
                            onClick={() => toggleDriverStatus(driver.id, driver.status)}
                          >
                            {driver.status === 'online' ? 'Set Offline' : 'Set Online'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Add Driver Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add New Driver"
        size="md"
      >
        <form onSubmit={handleAddDriver}>
          <div className="space-y-4">
            <FormInput
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Michael Ncube"
              required
            />
            <FormInput
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+263 773 456 789"
              required
              helperText="Format: +263 7XX XXX XXX"
            />
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="michael.ncube@example.com"
              required
            />
            <FormInput
              label="National ID"
              name="nationalId"
              value={formData.nationalId}
              onChange={(e) => setFormData({ ...formData, nationalId: e.target.value.toUpperCase() })}
              placeholder="63-123456A12"
              required
            />
            <FormInput
              label="Driver's License Number"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
              placeholder="DL123456"
              required
            />
            <FormInput
              label="Vehicle License Plate (Optional)"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
              placeholder="ABC 1234"
              helperText="Format: ABC 1234 (if driver has own vehicle)"
            />

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> A temporary password will be generated. The driver will need to upload required documents
                (Driver's License, PSV License, etc.) to complete their profile.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating Driver...' : 'Add Driver'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Driver Details Modal */}
      {selectedDriver && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedDriver(null);
          }}
          title={`Driver Details - ${selectedDriver.name}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Personal Information</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-medium">{selectedDriver.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Phone:</span>
                  <span className="font-medium">{selectedDriver.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Email:</span>
                  <span className="font-medium">{selectedDriver.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">License Number:</span>
                  <span className="font-medium">{selectedDriver.licenseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Joined Date:</span>
                  <span className="font-medium">{selectedDriver.joinedDate}</span>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Performance</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  {getStatusBadge(selectedDriver.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Rating:</span>
                  <span className="font-medium">
                    {selectedDriver.rating > 0 ? `⭐ ${selectedDriver.rating}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Rides:</span>
                  <span className="font-medium">{selectedDriver.totalRides.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Today's Earnings:</span>
                  <span className="font-bold text-green-600">${selectedDriver.todayEarnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">This Week's Earnings:</span>
                  <span className="font-bold text-green-600">${selectedDriver.weekEarnings.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Vehicle Assignment */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Vehicle Assignment</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Assigned Vehicle:</span>
                  <span className="font-medium">
                    {selectedDriver.assignedVehicle || <span className="text-slate-400">Unassigned</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Document Verification</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Documents Verified:</span>
                  {selectedDriver.documentsVerified ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      ⏳ Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedDriver(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default DriversPage;
