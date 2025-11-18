import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { sendPaymentConfirmationEmail } from '../../../services/emailService';

/**
 * Admin Payment Verification Page
 * 
 * Features:
 * - View pending payment proofs uploaded by corporate clients
 * - Approve/reject payment verifications
 * - Upon approval, automatically add credits to corporate account balance
 * - Track payment history with verification status and admin notes
 */

const PaymentVerificationPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationAction, setVerificationAction] = useState(null); // 'approve' or 'reject'
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          company:corporate_profiles!payment_proofs_company_id_fkey(
            company_name,
            credit_balance,
            user:profiles!corporate_profiles_user_id_fkey(
              name,
              email,
              phone
            )
          ),
          verified_by_user:profiles!payment_proofs_verified_by_fkey(
            name
          )
        `)
        .eq('platform', 'taxicab')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedPayments = (data || []).map(payment => ({
        id: payment.id,
        companyId: payment.company_id,
        companyName: payment.company?.company_name || 'N/A',
        contactName: payment.company?.user?.name || 'N/A',
        contactEmail: payment.company?.user?.email || 'N/A',
        contactPhone: payment.company?.user?.phone || 'N/A',
        currentBalance: parseFloat(payment.company?.credit_balance || 0),
        amount: parseFloat(payment.amount),
        paymentMethod: payment.payment_method,
        paymentDate: payment.payment_date,
        paymentReference: payment.payment_reference || 'N/A',
        proofDocumentUrl: payment.proof_document_url,
        verificationStatus: payment.verification_status,
        verifiedBy: payment.verified_by_user?.name || 'N/A',
        verifiedAt: payment.verified_at,
        adminNotes: payment.admin_notes || '',
        createdAt: new Date(payment.created_at).toLocaleString()
      }));

      setPayments(transformedPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (payment, action) => {
    setSelectedPayment(payment);
    setVerificationAction(action);
    setAdminNotes('');
    setShowVerifyModal(true);
  };

  const confirmVerification = async () => {
    if (!selectedPayment || !verificationAction) return;

    try {
      setProcessing(true);

      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();

      if (verificationAction === 'approve') {
        // Start a transaction-like operation
        // 1. Update payment proof status
        const { error: updateError } = await supabase
          .from('payment_proofs')
          .update({
            verification_status: 'verified',
            verified_by: user.id,
            verified_at: now,
            admin_notes: adminNotes
          })
          .eq('id', selectedPayment.id);

        if (updateError) throw updateError;

        // 2. Get current balance
        const { data: companyData, error: companyError } = await supabase
          .from('corporate_profiles')
          .select('credit_balance')
          .eq('user_id', selectedPayment.companyId)
          .single();

        if (companyError) throw companyError;

        const currentBalance = parseFloat(companyData.credit_balance || 0);
        const newBalance = currentBalance + selectedPayment.amount;

        // 3. Update corporate account balance
        const { error: balanceError } = await supabase
          .from('corporate_profiles')
          .update({ credit_balance: newBalance })
          .eq('user_id', selectedPayment.companyId);

        if (balanceError) throw balanceError;

        // 4. Create credit transaction record
        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert({
            company_id: selectedPayment.companyId,
            transaction_type: 'top_up',
            amount: selectedPayment.amount,
            balance_before: currentBalance,
            balance_after: newBalance,
            reference_type: 'payment_proof',
            reference_id: selectedPayment.id,
            description: `Payment verified: ${selectedPayment.paymentMethod} - ${selectedPayment.paymentReference}`,
            created_by: user.id,
            platform: 'taxicab'
          });

        if (transactionError) throw transactionError;

        // Send email notification
        const emailResult = await sendPaymentConfirmationEmail({
          email: selectedPayment.email,
          companyName: selectedPayment.companyName,
          amount: selectedPayment.amount,
          newBalance: newBalance,
          transactionDate: now
        });

        if (emailResult.success) {
          alert(`✅ Payment Approved!\n\nCompany: ${selectedPayment.companyName}\nAmount: $${selectedPayment.amount.toFixed(2)}\nNew Balance: $${newBalance.toFixed(2)}\n\n📧 Confirmation email sent to: ${selectedPayment.email}`);
        } else {
          alert(`✅ Payment Approved!\n\nCompany: ${selectedPayment.companyName}\nAmount: $${selectedPayment.amount.toFixed(2)}\nNew Balance: $${newBalance.toFixed(2)}\n\n⚠️ Email notification failed: ${emailResult.error}`);
        }
      } else {
        // Reject payment
        const { error: rejectError } = await supabase
          .from('payment_proofs')
          .update({
            verification_status: 'rejected',
            verified_by: user.id,
            verified_at: now,
            admin_notes: adminNotes
          })
          .eq('id', selectedPayment.id);

        if (rejectError) throw rejectError;

        alert(`❌ Payment Rejected\n\nCompany: ${selectedPayment.companyName}\nAmount: $${selectedPayment.amount.toFixed(2)}\n\nThe corporate account has been notified.`);
      }

      // Reload payments
      await loadPayments();
      setShowVerifyModal(false);
      setSelectedPayment(null);
      setVerificationAction(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error processing verification:', error);
      alert(`Failed to process verification: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    // Status filter
    if (filterStatus !== 'all' && p.verificationStatus !== filterStatus) {
      return false;
    }
    
    // Payment method filter
    if (filterMethod !== 'all' && p.paymentMethod !== filterMethod) {
      return false;
    }
    
    // Date range filter
    if (filterStartDate && p.paymentDate < filterStartDate) {
      return false;
    }
    if (filterEndDate && p.paymentDate > filterEndDate) {
      return false;
    }
    
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      verified: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const stats = {
    pending: payments.filter(p => p.verificationStatus === 'pending').length,
    verified: payments.filter(p => p.verificationStatus === 'verified').length,
    rejected: payments.filter(p => p.verificationStatus === 'rejected').length,
    totalAmount: payments
      .filter(p => p.verificationStatus === 'verified')
      .reduce((sum, p) => sum + p.amount, 0)
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-700 mb-2">💳 Payment Verification</h1>
        <p className="text-slate-600">Review and approve corporate account top-up requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="text-3xl">❌</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Verified</p>
              <p className="text-2xl font-bold text-green-600">${stats.totalAmount.toFixed(2)}</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'pending'
                ? 'bg-yellow-500 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⏳ Pending ({stats.pending})
          </button>
          <button
            onClick={() => setFilterStatus('verified')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'verified'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ✅ Verified ({stats.verified})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'rejected'
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ❌ Rejected ({stats.rejected})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'all'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({payments.length})
          </button>
        </div>

        {/* Additional Filters */}
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Methods</option>
              <option value="ecocash">EcoCash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="onemoney">OneMoney</option>
              <option value="usd_card">USD Card</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading payments...</p>
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No {filterStatus !== 'all' ? filterStatus : ''} payments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Payment Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-700">{payment.companyName}</p>
                        <p className="text-xs text-slate-500">{payment.contactName}</p>
                        <p className="text-xs text-slate-500">{payment.contactEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-green-600">${payment.amount.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">Balance: ${payment.currentBalance.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 capitalize">{payment.paymentMethod.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500">{payment.paymentReference}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{payment.paymentDate}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(payment.verificationStatus)}`}>
                        {payment.verificationStatus.charAt(0).toUpperCase() + payment.verificationStatus.slice(1)}
                      </span>
                      {payment.verificationStatus !== 'pending' && (
                        <p className="text-xs text-slate-500 mt-1">By: {payment.verifiedBy}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{payment.createdAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {payment.proofDocumentUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(payment.proofDocumentUrl, '_blank')}
                          >
                            📄 View Proof
                          </Button>
                        )}
                        {payment.verificationStatus === 'pending' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleVerify(payment, 'approve')}
                            >
                              ✅ Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerify(payment, 'reject')}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              ❌ Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verification Modal */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => {
          setShowVerifyModal(false);
          setSelectedPayment(null);
          setVerificationAction(null);
          setAdminNotes('');
        }}
        title={verificationAction === 'approve' ? '✅ Approve Payment' : '❌ Reject Payment'}
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className={`border-2 rounded-lg p-4 ${
              verificationAction === 'approve' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <h3 className="font-semibold text-slate-700 mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Company:</span>
                  <span className="font-medium">{selectedPayment.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-bold text-green-600">${selectedPayment.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Current Balance:</span>
                  <span className="font-medium">${selectedPayment.currentBalance.toFixed(2)}</span>
                </div>
                {verificationAction === 'approve' && (
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-slate-600 font-semibold">New Balance:</span>
                    <span className="font-bold text-green-600">
                      ${(selectedPayment.currentBalance + selectedPayment.amount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Method:</span>
                  <span className="font-medium capitalize">{selectedPayment.paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Reference:</span>
                  <span className="font-medium">{selectedPayment.paymentReference}</span>
                </div>
              </div>
            </div>

            {/* Proof of Payment Document */}
            {selectedPayment.proofDocumentUrl && (
              <div className="border-2 border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-3">Proof of Payment</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Document uploaded</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedPayment.proofDocumentUrl, '_blank')}
                  >
                    📄 View Document
                  </Button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Admin Notes {verificationAction === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={verificationAction === 'approve' 
                  ? 'Optional notes about this approval...'
                  : 'Please provide a reason for rejection...'
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                rows="3"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVerifyModal(false);
                  setSelectedPayment(null);
                  setVerificationAction(null);
                  setAdminNotes('');
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmVerification}
                disabled={processing || (verificationAction === 'reject' && !adminNotes.trim())}
                className={verificationAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {processing ? 'Processing...' : verificationAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentVerificationPage;

