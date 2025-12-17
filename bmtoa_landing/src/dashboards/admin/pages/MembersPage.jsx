import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import DataTable from '../../shared/DataTable';
import Modal from '../../shared/Modal';
import Pagination from '../../shared/Pagination';
import { useMembersStore } from '../../../stores';
import AdminAddMemberForm from '../components/AdminAddMemberForm';

/**
 * BMTOA Members Management Page
 * 
 * Features:
 * - View all BMTOA members (taxi operators and drivers)
 * - Filter by membership status, tier
 * - View member details
 * - Suspend/activate memberships
 * - Manage member subscriptions
 * 
 * Database Integration:
 * - SELECT * FROM bmtoa_members
 * - UPDATE bmtoa_members SET status = ? WHERE id = ?
 */

const MembersPage = () => {
  // Get members from Zustand store
  const {
    members,
    membersLoading,
    loadMembers,
    updateMemberStatus,
    setFilterType,
    setSearchQuery: setStoreSearchQuery,
    getFilteredMembers,
  } = useMembersStore();

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterSubscription, setFilterSubscription] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [relatedVehicles, setRelatedVehicles] = useState([]);
  const [relatedDrivers, setRelatedDrivers] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Load members on mount
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Update store search query when local search changes
  useEffect(() => {
    setStoreSearchQuery(searchQuery);
  }, [searchQuery, setStoreSearchQuery]);

  const handleViewDetails = async (member) => {
    setSelectedMember(member);
    setShowDetailsModal(true);
    setLoadingRelated(true);
    
    try {
      // Only fetch related data for operators
      if (member.memberType === 'operator') {
        // Import supabase
        const { supabase } = await import('../../../lib/supabase');
        
        // Fetch related vehicles
        const { data: vehicles, error: vehiclesError } = await supabase
          .from('operator_vehicles')
          .select('*')
          .eq('operator_id', member.id);
        
        if (vehiclesError) throw vehiclesError;
        setRelatedVehicles(vehicles || []);
        
        // Fetch related drivers
        const { data: drivers, error: driversError } = await supabase
          .from('driver_profiles')
          .select(`
            *,
            profiles!driver_profiles_user_id_fkey(name, email, phone)
          `)
          .eq('operator_id', member.id);
        
        if (driversError) throw driversError;
        setRelatedDrivers(drivers || []);
      } else {
        setRelatedVehicles([]);
        setRelatedDrivers([]);
      }
    } catch (error) {
      console.error('Error loading related data:', error);
      setRelatedVehicles([]);
      setRelatedDrivers([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleToggleStatus = async (member) => {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    try {
      await updateMemberStatus(member.id, newStatus);
      alert(`Member status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating member status:', error);
      alert('Failed to update member status. Please try again.');
    }
  };

  // Filter members
  const allFilteredMembers = members.filter(member => {
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    const matchesTier = filterTier === 'all' || member.membershipTier.toLowerCase() === filterTier.toLowerCase();
    const matchesSubscription = filterSubscription === 'all' || member.subscriptionStatus === filterSubscription;
    
    // Date range filter for bmtoa_member_since (joinedDate)
    let matchesDateRange = true;
    if (filterDateFrom && member.joinedDate) {
      matchesDateRange = matchesDateRange && member.joinedDate >= filterDateFrom;
    }
    if (filterDateTo && member.joinedDate) {
      matchesDateRange = matchesDateRange && member.joinedDate <= filterDateTo;
    }
    
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (member.id && member.id.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesTier && matchesSubscription && matchesDateRange && matchesSearch;
  });
  
  // Apply pagination
  const totalCount = allFilteredMembers.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const filteredMembers = allFilteredMembers.slice(startIndex, endIndex);

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getTierBadge = (tier) => {
    const badges = {
      Platinum: 'bg-purple-100 text-purple-700',
      Gold: 'bg-yellow-100 text-yellow-700',
      Silver: 'bg-gray-100 text-gray-700',
      Bronze: 'bg-orange-100 text-orange-700'
    };
    return badges[tier] || 'bg-gray-100 text-gray-700';
  };

  const columns = [
    { key: 'id', label: 'Member ID' },
    { key: 'name', label: 'Name/Company' },
    {
      key: 'memberType',
      label: 'Type',
      render: (value) => (
        <span className="capitalize">
          {value === 'operator' ? '🚕 Operator' : '👤 Driver'}
        </span>
      )
    },
    { 
      key: 'membershipTier', 
      label: 'Tier',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierBadge(value)}`}>
          {value}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    { key: 'joinDate', label: 'Join Date' },
    { 
      key: 'monthlyRevenue', 
      label: 'Monthly Revenue',
      render: (value) => `$${value.toFixed(2)}`
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, member) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(member)}
          >
            👁️ View
          </Button>
          <Button
            variant={member.status === 'suspended' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleToggleStatus(member)}
          >
            {member.status === 'suspended' ? '✓ Activate' : '⏸️ Suspend'}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-700 mb-2">👥 BMTOA Members</h1>
          <p className="text-slate-600">Manage BMTOA member operators and drivers</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddMemberModal(true)}>
          ➕ Add New Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Members</p>
              <p className="text-2xl font-bold text-slate-700">{members.length}</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Operators</p>
              <p className="text-2xl font-bold text-blue-600">
                {members.filter(m => m.memberType === 'operator').length}
              </p>
            </div>
            <div className="text-3xl">🚕</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Drivers</p>
              <p className="text-2xl font-bold text-green-600">
                {members.filter(m => m.memberType === 'driver').length}
              </p>
            </div>
            <div className="text-3xl">👤</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active</p>
              <p className="text-2xl font-bold text-yellow-600">
                {members.filter(m => m.status === 'active').length}
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="🔍 Search by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <Button>
              📊 Export Data
            </Button>
          </div>
          
          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Membership Tier</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Tiers</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
                <option value="basic">Basic</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Status</label>
              <select
                value={filterSubscription}
                onChange={(e) => setFilterSubscription(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Member Since (From)</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Member Since (To)</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilterStatus('all');
                setFilterTier('all');
                setFilterSubscription('all');
                setFilterDateFrom('');
                setFilterDateTo('');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {membersLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading members...</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredMembers}
            emptyMessage="No members found"
          />
        )}
        
        {/* Pagination */}
        {!membersLoading && totalCount > 0 && (
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

      {/* Member Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedMember(null);
        }}
        title={`👥 Member Details - ${selectedMember?.id}`}
      >
        {selectedMember && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Name/Company</p>
                <p className="font-semibold text-slate-700">{selectedMember.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Type</p>
                <p className="font-semibold text-slate-700 capitalize">
                  {selectedMember.type === 'operator' ? '🚕 Operator' : '👤 Driver'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Contact Person</p>
                <p className="font-semibold text-slate-700">{selectedMember.contactPerson}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-semibold text-slate-700">{selectedMember.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Phone</p>
                <p className="font-semibold text-slate-700">{selectedMember.phone}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Membership Tier</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTierBadge(selectedMember.membershipTier)}`}>
                  {selectedMember.membershipTier}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedMember.status)}`}>
                  {selectedMember.status.charAt(0).toUpperCase() + selectedMember.status.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-600">Join Date</p>
                <p className="font-semibold text-slate-700">{selectedMember.joinDate}</p>
              </div>
              {selectedMember.type === 'operator' && (
                <div>
                  <p className="text-sm text-slate-600">Fleet Size</p>
                  <p className="font-semibold text-slate-700">{selectedMember.fleetSize} vehicles</p>
                </div>
              )}
              {selectedMember.type === 'driver' && (
                <div>
                  <p className="text-sm text-slate-600">Vehicle Number</p>
                  <p className="font-semibold text-slate-700">{selectedMember.vehicleNumber}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-600">Monthly Revenue</p>
                <p className="text-lg font-bold text-yellow-600">${selectedMember.monthlyRevenue.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Related Vehicles (for operators only) */}
            {selectedMember.memberType === 'operator' && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-700 mb-3">🚗 Vehicles ({relatedVehicles.length})</h4>
                {loadingRelated ? (
                  <p className="text-sm text-slate-500">Loading vehicles...</p>
                ) : relatedVehicles.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Vehicle Number</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Model</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {relatedVehicles.map((vehicle) => (
                          <tr key={vehicle.id}>
                            <td className="px-3 py-2">{vehicle.vehicle_number}</td>
                            <td className="px-3 py-2">{vehicle.vehicle_type || 'N/A'}</td>
                            <td className="px-3 py-2">{vehicle.vehicle_model || 'N/A'}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${vehicle.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {vehicle.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No vehicles registered yet</p>
                )}
              </div>
            )}
            
            {/* Related Drivers (for operators only) */}
            {selectedMember.memberType === 'operator' && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-700 mb-3">👤 Drivers ({relatedDrivers.length})</h4>
                {loadingRelated ? (
                  <p className="text-sm text-slate-500">Loading drivers...</p>
                ) : relatedDrivers.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Phone</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {relatedDrivers.map((driver) => (
                          <tr key={driver.id}>
                            <td className="px-3 py-2">{driver.profiles?.name || 'N/A'}</td>
                            <td className="px-3 py-2">{driver.profiles?.email || 'N/A'}</td>
                            <td className="px-3 py-2">{driver.profiles?.phone || 'N/A'}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${driver.approval_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {driver.approval_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No drivers assigned yet</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add New Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="➕ Add New BMTOA Member"
        size="large"
      >
        <AdminAddMemberForm
          onSuccess={() => {
            setShowAddMemberModal(false);
            loadMembers(); // Reload the members list
          }}
          onCancel={() => setShowAddMemberModal(false)}
        />
      </Modal>
    </div>
  );
};

export default MembersPage;

