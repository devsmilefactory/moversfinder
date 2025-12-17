import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import DataTable from '../../shared/DataTable';
import { supabase } from '../../../lib/supabase';
import { sendInvoiceEmail, sendInvoicePaidEmail } from '../../../services/emailService';
import { generateInvoicePDF } from '../../../services/pdfService';

/**
 * Admin Invoice Management Page
 * Manage corporate invoices, generate new invoices, and track payments
 */
const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '' });

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0
  });

  const [createForm, setCreateForm] = useState({
    company_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    line_items: [],
    notes: '',
    tax: 0,
    discount: 0
  });

  const [generateForm, setGenerateForm] = useState({
    company_id: '',
    period_start: '',
    period_end: '',
    billing_type: 'monthly' // 'monthly', 'weekly', 'per_trip'
  });

  const [bulkGenerateForm, setBulkGenerateForm] = useState({
    period_start: '',
    period_end: '',
    selected_companies: [],
    send_emails: true
  });

  // Load invoices
  const loadInvoices = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:corporate_profiles!invoices_company_id_fkey(
            company_name,
            contact_person,
            email
          )
        `)
        .eq('platform', 'taxicab')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedInvoices = (data || []).map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        companyId: inv.company_id,
        companyName: inv.company?.company_name || 'Unknown',
        contactPerson: inv.company?.contact_person || '',
        email: inv.company?.email || '',
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        paidDate: inv.paid_date,
        subtotal: parseFloat(inv.subtotal || 0),
        tax: parseFloat(inv.tax || 0),
        discount: parseFloat(inv.discount || 0),
        totalAmount: parseFloat(inv.total_amount || 0),
        status: inv.status || 'draft',
        paymentMethod: inv.payment_method,
        paymentReference: inv.payment_reference,
        lineItems: inv.line_items || [],
        notes: inv.notes,
        createdAt: inv.created_at
      }));

      setInvoices(formattedInvoices);
      calculateStats(formattedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      alert(`Failed to load invoices: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load companies
  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('corporate_profiles')
        .select('user_id, company_name, contact_person, email')
        .eq('platform', 'taxicab')
        .eq('verification_status', 'verified')
        .order('company_name');

      if (error) throw error;

      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadCompanies();
  }, []);

  // Calculate stats
  const calculateStats = (invoiceList) => {
    const total = invoiceList.length;
    const draft = invoiceList.filter(inv => inv.status === 'draft').length;
    const sent = invoiceList.filter(inv => inv.status === 'sent').length;
    const paid = invoiceList.filter(inv => inv.status === 'paid').length;
    
    // Calculate overdue (sent invoices past due date)
    const today = new Date();
    const overdue = invoiceList.filter(inv => 
      inv.status === 'sent' && new Date(inv.dueDate) < today
    ).length;

    const totalAmount = invoiceList.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidAmount = invoiceList.filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const unpaidAmount = totalAmount - paidAmount;

    setStats({
      total,
      draft,
      sent,
      paid,
      overdue,
      totalAmount,
      paidAmount,
      unpaidAmount
    });
  };

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  };

  // Bulk generate invoices for multiple companies
  const handleBulkGenerate = async () => {
    if (!bulkGenerateForm.period_start || !bulkGenerateForm.period_end) {
      alert('Please select a date range');
      return;
    }

    if (bulkGenerateForm.selected_companies.length === 0) {
      alert('Please select at least one company');
      return;
    }

    setProcessing(true);
    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    try {
      const totalCompanies = bulkGenerateForm.selected_companies.length;

      for (let i = 0; i < totalCompanies; i++) {
        const companyId = bulkGenerateForm.selected_companies[i];

        setBulkProgress({
          current: i + 1,
          total: totalCompanies,
          status: `Processing company ${i + 1} of ${totalCompanies}...`
        });

        try {
          // Get company details
          const { data: companyData, error: companyError } = await supabase
            .from('corporate_profiles')
            .select('user_id, company_name, email, contact_person')
            .eq('user_id', companyId)
            .single();

          if (companyError) throw companyError;

          // Get trips for this company in the period
          const { data: trips, error: tripsError } = await supabase
            .from('rides')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'completed')
            .gte('created_at', bulkGenerateForm.period_start)
            .lte('created_at', bulkGenerateForm.period_end)
            .eq('platform', 'taxicab');

          if (tripsError) throw tripsError;

          if (!trips || trips.length === 0) {
            results.skipped.push({
              company: companyData.company_name,
              reason: 'No completed trips in this period'
            });
            continue;
          }

          // Calculate totals
          const subtotal = trips.reduce((sum, trip) => sum + parseFloat(trip.fare || 0), 0);
          const invoiceNumber = `INV-${Date.now()}-${companyId.substring(0, 8)}`;

          // Create line items
          const lineItems = trips.map(trip => ({
            description: `${trip.service_type || 'Taxi'} - ${trip.pickup_location} to ${trip.dropoff_location}`,
            quantity: 1,
            unit_price: parseFloat(trip.fare || 0),
            amount: parseFloat(trip.fare || 0),
            trip_id: trip.id,
            trip_date: trip.created_at
          }));

          // Create invoice
          const { data: invoice, error: insertError } = await supabase
            .from('invoices')
            .insert({
              company_id: companyId,
              invoice_number: invoiceNumber,
              issue_date: new Date().toISOString().split('T')[0],
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              line_items: lineItems,
              subtotal: subtotal,
              tax: 0,
              discount: 0,
              total_amount: subtotal,
              status: bulkGenerateForm.send_emails ? 'sent' : 'draft',
              notes: `Auto-generated invoice for period: ${bulkGenerateForm.period_start} to ${bulkGenerateForm.period_end}`,
              platform: 'taxicab'
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Send email if requested
          if (bulkGenerateForm.send_emails && companyData.email) {
            await sendInvoiceEmail({
              email: companyData.email,
              companyName: companyData.company_name,
              invoiceNumber: invoiceNumber,
              issueDate: invoice.issue_date,
              dueDate: invoice.due_date,
              totalAmount: subtotal,
              lineItems: lineItems
            });
          }

          results.success.push({
            company: companyData.company_name,
            invoiceNumber: invoiceNumber,
            amount: subtotal,
            trips: trips.length
          });

        } catch (error) {
          console.error(`Error generating invoice for company ${companyId}:`, error);
          results.failed.push({
            company: companyId,
            error: error.message
          });
        }
      }

      // Show results
      let message = `✅ Bulk Invoice Generation Complete!\n\n`;

      if (results.success.length > 0) {
        message += `✅ Successfully Generated: ${results.success.length}\n`;
        results.success.forEach(r => {
          message += `  • ${r.company}: ${r.invoiceNumber} ($${r.amount.toFixed(2)}, ${r.trips} trips)\n`;
        });
      }

      if (results.skipped.length > 0) {
        message += `\n⚠️ Skipped: ${results.skipped.length}\n`;
        results.skipped.forEach(r => {
          message += `  • ${r.company}: ${r.reason}\n`;
        });
      }

      if (results.failed.length > 0) {
        message += `\n❌ Failed: ${results.failed.length}\n`;
        results.failed.forEach(r => {
          message += `  • ${r.company}: ${r.error}\n`;
        });
      }

      alert(message);

      setShowBulkGenerateModal(false);
      setBulkGenerateForm({
        period_start: '',
        period_end: '',
        selected_companies: [],
        send_emails: true
      });
      setBulkProgress({ current: 0, total: 0, status: '' });
      loadInvoices();

    } catch (error) {
      console.error('Error in bulk generation:', error);
      alert(`Bulk generation failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Auto-generate invoice from trips
  const handleAutoGenerate = async () => {
    if (!generateForm.company_id || !generateForm.period_start || !generateForm.period_end) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setProcessing(true);

      // Fetch trips for the period
      const { data: trips, error: tripsError } = await supabase
        .from('rides')
        .select('*')
        .eq('company_id', generateForm.company_id)
        .eq('platform', 'taxicab')
        .gte('created_at', generateForm.period_start)
        .lte('created_at', generateForm.period_end)
        .eq('status', 'completed');

      if (tripsError) throw tripsError;

      if (!trips || trips.length === 0) {
        alert('No completed trips found for the selected period');
        setProcessing(false);
        return;
      }

      // Group trips by service type
      const lineItems = trips.reduce((acc, trip) => {
        const serviceType = trip.service_type || 'taxi';
        const existing = acc.find(item => item.description === `${serviceType} rides`);
        
        if (existing) {
          existing.quantity += 1;
          existing.amount += parseFloat(trip.fare || 0);
        } else {
          acc.push({
            description: `${serviceType} rides`,
            quantity: 1,
            unit_price: parseFloat(trip.fare || 0),
            amount: parseFloat(trip.fare || 0)
          });
        }
        
        return acc;
      }, []);

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const invoiceNumber = generateInvoiceNumber();

      // Create invoice
      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          company_id: generateForm.company_id,
          invoice_number: invoiceNumber,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days
          subtotal: subtotal,
          tax: 0,
          discount: 0,
          total_amount: subtotal,
          status: 'draft',
          line_items: lineItems,
          notes: `Auto-generated invoice for ${trips.length} trips from ${generateForm.period_start} to ${generateForm.period_end}`,
          platform: 'taxicab'
        });

      if (insertError) throw insertError;

      alert(`✅ Invoice Generated!\n\nInvoice Number: ${invoiceNumber}\nTrips: ${trips.length}\nTotal Amount: $${subtotal.toFixed(2)}\n\nStatus: Draft (review and send to client)`);
      
      setShowGenerateModal(false);
      setGenerateForm({
        company_id: '',
        period_start: '',
        period_end: '',
        billing_type: 'monthly'
      });
      loadInvoices();
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert(`Failed to generate invoice: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Update invoice status
  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      const updateData = { status: newStatus };

      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;

      // Send email notification
      if (newStatus === 'sent' && selectedInvoice) {
        const emailResult = await sendInvoiceEmail({
          email: selectedInvoice.email,
          companyName: selectedInvoice.companyName,
          invoiceNumber: selectedInvoice.invoiceNumber,
          issueDate: selectedInvoice.issueDate,
          dueDate: selectedInvoice.dueDate,
          totalAmount: selectedInvoice.totalAmount,
          lineItems: selectedInvoice.lineItems
        });

        if (emailResult.success) {
          alert(`✅ Invoice sent to ${selectedInvoice.companyName}!\n\nEmail delivered to: ${selectedInvoice.email}`);
        } else {
          alert(`✅ Invoice status updated to SENT\n\n⚠️ Email delivery failed: ${emailResult.error}\n\nPlease send the invoice manually.`);
        }
      } else if (newStatus === 'paid' && selectedInvoice) {
        const emailResult = await sendInvoicePaidEmail({
          email: selectedInvoice.email,
          companyName: selectedInvoice.companyName,
          invoiceNumber: selectedInvoice.invoiceNumber,
          amount: selectedInvoice.totalAmount,
          paidDate: updateData.paid_date
        });

        if (emailResult.success) {
          alert(`✅ Invoice marked as PAID!\n\nPayment confirmation sent to: ${selectedInvoice.email}`);
        } else {
          alert(`✅ Invoice marked as PAID\n\n⚠️ Email notification failed: ${emailResult.error}`);
        }
      } else {
        alert(`✅ Invoice status updated to: ${newStatus.toUpperCase()}`);
      }

      loadInvoices();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert(`Failed to update invoice: ${error.message}`);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      alert('✅ Invoice deleted successfully');
      loadInvoices();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert(`Failed to delete invoice: ${error.message}`);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'companyName', label: 'Company' },
    { key: 'issueDate', label: 'Issue Date' },
    { key: 'dueDate', label: 'Due Date' },
    { 
      key: 'totalAmount', 
      label: 'Amount',
      render: (value) => <span className="font-semibold">${value.toFixed(2)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(value)}`}>
          {value.toUpperCase()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, invoice) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedInvoice(invoice);
              setShowDetailsModal(true);
            }}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateInvoicePDF(invoice)}
          >
            📄 PDF
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
          <h1 className="text-2xl font-bold text-slate-700 mb-2">📄 Invoice Management</h1>
          <p className="text-slate-600">Manage corporate invoices and billing</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => setShowBulkGenerateModal(true)}>
            📦 Bulk Generate Invoices
          </Button>
          <Button variant="primary" onClick={() => setShowGenerateModal(true)}>
            ⚡ Auto-Generate Invoice
          </Button>
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            ➕ Create Manual Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
            </div>
            <div className="text-3xl">📄</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              <p className="text-xs text-slate-500">${stats.paidAmount.toFixed(2)}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Unpaid</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.sent}</p>
              <p className="text-xs text-slate-500">${stats.unpaidAmount.toFixed(2)}</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="🔍 Search by invoice number or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading invoices...</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredInvoices}
            emptyMessage="No invoices found"
          />
        )}
      </div>

      {/* Auto-Generate Invoice Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="⚡ Auto-Generate Invoice from Trips"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company *
            </label>
            <select
              value={generateForm.company_id}
              onChange={(e) => setGenerateForm({ ...generateForm, company_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            >
              <option value="">Select Company</option>
              {companies.map(company => (
                <option key={company.user_id} value={company.user_id}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Period Start *
              </label>
              <input
                type="date"
                value={generateForm.period_start}
                onChange={(e) => setGenerateForm({ ...generateForm, period_start: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Period End *
              </label>
              <input
                type="date"
                value={generateForm.period_end}
                onChange={(e) => setGenerateForm({ ...generateForm, period_end: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              💡 This will automatically generate an invoice based on all completed trips for the selected company during the specified period.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAutoGenerate}
              disabled={processing}
            >
              {processing ? 'Generating...' : '⚡ Generate Invoice'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Generate Invoices Modal */}
      <Modal
        isOpen={showBulkGenerateModal}
        onClose={() => setShowBulkGenerateModal(false)}
        title="📦 Bulk Generate Invoices"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Bulk Generation:</strong> Generate invoices for multiple companies at once for a specific period.
              This will create invoices for all selected companies that have completed trips in the date range.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Period Start *
              </label>
              <input
                type="date"
                value={bulkGenerateForm.period_start}
                onChange={(e) => setBulkGenerateForm({ ...bulkGenerateForm, period_start: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Period End *
              </label>
              <input
                type="date"
                value={bulkGenerateForm.period_end}
                onChange={(e) => setBulkGenerateForm({ ...bulkGenerateForm, period_end: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Companies *
            </label>
            <div className="border border-slate-300 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              <div className="mb-3 pb-3 border-b border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkGenerateForm.selected_companies.length === companies.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkGenerateForm({
                          ...bulkGenerateForm,
                          selected_companies: companies.map(c => c.user_id)
                        });
                      } else {
                        setBulkGenerateForm({ ...bulkGenerateForm, selected_companies: [] });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="font-semibold text-slate-700">Select All ({companies.length})</span>
                </label>
              </div>
              {companies.map(company => (
                <label key={company.user_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={bulkGenerateForm.selected_companies.includes(company.user_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkGenerateForm({
                          ...bulkGenerateForm,
                          selected_companies: [...bulkGenerateForm.selected_companies, company.user_id]
                        });
                      } else {
                        setBulkGenerateForm({
                          ...bulkGenerateForm,
                          selected_companies: bulkGenerateForm.selected_companies.filter(id => id !== company.user_id)
                        });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-slate-700">{company.company_name}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Selected: {bulkGenerateForm.selected_companies.length} companies
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkGenerateForm.send_emails}
                onChange={(e) => setBulkGenerateForm({ ...bulkGenerateForm, send_emails: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-yellow-400"
              />
              <span className="text-sm text-slate-700">
                📧 Automatically send invoices via email (status will be "Sent" instead of "Draft")
              </span>
            </label>
          </div>

          {processing && bulkProgress.total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  {bulkProgress.status}
                </span>
                <span className="text-sm text-blue-600">
                  {bulkProgress.current} / {bulkProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="primary"
              onClick={handleBulkGenerate}
              disabled={processing}
            >
              {processing ? '⏳ Generating...' : '📦 Generate Invoices'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkGenerateModal(false)}
              disabled={processing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={`Invoice ${selectedInvoice.invoiceNumber}`}
        >
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-2">Company Information</h3>
              <p className="text-sm text-slate-600">
                <strong>Company:</strong> {selectedInvoice.companyName}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Contact:</strong> {selectedInvoice.contactPerson}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Email:</strong> {selectedInvoice.email}
              </p>
            </div>

            {/* Invoice Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Issue Date</p>
                <p className="font-semibold text-slate-700">{selectedInvoice.issueDate}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Due Date</p>
                <p className="font-semibold text-slate-700">{selectedInvoice.dueDate}</p>
              </div>
              {selectedInvoice.paidDate && (
                <div>
                  <p className="text-sm text-slate-600">Paid Date</p>
                  <p className="font-semibold text-green-700">{selectedInvoice.paidDate}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedInvoice.status)}`}>
                  {selectedInvoice.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Line Items</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.lineItems.map((item, index) => (
                      <tr key={index} className="border-t border-slate-200">
                        <td className="px-4 py-2 text-sm text-slate-700">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 text-right">${item.unit_price?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-2 text-sm text-slate-700 text-right">${item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-600">Subtotal</span>
                <span className="text-sm font-semibold text-slate-700">${selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              {selectedInvoice.tax > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-600">Tax</span>
                  <span className="text-sm font-semibold text-slate-700">${selectedInvoice.tax.toFixed(2)}</span>
                </div>
              )}
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-600">Discount</span>
                  <span className="text-sm font-semibold text-red-600">-${selectedInvoice.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-base font-bold text-slate-700">Total Amount</span>
                <span className="text-base font-bold text-slate-700">${selectedInvoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {selectedInvoice.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  <strong>Notes:</strong> {selectedInvoice.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-between pt-4 border-t border-slate-200">
              <div className="flex gap-2">
                {selectedInvoice.status === 'draft' && (
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateStatus(selectedInvoice.id, 'sent')}
                  >
                    📧 Send to Client
                  </Button>
                )}
                {selectedInvoice.status === 'sent' && (
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateStatus(selectedInvoice.id, 'paid')}
                  >
                    ✅ Mark as Paid
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateInvoicePDF(selectedInvoice)}
                >
                  📄 Download PDF
                </Button>
                {selectedInvoice.status === 'draft' && (
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                  >
                    🗑️ Delete
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Manual Invoice Modal - Placeholder */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="➕ Create Manual Invoice"
      >
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">
            Manual invoice creation coming soon!
          </p>
          <p className="text-sm text-slate-500">
            For now, please use the Auto-Generate feature to create invoices from completed trips.
          </p>
          <Button variant="outline" onClick={() => setShowCreateModal(false)} className="mt-4">
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default InvoicesPage;

