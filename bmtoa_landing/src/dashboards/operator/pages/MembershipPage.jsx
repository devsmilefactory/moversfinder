import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';

/**
 * Operator Membership Page (BMTOA)
 *
 * Features:
 * - BMTOA membership details
 * - Membership renewal
 * - Benefits display
 * - Payment history
 *
 * Database Integration Ready:
 * - Fetch: SELECT * FROM memberships WHERE operator_id = current_operator
 * - Update: UPDATE memberships SET renewal_date = ?, status = ? WHERE id = ?
 */

const MembershipPage = () => {
  const user = useAuthStore((state) => state.user);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [proofOfPayment, setProofOfPayment] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Load membership data from database
  useEffect(() => {
    loadMembership();
  }, [user]);

  const loadMembership = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch membership with profile verification status
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select(`
          *,
          profiles!memberships_user_id_fkey (
            verification_status,
            profile_completion_status
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading membership:', membershipError);
        return;
      }

      if (membershipData) {
        // Calculate days until renewal
        const expiryDate = new Date(membershipData.expiry_date);
        const today = new Date();
        const daysUntilRenewal = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        setMembership({
          ...membershipData,
          daysUntilRenewal,
          verificationStatus: membershipData.profiles?.verification_status || 'pending',
          profileCompletionStatus: membershipData.profiles?.profile_completion_status || 'incomplete'
        });
      }
    } catch (error) {
      console.error('Error loading membership:', error);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: '✓', title: 'Priority Ride Allocation', description: 'Get priority access to high-value rides' },
    { icon: '✓', title: 'Lower Commission Rates', description: '15% commission vs standard 20%' },
    { icon: '✓', title: 'Marketing Support', description: 'Featured in BMTOA promotional materials' },
    { icon: '✓', title: 'Training Programs', description: 'Free access to driver training workshops' },
    { icon: '✓', title: 'Insurance Discounts', description: '10% discount on vehicle insurance' },
    { icon: '✓', title: '24/7 Support', description: 'Dedicated support line for members' }
  ];

  const paymentHistory = [
    { date: '2024-12-15', amount: 50.00, method: 'EcoCash', status: 'paid', period: 'Dec 2024 - Jan 2025' },
    { date: '2024-11-15', amount: 50.00, method: 'Bank Transfer', status: 'paid', period: 'Nov 2024 - Dec 2024' },
    { date: '2024-10-15', amount: 50.00, method: 'EcoCash', status: 'paid', period: 'Oct 2024 - Nov 2024' },
    { date: '2024-09-15', amount: 50.00, method: 'Cash', status: 'paid', period: 'Sep 2024 - Oct 2024' }
  ];

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image (JPG, PNG) or PDF file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setProofOfPayment(file);
  };

  const handleRenewal = async () => {
    // Check if membership is approved
    if (!membership || membership.verificationStatus !== 'approved') {
      alert('⚠️ Your membership must be approved before you can renew.\n\nPlease wait for admin approval or contact BMTOA support.');
      return;
    }

    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    if (!proofOfPayment) {
      alert('Please upload proof of payment');
      return;
    }

    try {
      setSubmitting(true);

      // Upload proof of payment to Supabase storage
      const fileExt = proofOfPayment.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `payment_proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('upload_photos')
        .upload(filePath, proofOfPayment);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('upload_photos')
        .getPublicUrl(filePath);

      // Calculate payment details
      const monthlyFee = membership?.monthly_fee || 25;
      const paymentForMonth = new Date();
      paymentForMonth.setMonth(paymentForMonth.getMonth() + 1);

      // Create subscription payment record with pending verification
      const { error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          user_id: user.id,
          membership_id: membership?.id,
          amount: monthlyFee,
          payment_method: paymentMethod,
          payment_for_month: paymentForMonth.toISOString().split('T')[0],
          payment_date: new Date().toISOString().split('T')[0],
          is_partial_payment: false,
          expected_amount: monthlyFee,
          remaining_balance: 0,
          status: 'pending',
          verification_status: 'pending',
          proof_of_payment_url: publicUrl,
          notes: 'Membership renewal payment - awaiting verification'
        });

      if (paymentError) throw paymentError;

      alert('✅ Payment submitted successfully!\n\nYour payment is pending verification by BMTOA admin. You will be notified once it has been verified.\n\nThank you!');

      setShowRenewalModal(false);
      setPaymentMethod('');
      setProofOfPayment(null);
      loadMembership(); // Reload membership data
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert(`Failed to submit payment: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600">Loading membership details...</p>
        </div>
      </div>
    );
  }

  // Check if renewal is allowed
  const isRenewalAllowed = membership && membership.verificationStatus === 'approved';
  const renewalDisabledReason = !membership
    ? 'No active membership'
    : membership.verificationStatus !== 'approved'
    ? 'Membership pending approval'
    : null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">BMTOA Membership</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your Bulawayo Metered Taxi Operators Association membership
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="primary"
            onClick={() => setShowRenewalModal(true)}
            disabled={!isRenewalAllowed}
          >
            Renew Membership
          </Button>
          {renewalDisabledReason && (
            <p className="text-xs text-slate-500 italic">{renewalDisabledReason}</p>
          )}
        </div>
      </div>

      {/* Approval Status Alert */}
      {membership && membership.verificationStatus !== 'approved' && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⏳</div>
            <div>
              <h3 className="font-bold text-slate-700 mb-1">Membership Pending Approval</h3>
              <p className="text-sm text-slate-600">
                Your membership is currently under review by BMTOA administrators.
                You will be able to renew your membership once it has been approved.
              </p>
              {membership.verificationStatus === 'rejected' && (
                <p className="text-sm text-red-600 mt-2">
                  <strong>Status:</strong> Rejected. Please contact BMTOA support for more information.
                </p>
              )}
              {membership.verificationStatus === 'under_review' && (
                <p className="text-sm text-blue-600 mt-2">
                  <strong>Status:</strong> Under Review. We'll notify you once the review is complete.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!membership ? (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Active Membership</h2>
          <p className="text-slate-600 mb-4">
            You don't have an active BMTOA membership yet. Contact BMTOA admin to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Membership Status Card */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-xl p-6 mb-6 border-2 border-yellow-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-700">BMTOA Member</h2>
                <p className="text-slate-600 mt-1">Member #{membership.bmtoa_member_number || 'N/A'}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                membership.status === 'active' ? 'bg-green-500 text-white' :
                membership.status === 'suspended' ? 'bg-yellow-500 text-white' :
                'bg-red-500 text-white'
              }`}>
                {(membership.status || 'ACTIVE').toUpperCase()}
              </span>
            </div>

            <div className="grid md:grid-cols-5 gap-4 mt-6">
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs text-slate-600">Member Since</p>
                <p className="text-lg font-bold text-slate-700">{membership.joined_date || 'N/A'}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs text-slate-600">Expiry Date</p>
                <p className="text-lg font-bold text-slate-700">{membership.expiry_date || 'N/A'}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs text-slate-600">Membership Tier</p>
                <p className="text-lg font-bold text-yellow-600">
                  {(membership.membership_tier || 'standard').charAt(0).toUpperCase() +
                   (membership.membership_tier || 'standard').slice(1)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs text-slate-600">Monthly Fee</p>
                <p className="text-lg font-bold text-green-600">${(membership.monthly_fee || 25).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs text-slate-600">Approval Status</p>
                <p className={`text-sm font-bold ${
                  membership.verificationStatus === 'approved' ? 'text-green-600' :
                  membership.verificationStatus === 'rejected' ? 'text-red-600' :
                  membership.verificationStatus === 'under_review' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {membership.verificationStatus === 'approved' ? '✓ Approved' :
                   membership.verificationStatus === 'rejected' ? '✗ Rejected' :
                   membership.verificationStatus === 'under_review' ? '⏳ Under Review' :
                   '⏳ Pending'}
                </p>
              </div>
            </div>

            {membership.daysUntilRenewal !== undefined && membership.daysUntilRenewal <= 90 && (
              <div className="mt-4 bg-yellow-200 border-l-4 border-yellow-600 p-3 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ Your membership expires in <strong>{membership.daysUntilRenewal} days</strong>. Renew now to avoid service interruption.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Membership Benefits */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Membership Benefits</h2>
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-green-600 font-bold text-xl">{benefit.icon}</span>
                <div>
                  <p className="font-medium text-slate-700">{benefit.title}</p>
                  <p className="text-sm text-slate-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Payment History</h2>
          <div className="space-y-3">
            {paymentHistory.map((payment, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-700">{payment.period}</p>
                    <p className="text-xs text-slate-500">{payment.date}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    {payment.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{payment.method}</span>
                  <span className="font-bold text-slate-700">${payment.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            View All Payments
          </Button>
        </div>
      </div>

      {/* Renewal Modal */}
      <Modal
        isOpen={showRenewalModal}
        onClose={() => {
          setShowRenewalModal(false);
          setPaymentMethod('');
          setProofOfPayment(null);
        }}
        title="Renew BMTOA Membership"
        size="lg"
      >
        <div className="space-y-6">
          {/* Renewal Summary */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-700 mb-2">Renewal Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Current Expiry:</span>
                <span className="font-medium">{membership?.expiry_date || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Membership Tier:</span>
                <span className="font-medium text-yellow-600">{membership?.membership_tier || 'Standard'}</span>
              </div>
              <div className="border-t border-yellow-300 pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-slate-700">Monthly Fee:</span>
                <span className="font-bold text-green-600">${(membership?.monthly_fee || 25).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Select Payment Method *
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              <div
                onClick={() => setPaymentMethod('ecocash')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'ecocash'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700">EcoCash</span>
                  {paymentMethod === 'ecocash' && <span className="text-yellow-500 text-xl">✓</span>}
                </div>
                <p className="text-xs text-slate-600">Mobile money payment</p>
              </div>

              <div
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700">Bank Transfer</span>
                  {paymentMethod === 'bank_transfer' && <span className="text-yellow-500 text-xl">✓</span>}
                </div>
                <p className="text-xs text-slate-600">Direct bank deposit</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {paymentMethod === 'ecocash' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-700 mb-3">📱 EcoCash Payment Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Merchant Name:</span>
                  <span className="font-medium">BMTOA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Merchant Code:</span>
                  <span className="font-medium">123456</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">EcoCash Number:</span>
                  <span className="font-medium">+263 77 123 4567</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-bold text-green-600">${(membership?.monthly_fee || 25).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-3">
                ℹ️ Send payment to the above number and upload the confirmation SMS screenshot below
              </p>
            </div>
          )}

          {paymentMethod === 'bank_transfer' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-700 mb-3">🏦 Bank Transfer Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Bank Name:</span>
                  <span className="font-medium">CBZ Bank</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Account Name:</span>
                  <span className="font-medium">BMTOA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Account Number:</span>
                  <span className="font-medium">01234567890</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Branch:</span>
                  <span className="font-medium">Bulawayo Main</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-bold text-green-600">${(membership?.monthly_fee || 25).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-3">
                ℹ️ Make the transfer and upload the bank receipt/confirmation below
              </p>
            </div>
          )}

          {/* Proof of Payment Upload */}
          {paymentMethod && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload Proof of Payment *
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleProofUpload}
                  className="hidden"
                  id="proof-upload"
                />
                <label htmlFor="proof-upload" className="cursor-pointer">
                  {proofOfPayment ? (
                    <div className="space-y-2">
                      <div className="text-green-600 text-4xl">✓</div>
                      <p className="text-sm font-medium text-slate-700">{proofOfPayment.name}</p>
                      <p className="text-xs text-slate-500">
                        {(proofOfPayment.size / 1024).toFixed(2)} KB
                      </p>
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.preventDefault();
                        setProofOfPayment(null);
                      }}>
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-slate-400 text-4xl">📎</div>
                      <p className="text-sm text-slate-600">
                        Click to upload payment receipt
                      </p>
                      <p className="text-xs text-slate-500">
                        Supported: JPG, PNG, PDF (Max 5MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-xs text-yellow-800">
              ⚠️ Your payment will be verified by BMTOA admin within 24-48 hours. You will receive a confirmation notification once verified.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowRenewalModal(false);
                setPaymentMethod('');
                setProofOfPayment(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRenewal}
              disabled={!paymentMethod || !proofOfPayment || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MembershipPage;
