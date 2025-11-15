import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import DataTable from '../../shared/DataTable';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import AdminAddCorporateForm from '../components/AdminAddCorporateForm';

/**
 * TaxiCab Corporate Accounts Management Page
 * 
 * Features:
 * - View corporate accounts awaiting approval
 * - Approve or reject corporate accounts
 * - View account details and documents
 * 
 * Fully integrated with Supabase
 */

const CorporateAccountsPage = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'active'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [creditAdjustment, setCreditAdjustment] = useState({ amount: '', type: 'top_up', description: '' });
  const [accounts, setAccounts] = useState([]);
  const [activeAccounts, setActiveAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    totalActive: 0,
    totalCredits: 0,
    lowBalanceAccounts: 0
  });

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'pending') {
      loadAccounts();
    } else {
      loadActiveAccounts();
    }
    loadStats();
  }, [activeTab]);

  const loadAccounts = async () => {
    try {
      setLoading(true);

      // Fetch corporate accounts with complete profiles awaiting approval
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          verification_status,
          profile_completion_status,
          corporate_profiles (
            company_name,
            company_size,
            business_registration,
            industry,
            primary_contact_name,
            primary_contact_phone,
            primary_contact_email,
            account_tier,
            total_employees
          )
        `)
        .eq('user_type', 'corporate')
        .eq('platform', 'taxicab')
        .eq('profile_completion_status', 'complete')
        .eq('verification_status', 'pending');

      if (error) throw error;

      // Transform data
      const transformedAccounts = (data || []).map(account => ({
        id: account.id,
        companyName: account.corporate_profiles?.company_name || 'N/A',
        contactPerson: account.corporate_profiles?.primary_contact_name || account.name,
        email: account.corporate_profiles?.primary_contact_email || account.email,
        phone: account.corporate_profiles?.primary_contact_phone || account.phone,
        registrationDate: account.created_at?.split('T')[0] || 'N/A',
        businessRegistration: account.corporate_profiles?.business_registration || 'N/A',
        industry: account.corporate_profiles?.industry || 'N/A',
        companySize: account.corporate_profiles?.company_size || 'N/A',
        accountTier: account.corporate_profiles?.account_tier || 'standard',
        totalEmployees: account.corporate_profiles?.total_employees || 0,
        verificationStatus: account.verification_status,
        profileCompletionStatus: account.profile_completion_status
      }));

      setAccounts(transformedAccounts);
    } catch (error) {
      console.error('Error loading corporate accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveAccounts = async () => {
    try {
      setLoading(true);

      // Fetch active corporate accounts with credit balance info
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          corporate_profiles (
            company_name,
            company_size,
            credit_balance,
            low_balance_threshold,
            auto_invoice,
            account_tier,
            total_employees
          )
        `)
        .eq('user_type', 'corporate')
        .eq('platform', 'taxicab')
        .eq('verification_status', 'verified');

      if (error) throw error;

      // Transform data
      const transformedAccounts = (data || []).map(account => ({
        id: account.id,
        companyName: account.corporate_profiles?.company_name || 'N/A',
        contactPerson: account.name,
        email: account.email,
        phone: account.phone,
        creditBalance: parseFloat(account.corporate_profiles?.credit_balance || 0),
        lowBalanceThreshold: parseFloat(account.corporate_profiles?.low_balance_threshold || 100),
        autoInvoice: account.corporate_profiles?.auto_invoice || false,
        accountTier: account.corporate_profiles?.account_tier || 'standard',
        totalEmployees: account.corporate_profiles?.total_employees || 0,
        registrationDate: account.created_at?.split('T')[0] || 'N/A',
        isLowBalance: parseFloat(account.corporate_profiles?.credit_balance || 0) < parseFloat(account.corporate_profiles?.low_balance_threshold || 100)
      }));

      setActiveAccounts(transformedAccounts);
    } catch (error) {
      console.error('Error loading active accounts:', error);
      setActiveAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (companyId) => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          created_by_user:profiles!credit_transactions_created_by_fkey(name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const transformedTransactions = (data || []).map(txn => ({
        id: txn.id,
        type: txn.transaction_type,
        amount: parseFloat(txn.amount),
        balanceBefore: parseFloat(txn.balance_before),
        balanceAfter: parseFloat(txn.balance_after),
        description: txn.description,
        createdBy: txn.created_by_user?.name || 'System',
        createdAt: new Date(txn.created_at).toLocaleString()
      }));

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const loadStats = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Count pending
      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'corporate')
        .eq('platform', 'taxicab')
        .eq('profile_completion_status', 'complete')
        .eq('verification_status', 'pending');

      // Count approved this month
      const { count: approvedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'corporate')
        .eq('platform', 'taxicab')
        .eq('verification_status', 'verified')
        .gte('verified_at', startOfMonth.toISOString());

      // Count rejected this month
      const { count: rejectedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'corporate')
        .eq('platform', 'taxicab')
        .eq('verification_status', 'rejected')
        .gte('updated_at', startOfMonth.toISOString());

      // Count total active accounts
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'corporate')
        .eq('platform', 'taxicab')
        .eq('verification_status', 'verified');

      // Get total credits and low balance count
      const { data: creditData } = await supabase
        .from('corporate_profiles')
        .select('credit_balance, low_balance_threshold')
        .eq('platform', 'taxicab');

      const totalCredits = (creditData || []).reduce((sum, acc) => sum + parseFloat(acc.credit_balance || 0), 0);
      const lowBalanceCount = (creditData || []).filter(acc =>
        parseFloat(acc.credit_balance || 0) < parseFloat(acc.low_balance_threshold || 100)
      ).length;

      setStats({
        pending: pendingCount || 0,
        approvedThisMonth: approvedCount || 0,
        rejectedThisMonth: rejectedCount || 0,
        totalActive: activeCount || 0,
        totalCredits: totalCredits,
        lowBalanceAccounts: lowBalanceCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewDetails = (account) => {
    setSelectedAccount(account);
    setShowDetailsModal(true);
  };

  const handleApproveClick = (account) => {
    setSelectedAccount(account);
    setShowApproveModal(true);
  };

  const handleRejectClick = (account) => {
    setSelectedAccount(account);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString()
        })
        .eq('id', selectedAccount.id);

      if (profileError) throw profileError;

      // Update corporate_profiles table for multi-profile system consistency
      const { error: corporateError } = await supabase
        .from('corporate_profiles')
        .update({
          approval_status: 'approved',
          profile_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('user_id', selectedAccount.id);

      if (corporateError) throw corporateError;

      alert('Corporate account approved successfully!');
      setShowApproveModal(false);
      loadAccounts();
      loadStats();
    } catch (error) {
      console.error('Error approving account:', error);
      alert(`Failed to approve account: ${error.message}`);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectReason
        })
        .eq('id', selectedAccount.id);

      if (profileError) throw profileError;

      // Update corporate_profiles table for multi-profile system consistency
      const { error: corporateError } = await supabase
        .from('corporate_profiles')
        .update({
          approval_status: 'rejected',
          profile_status: 'rejected',
          rejection_reason: rejectReason
        })
        .eq('user_id', selectedAccount.id);

      if (corporateError) throw corporateError;

      alert('Corporate account rejected');
      setShowRejectModal(false);
      loadAccounts();
      loadStats();
    } catch (error) {
      console.error('Error rejecting account:', error);
      alert(`Failed to reject account: ${error.message}`);
    }
  };

  const handleCreditAdjustment = async () => {
    if (!creditAdjustment.amount || parseFloat(creditAdjustment.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!creditAdjustment.description.trim()) {
      alert('Please provide a description for this adjustment');
      return;
    }

    try {
      setProcessing(true);

      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current balance
      const { data: companyData, error: companyError } = await supabase
        .from('corporate_profiles')
        .select('credit_balance')
        .eq('user_id', selectedAccount.id)
        .single();

      if (companyError) throw companyError;

      const currentBalance = parseFloat(companyData.credit_balance || 0);
      const adjustmentAmount = parseFloat(creditAdjustment.amount);
      const newBalance = creditAdjustment.type === 'deduction'
        ? currentBalance - adjustmentAmount
        : currentBalance + adjustmentAmount;

      if (newBalance < 0) {
        alert('Adjustment would result in negative balance. Please adjust the amount.');
        setProcessing(false);
        return;
      }

      // Update balance
      const { error: balanceError } = await supabase
        .from('corporate_profiles')
        .update({ credit_balance: newBalance })
        .eq('user_id', selectedAccount.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          company_id: selectedAccount.id,
          transaction_type: creditAdjustment.type === 'deduction' ? 'deduction' : 'adjustment',
          amount: adjustmentAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: creditAdjustment.description,
          created_by: user.id,
          platform: 'taxicab'
        });

      if (transactionError) throw transactionError;

      alert(`✅ Credit ${creditAdjustment.type === 'deduction' ? 'Deduction' : 'Adjustment'} Successful!\n\nCompany: ${selectedAccount.companyName}\nAmount: $${adjustmentAmount.toFixed(2)}\nNew Balance: $${newBalance.toFixed(2)}`);

      setShowCreditModal(false);
      setCreditAdjustment({ amount: '', type: 'top_up', description: '' });
      loadActiveAccounts();
      loadStats();
    } catch (error) {
      console.error('Error processing credit adjustment:', error);
      alert(`Failed to process adjustment: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleViewTransactions = async (account) => {
    setSelectedAccount(account);
    await loadTransactions(account.id);
    setShowTransactionsModal(true);
  };

  const handleManageCredits = (account) => {
    setSelectedAccount(account);
    setCreditAdjustment({ amount: '', type: 'top_up', description: '' });
    setShowCreditModal(true);
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredActiveAccounts = activeAccounts.filter(account => {
    const matchesSearch = account.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getTierBadge = (tier) => {
    const badges = {
      enterprise: 'bg-purple-100 text-purple-700',
      business: 'bg-blue-100 text-blue-700',
      standard: 'bg-gray-100 text-gray-700'
    };
    return badges[tier] || 'bg-gray-100 text-gray-700';
  };

  const pendingColumns = [
    { key: 'companyName', label: 'Company Name' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { 
      key: 'accountTier', 
      label: 'Account Tier',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierBadge(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    { key: 'registrationDate', label: 'Registration Date' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, account) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(account)}
          >
            👁️ View
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleApproveClick(account)}
          >
            ✓ Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleRejectClick(account)}
          >
            ✗ Reject
          </Button>
        </div>
      )
    }
  ];

  const activeColumns = [
    { key: 'companyName', label: 'Company Name' },
    { key: 'contactPerson', label: 'Contact Person' },
    {
      key: 'creditBalance',
      label: 'Credit Balance',
      render: (value, account) => (
        <div>
          <p className={`font-bold ${account.isLowBalance ? 'text-red-600' : 'text-green-600'}`}>
            ${value.toFixed(2)}
          </p>
          {account.isLowBalance && (
            <p className="text-xs text-red-500">⚠️ Low Balance</p>
          )}
        </div>
      )
    },
    {
      key: 'accountTier',
      label: 'Tier',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierBadge(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    { key: 'totalEmployees', label: 'Employees' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, account) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleManageCredits(account)}
          >
            💰 Manage Credits
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewTransactions(account)}
          >
            📊 Transactions
          </Button>
        </div>
      )
    }
  ];

  const columns = activeTab === 'pending' ? pendingColumns : activeColumns;
  const displayAccounts = activeTab === 'pending' ? filteredAccounts : filteredActiveAccounts;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-700 mb-2">🏢 Corporate Accounts Management</h1>
          <p className="text-slate-600">Manage TaxiCab corporate accounts, approvals, and credit balances</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddAccountModal(true)}>
          ➕ Add Corporate Account
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-2 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-slate-800 shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⏳ Pending Approvals
            <span className="ml-2 px-2 py-1 rounded-full text-xs bg-white/30">
              {stats.pending}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-green-500 to-green-400 text-white shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ✅ Active Accounts
            <span className="ml-2 px-2 py-1 rounded-full text-xs bg-white/30">
              {stats.totalActive}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {activeTab === 'pending' ? (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
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
      ) : (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalActive}</p>
              </div>
              <div className="text-3xl">🏢</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Credits</p>
                <p className="text-2xl font-bold text-blue-600">${stats.totalCredits.toFixed(2)}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Low Balance</p>
                <p className="text-2xl font-bold text-red-600">{stats.lowBalanceAccounts}</p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Balance</p>
                <p className="text-2xl font-bold text-slate-700">
                  ${stats.totalActive > 0 ? (stats.totalCredits / stats.totalActive).toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <input
          type="text"
          placeholder="🔍 Search by company name, contact person, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading corporate accounts...</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={displayAccounts}
            emptyMessage={activeTab === 'pending' ? 'No pending corporate accounts' : 'No active corporate accounts'}
          />
        )}
      </div>

      {/* Account Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAccount(null);
        }}
        title={`🏢 Corporate Account Details - ${selectedAccount?.companyName}`}
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Company Name</p>
                <p className="font-semibold text-slate-700">{selectedAccount.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Business Registration</p>
                <p className="font-semibold text-slate-700">{selectedAccount.businessRegistration}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Industry</p>
                <p className="font-semibold text-slate-700">{selectedAccount.industry}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Company Size</p>
                <p className="font-semibold text-slate-700">{selectedAccount.companySize}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Employees</p>
                <p className="font-semibold text-slate-700">{selectedAccount.totalEmployees}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Account Tier</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTierBadge(selectedAccount.accountTier)}`}>
                  {selectedAccount.accountTier.charAt(0).toUpperCase() + selectedAccount.accountTier.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-600">Contact Person</p>
                <p className="font-semibold text-slate-700">{selectedAccount.contactPerson}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-semibold text-slate-700">{selectedAccount.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Phone</p>
                <p className="font-semibold text-slate-700">{selectedAccount.phone}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Registration Date</p>
                <p className="font-semibold text-slate-700">{selectedAccount.registrationDate}</p>
              </div>
            </div>
            <div className="border-t pt-4 flex gap-3">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleApproveClick(selectedAccount);
                }}
              >
                ✓ Approve Account
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleRejectClick(selectedAccount);
                }}
              >
                ✗ Reject Account
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="✓ Approve Corporate Account"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            Are you sure you want to approve the corporate account for <strong>{selectedAccount?.companyName}</strong>?
          </p>
          <p className="text-sm text-slate-600">
            This will grant them access to the TaxiCab platform and allow them to start booking rides for their employees.
          </p>
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowApproveModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              className="flex-1"
            >
              Approve Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="✗ Reject Corporate Account"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            Rejecting the corporate account for <strong>{selectedAccount?.companyName}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason for Rejection *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              rows="4"
              placeholder="Please provide a reason for rejection..."
              required
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
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
              Reject Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Corporate Account Modal */}
      <Modal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        title="➕ Add New Corporate Account"
        size="large"
      >
        <AdminAddCorporateForm
          onSuccess={() => {
            setShowAddAccountModal(false);
            loadAccounts(); // Reload the accounts list
            loadStats(); // Reload stats
          }}
          onCancel={() => setShowAddAccountModal(false)}
        />
      </Modal>

      {/* Credit Adjustment Modal */}
      <Modal
        isOpen={showCreditModal}
        onClose={() => {
          setShowCreditModal(false);
          setSelectedAccount(null);
          setCreditAdjustment({ amount: '', type: 'top_up', description: '' });
        }}
        title="💰 Manage Account Credits"
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-2">Account Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-600">Company</p>
                  <p className="font-semibold text-slate-700">{selectedAccount.companyName}</p>
                </div>
                <div>
                  <p className="text-slate-600">Current Balance</p>
                  <p className="font-bold text-green-600">${selectedAccount.creditBalance.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adjustment Type
              </label>
              <select
                value={creditAdjustment.type}
                onChange={(e) => setCreditAdjustment({ ...creditAdjustment, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="top_up">Add Credits</option>
                <option value="deduction">Deduct Credits</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={creditAdjustment.amount}
                onChange={(e) => setCreditAdjustment({ ...creditAdjustment, amount: e.target.value })}
                placeholder="Enter amount..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={creditAdjustment.description}
                onChange={(e) => setCreditAdjustment({ ...creditAdjustment, description: e.target.value })}
                placeholder="Reason for this adjustment..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                rows="3"
              />
            </div>

            {creditAdjustment.amount && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-slate-600">New Balance Preview:</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(creditAdjustment.type === 'deduction'
                    ? selectedAccount.creditBalance - parseFloat(creditAdjustment.amount || 0)
                    : selectedAccount.creditBalance + parseFloat(creditAdjustment.amount || 0)
                  ).toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreditModal(false);
                  setSelectedAccount(null);
                  setCreditAdjustment({ amount: '', type: 'top_up', description: '' });
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreditAdjustment}
                disabled={processing || !creditAdjustment.amount || !creditAdjustment.description.trim()}
              >
                {processing ? 'Processing...' : 'Confirm Adjustment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transactions History Modal */}
      <Modal
        isOpen={showTransactionsModal}
        onClose={() => {
          setShowTransactionsModal(false);
          setSelectedAccount(null);
          setTransactions([]);
        }}
        title="📊 Credit Transaction History"
        size="large"
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Company</p>
                  <p className="font-semibold text-slate-700">{selectedAccount.companyName}</p>
                </div>
                <div>
                  <p className="text-slate-600">Current Balance</p>
                  <p className="font-bold text-green-600">${selectedAccount.creditBalance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Total Transactions</p>
                  <p className="font-semibold text-slate-700">{transactions.length}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No transactions found
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Balance After</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600">{txn.createdAt}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            txn.type === 'top_up' ? 'bg-green-100 text-green-700' :
                            txn.type === 'deduction' ? 'bg-red-100 text-red-700' :
                            txn.type === 'adjustment' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {txn.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${
                            txn.type === 'deduction' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {txn.type === 'deduction' ? '-' : '+'}${txn.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">${txn.balanceAfter.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{txn.description}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{txn.createdBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CorporateAccountsPage;

