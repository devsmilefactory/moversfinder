import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import DataTable from '../../shared/DataTable';
import Modal from '../../shared/Modal';
import Pagination from '../../shared/Pagination';
import { supabase } from '../../../lib/supabase';
import FormInput from '../../shared/FormInput';

/**
 * Admin Users Management Page
 * 
 * Features:
 * - Create new admin users (can be saved as draft)
 * - Read admin user details, account info, activity history
 * - Update admin user information
 * - Suspend admin accounts (deactivate without deleting data)
 * - Delete admin users (permanent removal with confirmation)
 * 
 * Database Integration:
 * - SELECT * FROM admin_users WHERE status != 'deleted'
 * - INSERT INTO admin_users (name, email, role, status)
 * - UPDATE admin_users SET status = 'suspended' WHERE id = ?
 * - DELETE FROM admin_users WHERE id = ?
 */

const AdminUsersPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Load admin users from Supabase
  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedUsers = (data || []).map(user => ({
        id: user.id,
        name: user.name || user.full_name || 'N/A',
        email: user.email || 'N/A',
        role: user.admin_role || 'Admin',
        status: user.account_status || 'active',
        lastLogin: user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never',
        createdAt: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : 'N/A',
        permissions: user.admin_permissions || []
      }));

      setAdminUsers(transformedUsers);
    } catch (error) {
      console.error('Error loading admin users:', error);
      setAdminUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Content Manager',
    status: 'draft',
    permissions: []
  });

  const roles = [
    { value: 'Super Admin', label: 'Super Admin', permissions: ['all'] },
    { value: 'Content Manager', label: 'Content Manager', permissions: ['content', 'users_read'] },
    { value: 'Support Admin', label: 'Support Admin', permissions: ['tickets', 'users_read'] },
    { value: 'Finance Admin', label: 'Finance Admin', permissions: ['financial', 'reports'] },
    { value: 'BMTOA Manager', label: 'BMTOA Manager', permissions: ['bmtoa', 'members', 'subscriptions'] }
  ];

  const handleCreateUser = async () => {
    try {
      // Validate form data
      if (!formData.name || !formData.email) {
        alert('Please fill in all required fields (Name and Email)');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert('Please enter a valid email address');
        return;
      }

      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        alert('An account with this email already exists. Please use a different email.');
        return;
      }

      // Use provided password or generate a temporary one
      const password = formData.password || `Admin${Math.random().toString(36).slice(-8)}!`;

      // Validate password strength if provided
      if (formData.password && formData.password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
      }

      // Create auth user using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: password,
        options: {
          data: {
            name: formData.name,
            user_type: 'admin',
            platform: 'bmtoa'
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create auth user - no user data returned');
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          user_type: 'admin',
          platform: 'bmtoa',
          auth_method: 'password',
          admin_role: formData.role,
          account_status: formData.status,
          admin_permissions: formData.permissions,
          verification_status: 'approved',
          profile_completion_status: 'complete',
          profile_completion_percentage: 100,
          login_count: 0
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        // Try to clean up auth user if profile creation fails
        // Note: This requires admin privileges
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Reload admin users list
      await loadAdminUsers();

      // Show success message
      if (formData.password) {
        alert(`✅ Admin user created successfully!\n\nEmail: ${formData.email}\nPassword: (as provided)\n\n⚠️ Make sure to share the credentials securely with the new admin.`);
      } else {
        alert(`✅ Admin user created successfully!\n\nEmail: ${formData.email}\nTemporary Password: ${password}\n\n⚠️ IMPORTANT: Save this password and share it securely with the new admin. They should change it on first login.`);
      }

      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating admin user:', error);
      alert(`Failed to create admin user: ${error.message}\n\nPlease try again or contact support.`);
    }
  };

  const handleUpdateUser = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          admin_role: formData.role,
          account_status: formData.status,
          admin_permissions: formData.permissions
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      await loadAdminUsers();
      setShowEditModal(false);
      resetForm();
      alert('Admin user updated successfully!');
    } catch (error) {
      console.error('Error updating admin user:', error);
      alert('Failed to update admin user. Please try again.');
    }
  };

  const handleSuspendUser = async (user) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      await loadAdminUsers();
      alert(`Admin user ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error updating admin user status:', error);
      alert('Failed to update admin user status. Please try again.');
    }
  };

  const handleDeleteUser = async () => {
    try {
      // Note: Deleting users from profiles table doesn't delete from auth.users
      // In production, you'd need to use Supabase auth.admin API
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      await loadAdminUsers();
      setShowDeleteModal(false);
      setSelectedUser(null);
      alert('Admin user deleted successfully!');
    } catch (error) {
      console.error('Error deleting admin user:', error);
      alert('Failed to delete admin user. Please try again.');
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: user.permissions
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Content Manager',
      status: 'draft',
      permissions: []
    });
    setSelectedUser(null);
  };

  const handleRoleChange = (role) => {
    const selectedRole = roles.find(r => r.value === role);
    setFormData({
      ...formData,
      role: role,
      permissions: selectedRole ? selectedRole.permissions : []
    });
  };

  const allFilteredUsers = adminUsers.filter(user => {
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    // Date range filter for created_at
    let matchesDateRange = true;
    if (filterDateFrom && user.createdAt) {
      matchesDateRange = matchesDateRange && user.createdAt >= filterDateFrom;
    }
    if (filterDateTo && user.createdAt) {
      matchesDateRange = matchesDateRange && user.createdAt <= filterDateTo;
    }
    
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesDateRange && matchesSearch;
  });
  
  // Apply pagination
  const totalCount = allFilteredUsers.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const filteredUsers = allFilteredUsers.slice(startIndex, endIndex);

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      draft: 'bg-yellow-100 text-yellow-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    { key: 'lastLogin', label: 'Last Login', render: (value) => value || 'Never' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, user) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditClick(user)}
          >
            ✏️ Edit
          </Button>
          <Button
            variant={user.status === 'suspended' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleSuspendUser(user)}
          >
            {user.status === 'suspended' ? '✓ Activate' : '⏸️ Suspend'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteClick(user)}
          >
            🗑️ Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-700 mb-2">👤 Admin Users</h1>
        <p className="text-slate-600">Manage administrator accounts and permissions</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="🔍 Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <Button onClick={() => setShowCreateModal(true)}>
              ➕ Create Admin User
            </Button>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Created From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Created To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSearchQuery('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading admin users...</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            emptyMessage="No admin users found"
          />
        )}
        
        {/* Pagination */}
        {!loading && totalCount > 0 && (
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        title={showEditModal ? '✏️ Edit Admin User' : '➕ Create Admin User'}
      >
        <div className="space-y-4">
          <FormInput
            label="Full Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter full name"
            required
          />
          <FormInput
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="admin@bmtoa.test"
            required
            disabled={showEditModal}
          />
          {!showEditModal && (
            <FormInput
              label="Password (Optional)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Leave blank to auto-generate"
              helperText="Minimum 8 characters. If left blank, a temporary password will be generated."
            />
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Permissions: {formData.permissions.join(', ')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="draft">Draft (Not yet active)</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={showEditModal ? handleUpdateUser : handleCreateUser}
              className="flex-1"
            >
              {showEditModal ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="🗑️ Delete Admin User"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            Are you sure you want to permanently delete <strong>{selectedUser?.name}</strong>?
          </p>
          <p className="text-sm text-red-600">
            ⚠️ This action cannot be undone. All data associated with this admin user will be permanently removed.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteUser}
              className="flex-1"
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;

