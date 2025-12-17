import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores';

/**
 * ComplaintsPage Component (Admin)
 * 
 * Admin interface for reviewing and managing complaints
 * Features:
 * - View all complaints with filtering
 * - Review complaint details
 * - Update complaint status
 * - Add admin notes
 * - Resolve or dismiss complaints
 */
const ComplaintsPage = () => {
  const user = useAuthStore((state) => state.user);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Load complaints
  useEffect(() => {
    loadComplaints();
  }, [statusFilter]);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          complainant:complainant_id(id, name, email),
          against:against_id(id, name, email),
          ride:ride_id(id, pickup_address, dropoff_address, created_at)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setComplaints(data || []);
    } catch (error) {
      console.error('Error loading complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update complaint status
  const updateComplaintStatus = async (complaintId, newStatus) => {
    setProcessing(true);
    try {
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' || newStatus === 'dismissed') {
        updates.resolved_by = user.id;
        updates.resolved_at = new Date().toISOString();
        updates.admin_notes = adminNotes || null;
      }

      const { error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', complaintId);

      if (error) throw error;

      alert(`✅ Complaint ${newStatus === 'resolved' ? 'resolved' : newStatus === 'dismissed' ? 'dismissed' : 'updated'} successfully`);
      setSelectedComplaint(null);
      setAdminNotes('');
      loadComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      alert('❌ Failed to update complaint. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      under_review: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Under Review' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
      dismissed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dismissed' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Get complaint type label
  const getComplaintTypeLabel = (type) => {
    const labels = {
      payment_issue: '💰 Payment Issue',
      inappropriate_behavior: '⚠️ Inappropriate Behavior',
      safety_concern: '🚨 Safety Concern',
      property_damage: '🔧 Property Damage',
      no_show: '👻 No Show',
      wrong_location: '📍 Wrong Location',
      other: '📝 Other',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Complaints Management</h1>
        <p className="text-slate-600 mt-2">Review and manage driver and customer complaints</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Filter by Status:</label>
          <div className="flex gap-2">
            {['all', 'pending', 'under_review', 'resolved', 'dismissed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-slate-500">Loading complaints...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No complaints found</p>
            </div>
          ) : (
            complaints.map((complaint) => (
              <div
                key={complaint.id}
                onClick={() => setSelectedComplaint(complaint)}
                className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
                  selectedComplaint?.id === complaint.id
                    ? 'border-slate-700 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {getComplaintTypeLabel(complaint.complaint_type)}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      From: {complaint.complainant?.name || 'Unknown'} ({complaint.complainant_type})
                    </div>
                  </div>
                  {getStatusBadge(complaint.status)}
                </div>
                <p className="text-sm text-slate-700 line-clamp-2 mb-2">
                  {complaint.description}
                </p>
                <div className="text-xs text-slate-500">
                  {new Date(complaint.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Details */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {selectedComplaint ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Complaint Details</h3>

              {/* Status */}
              <div className="mb-4">
                {getStatusBadge(selectedComplaint.status)}
              </div>

              {/* Type */}
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-500">Type</p>
                <p className="text-lg font-semibold text-slate-800">
                  {getComplaintTypeLabel(selectedComplaint.complaint_type)}
                </p>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Complainant</p>
                  <p className="text-sm text-slate-800">{selectedComplaint.complainant?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-600">{selectedComplaint.complainant_type}</p>
                </div>
                {selectedComplaint.against && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Against</p>
                    <p className="text-sm text-slate-800">{selectedComplaint.against?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-600">{selectedComplaint.against_type}</p>
                  </div>
                )}
              </div>

              {/* Ride Info */}
              {selectedComplaint.ride && (
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Related Ride</p>
                  <p className="text-xs text-slate-600">
                    {selectedComplaint.ride.pickup_address} → {selectedComplaint.ride.dropoff_address}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(selectedComplaint.ride.created_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-500 mb-2">Description</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Admin Notes */}
              {selectedComplaint.status === 'pending' || selectedComplaint.status === 'under_review' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this complaint..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none"
                    rows="3"
                  />
                </div>
              ) : selectedComplaint.admin_notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-500 mb-2">Admin Notes</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                    {selectedComplaint.admin_notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedComplaint.status === 'pending' || selectedComplaint.status === 'under_review' ? (
                <div className="flex gap-2">
                  {selectedComplaint.status === 'pending' && (
                    <button
                      onClick={() => updateComplaintStatus(selectedComplaint.id, 'under_review')}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Start Review
                    </button>
                  )}
                  <button
                    onClick={() => updateComplaintStatus(selectedComplaint.id, 'resolved')}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => updateComplaintStatus(selectedComplaint.id, 'dismissed')}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-600">
                    Resolved by admin on {new Date(selectedComplaint.resolved_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-500">Select a complaint to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintsPage;

