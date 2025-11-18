import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import Pagination from '../../shared/Pagination';
import { supabase } from '../../../lib/supabase';

/**
 * Driver Verification Page
 * 
 * Admin panel for verifying driver profiles and documents
 * 
 * Features:
 * - View all pending driver profiles
 * - Review driver information (personal, license, vehicle, payment)
 * - View and verify uploaded documents
 * - Approve/reject individual documents
 * - Approve/reject entire driver profile
 * - Send notifications to drivers
 * 
 * Supabase Integration:
 * - Fetches from driver_profiles, profiles, documents tables
 * - Updates verification_status and document status
 * - Triggers email notifications (future)
 */

const DriverVerificationPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterApprovalStatus, setFilterApprovalStatus] = useState('all');
  const [filterSubmissionStatus, setFilterSubmissionStatus] = useState('all');
  const [rejectReason, setRejectReason] = useState('');
  const [documentRejectReason, setDocumentRejectReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Load drivers
  useEffect(() => {
    loadDrivers();
  }, [filterStatus, filterApprovalStatus, filterSubmissionStatus, currentPage, pageSize]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      // Fetch driver profiles with user data
      let query = supabase
        .from('driver_profiles')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            phone,
            name,
            created_at
          )
        `);

      if (filterStatus !== 'all') {
        query = query.eq('verification_status', filterStatus);
      }
      
      if (filterApprovalStatus !== 'all') {
        query = query.eq('approval_status', filterApprovalStatus);
      }
      
      if (filterSubmissionStatus !== 'all') {
        query = query.eq('submission_status', filterSubmissionStatus);
      }

      // Add pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)
        .select('*', { count: 'exact' });

      if (error) throw error;

      setTotalCount(count || 0);

      // Fetch documents for each driver
      const driversWithDocs = await Promise.all(
        (data || []).map(async (driver) => {
          const { data: docs } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', driver.user_id);

          return {
            ...driver,
            profile: driver.profiles,
            documents: docs || []
          };
        })
      );

      setDrivers(driversWithDocs);
    } catch (error) {
      console.error('Error loading drivers:', error);
      alert(`Failed to load drivers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (driver) => {
    setSelectedDriver(driver);
    setShowDetailsModal(true);
  };

  const handleApproveDriver = async (driverId) => {
    if (!confirm('Are you sure you want to approve this driver?')) return;

    try {
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('driver_profiles')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
          documents_verified: true,
          bmtoa_verified: true
        })
        .eq('user_id', driverId);

      if (error) throw error;

      alert('Driver approved successfully!');
      loadDrivers();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error approving driver:', error);
      alert(`Failed to approve driver: ${error.message}`);
    }
  };

  const handleRejectDriver = async (driverId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectReason
        })
        .eq('user_id', driverId);

      if (error) throw error;

      alert('Driver rejected. Notification will be sent.');
      setRejectReason('');
      loadDrivers();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error rejecting driver:', error);
      alert(`Failed to reject driver: ${error.message}`);
    }
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const handleApproveDocument = async (documentId) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ status: 'approved' })
        .eq('id', documentId);

      if (error) throw error;

      alert('Document approved!');
      loadDrivers();
      setShowDocumentModal(false);
    } catch (error) {
      console.error('Error approving document:', error);
      alert(`Failed to approve document: ${error.message}`);
    }
  };

  const handleRejectDocument = async (documentId) => {
    if (!documentRejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'rejected',
          rejection_reason: documentRejectReason
        })
        .eq('id', documentId);

      if (error) throw error;

      alert('Document rejected. Driver will be notified.');
      setDocumentRejectReason('');
      loadDrivers();
      setShowDocumentModal(false);
    } catch (error) {
      console.error('Error rejecting document:', error);
      alert(`Failed to reject document: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      under_review: 'bg-blue-100 text-blue-700'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || badges.pending}`}>
        {status || 'pending'}
      </span>
    );
  };

  const getDocumentIcon = (type) => {
    const icons = {
      drivers_license: '🪪',
      psv_license: '📋',
      vehicle_registration: '📘',
      insurance: '🛡️',
      roadworthy: '✅',
      police_clearance: '👮',
      medical_certificate: '🏥'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-700 mb-2">🚗 Driver Verification</h1>
          <p className="text-slate-600">Review and verify driver profiles and documents</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddDriverModal(true)}
        >
          ➕ Add Driver
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Verification Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Approval Status</label>
            <select
              value={filterApprovalStatus}
              onChange={(e) => setFilterApprovalStatus(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Submission Status</label>
            <select
              value={filterSubmissionStatus}
              onChange={(e) => setFilterSubmissionStatus(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="incomplete">Incomplete</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilterStatus('pending');
                setFilterApprovalStatus('all');
                setFilterSubmissionStatus('all');
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-slate-600">Loading drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-600">No drivers found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Completion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {drivers.map((driver) => {
                const approvedDocs = driver.documents.filter(d => d.status === 'approved').length;
                const totalDocs = driver.documents.length;
                
                return (
                  <tr key={driver.user_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {driver.profile_photo_url ? (
                          <img src={driver.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-medium">
                              {driver.profile?.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-700">{driver.full_name || driver.profile?.name || 'N/A'}</p>
                          <p className="text-xs text-slate-500">ID: {driver.national_id || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{driver.profile?.phone || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{driver.profile?.email || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{driver.vehicle_make} {driver.vehicle_model}</p>
                      <p className="text-xs text-slate-500">{driver.license_plate || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{approvedDocs}/{totalDocs} approved</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${driver.profile_completion_percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-600">{driver.profile_completion_percentage || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(driver.verification_status)}</td>
                    <td className="px-6 py-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewDetails(driver)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {/* Driver Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Driver Verification Details"
        size="large"
      >
        {selectedDriver && (
          <div className="space-y-6">
            {/* Profile Photos */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Profile Photo</h3>
                {selectedDriver.profile_photo_url ? (
                  <img src={selectedDriver.profile_photo_url} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-slate-200" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-slate-500">No photo</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Vehicle Photo</h3>
                {selectedDriver.vehicle_photo_url ? (
                  <img src={selectedDriver.vehicle_photo_url} alt="Vehicle" className="w-full h-32 rounded-lg object-cover border-4 border-slate-200" />
                ) : (
                  <div className="w-full h-32 rounded-lg bg-slate-200 flex items-center justify-center">
                    <span className="text-slate-500">No photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Full Name:</span> <span className="font-medium">{selectedDriver.full_name || selectedDriver.profile?.name || 'N/A'}</span></div>
                <div><span className="text-slate-500">Date of Birth:</span> <span className="font-medium">{selectedDriver.date_of_birth || 'N/A'}</span></div>
                <div><span className="text-slate-500">National ID:</span> <span className="font-medium">{selectedDriver.national_id || 'N/A'}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="font-medium">{selectedDriver.profile?.email || 'N/A'}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{selectedDriver.profile?.phone || 'N/A'}</span></div>
              </div>
            </div>

            {/* Driver License */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Driver License</h3>
              {selectedDriver.license_photo_url && (
                <img src={selectedDriver.license_photo_url} alt="License" className="w-full h-48 rounded-lg object-cover border-2 border-slate-200 mb-3" />
              )}
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">License Number:</span> <span className="font-medium">{selectedDriver.license_number || 'N/A'}</span></div>
                <div><span className="text-slate-500">License Class:</span> <span className="font-medium">{selectedDriver.license_class || 'N/A'}</span></div>
                <div><span className="text-slate-500">Expiry Date:</span> <span className="font-medium">{selectedDriver.license_expiry || 'N/A'}</span></div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Vehicle Information</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Make:</span> <span className="font-medium">{selectedDriver.vehicle_make || 'N/A'}</span></div>
                <div><span className="text-slate-500">Model:</span> <span className="font-medium">{selectedDriver.vehicle_model || 'N/A'}</span></div>
                <div><span className="text-slate-500">Year:</span> <span className="font-medium">{selectedDriver.vehicle_year || 'N/A'}</span></div>
                <div><span className="text-slate-500">Color:</span> <span className="font-medium">{selectedDriver.vehicle_color || 'N/A'}</span></div>
                <div><span className="text-slate-500">License Plate:</span> <span className="font-medium">{selectedDriver.license_plate || 'N/A'}</span></div>
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Payment Information</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                {selectedDriver.ecocash_number && (
                  <div><span className="text-slate-500">EcoCash:</span> <span className="font-medium">{selectedDriver.ecocash_number}</span></div>
                )}
                {selectedDriver.bank_name && (
                  <>
                    <div><span className="text-slate-500">Bank:</span> <span className="font-medium">{selectedDriver.bank_name}</span></div>
                    <div><span className="text-slate-500">Account:</span> <span className="font-medium">{selectedDriver.account_number}</span></div>
                  </>
                )}
              </div>
            </div>

            {/* BMTOA Membership */}
            {selectedDriver.bmtoa_member && (
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">BMTOA Membership</h3>
                <div className="text-sm">
                  <span className="text-slate-500">Membership Number:</span> <span className="font-medium">{selectedDriver.bmtoa_membership_number || 'N/A'}</span>
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Documents ({selectedDriver.documents.length})</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {selectedDriver.documents.map((doc) => (
                  <div key={doc.id} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getDocumentIcon(doc.document_type)}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{doc.document_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500">{doc.expiry_date ? `Expires: ${doc.expiry_date}` : 'No expiry'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rejection Reason (if rejected) */}
            {selectedDriver.verification_status === 'rejected' && selectedDriver.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-700 mb-2">Rejection Reason</h3>
                <p className="text-sm text-red-600">{selectedDriver.rejection_reason}</p>
              </div>
            )}

            {/* Actions */}
            {selectedDriver.verification_status === 'pending' && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => handleApproveDriver(selectedDriver.user_id)}
                  >
                    ✓ Approve Driver
                  </Button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Reject with Reason</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                    rows="3"
                    placeholder="Provide a reason for rejection..."
                  />
                  <Button
                    variant="danger"
                    className="mt-2 w-full"
                    onClick={() => handleRejectDriver(selectedDriver.user_id)}
                  >
                    ✗ Reject Driver
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Document View Modal */}
      <Modal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        title="Document Verification"
        size="large"
      >
        {selectedDocument && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {getDocumentIcon(selectedDocument.document_type)} {selectedDocument.document_type.replace(/_/g, ' ')}
              </h3>
              {selectedDocument.expiry_date && (
                <p className="text-sm text-slate-600">Expires: {selectedDocument.expiry_date}</p>
              )}
              <div className="mt-2">{getStatusBadge(selectedDocument.status)}</div>
            </div>

            {/* Document Preview */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {selectedDocument.document_url?.endsWith('.pdf') ? (
                <iframe
                  src={selectedDocument.document_url}
                  className="w-full h-96"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={selectedDocument.document_url}
                  alt="Document"
                  className="w-full h-auto"
                />
              )}
            </div>

            {/* Rejection Reason (if rejected) */}
            {selectedDocument.status === 'rejected' && selectedDocument.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-700 mb-2">Rejection Reason</h3>
                <p className="text-sm text-red-600">{selectedDocument.rejection_reason}</p>
              </div>
            )}

            {/* Actions */}
            {selectedDocument.status === 'pending' && (
              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleApproveDocument(selectedDocument.id)}
                >
                  ✓ Approve Document
                </Button>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Reject with Reason</label>
                  <textarea
                    value={documentRejectReason}
                    onChange={(e) => setDocumentRejectReason(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                    rows="3"
                    placeholder="Provide a reason for rejection..."
                  />
                  <Button
                    variant="danger"
                    className="mt-2 w-full"
                    onClick={() => handleRejectDocument(selectedDocument.id)}
                  >
                    ✗ Reject Document
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Driver Modal - Placeholder for now */}
      <Modal
        isOpen={showAddDriverModal}
        onClose={() => setShowAddDriverModal(false)}
        title="Add New Driver"
        size="large"
      >
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">
            This feature will allow you to manually add a driver to the system.
          </p>
          <p className="text-sm text-slate-500">
            Implementation pending: Will use shared registration component
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default DriverVerificationPage;

