import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';

/**
 * Driver Support Page
 *
 * Features:
 * - Submit support tickets
 * - View ticket history
 * - FAQ section
 * - Contact information
 *
 * Supabase Integration:
 * - Fetches support tickets from support_tickets table
 * - Creates new tickets via driver store
 */

const SupportPage = () => {
  const user = useAuthStore((state) => state.user);
  const { supportTickets, loading, loadSupportTickets, createSupportTicket } = useDriverStore();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketData, setTicketData] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadSupportTickets(user.id);
    }
  }, [user?.id, loadSupportTickets]);

  const faqs = [
    { q: 'How do I update my documents?', a: 'Go to Documents page and click Upload for each document type.' },
    { q: 'When will I receive my payout?', a: 'Payouts are processed within 2-3 business days after request.' },
    { q: 'How do I report an issue with a ride?', a: 'Use the Support Ticket form to report any ride-related issues.' },
    { q: 'Can I change my availability?', a: 'Yes, go to Schedule page and toggle your availability status.' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    try {
      await createSupportTicket(
        user.id,
        ticketData.subject,
        ticketData.category,
        ticketData.priority,
        ticketData.description
      );

      setShowTicketModal(false);
      setTicketData({ subject: '', category: '', priority: 'medium', description: '' });
      alert('Support ticket submitted successfully!');
    } catch (error) {
      alert(`Failed to submit ticket: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading support tickets...</div>
      </div>
    );
  }

  const handleChange = (e) => {
    setTicketData({ ...ticketData, [e.target.name]: e.target.value });
    alert('Support ticket submitted successfully!');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Driver Support</h1>
          <p className="text-sm text-slate-500 mt-1">Get help and submit support tickets</p>
        </div>
        <Button variant="primary" onClick={() => setShowTicketModal(true)}>
          Submit Ticket
        </Button>
      </div>

      {/* Contact Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
          <div className="text-3xl mb-2">📞</div>
          <h3 className="font-semibold text-slate-700 mb-1">Phone Support</h3>
          <p className="text-sm text-slate-600">+263 71 234 5678</p>
          <p className="text-xs text-slate-500 mt-2">Mon-Fri: 8AM-6PM</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
          <div className="text-3xl mb-2">📧</div>
          <h3 className="font-semibold text-slate-700 mb-1">Email Support</h3>
          <p className="text-sm text-slate-600">support@taxicab.co.zw</p>
          <p className="text-xs text-slate-500 mt-2">24-48 hour response</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-lg p-6 border-2 border-yellow-200">
          <div className="text-3xl mb-2">💬</div>
          <h3 className="font-semibold text-slate-700 mb-1">Live Chat</h3>
          <p className="text-sm text-slate-600">Available in app</p>
          <p className="text-xs text-slate-500 mt-2">Instant responses</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* My Tickets */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">My Tickets</h2>
          {supportTickets && supportTickets.length > 0 ? (
            <div className="space-y-3">
              {supportTickets.map(ticket => (
                <div key={ticket.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-slate-700">{ticket.subject}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ticket.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <span className={`text-xs ${
                  ticket.priority === 'high' ? 'text-red-600' : 'text-slate-600'
                }`}>
                  Priority: {ticket.priority}
                </span>
              </div>
            ))}
          </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No support tickets yet
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <details key={index} className="cursor-pointer">
                <summary className="font-medium text-slate-700 p-2 hover:bg-slate-50 rounded">
                  {faq.q}
                </summary>
                <p className="text-sm text-slate-600 mt-2 pl-4">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Ticket Modal */}
      <Modal
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false);
          setTicketData({ subject: '', category: '', priority: 'medium', description: '' });
        }}
        title="Submit Support Ticket"
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Subject"
            value={ticketData.subject}
            onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
            required
          />
          <FormSelect
            label="Category"
            value={ticketData.category}
            onChange={(e) => setTicketData({ ...ticketData, category: e.target.value })}
            required
            options={[
              { value: 'payment', label: 'Payment Issue' },
              { value: 'technical', label: 'Technical Issue' },
              { value: 'ride', label: 'Ride Issue' },
              { value: 'account', label: 'Account Issue' },
              { value: 'other', label: 'Other' }
            ]}
          />
          <FormSelect
            label="Priority"
            value={ticketData.priority}
            onChange={(e) => setTicketData({ ...ticketData, priority: e.target.value })}
            required
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
          <FormTextarea
            label="Description"
            value={ticketData.description}
            onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
            placeholder="Please describe your issue in detail..."
            rows={5}
            required
          />
          <div className="flex gap-3 justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTicketModal(false);
                setTicketData({ subject: '', category: '', priority: 'medium', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupportPage;
