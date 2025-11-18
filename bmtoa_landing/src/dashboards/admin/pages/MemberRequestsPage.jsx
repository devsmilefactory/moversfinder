import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import DataTable from '../../shared/DataTable';
import Modal from '../../shared/Modal';
import Pagination from '../../shared/Pagination';
import { supabase } from '../../../lib/supabase';
import AdminAddMemberForm from '../components/AdminAddMemberForm';

/**
 * BMTOA Onboarding Requests Page
 *
 * Handles onboarding requests for:
 * 1. Taxi Operators - Business owners with fleets
 * 2. Drivers - Individual drivers joining the platform
 *
 * Features:
 * - View pending onboarding requests from profiles table
 * - Approve or reject requests
 * - View request details and documents
 * - Filter by request type (Operator/Driver)
 *
 * Fully integrated with Supabase - NO MOCK DATA
 */

const MemberRequestsPage = () => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [requestDocuments, setRequestDocuments] = useState([]);
  const [detailedProfile, setDetailedProfile] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load pending requests and stats from Supabase
  useEffect(() => {
    loadRequests();
    loadStats();
  }, [filterType, currentPage, pageSize]);

  const loadRequests = async () => {
    try {
      setLoading(true);

      // Fetch pending operator requests
      let operatorQuery = supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          verification_status,
          operator_profiles (
            company_name,
            business_registration,
            fleet_size,
            membership_tier
          )
        `)
        .eq('user_type', 'taxi_operator')
        .eq('platform', 'bmtoa')
        .eq('verification_status', 'pending');

      // Fetch pending driver requests
      let driverQuery = supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          verification_status,
          driver_profiles (
            full_name,
            license_number,
            license_plate,
            vehicle_make,
            vehicle_model
          )
        `)
        .eq('user_type', 'driver')
        .eq('platform', 'bmtoa')
        .eq('verification_status', 'pending');

      const [operatorResult, driverResult] = await Promise.all([
        operatorQuery,
        driverQuery
      ]);

      if (operatorResult.error) throw operatorResult.error;
      if (driverResult.error) throw driverResult.error;

      // Transform operator data
      const operators = (operatorResult.data || []).map(profile => ({
        id: profile.id,
        applicantName: profile.operator_profiles?.company_name || profile.name,
        type: 'operator',
        contactPerson: profile.name,
        email: profile.email,
        phone: profile.phone,
        requestedTier: profile.operator_profiles?.membership_tier || 'standard',
        fleetSize: profile.operator_profiles?.fleet_size || 'N/A',
        submittedDate: profile.created_at?.split('T')[0],
        status: 'pending',
        businessRegistration: profile.operator_profiles?.business_registration,
        documents: [] // Will be populated from storage if needed
      }));

      // Transform driver data
      const drivers = (driverResult.data || []).map(profile => ({
        id: profile.id,
        applicantName: profile.driver_profiles?.full_name || profile.name,
        type: 'driver',
        contactPerson: profile.name,
        email: profile.email,
        phone: profile.phone,
        vehicleNumber: profile.driver_profiles?.license_plate || 'N/A',
        vehicleMake: profile.driver_profiles?.vehicle_make,
        vehicleModel: profile.driver_profiles?.vehicle_model,
        licenseNumber: profile.driver_profiles?.license_number,
        submittedDate: profile.created_at?.split('T')[0],
        status: 'pending',
        documents: [] // Will be populated from storage if needed
      }));

      // Combine and filter
      let allRequests = [...operators, ...drivers];

      if (filterType !== 'all') {
        allRequests = allRequests.filter(r => r.type === filterType);
      }

      if (searchQuery) {
        allRequests = allRequests.filter(r =>
          r.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Set total count for pagination
      setTotalCount(allRequests.length);

      // Apply pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedRequests = allRequests.slice(startIndex, endIndex);

      setRequests(paginatedRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Count approved this month
      const { count: approvedCount, error: approvedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('platform', 'bmtoa')
        .eq('verification_status', 'verified')
        .gte('verified_at', startOfMonth);

      if (approvedError) throw approvedError;

      // Count rejected this month
      const { count: rejectedCount, error: rejectedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('platform', 'bmtoa')
        .eq('verification_status', 'rejected')
        .gte('updated_at', startOfMonth);

      if (rejectedError) throw rejectedError;

      setStats({
        pending: requests.length,
        approvedThisMonth: approvedCount || 0,
        rejectedThisMonth: rejectedCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    
    try {
      // Fetch detailed profile data
      if (request.type === 'operator') {
        const { data: operatorProfile, error: profileError } = await supabase
          .from('operator_profiles')
          .select('*')
          .eq('user_id', request.id)
          .single();
        
        if (profileError) throw profileError;
        setDetailedProfile(operatorProfile);
      } else {
        const { data: driverProfile, error: profileError } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', request.id)
          .single();
        
        if (profileError) throw profileError;
        setDetailedProfile(driverProfile);
      }
      
      // Fetch documents from documents table
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', request.id);
      
      if (docsError) throw docsError;
      setRequestDocuments(documents || []);
    } catch (error) {
      console.error('Error loading request details:', error);
      setDetailedProfile(null);
      setRequestDocuments([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    try {
      // Update profile verification status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (profileError) throw profileError;

      // If operator, update operator_profiles
      if (selectedRequest.type === 'operator') {
        const { error: operatorError } = await supabase
          .from('operator_profiles')
          .update({
            bmtoa_verified: true,
            bmtoa_verified_at: new Date().toISOString(),
            grace_period_active: false
          })
          .eq('user_id', selectedRequest.id);

        if (operatorError) throw operatorError;
      }

      // If driver, update driver_profiles
      if (selectedRequest.type === 'driver') {
        const { error: driverError } = await supabase
          .from('driver_profiles')
          .update({
            bmtoa_verified: true,
            bmtoa_verified_at: new Date().toISOString()
          })
          .eq('user_id', selectedRequest.id);

        if (driverError) throw driverError;
      }

      // Reload requests and stats
      await loadRequests();
      await loadStats();
      setShowApproveModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    }
  };

  const handleReject = async () => {
    try {
      // Update profile verification status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectReason
        })
        .eq('id', selectedRequest.id);

      if (profileError) throw profileError;

      // Reload requests and stats
      await loadRequests();
      await loadStats();
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    }
  };



  // Filtering is now done in loadRequests() based on filterType and searchQuery
  // Re-load when search query changes
  useEffect(() => {
    if (searchQuery !== undefined) {
      loadRequests();
    }
  }, [searchQuery]);

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
    { key: 'id', label: 'Request ID' },
    { key: 'applicantName', label: 'Applicant' },
    { 
      key: 'type', 
      label: 'Type',
      render: (value) => (
        <span className="capitalize">
          {value === 'operator' ? '🚕 Operator' : '👤 Driver'}
        </span>
      )
    },
    { 
      key: 'requestedTier', 
      label: 'Requested Tier',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierBadge(value)}`}>
          {value}
        </span>
      )
    },
    { key: 'submittedDate', label: 'Submitted' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, request) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(request)}
          >
            👁️ View
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleApproveClick(request)}
          >
            ✓ Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleRejectClick(request)}
          >
            ✗ Reject
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
          <h1 className="text-2xl font-bold text-slate-700 mb-2">📋 BMTOA Membership Requests</h1>
          <p className="text-slate-600">Review and process membership applications for Taxi Operators and Drivers</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddMemberModal(true)}>
          ➕ Add New Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-600">{requests.length}</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Approved This Month</p>
              <p className="text-2xl font-bold text-green-600">{stats.approvedThisMonth}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Rejected This Month</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejectedThisMonth}</p>
            </div>
            <div className="text-3xl">❌</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            <input
              type="text"
              placeholder="🔍 Search by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Types</option>
              <option value="operator">🚕 Taxi Operators</option>
              <option value="driver">👤 Drivers</option>
            </select>
          </div>

        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading requests...</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={requests}
            emptyMessage="No pending requests"
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

      {/* Request Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRequest(null);
        }}
        title={`📋 Request Details - ${selectedRequest?.id}`}
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Applicant</p>
                <p className="font-semibold text-slate-700">{selectedRequest.applicantName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Type</p>
                <p className="font-semibold text-slate-700 capitalize">
                  {selectedRequest.type === 'operator' ? '🚕 Operator' : '👤 Driver'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Contact Person</p>
                <p className="font-semibold text-slate-700">{selectedRequest.contactPerson}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-semibold text-slate-700">{selectedRequest.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Phone</p>
                <p className="font-semibold text-slate-700">{selectedRequest.phone}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Requested Tier</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTierBadge(selectedRequest.requestedTier)}`}>
                  {selectedRequest.requestedTier}
                </span>
              </div>
              {selectedRequest.type === 'operator' && (
                <div>
                  <p className="text-sm text-slate-600">Fleet Size</p>
                  <p className="font-semibold text-slate-700">{selectedRequest.fleetSize} vehicles</p>
                </div>
              )}
              {selectedRequest.type === 'driver' && (
                <div>
                  <p className="text-sm text-slate-600">Vehicle Number</p>
                  <p className="font-semibold text-slate-700">{selectedRequest.vehicleNumber}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-600">Submitted Date</p>
                <p className="font-semibold text-slate-700">{selectedRequest.submittedDate}</p>
              </div>
            </div>
            
            {/* Detailed Profile Information */}
            {loadingDetails ? (
              <div className="border-t pt-4">
                <p className="text-sm text-slate-500">Loading detailed information...</p>
              </div>
            ) : detailedProfile && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-700 mb-3">📝 Complete Profile Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(detailedProfile).map(([key, value]) => {
                    // Skip internal fields
                    if (key === 'id' || key === 'user_id' || key === 'created_at' || key === 'updated_at') return null;
                    
                    return (
                      <div key={key}>
                        <p className="text-slate-600 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="font-medium text-slate-700">
                          {value === null || value === undefined ? 'N/A' : 
                           typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                           typeof value === 'object' ? JSON.stringify(value) :
                           value.toString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Submitted Documents */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-700 mb-3">📄 Submitted Documents ({requestDocuments.length})</h4>
              {loadingDetails ? (
                <p className="text-sm text-slate-500">Loading documents...</p>
              ) : requestDocuments.length > 0 ? (
                <div className="space-y-2">
                  {requestDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="font-medium text-slate-700">{doc.document_type}</p>
                          <p className="text-xs text-slate-500">Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {doc.document_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.document_url, '_blank')}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No documents uploaded yet</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedRequest(null);
        }}
        title="✓ Approve Membership Request"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            Are you sure you want to approve the membership request for <strong>{selectedRequest?.applicantName}</strong>?
          </p>
          <p className="text-sm text-green-600">
            ✓ An approval email will be sent with membership details and next steps.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveModal(false);
                setSelectedRequest(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              className="flex-1"
            >
              Approve Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
          setRejectReason('');
        }}
        title="✗ Reject Membership Request"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            Are you sure you want to reject the membership request for <strong>{selectedRequest?.applicantName}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason for Rejection *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              rows="4"
              required
            />
          </div>
          <p className="text-sm text-red-600">
            ⚠️ A rejection email will be sent with the reason provided.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setSelectedRequest(null);
                setRejectReason('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              className="flex-1"
              disabled={!rejectReason.trim()}
            >
              Reject Request
            </Button>
          </div>
        </div>
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
            loadRequests(); // Reload the requests list
          }}
          onCancel={() => setShowAddMemberModal(false)}
        />
      </Modal>

    </div>
  );
};

export default MemberRequestsPage;

