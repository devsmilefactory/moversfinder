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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [updating, setUpdating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({});
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteRelatedRecords, setDeleteRelatedRecords] = useState({});

  // Load users from database
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Fetch all users from profiles table with ride count
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          phone,
          user_type,
          platform,
          account_status,
          created_at,
          last_login_at,
          rides:rides(count)
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
        status: user.account_status || 'active',
        registeredAt: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : 'N/A',
        lastActive: user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never',
        totalRides: user.rides?.[0]?.count || 0
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
          account_status: 'active',
          updated_at: new Date().toISOString()
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
          account_status: 'suspended',
          updated_at: new Date().toISOString()
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
          account_status: 'active',
          updated_at: new Date().toISOString()
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

  // View user details with complete profile information
  const viewUserDetails = async (user) => {
    try {
      setLoading(true);
      
      // Fetch complete profile based on user type
      let profileData = null;
      
      if (user.userType === 'corporate') {
        const { data, error } = await supabase
          .from('corporate_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          profileData = {
            type: 'corporate',
            companyName: data.company_name,
            businessRegistration: data.business_registration,
            industry: data.industry,
            companySize: data.company_size,
            totalEmployees: data.total_employees,
            accountTier: data.account_tier,
            creditBalance: data.credit_balance,
            monthlySpend: data.monthly_spend,
            verificationStatus: data.verification_status,
            creditBookingApproved: data.credit_booking_approved,
            primaryContactName: data.primary_contact_name,
            primaryContactPhone: data.primary_contact_phone,
            primaryContactEmail: data.primary_contact_email
          };
        }
      } else if (user.userType === 'driver') {
        const { data, error } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          profileData = {
            type: 'driver',
            fullName: data.full_name,
            licenseNumber: data.license_number,
            licenseExpiry: data.license_expiry,
            verificationStatus: data.verification_status,
            approvalStatus: data.approval_status,
            submissionStatus: data.submission_status,
            operatorId: data.operator_id,
            totalEarnings: data.total_earnings,
            rating: data.rating,
            totalTrips: data.total_trips
          };
        }
      } else if (user.userType === 'operator') {
        const { data, error } = await supabase
          .from('operator_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          profileData = {
            type: 'operator',
            companyName: data.company_name,
            businessRegistration: data.business_registration,
            fleetSize: data.fleet_size,
            totalDrivers: data.total_drivers,
            membershipTier: data.membership_tier,
            bmtoaVerified: data.bmtoa_verified,
            bmtoaMemberNumber: data.bmtoa_member_number,
            monthlyRevenue: data.monthly_revenue,
            approvalStatus: data.approval_status,
            profileStatus: data.profile_status
          };
        }
      } else if (user.userType === 'individual') {
        const { data, error } = await supabase
          .from('individual_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          profileData = {
            type: 'individual',
            totalRides: data.total_rides,
            totalSpent: data.total_spent,
            profileStatus: data.profile_status,
            completionPercentage: data.completion_percentage,
            servicePreferences: data.service_preferences,
            savedPlaces: data.saved_places
          };
        }
      }
      
      setSelectedUser({
        ...user,
        profileData
      });
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading user profile details:', error);
      // Still show modal with basic info
      setSelectedUser(user);
      setShowDetailsModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      platform: user.platform,
      account_status: user.status
    });
    setEditFormErrors({});
    setShowEditModal(true);
  };

  // Validate form data against database schema
  const validateUserForm = (formData) => {
    const errors = {};

    // Name validation (required, text)
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Name is required';
    }

    // Email validation (required, valid email format, unique)
    if (!formData.email || formData.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Phone validation (optional, but if provided should be valid)
    if (formData.phone && formData.phone.trim() !== '') {
      // Basic phone validation - adjust regex based on your requirements
      if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
        errors.phone = 'Invalid phone number format';
      }
    }

    // Platform validation (must be one of the allowed values)
    const validPlatforms = ['taxicab', 'bmtoa', 'both'];
    if (!formData.platform || !validPlatforms.includes(formData.platform)) {
      errors.platform = 'Platform must be taxicab, bmtoa, or both';
    }

    // Account status validation (must be one of the allowed values)
    const validStatuses = ['active', 'disabled', 'suspended'];
    if (!formData.account_status || !validStatuses.includes(formData.account_status)) {
      errors.account_status = 'Status must be active, disabled, or suspended';
    }

    return errors;
  };

  // Handle update user
  const handleUpdateUser = async () => {
    try {
      setUpdating(true);
      setEditFormErrors({});

      // Validate form data
      const errors = validateUserForm(editFormData);
      if (Object.keys(errors).length > 0) {
        setEditFormErrors(errors);
        setUpdating(false);
        return;
      }

      // Check if email is being changed and if it's unique
      if (editFormData.email !== selectedUser.email) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', editFormData.email)
          .neq('id', selectedUser.id)
          .single();

        if (existingUser) {
          setEditFormErrors({ email: 'Email already exists' });
          setUpdating(false);
          return;
        }
      }

      // Update user in database
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editFormData.name.trim(),
          email: editFormData.email.trim(),
          phone: editFormData.phone?.trim() || null,
          platform: editFormData.platform,
          account_status: editFormData.account_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      alert('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      setEditFormData({});
      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setCreateFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      user_type: '',
      platform: '',
      account_status: 'active'
    });
    setCreateFormErrors({});
    setShowCreateModal(true);
  };

  // Validate create form data
  const validateCreateForm = (formData) => {
    const errors = {};

    // Name validation
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Name is required';
    }

    // Email validation
    if (!formData.email || formData.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // User type validation
    const validUserTypes = ['individual', 'corporate', 'driver', 'operator', 'admin'];
    if (!formData.user_type || !validUserTypes.includes(formData.user_type)) {
      errors.user_type = 'Please select a valid user type';
    }

    // Platform validation
    const validPlatforms = ['taxicab', 'bmtoa', 'both'];
    if (!formData.platform || !validPlatforms.includes(formData.platform)) {
      errors.platform = 'Please select a valid platform';
    }

    // Phone validation (optional)
    if (formData.phone && formData.phone.trim() !== '') {
      if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
        errors.phone = 'Invalid phone number format';
      }
    }

    return errors;
  };

  // Handle create user
  const handleCreateUser = async () => {
    try {
      setCreating(true);
      setCreateFormErrors({});

      // Validate form data
      const errors = validateCreateForm(createFormData);
      if (Object.keys(errors).length > 0) {
        setCreateFormErrors(errors);
        setCreating(false);
        return;
      }

      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', createFormData.email.trim())
        .single();

      if (existingUser) {
        setCreateFormErrors({ email: 'Email already exists' });
        setCreating(false);
        return;
      }

      // Create user in auth.users using Supabase Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: createFormData.email.trim(),
        password: createFormData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: createFormData.name.trim()
        }
      });

      if (authError) throw authError;

      // Create profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: createFormData.email.trim(),
          name: createFormData.name.trim(),
          phone: createFormData.phone?.trim() || null,
          user_type: createFormData.user_type,
          platform: createFormData.platform,
          account_status: createFormData.account_status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        // If profile creation fails, we should delete the auth user
        // However, this requires admin privileges
        console.error('Profile creation failed:', profileError);
        throw new Error('Failed to create user profile. Please contact support.');
      }

      alert('User created successfully! A confirmation email has been sent.');
      setShowCreateModal(false);
      setCreateFormData({});
      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`Failed to create user: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Check related records before delete
  const checkRelatedRecords = async (userId) => {
    try {
      const related = {};

      // Check rides (NO ACTION constraint)
      const { count: ridesCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      related.rides = ridesCount || 0;

      // Check documents (NO ACTION constraint)
      const { count: documentsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      related.documents = documentsCount || 0;

      // Check payments (NO ACTION constraint)
      const { count: paymentsCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      related.payments = paymentsCount || 0;

      // Check notifications (NO ACTION constraint)
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      related.notifications = notificationsCount || 0;

      // Check complaints (NO ACTION constraint)
      const { count: complaintsCount } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .or(`complainant_id.eq.${userId},against_id.eq.${userId}`);
      related.complaints = complaintsCount || 0;

      return related;
    } catch (error) {
      console.error('Error checking related records:', error);
      return {};
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = async (user) => {
    setUserToDelete(user);
    const related = await checkRelatedRecords(user.id);
    setDeleteRelatedRecords(related);
    setShowDeleteModal(true);
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);

      // Delete related records with NO ACTION constraints first
      // This prevents foreign key constraint violations

      // Delete documents
      if (deleteRelatedRecords.documents > 0) {
        const { error: docsError } = await supabase
          .from('documents')
          .delete()
          .eq('user_id', userToDelete.id);
        if (docsError) throw docsError;
      }

      // Delete notifications
      if (deleteRelatedRecords.notifications > 0) {
        const { error: notifsError } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', userToDelete.id);
        if (notifsError) throw notifsError;
      }

      // Delete payments
      if (deleteRelatedRecords.payments > 0) {
        const { error: paymentsError } = await supabase
          .from('payments')
          .delete()
          .eq('user_id', userToDelete.id);
        if (paymentsError) throw paymentsError;
      }

      // Delete complaints
      if (deleteRelatedRecords.complaints > 0) {
        const { error: complaintsError } = await supabase
          .from('complaints')
          .delete()
          .or(`complainant_id.eq.${userToDelete.id},against_id.eq.${userToDelete.id}`);
        if (complaintsError) throw complaintsError;
      }

      // Delete rides (NO ACTION constraint)
      if (deleteRelatedRecords.rides > 0) {
        const { error: ridesError } = await supabase
          .from('rides')
          .delete()
          .eq('user_id', userToDelete.id);
        if (ridesError) throw ridesError;
      }

      // Delete profile-specific tables (these have CASCADE or NO ACTION)
      // Individual profile
      await supabase.from('individual_profiles').delete().eq('user_id', userToDelete.id);
      
      // Corporate profile
      await supabase.from('corporate_profiles').delete().eq('user_id', userToDelete.id);
      
      // Driver profile (CASCADE)
      await supabase.from('driver_profiles').delete().eq('user_id', userToDelete.id);
      
      // Operator profile
      await supabase.from('operator_profiles').delete().eq('user_id', userToDelete.id);

      // Delete from profiles table
      // This will CASCADE delete: memberships, operators, subscriptions, support_tickets, 
      // scheduled_trips, recurring_trip_series, trip_reminders, ride_offers, 
      // driver_operator_assignments, corporate_passengers
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

      // Delete from auth.users using Admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(userToDelete.id);
      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Continue anyway as profile is already deleted
      }

      alert('User deleted successfully!');
      setShowDeleteModal(false);
      setUserToDelete(null);
      setDeleteRelatedRecords({});
      loadUsers(); // Reload users
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.message}`);
    } finally {
      setDeleting(false);
    }
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
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Users Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage all users across TaxiCab and BMTOA platforms
            </p>
          </div>
          <Button variant="primary" onClick={openCreateModal}>
            ➕ Create User
          </Button>
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
                        <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => openDeleteModal(user)}>
                          Delete
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

            {/* Profile-Specific Information */}
            {selectedUser.profileData && (
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">
                  {selectedUser.profileData.type === 'corporate' && 'Corporate Profile'}
                  {selectedUser.profileData.type === 'driver' && 'Driver Profile'}
                  {selectedUser.profileData.type === 'operator' && 'Operator Profile'}
                  {selectedUser.profileData.type === 'individual' && 'Individual Profile'}
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  {/* Corporate Profile Details */}
                  {selectedUser.profileData.type === 'corporate' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Company Name:</span>
                        <span className="font-medium">{selectedUser.profileData.companyName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Business Registration:</span>
                        <span className="font-medium">{selectedUser.profileData.businessRegistration || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Industry:</span>
                        <span className="font-medium">{selectedUser.profileData.industry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Company Size:</span>
                        <span className="font-medium">{selectedUser.profileData.companySize || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Employees:</span>
                        <span className="font-medium">{selectedUser.profileData.totalEmployees || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Account Tier:</span>
                        <span className="font-medium capitalize">{selectedUser.profileData.accountTier || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Credit Balance:</span>
                        <span className="font-medium text-green-600">${parseFloat(selectedUser.profileData.creditBalance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Monthly Spend:</span>
                        <span className="font-medium">${parseFloat(selectedUser.profileData.monthlySpend || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Credit Booking:</span>
                        <span className={`font-medium ${selectedUser.profileData.creditBookingApproved ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser.profileData.creditBookingApproved ? 'Approved' : 'Not Approved'}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Driver Profile Details */}
                  {selectedUser.profileData.type === 'driver' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Full Name:</span>
                        <span className="font-medium">{selectedUser.profileData.fullName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">License Number:</span>
                        <span className="font-medium">{selectedUser.profileData.licenseNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">License Expiry:</span>
                        <span className="font-medium">{selectedUser.profileData.licenseExpiry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Verification Status:</span>
                        <span className="font-medium capitalize">{selectedUser.profileData.verificationStatus || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Approval Status:</span>
                        <span className="font-medium capitalize">{selectedUser.profileData.approvalStatus || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Submission Status:</span>
                        <span className="font-medium capitalize">{selectedUser.profileData.submissionStatus || 'N/A'}</span>
                      </div>
                      {selectedUser.profileData.totalEarnings && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Earnings:</span>
                          <span className="font-medium text-green-600">${parseFloat(selectedUser.profileData.totalEarnings).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedUser.profileData.rating && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Rating:</span>
                          <span className="font-medium">⭐ {selectedUser.profileData.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Operator Profile Details */}
                  {selectedUser.profileData.type === 'operator' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Company Name:</span>
                        <span className="font-medium">{selectedUser.profileData.companyName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Business Registration:</span>
                        <span className="font-medium">{selectedUser.profileData.businessRegistration || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Fleet Size:</span>
                        <span className="font-medium">{selectedUser.profileData.fleetSize || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Drivers:</span>
                        <span className="font-medium">{selectedUser.profileData.totalDrivers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Membership Tier:</span>
                        <span className="font-medium capitalize">{selectedUser.profileData.membershipTier || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">BMTOA Verified:</span>
                        <span className={`font-medium ${selectedUser.profileData.bmtoaVerified ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser.profileData.bmtoaVerified ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {selectedUser.profileData.bmtoaMemberNumber && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">BMTOA Member #:</span>
                          <span className="font-medium">{selectedUser.profileData.bmtoaMemberNumber}</span>
                        </div>
                      )}
                      {selectedUser.profileData.monthlyRevenue && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Monthly Revenue:</span>
                          <span className="font-medium text-green-600">${parseFloat(selectedUser.profileData.monthlyRevenue).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Individual Profile Details */}
                  {selectedUser.profileData.type === 'individual' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Rides:</span>
                        <span className="font-medium">{selectedUser.profileData.totalRides || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Spent:</span>
                        <span className="font-medium">${parseFloat(selectedUser.profileData.totalSpent || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Profile Status:</span>
                        <span className="font-medium capitalize">{selectedUser.profileData.profileStatus?.replace('_', ' ') || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Completion:</span>
                        <span className="font-medium">{selectedUser.profileData.completionPercentage || 0}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

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

      {/* Edit User Modal */}
      {selectedUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            setEditFormData({});
            setEditFormErrors({});
          }}
          title={`Edit User - ${selectedUser.name}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  editFormErrors.name
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-yellow-400'
                }`}
                placeholder="Enter user name"
              />
              {editFormErrors.name && (
                <p className="text-red-500 text-sm mt-1">{editFormErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  editFormErrors.email
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-yellow-400'
                }`}
                placeholder="Enter email address"
              />
              {editFormErrors.email && (
                <p className="text-red-500 text-sm mt-1">{editFormErrors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={editFormData.phone || ''}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  editFormErrors.phone
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-yellow-400'
                }`}
                placeholder="Enter phone number"
              />
              {editFormErrors.phone && (
                <p className="text-red-500 text-sm mt-1">{editFormErrors.phone}</p>
              )}
            </div>

            {/* Platform Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Platform <span className="text-red-500">*</span>
              </label>
              <select
                value={editFormData.platform || ''}
                onChange={(e) => setEditFormData({ ...editFormData, platform: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  editFormErrors.platform
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-yellow-400'
                }`}
              >
                <option value="">Select platform</option>
                <option value="taxicab">TaxiCab</option>
                <option value="bmtoa">BMTOA</option>
                <option value="both">Both</option>
              </select>
              {editFormErrors.platform && (
                <p className="text-red-500 text-sm mt-1">{editFormErrors.platform}</p>
              )}
            </div>

            {/* Account Status Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Status <span className="text-red-500">*</span>
              </label>
              <select
                value={editFormData.account_status || ''}
                onChange={(e) => setEditFormData({ ...editFormData, account_status: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  editFormErrors.account_status
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-yellow-400'
                }`}
              >
                <option value="">Select status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="suspended">Suspended</option>
              </select>
              {editFormErrors.account_status && (
                <p className="text-red-500 text-sm mt-1">{editFormErrors.account_status}</p>
              )}
            </div>

            {/* User Type Display (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                User Type (Read-only)
              </label>
              <div className="px-4 py-2 bg-slate-100 rounded-lg">
                {getUserTypeBadge(selectedUser.userType)}
              </div>
              <p className="text-xs text-slate-500 mt-1">User type cannot be changed after creation</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  setEditFormData({});
                  setEditFormErrors({});
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateUser}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateFormData({});
          setCreateFormErrors({});
        }}
        title="Create New User"
        size="lg"
      >
        <div className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createFormData.name || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                createFormErrors.name
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-slate-300 focus:ring-yellow-400'
              }`}
              placeholder="Enter user name"
            />
            {createFormErrors.name && (
              <p className="text-red-500 text-sm mt-1">{createFormErrors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={createFormData.email || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                createFormErrors.email
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-slate-300 focus:ring-yellow-400'
              }`}
              placeholder="Enter email address"
            />
            {createFormErrors.email && (
              <p className="text-red-500 text-sm mt-1">{createFormErrors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={createFormData.password || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                createFormErrors.password
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-slate-300 focus:ring-yellow-400'
              }`}
              placeholder="Enter password (min 6 characters)"
            />
            {createFormErrors.password && (
              <p className="text-red-500 text-sm mt-1">{createFormErrors.password}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Password must be at least 6 characters</p>
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={createFormData.phone || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                createFormErrors.phone
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-slate-300 focus:ring-yellow-400'
              }`}
              placeholder="Enter phone number (optional)"
            />
            {createFormErrors.phone && (
              <p className="text-red-500 text-sm mt-1">{createFormErrors.phone}</p>
            )}
          </div>

          {/* User Type Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              User Type <span className="text-red-500">*</span>
            </label>
            <select
              value={createFormData.user_type || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, user_type: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                createFormErrors.user_type
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-slate-300 focus:ring-yellow-400'
              }`}
            >
              <option value="">Select user type</option>
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
              <option value="driver">Driver</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
            {createFormErrors.user_type && (
              <p className="text-red-500 text-sm mt-1">{createFormErrors.user_type}</p>
            )}
          </div>

          {/* Platform Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Platform <span className="text-red-500">*</span>
            </label>
            <select
              value={createFormData.platform || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, platform: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                createFormErrors.platform
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-slate-300 focus:ring-yellow-400'
              }`}
            >
              <option value="">Select platform</option>
              <option value="taxicab">TaxiCab</option>
              <option value="bmtoa">BMTOA</option>
              <option value="both">Both</option>
            </select>
            {createFormErrors.platform && (
              <p className="text-red-500 text-sm mt-1">{createFormErrors.platform}</p>
            )}
          </div>

          {/* Account Status Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Account Status <span className="text-red-500">*</span>
            </label>
            <select
              value={createFormData.account_status || 'active'}
              onChange={(e) => setCreateFormData({ ...createFormData, account_status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setCreateFormData({});
                setCreateFormErrors({});
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateUser}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setUserToDelete(null);
            setDeleteRelatedRecords({});
          }}
          title="⚠️ Delete User"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold mb-2">
                Are you sure you want to delete this user?
              </p>
              <p className="text-red-700 text-sm">
                This action cannot be undone. The user and all related data will be permanently deleted.
              </p>
            </div>

            {/* User Info */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-700 mb-2">User Information</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Name:</span> {userToDelete.name}</p>
                <p><span className="font-medium">Email:</span> {userToDelete.email}</p>
                <p><span className="font-medium">User Type:</span> {userToDelete.userType}</p>
                <p><span className="font-medium">Platform:</span> {userToDelete.platform}</p>
              </div>
            </div>

            {/* Related Records Warning */}
            {Object.keys(deleteRelatedRecords).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Related Records</h4>
                <p className="text-yellow-700 text-sm mb-2">
                  The following related records will also be deleted:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {deleteRelatedRecords.rides > 0 && (
                    <li>• {deleteRelatedRecords.rides} ride(s)</li>
                  )}
                  {deleteRelatedRecords.documents > 0 && (
                    <li>• {deleteRelatedRecords.documents} document(s)</li>
                  )}
                  {deleteRelatedRecords.payments > 0 && (
                    <li>• {deleteRelatedRecords.payments} payment(s)</li>
                  )}
                  {deleteRelatedRecords.notifications > 0 && (
                    <li>• {deleteRelatedRecords.notifications} notification(s)</li>
                  )}
                  {deleteRelatedRecords.complaints > 0 && (
                    <li>• {deleteRelatedRecords.complaints} complaint(s)</li>
                  )}
                </ul>
                <p className="text-yellow-700 text-sm mt-2">
                  Plus any memberships, subscriptions, support tickets, and profile-specific data.
                </p>
              </div>
            )}

            {/* Confirmation Input */}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700 mb-2">
                Type <span className="font-mono font-bold">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                id="deleteConfirmation"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Type DELETE to confirm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                  setDeleteRelatedRecords({});
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const confirmation = document.getElementById('deleteConfirmation').value;
                  if (confirmation === 'DELETE') {
                    handleDeleteUser();
                  } else {
                    alert('Please type DELETE to confirm');
                  }
                }}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default UsersPage;

