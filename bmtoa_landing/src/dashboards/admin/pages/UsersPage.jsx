import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';

/**
 * Admin Users Management Page (ENHANCED for both platforms)
 *
 * Features:
 * - Unified view of all users across TaxiCab and BMTOA platforms
 * - Platform filter tabs (TaxiCab / BMTOA / All)
 * - User type filter (Individual, Corporate, Driver, Operator, Admin)
 * - Status filter (Active, Pending, Suspended)
 * - Search by name, email, phone
 * - Approve/Suspend/Delete actions
 * - View user details modal
 * - User activity history
 *
 * State Management:
 * - users: Array of user objects from both platforms
 * - platformFilter: 'all', 'taxicab', 'bmtoa'
 * - userTypeFilter: 'all', 'individual', 'corporate', 'driver', 'operator', 'admin'
 * - statusFilter: 'all', 'active', 'pending', 'suspended'
 * - searchQuery: Search string
 * - selectedUser: Currently viewed user
 * - showDetailsModal: Boolean for details modal
 *
 * Database Integration:
 * - Fetch: SELECT * FROM profiles WHERE platform IN ('taxicab', 'bmtoa')
 * - Approve: UPDATE profiles SET verification_status = 'approved', verified_at = now() WHERE id = user_id
 * - Suspend: UPDATE profiles SET verification_status = 'suspended' WHERE id = user_id
 */

const UsersPage = () => {
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Load users from database
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Fetch all users from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          phone,
          user_type,
          platform,
          verification_status,
          created_at,
          last_login_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match UI expectations
      const transformedUsers = (data || []).map(user => ({
        id: user.id,
        name: user.name || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        userType: user.user_type === 'taxi_operator' ? 'operator' : user.user_type,
        platform: user.platform,
        status: user.verification_status === 'approved' ? 'active' :
                user.verification_status === 'suspended' ? 'suspended' : 'pending',
        registeredAt: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : 'N/A',
        lastActive: user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never',
        totalRides: 0 // Will be calculated from rides table if needed
      }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get platform badge
  const getPlatformBadge = (platform) => {
    const badges = {
      taxicab: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'TaxiCab' },
      bmtoa: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'BMTOA' },
    };
    const badge = badges[platform];
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} rounded text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  // Get user type badge
  const getUserTypeBadge = (userType) => {
    const badges = {
      individual: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Individual', icon: '👤' },
      corporate: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Corporate', icon: '🏢' },
      driver: { bg: 'bg-green-100', text: 'text-green-700', label: 'Driver', icon: '🚗' },
      operator: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Operator', icon: '🚕' },
      admin: { bg: 'bg-red-100', text: 'text-red-700', label: 'Admin', icon: '🛡️' },
    };
    const badge = badges[userType];
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} rounded text-xs font-medium`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      suspended: { bg: 'bg-red-100', text: 'text-red-700', label: 'Suspended' },
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesPlatform = platformFilter === 'all' || user.platform === platformFilter;
    const matchesUserType = userTypeFilter === 'all' || user.userType === userTypeFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.phone.includes(searchQuery);
    return matchesPlatform && matchesUserType && matchesStatus && matchesSearch;
  });

  // Handle approve user
  const handleApprove = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'approved',
          verified_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      alert('User approved successfully!');
      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error approving user:', error);
      alert(`Failed to approve user: ${error.message}`);
    }
  };

  // Handle suspend user
  const handleSuspend = async (userId) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'suspended'
        })
        .eq('id', userId);

      if (error) throw error;

      alert('User suspended successfully!');
      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error suspending user:', error);
      alert(`Failed to suspend user: ${error.message}`);
    }
  };

  // Handle activate user
  const handleActivate = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'approved',
          verified_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      alert('User activated successfully!');
      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error activating user:', error);
      alert(`Failed to activate user: ${error.message}`);
    }
  };

  // View user details
  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  // Calculate stats
  const stats = {
    total: users.length,
    taxicab: users.filter(u => u.platform === 'taxicab').length,
    bmtoa: users.filter(u => u.platform === 'bmtoa').length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  };

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-700">Users Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all users across TaxiCab and BMTOA platforms
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-slate-600">Total Users</p>
            <p className="text-3xl font-bold text-slate-700">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-blue-700">TaxiCab</p>
            <p className="text-3xl font-bold text-blue-700">{stats.taxicab}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-yellow-700">BMTOA</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.bmtoa}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-green-700">Active</p>
            <p className="text-3xl font-bold text-green-700">{stats.active}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-yellow-700">Pending</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-red-700">Suspended</p>
            <p className="text-3xl font-bold text-red-700">{stats.suspended}</p>
          </div>
        </div>

        {/* Platform Filter Tabs */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                platformFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Platforms ({stats.total})
            </button>
            <button
              onClick={() => setPlatformFilter('taxicab')}
              className={`px-4 py-2 rounded-lg font-medium ${
                platformFilter === 'taxicab'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              TaxiCab ({stats.taxicab})
            </button>
            <button
              onClick={() => setPlatformFilter('bmtoa')}
              className={`px-4 py-2 rounded-lg font-medium ${
                platformFilter === 'bmtoa'
                  ? 'bg-yellow-400 text-slate-700'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              BMTOA ({stats.bmtoa})
            </button>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All User Types</option>
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
              <option value="driver">Driver</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="text-sm text-slate-600 flex items-center">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading users...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-slate-600 text-lg mb-2">No users found</p>
                <p className="text-slate-500 text-sm">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Registered</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    No users found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-700">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{user.name}</p>
                          <p className="text-xs text-slate-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{user.phone}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">{getPlatformBadge(user.platform)}</td>
                    <td className="px-6 py-4">{getUserTypeBadge(user.userType)}</td>
                    <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{user.registeredAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => viewUserDetails(user)}>
                          View
                        </Button>
                        {user.status === 'pending' && (
                          <Button variant="primary" size="sm" onClick={() => handleApprove(user.id)}>
                            Approve
                          </Button>
                        )}
                        {user.status === 'active' && (
                          <Button variant="danger" size="sm" onClick={() => handleSuspend(user.id)}>
                            Suspend
                          </Button>
                        )}
                        {user.status === 'suspended' && (
                          <Button variant="primary" size="sm" onClick={() => handleActivate(user.id)}>
                            Activate
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

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
          title={`User Details - ${selectedUser.name}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Basic Information</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-medium">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Email:</span>
                  <span className="font-medium">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Phone:</span>
                  <span className="font-medium">{selectedUser.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Platform:</span>
                  {getPlatformBadge(selectedUser.platform)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">User Type:</span>
                  {getUserTypeBadge(selectedUser.userType)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  {getStatusBadge(selectedUser.status)}
                </div>
              </div>
            </div>

            {/* Activity */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Activity</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Registered:</span>
                  <span className="font-medium">{selectedUser.registeredAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Last Active:</span>
                  <span className="font-medium">{selectedUser.lastActive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Rides:</span>
                  <span className="font-medium">{selectedUser.totalRides.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedUser(null);
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

export default UsersPage;

