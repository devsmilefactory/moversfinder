import React, { useState, useEffect, useRef } from 'react';
import Button from '../../shared/Button';
import DataTable from '../../shared/DataTable';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import Papa from 'papaparse';
import ManageTiersModal from '../components/ManageTiersModal';

/**
 * BMTOA Subscriptions Management Page
 * 
 * Features:
 * - View all member subscriptions
 * - Filter by status, tier
 * - Manage subscription renewals
 * - Handle payment issues
 */

const SubscriptionsPage = () => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showAddSubscriptionModal, setShowAddSubscriptionModal] = useState(false);
  const [showUploadCSVModal, setShowUploadCSVModal] = useState(false);
  const [showManageTiersModal, setShowManageTiersModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [verificationAction, setVerificationAction] = useState(''); // 'verify' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [subscriptionStep, setSubscriptionStep] = useState(1); // 1: Select Member, 2: Enter Details
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, expiring: 0, overdue: 0, revenue: 0 });
  const [members, setMembers] = useState([]);
  const csvFileInputRef = useRef(null);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    membership_id: '',
    user_id: '',
    amount: '',
    payment_method: 'ecocash',
    payment_for_month: new Date().toISOString().slice(0, 7) + '-01',
    payment_date: new Date().toISOString().slice(0, 10),
    transaction_reference: '',
    notes: '',
    is_partial_payment: false,
    expected_amount: ''
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Add subscription form state
  const [subscriptionForm, setSubscriptionForm] = useState({
    user_id: '',
    membership_tier: 'premium',
    bmtoa_member_number: '',
    joined_date: new Date().toISOString().slice(0, 10),
    expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    monthly_fee: '50.00',
    status: 'active'
  });

  // CSV upload state
  const [csvData, setCsvData] = useState([]);
  const [csvResults, setCsvResults] = useState({ success: 0, failed: 0, errors: [] });

  // Load subscriptions and members from Supabase
  useEffect(() => {
    loadSubscriptions();
    loadMembers();
    loadPendingPayments();
  }, []);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('user_type', 'taxi_operator')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadPendingPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select(`
          *,
          profiles!subscription_payments_user_id_fkey (
            id,
            name,
            email
          ),
          memberships!subscription_payments_membership_id_fkey (
            bmtoa_member_number,
            membership_tier
          )
        `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingPayments(data || []);
    } catch (error) {
      console.error('Error loading pending payments:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);

      // Fetch memberships with user profiles and payment data
      const { data: membershipsData, error } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          membership_tier,
          bmtoa_member_number,
          status,
          joined_date,
          expiry_date,
          monthly_fee,
          created_at,
          profiles!memberships_user_id_fkey (
            id,
            name,
            email,
            user_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch latest payment for each membership
      const { data: paymentsData } = await supabase
        .from('subscription_payments')
        .select('user_id, payment_date, payment_method, amount')
        .order('payment_date', { ascending: false });

      // Create a map of latest payments by user_id
      const latestPayments = {};
      (paymentsData || []).forEach(payment => {
        if (!latestPayments[payment.user_id]) {
          latestPayments[payment.user_id] = payment;
        }
      });

      const transformedSubscriptions = (membershipsData || []).map(membership => ({
        id: membership.id,
        membershipId: membership.id,
        userId: membership.user_id,
        memberName: membership.profiles?.name || 'Unknown',
        memberId: membership.bmtoa_member_number || 'N/A',
        tier: membership.membership_tier || 'basic',
        status: membership.status || 'active',
        startDate: membership.joined_date || membership.created_at?.split('T')[0] || 'N/A',
        renewalDate: membership.expiry_date || 'N/A',
        monthlyFee: parseFloat(membership.monthly_fee || 50),
        paymentMethod: latestPayments[membership.user_id]?.payment_method || 'N/A',
        lastPayment: latestPayments[membership.user_id]?.payment_date || 'N/A',
        lastPaymentAmount: latestPayments[membership.user_id]?.amount || 0,
        userType: membership.profiles?.user_type || 'N/A'
      }));

      setSubscriptions(transformedSubscriptions);

      // Calculate stats
      const activeCount = transformedSubscriptions.filter(s => s.status === 'active').length;
      const totalRevenue = transformedSubscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + s.monthlyFee, 0);

      setStats({
        active: activeCount,
        expiring: 0, // TODO: Calculate based on renewal_date
        overdue: 0, // TODO: Calculate based on payment status
        revenue: totalRevenue
      });
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };



  const handleViewDetails = (subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };

  const handleAddPayment = (subscription) => {
    setSelectedSubscription(subscription);
    setPaymentForm({
      membership_id: subscription.membershipId,
      user_id: subscription.userId,
      amount: subscription.monthlyFee.toString(),
      payment_method: 'ecocash',
      payment_for_month: new Date().toISOString().slice(0, 7) + '-01',
      payment_date: new Date().toISOString().slice(0, 10),
      transaction_reference: '',
      notes: '',
      is_partial_payment: false,
      expected_amount: subscription.monthlyFee.toString()
    });
    setShowAddPaymentModal(true);
  };

  const handleViewPaymentHistory = async (subscription) => {
    setSelectedSubscription(subscription);
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('user_id', subscription.userId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
      setShowPaymentHistoryModal(true);
    } catch (error) {
      console.error('Error loading payment history:', error);
      alert('Failed to load payment history');
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const paymentData = {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
        expected_amount: paymentForm.is_partial_payment ? parseFloat(paymentForm.expected_amount) : parseFloat(paymentForm.amount),
        remaining_balance: paymentForm.is_partial_payment ?
          parseFloat(paymentForm.expected_amount) - parseFloat(paymentForm.amount) : 0,
        recorded_by: user?.id,
        status: 'completed'
      };

      const { error } = await supabase
        .from('subscription_payments')
        .insert([paymentData]);

      if (error) throw error;

      alert('Payment recorded successfully!');
      setShowAddPaymentModal(false);
      loadSubscriptions();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(`Failed to record payment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedPayment) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('subscription_payments')
        .update({
          verification_status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      alert('✅ Payment verified successfully!');
      setShowVerificationModal(false);
      setSelectedPayment(null);
      loadPendingPayments();
      loadSubscriptions();
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert(`Failed to verify payment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('subscription_payments')
        .update({
          verification_status: 'rejected',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          status: 'failed'
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      alert('❌ Payment rejected. The member will be notified.');
      setShowVerificationModal(false);
      setSelectedPayment(null);
      setRejectionReason('');
      loadPendingPayments();
      loadSubscriptions();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert(`Failed to reject payment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubscription = () => {
    setSubscriptionStep(1);
    setSelectedMember(null);
    setMemberSearchQuery('');
    setSubscriptionForm({
      user_id: '',
      membership_tier: 'premium',
      bmtoa_member_number: '',
      joined_date: new Date().toISOString().slice(0, 10),
      expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
      monthly_fee: '50.00',
      status: 'active'
    });
    setShowAddSubscriptionModal(true);
  };

  const handleSubmitSubscription = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const subscriptionData = {
        ...subscriptionForm,
        monthly_fee: parseFloat(subscriptionForm.monthly_fee)
      };

      const { error } = await supabase
        .from('memberships')
        .insert([subscriptionData]);

      if (error) throw error;

      alert('Subscription created successfully!');
      setShowAddSubscriptionModal(false);
      loadSubscriptions();
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert(`Failed to create subscription: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadCSV = () => {
    setShowUploadCSVModal(true);
    setCsvData([]);
    setCsvResults({ success: 0, failed: 0, errors: [] });
  };

  const handleCSVFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const handleProcessCSV = async () => {
    if (csvData.length === 0) {
      alert('Please select a CSV file first');
      return;
    }

    setSubmitting(true);
    const results = { success: 0, failed: 0, errors: [] };

    for (const row of csvData) {
      try {
        // Find user by email
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.member_email)
          .single();

        if (userError || !userData) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: User not found with email ${row.member_email}`);
          continue;
        }

        // Insert membership
        const { error: insertError } = await supabase
          .from('memberships')
          .insert([{
            user_id: userData.id,
            membership_tier: row.membership_tier || 'premium',
            bmtoa_member_number: row.bmtoa_member_number,
            monthly_fee: parseFloat(row.monthly_fee || 50),
            joined_date: row.start_date || new Date().toISOString().slice(0, 10),
            expiry_date: row.expiry_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
            status: 'active'
          }]);

        if (insertError) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: ${insertError.message}`);
        } else {
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${results.success + results.failed}: ${error.message}`);
      }
    }

    setCsvResults(results);
    setSubmitting(false);
    loadSubscriptions();
  };

  const handleExportCSV = () => {
    const exportData = filteredSubscriptions.map(sub => ({
      subscription_id: sub.id,
      member_name: sub.memberName,
      member_id: sub.memberId,
      tier: sub.tier,
      status: sub.status,
      monthly_fee: sub.monthlyFee,
      start_date: sub.startDate,
      renewal_date: sub.renewalDate,
      payment_method: sub.paymentMethod,
      last_payment: sub.lastPayment,
      last_payment_amount: sub.lastPaymentAmount
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bmtoa_subscriptions_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesTier = filterTier === 'all' || sub.tier === filterTier;
    const matchesSearch = sub.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesTier && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      expiring_soon: 'bg-yellow-100 text-yellow-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700'
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
    { key: 'id', label: 'Subscription ID' },
    { key: 'memberName', label: 'Member' },
    { key: 'memberId', label: 'Member ID' },
    { 
      key: 'tier', 
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
          {value.replace('_', ' ').charAt(0).toUpperCase() + value.replace('_', ' ').slice(1)}
        </span>
      )
    },
    { 
      key: 'monthlyFee', 
      label: 'Monthly Fee',
      render: (value) => `$${value.toFixed(2)}`
    },
    { key: 'renewalDate', label: 'Renewal Date' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, subscription) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(subscription)}
          >
            👁️ View
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleAddPayment(subscription)}
          >
            💰 Add Payment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewPaymentHistory(subscription)}
          >
            📜 History
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
          <h1 className="text-2xl font-bold text-slate-700 mb-2">💳 Subscriptions & Payments</h1>
          <p className="text-slate-600">Manage BMTOA member subscriptions and record payments</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={handleAddSubscription}>
            ➕ Add Subscription
          </Button>
          <Button variant="outline" onClick={() => setShowManageTiersModal(true)}>
            🎯 Manage Tiers
          </Button>
          <Button variant="outline" onClick={handleUploadCSV}>
            📤 Upload CSV
          </Button>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⏳</div>
              <div>
                <h3 className="font-semibold text-slate-700">
                  {pendingPayments.length} Payment{pendingPayments.length !== 1 ? 's' : ''} Awaiting Verification
                </h3>
                <p className="text-sm text-slate-600">
                  Review and verify member payment submissions
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                // Scroll to pending payments section
                document.getElementById('pending-payments-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Review Payments
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Subscriptions</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.expiring}</p>
            </div>
            <div className="text-3xl">⏰</div>
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-yellow-600">${stats.revenue.toFixed(2)}</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            <input
              type="text"
              placeholder="🔍 Search by member name, ID, or subscription ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Tiers</option>
              <option value="Platinum">Platinum</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Bronze">Bronze</option>
            </select>
          </div>
          <Button onClick={handleExportCSV}>
            📊 Export Data
          </Button>
        </div>
      </div>

      {/* Pending Payments Section */}
      {pendingPayments.length > 0 && (
        <div id="pending-payments-section" className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">⏳ Pending Payment Verifications</h2>
          <div className="space-y-3">
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-700">
                        {payment.profiles?.name || 'Unknown Member'}
                      </h3>
                      <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-medium">
                        Pending Verification
                      </span>
                    </div>
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Email</p>
                        <p className="font-medium">{payment.profiles?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Amount</p>
                        <p className="font-medium text-green-600">${payment.amount?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Payment Method</p>
                        <p className="font-medium capitalize">{payment.payment_method?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Submitted</p>
                        <p className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {payment.proof_of_payment_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(payment.proof_of_payment_url, '_blank')}
                      >
                        📎 View Proof
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setVerificationAction('verify');
                        setShowVerificationModal(true);
                      }}
                    >
                      ✓ Verify
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setVerificationAction('reject');
                        setShowVerificationModal(true);
                      }}
                    >
                      ✗ Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading subscriptions...</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredSubscriptions}
            emptyMessage="No subscriptions found"
          />
        )}
      </div>

      {/* Subscription Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedSubscription(null);
        }}
        title={`💳 Subscription Details - ${selectedSubscription?.id}`}
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Member</p>
                <p className="font-semibold text-slate-700">{selectedSubscription.memberName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Member ID</p>
                <p className="font-semibold text-slate-700">{selectedSubscription.memberId}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Tier</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTierBadge(selectedSubscription.tier)}`}>
                  {selectedSubscription.tier}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedSubscription.status)}`}>
                  {selectedSubscription.status.replace('_', ' ').charAt(0).toUpperCase() + selectedSubscription.status.replace('_', ' ').slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-600">Start Date</p>
                <p className="font-semibold text-slate-700">{selectedSubscription.startDate}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Renewal Date</p>
                <p className="font-semibold text-slate-700">{selectedSubscription.renewalDate}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Monthly Fee</p>
                <p className="text-lg font-bold text-yellow-600">${selectedSubscription.monthlyFee.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Payment Method</p>
                <p className="font-semibold text-slate-700">{selectedSubscription.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Last Payment</p>
                <p className="font-semibold text-slate-700">{selectedSubscription.lastPayment}</p>
              </div>
            </div>
            <div className="border-t pt-4 flex gap-3">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleAddPayment(selectedSubscription);
                }}
              >
                💰 Add Payment
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleViewPaymentHistory(selectedSubscription);
                }}
              >
                📜 Payment History
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        title={`💰 Record Payment - ${selectedSubscription?.memberName}`}
        size="large"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="50.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Method *
              </label>
              <select
                required
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="ecocash">EcoCash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="usd_card">USD Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment For Month *
              </label>
              <input
                type="date"
                required
                value={paymentForm.payment_for_month}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_for_month: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Transaction Reference
              </label>
              <input
                type="text"
                value={paymentForm.transaction_reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="TXN123456"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.is_partial_payment}
                  onChange={(e) => setPaymentForm({
                    ...paymentForm,
                    is_partial_payment: e.target.checked,
                    expected_amount: e.target.checked ? selectedSubscription?.monthlyFee.toString() : paymentForm.amount
                  })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-slate-700">Partial Payment</span>
              </label>
            </div>
          </div>

          {paymentForm.is_partial_payment && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expected Full Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentForm.expected_amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, expected_amount: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="50.00"
              />
              <p className="text-sm text-slate-500 mt-1">
                Remaining balance: ${(parseFloat(paymentForm.expected_amount || 0) - parseFloat(paymentForm.amount || 0)).toFixed(2)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              rows="3"
              placeholder="Additional notes about this payment..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowAddPaymentModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? 'Recording...' : '💰 Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={showPaymentHistoryModal}
        onClose={() => setShowPaymentHistoryModal(false)}
        title={`📜 Payment History - ${selectedSubscription?.memberName}`}
        size="large"
      >
        <div className="space-y-4">
          {paymentHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No payment history found
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Payment Date</p>
                      <p className="font-semibold text-slate-700">{payment.payment_date}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Amount</p>
                      <p className="font-semibold text-green-600">${parseFloat(payment.amount).toFixed(2)}</p>
                      {payment.is_partial_payment && (
                        <p className="text-xs text-orange-600">
                          Partial (${parseFloat(payment.remaining_balance).toFixed(2)} remaining)
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500">Payment Method</p>
                      <p className="font-semibold text-slate-700 capitalize">{payment.payment_method.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">For Month</p>
                      <p className="font-semibold text-slate-700">{payment.payment_for_month}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Transaction Ref</p>
                      <p className="font-semibold text-slate-700">{payment.transaction_reference || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Status</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                  {payment.notes && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-500">Notes:</p>
                      <p className="text-sm text-slate-700">{payment.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Subscription Modal */}
      <Modal
        isOpen={showAddSubscriptionModal}
        onClose={() => {
          setShowAddSubscriptionModal(false);
          setSubscriptionStep(1);
          setSelectedMember(null);
          setMemberSearchQuery('');
        }}
        title={`➕ Add New Subscription ${subscriptionStep === 1 ? '- Step 1: Select Member' : '- Step 2: Subscription Details'}`}
        size="large"
      >
        {subscriptionStep === 1 ? (
          // Step 1: Search and Select Member
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                🔍 Search for Member
              </label>
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">
                Type to search from {members.length} taxi operators
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {members
                .filter(member =>
                  memberSearchQuery === '' ||
                  member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                  member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                )
                .slice(0, 50) // Show max 50 results
                .map(member => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setSelectedMember(member);
                      setSubscriptionForm({ ...subscriptionForm, user_id: member.id });
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedMember?.id === member.id
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-800">{member.name}</p>
                        <p className="text-sm text-slate-600">{member.email}</p>
                      </div>
                      {selectedMember?.id === member.id && (
                        <span className="text-yellow-500 text-xl">✓</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {memberSearchQuery && members.filter(member =>
              member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
              member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
            ).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No members found matching "{memberSearchQuery}"
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddSubscriptionModal(false);
                  setSubscriptionStep(1);
                  setSelectedMember(null);
                  setMemberSearchQuery('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => setSubscriptionStep(2)}
                disabled={!selectedMember}
              >
                Next: Enter Details →
              </Button>
            </div>
          </div>
        ) : (
          // Step 2: Enter Subscription Details
          <form onSubmit={handleSubmitSubscription} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600">Creating subscription for:</p>
              <p className="font-semibold text-slate-800">{selectedMember?.name}</p>
              <p className="text-sm text-slate-600">{selectedMember?.email}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Membership Tier *
              </label>
              <select
                required
                value={subscriptionForm.membership_tier}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, membership_tier: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="premium">Premium</option>
                <option value="basic">Basic</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                BMTOA Member Number *
              </label>
              <input
                type="text"
                required
                value={subscriptionForm.bmtoa_member_number}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, bmtoa_member_number: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="BMTOA-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={subscriptionForm.joined_date}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, joined_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={subscriptionForm.expiry_date}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, expiry_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Monthly Fee ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={subscriptionForm.monthly_fee}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, monthly_fee: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="50.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status *
              </label>
              <select
                required
                value={subscriptionForm.status}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, status: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubscriptionStep(1)}
              disabled={submitting}
            >
              ← Back
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddSubscriptionModal(false);
                setSubscriptionStep(1);
                setSelectedMember(null);
                setMemberSearchQuery('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Subscription'}
            </Button>
          </div>
        </form>
        )}
      </Modal>

      {/* Upload CSV Modal */}
      <Modal
        isOpen={showUploadCSVModal}
        onClose={() => setShowUploadCSVModal(false)}
        title="📤 Upload CSV - Bulk Import Subscriptions"
        size="large"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h4>
            <p className="text-sm text-blue-800 mb-2">Your CSV file should have the following columns:</p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><strong>member_email</strong> - Email of existing member (required)</li>
              <li><strong>membership_tier</strong> - premium, basic, platinum, gold, silver, or bronze</li>
              <li><strong>bmtoa_member_number</strong> - Unique member ID (required)</li>
              <li><strong>monthly_fee</strong> - Monthly subscription fee (default: 50.00)</li>
              <li><strong>start_date</strong> - Format: YYYY-MM-DD (default: today)</li>
              <li><strong>expiry_date</strong> - Format: YYYY-MM-DD (default: 1 year from start)</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select CSV File
            </label>
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVFileChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {csvData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✅ CSV file loaded successfully! Found {csvData.length} rows.
              </p>
            </div>
          )}

          {csvResults.success > 0 || csvResults.failed > 0 ? (
            <div className="space-y-2">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Import Results:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-sm text-green-600">Successful</p>
                    <p className="text-2xl font-bold text-green-700">{csvResults.success}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <p className="text-sm text-red-600">Failed</p>
                    <p className="text-2xl font-bold text-red-700">{csvResults.failed}</p>
                  </div>
                </div>
              </div>

              {csvResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {csvResults.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowUploadCSVModal(false);
                setCsvData([]);
                setCsvResults({ success: 0, failed: 0, errors: [] });
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              onClick={handleProcessCSV}
              disabled={submitting || csvData.length === 0}
            >
              {submitting ? 'Processing...' : 'Process CSV'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Tiers Modal */}
      <ManageTiersModal
        isOpen={showManageTiersModal}
        onClose={() => setShowManageTiersModal(false)}
        onTierUpdated={loadSubscriptions}
      />

      {/* Payment Verification Modal */}
      <Modal
        isOpen={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          setSelectedPayment(null);
          setVerificationAction('');
          setRejectionReason('');
        }}
        title={verificationAction === 'verify' ? '✓ Verify Payment' : '✗ Reject Payment'}
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            {/* Payment Details */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Member:</span>
                  <span className="font-medium">{selectedPayment.profiles?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Email:</span>
                  <span className="font-medium">{selectedPayment.profiles?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-medium text-green-600">${selectedPayment.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Method:</span>
                  <span className="font-medium capitalize">{selectedPayment.payment_method?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment For:</span>
                  <span className="font-medium">{selectedPayment.payment_for_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Submitted:</span>
                  <span className="font-medium">{new Date(selectedPayment.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Proof of Payment */}
            {selectedPayment.proof_of_payment_url && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Proof of Payment
                </label>
                <div className="border border-slate-300 rounded-lg p-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedPayment.proof_of_payment_url, '_blank')}
                  >
                    📎 View Uploaded Document
                  </Button>
                </div>
              </div>
            )}

            {/* Rejection Reason (only for reject action) */}
            {verificationAction === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this payment is being rejected..."
                  rows="4"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>
            )}

            {/* Confirmation Message */}
            <div className={`border-2 rounded-lg p-4 ${
              verificationAction === 'verify'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm ${
                verificationAction === 'verify' ? 'text-green-800' : 'text-red-800'
              }`}>
                {verificationAction === 'verify'
                  ? '✓ This will mark the payment as verified and activate the member\'s subscription.'
                  : '✗ This will reject the payment and notify the member. They will need to resubmit.'
                }
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVerificationModal(false);
                  setSelectedPayment(null);
                  setVerificationAction('');
                  setRejectionReason('');
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant={verificationAction === 'verify' ? 'primary' : 'danger'}
                onClick={verificationAction === 'verify' ? handleVerifyPayment : handleRejectPayment}
                disabled={submitting || (verificationAction === 'reject' && !rejectionReason.trim())}
              >
                {submitting
                  ? 'Processing...'
                  : verificationAction === 'verify'
                    ? '✓ Verify Payment'
                    : '✗ Reject Payment'
                }
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;

