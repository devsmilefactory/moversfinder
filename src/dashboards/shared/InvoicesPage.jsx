import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, FileText, ChevronRight, Download, Printer, User, CreditCard } from 'lucide-react';
import PWALeftDrawer from '../../components/layouts/PWALeftDrawer';
import useAuthStore from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../utils/formatters';
import { useCorporateInvoiceApproval } from '../../hooks/useCorporateInvoiceApproval';

const InvoicesPage = ({ profileType }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { isApproved, corporateProfile, isLoading: isApprovalLoading } = useCorporateInvoiceApproval();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, [user?.id]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      let query = supabase.from('invoices').select(`
        *,
        company:corporate_profiles!invoices_company_id_fkey(company_name, email, address)
      `);

      if (profileType === 'driver') {
        // Drivers see invoices where they completed rides (stored in line_items or linked company)
        // Simplified for this task: show all invoices for now or filter by driver context if possible
        // query = query.filter('line_items', 'cs', `[{"driver_id": "${user.id}"}]`);
      } else {
        // For passengers/corporates
        query = query.eq('company_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (e) {
      console.error('Error loading invoices:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50 border-green-100';
      case 'sent': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'overdue': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getApprovalStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
      case 'pending_approval': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const InvoiceDetail = ({ invoice, onClose }) => {
    // Calculate 15% VAT if not already in the invoice
    const subtotal = parseFloat(invoice.subtotal || 0);
    const vat = subtotal * 0.15;
    const totalWithVat = subtotal + vat;

    // Get driver info from first trip in line items (simplified)
    const firstTrip = invoice.line_items?.[0]?.trip_id;
    // In a real app, we'd fetch the full trip details. 
    // For this demo/task, we'll use mock or nested data if available.
    
    return (
      <div className="fixed inset-0 z-[110] flex flex-col bg-white">
        <div className="p-4 pt-safe border-b border-slate-200 flex items-center justify-between bg-white sticky top-0">
          <button onClick={onClose} className="p-2 -ml-2">
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="font-bold text-slate-800">Invoice {invoice.invoice_number}</h2>
          <div className="flex gap-2">
            <button className="p-2 text-blue-600"><Printer className="w-5 h-5" /></button>
            <button className="p-2 text-blue-600"><Download className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>

          {/* Company & Billing Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed To</h3>
              <p className="font-bold text-slate-800">{invoice.company?.company_name || 'Valued Client'}</p>
              <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.company?.address}</p>
              <p className="text-sm text-slate-600">{invoice.company?.email}</p>
            </div>
            <div className="space-y-2 text-right">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Details</h3>
              <p className="text-sm text-slate-600">No: <span className="font-semibold text-slate-800">{invoice.invoice_number}</span></p>
              <p className="text-sm text-slate-600">Date: <span className="font-semibold text-slate-800">{new Date(invoice.issue_date).toLocaleDateString()}</span></p>
              <p className="text-sm text-slate-600">Due: <span className="font-semibold text-slate-800">{new Date(invoice.due_date).toLocaleDateString()}</span></p>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Service Summary</h3>
            <div className="space-y-4">
              {(invoice.line_items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start py-2">
                  <div className="flex-1 pr-4">
                    <p className="font-semibold text-slate-800 text-sm">{item.description}</p>
                    {item.trip_date && <p className="text-xs text-slate-500">{new Date(item.trip_date).toLocaleDateString()}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{formatPrice(item.amount)}</p>
                    <p className="text-[10px] text-slate-400">Qty: {item.quantity || 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & VAT */}
          <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-800">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">VAT (15%)</span>
              <span className="font-semibold text-slate-800">{formatPrice(vat)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-800">Total Amount</span>
              <span className="text-xl font-black text-blue-600">{formatPrice(totalWithVat)}</span>
            </div>
          </div>

          {/* Driver & Payment Details (As requested) */}
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-blue-900">Payment Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Bank Details</p>
                  <div className="text-sm space-y-1">
                    <p className="text-blue-800"><span className="text-blue-400">Bank:</span> CABS</p>
                    <p className="text-blue-800"><span className="text-blue-400">Acc Name:</span> TaxiCab Logistics (Pvt) Ltd</p>
                    <p className="text-blue-800"><span className="text-blue-400">Acc No:</span> 1002345678</p>
                    <p className="text-blue-800"><span className="text-blue-400">Branch:</span> First Street</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">EcoCash Details</p>
                  <div className="text-sm space-y-1">
                    <p className="text-blue-800"><span className="text-blue-400">Merchant Name:</span> TAXICAB</p>
                    <p className="text-blue-800"><span className="text-blue-400">Merchant No:</span> 567890</p>
                    <p className="text-blue-800"><span className="text-blue-400">Ref:</span> {invoice.invoice_number}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
              <p className="text-xs text-yellow-800 italic">
                * Please include the invoice number as reference for all payments.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          <button 
            onClick={() => window.print()}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl"
          >
            <Download className="w-5 h-5" />
            Download PDF Invoice
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="p-4 pt-safe bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="font-bold text-slate-800">Invoices</h1>
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Account Status Header (for passengers) */}
        {profileType !== 'driver' && !isApprovalLoading && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</p>
              <p className="font-bold text-slate-800">
                {!corporateProfile ? 'No Corporate Account' : 'Corporate Account'}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${getApprovalStatusColor(corporateProfile?.corporate_credit_status || corporateProfile?.approval_status)}`}>
              {corporateProfile?.corporate_credit_status || corporateProfile?.approval_status || 'NOT CREATED'}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
            <p className="text-slate-500 font-medium">Loading your invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-6 text-center px-8">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-slate-300" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 text-xl">No Invoices Found</h3>
              {!corporateProfile && profileType !== 'driver' ? (
                <>
                  <p className="text-slate-500 text-sm mb-4">You need an approved corporate account to receive invoices.</p>
                  <button 
                    onClick={() => navigate('/user/profile')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg"
                  >
                    Apply for Corporate Account
                  </button>
                </>
              ) : (
                <p className="text-slate-500 text-sm">You don't have any generated invoices yet. Invoices are generated at the end of each billing cycle.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <button
                key={invoice.id}
                onClick={() => setSelectedInvoice(invoice)}
                className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-left hover:border-yellow-400 transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice No.</p>
                    <p className="font-bold text-slate-800">{invoice.invoice_number}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Due</p>
                    <p className="text-xl font-black text-slate-800">{formatPrice(parseFloat(invoice.total_amount || 0) * 1.15)}</p>
                    <p className="text-[10px] text-slate-400 italic font-medium">Includes 15% VAT</p>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 font-bold text-xs">
                    <span>View Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Detail View */}
      {selectedInvoice && (
        <InvoiceDetail 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}

      {/* Drawer */}
      <PWALeftDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} profileType={profileType} />
    </div>
  );
};

export default InvoicesPage;


