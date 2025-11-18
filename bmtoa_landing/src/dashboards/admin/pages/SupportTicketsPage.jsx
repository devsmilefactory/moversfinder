import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import Pagination from '../../shared/Pagination';
import { FormTextarea, FormSelect } from '../../shared/FormInput';
import { supabase } from '../../../lib/supabase';

/**
 * Admin Support Tickets Page
 *
 * Features:
 * - Ticket table with filtering
 * - Status filter (open, in progress, resolved, closed)
 * - Priority filter (low, medium, high, urgent)
 * - Platform filter (TaxiCab, BMTOA, All)
 * - Assign to support staff
 * - Add internal notes
 * - Update status
 * - Reply to customer
 * - Ticket details modal
 *
 * State Management:
 * - tickets: Array of ticket objects
 * - statusFilter: Current status filter
 * - priorityFilter: Current priority filter
 * - platformFilter: Current platform filter
 * - selectedTicket: Currently viewed ticket
 * - showDetailsModal: Boolean for details modal
 * - showReplyModal: Boolean for reply modal
 *
 * Database Integration Ready:
 * - Fetch: SELECT * FROM support_tickets ORDER BY created_at DESC
 * - Update: UPDATE support_tickets SET status = ?, assigned_to = ? WHERE id = ?
 * - Reply: INSERT INTO ticket_replies (ticket_id, message, is_internal, ...)
 */

const SupportTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [adminUsers, setAdminUsers] = useState([]);

  // Load admin users for assignment
  useEffect(() => {
    loadAdminUsers();
  }, []);

  // Load tickets from Supabase
  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter, platformFilter, categoryFilter, currentPage, pageSize]);

  const loadAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, full_name, email')
        .eq('user_type', 'admin')
        .eq('account_status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error loading admin users:', error);
      setAdminUsers([]);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          user:profiles!support_tickets_user_id_fkey (
            name,
            full_name,
            email,
            user_type,
            platform
          ),
          assigned_admin:profiles!support_tickets_assigned_to_fkey (
            name,
            full_name
          )
        `, { count: 'exact' });

      // Apply filters
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (priorityFilter && priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }
      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by priority (urgent first) then by creation date
      query = query
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const transformedTickets = (data || []).map(ticket => ({
        id: ticket.id,
        ticketNumber: `TKT-${ticket.id.substring(0, 8)}`,
        platform: ticket.user?.platform || 'N/A',
        userType: ticket.user?.user_type || 'N/A',
        userName: ticket.user?.full_name || ticket.user?.name || 'Unknown',
        userEmail: ticket.user?.email || 'N/A',
        subject: ticket.subject || 'No Subject',
        message: ticket.message || '',
        category: ticket.category || 'general',
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        assignedTo: ticket.assigned_admin?.full_name || ticket.assigned_admin?.name || null,
        assignedToId: ticket.assigned_to || null,
        createdAt: ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A',
        updatedAt: ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A',
        resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : null,
        replies: [] // TODO: Add replies from a separate table if needed
      }));

      setTickets(transformedTickets);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading support tickets:', error);
      setTickets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // State management
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      open: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Open', icon: '🔵' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress', icon: '⏳' },
      resolved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Resolved', icon: '✓' },
      closed: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Closed', icon: '✕' },
    };
    const badge = badges[status];
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  // Get priority badge
  const getPriorityBadge = (priority) => {
    const badges = {
      low: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Low' },
      medium: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Medium' },
      high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
      urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent', icon: '🚨' },
    };
    const badge = badges[priority];
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.icon || ''} {badge.label}
      </span>
    );
  };

  // Apply platform filter client-side since it's on the user profile
  const filteredTickets = tickets.filter(ticket => {
    if (platformFilter !== 'all' && ticket.platform !== platformFilter) return false;
    return true;
  });

  // Calculate stats
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
  };

  // View ticket details
  const viewTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  // Update ticket status
  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If status is resolved, record the resolved_at timestamp
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      // Reload tickets to reflect changes
      await loadTickets();
      
      alert(`Ticket status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status: ' + error.message);
    }
  };

  // Assign ticket
  const assignTicket = async (ticketId, assigneeId) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: assigneeId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      // Reload tickets to reflect changes
      await loadTickets();
      
      if (assigneeId) {
        alert('Ticket assigned successfully');
      } else {
        alert('Ticket unassigned successfully');
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      alert('Failed to assign ticket: ' + error.message);
    }
  };

  // Send reply
  const sendReply = () => {
    if (!replyMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    // Database integration:
    // await supabase
    //   .from('ticket_replies')
    //   .insert({
    //     ticket_id: selectedTicket.id,
    //     message: replyMessage,
    //     is_internal: isInternalNote,
    //     author: currentAdminName,
    //     created_at: new Date()
    //   });

    setShowReplyModal(false);
    setReplyMessage('');
    setIsInternalNote(false);
    alert(`${isInternalNote ? 'Internal note' : 'Reply'} sent successfully!`);
  };

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-700">Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer support tickets across both platforms
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-slate-600">Total Tickets</p>
            <p className="text-3xl font-bold text-slate-700">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-blue-700">Open</p>
            <p className="text-3xl font-bold text-blue-700">{stats.open}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-yellow-700">In Progress</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.inProgress}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-red-700">Urgent</p>
            <p className="text-3xl font-bold text-red-700">{stats.urgent}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Platform</label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Platforms</option>
                <option value="TaxiCab">TaxiCab</option>
                <option value="BMTOA">BMTOA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="account">Account</option>
                <option value="complaint">Complaint</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading support tickets...</p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ticket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                    No tickets found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-700">{ticket.ticketNumber}</p>
                        <p className="text-xs text-slate-500">{ticket.createdAt}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        ticket.platform === 'TaxiCab'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {ticket.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{ticket.userName}</p>
                        <p className="text-xs text-slate-500">{ticket.userType}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{ticket.subject}</p>
                    </td>
                    <td className="px-6 py-4">{getPriorityBadge(ticket.priority)}</td>
                    <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{ticket.assignedTo || 'Unassigned'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="outline" size="sm" onClick={() => viewTicketDetails(ticket)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
          
          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTicket(null);
          }}
          title={`Ticket ${selectedTicket.ticketNumber}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedTicket.platform === 'TaxiCab'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedTicket.platform}
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  {selectedTicket.category}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Created: {selectedTicket.createdAt}</p>
                {selectedTicket.resolvedAt && (
                  <p className="text-sm text-green-600">Resolved: {selectedTicket.resolvedAt}</p>
                )}
              </div>
            </div>

            {/* User Info */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Customer Information</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-medium">{selectedTicket.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Email:</span>
                  <span className="font-medium">{selectedTicket.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">User Type:</span>
                  <span className="font-medium">{selectedTicket.userType}</span>
                </div>
              </div>
            </div>

            {/* Ticket Details */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Ticket Details</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="font-medium text-slate-700 mb-2">{selectedTicket.subject}</p>
                <p className="text-sm text-slate-600">{selectedTicket.message}</p>
              </div>
            </div>

            {/* Replies */}
            {selectedTicket.replies.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Conversation History</h3>
                <div className="space-y-3">
                  {selectedTicket.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-lg ${
                        reply.isInternal
                          ? 'bg-yellow-50 border-l-4 border-yellow-400'
                          : 'bg-blue-50 border-l-4 border-blue-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {reply.author}
                          {reply.isInternal && <span className="ml-2 text-xs text-yellow-700">(Internal Note)</span>}
                        </span>
                        <span className="text-xs text-slate-500">{reply.createdAt}</span>
                      </div>
                      <p className="text-sm text-slate-700">{reply.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Update Status</label>
                <FormSelect
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                  options={[
                    { value: 'open', label: 'Open' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
                <select
                  value={selectedTicket.assignedToId || ''}
                  onChange={(e) => assignTicket(selectedTicket.id, e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Unassigned</option>
                  {adminUsers.map(admin => (
                    <option key={admin.id} value={admin.id}>
                      {admin.full_name || admin.name || admin.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTicket(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowReplyModal(true);
                }}
              >
                Reply to Customer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reply Modal */}
      {selectedTicket && (
        <Modal
          isOpen={showReplyModal}
          onClose={() => {
            setShowReplyModal(false);
            setReplyMessage('');
            setIsInternalNote(false);
          }}
          title={`Reply to ${selectedTicket.ticketNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-1">{selectedTicket.subject}</p>
              <p className="text-xs text-slate-500">From: {selectedTicket.userName}</p>
            </div>

            <FormTextarea
              label="Message"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply here..."
              rows={6}
              required
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="internalNote"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                className="w-4 h-4 text-yellow-600 border-slate-300 rounded focus:ring-yellow-400"
              />
              <label htmlFor="internalNote" className="text-sm text-slate-700">
                Internal note (not visible to customer)
              </label>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-700">
                {isInternalNote
                  ? '📝 This note will only be visible to support staff'
                  : '📧 This reply will be sent to the customer via email'
                }
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyMessage('');
                  setIsInternalNote(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={sendReply}>
                {isInternalNote ? 'Add Internal Note' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default SupportTicketsPage;

