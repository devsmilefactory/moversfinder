import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import PWALeftDrawer from '../../../components/layouts/PWALeftDrawer';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { useCorporateInvoiceApproval } from '../../../hooks/useCorporateInvoiceApproval';
import CorporateProfileForm from '../../../components/auth/CorporateProfileForm';

/**
 * Individual Profile Page - PWA version
 * Shows basic personal info (from auth) and individual profile data
 */
const IndividualProfilePage = () => {
  const { user } = useAuthStore();
  const { isApproved, corporateProfile, isLoading: isApprovalLoading } = useCorporateInvoiceApproval();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCorpForm, setShowCorpForm] = useState(false);
  const [profile, setProfile] = useState({
    service_preferences: {},
    saved_places: [],
    payment_methods: [],
    preferences: {},
    total_rides: 0,
    total_spent: 0
  });

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('individual_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setProfile(data);
    } catch (e) {
      console.error('Load individual profile error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!user?.id) return;
      const { error } = await supabase
        .from('individual_profiles')
        .update({
          preferences: profile.preferences,
          saved_places: profile.saved_places,
          payment_methods: profile.payment_methods,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      if (error) throw error;
      alert('Profile updated');
    } catch (e) {
      console.error('Save individual profile error:', e);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
      case 'pending_approval': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="p-4 pt-safe bg-white border-b border-slate-200 flex items-center justify-between">
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="font-bold text-slate-800">Profile</h1>
        <div className="w-8" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* User Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-800 font-bold flex items-center justify-center">
              {(user?.email || 'P')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-800">{user?.email || 'Passenger'}</div>
              <div className="text-xs text-slate-500">Individual Account</div>
            </div>
          </div>
        </div>

        {/* Corporate Invoice Status */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-slate-800">Corporate Invoice Account</div>
            {!isApprovalLoading && corporateProfile && (
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(corporateProfile.corporate_credit_status || corporateProfile.approval_status)}`}>
                {corporateProfile.corporate_credit_status || corporateProfile.approval_status || 'Created'}
              </span>
            )}
          </div>

          {isApprovalLoading ? (
            <div className="text-sm text-slate-500 animate-pulse">Checking status...</div>
          ) : !corporateProfile ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Apply for a corporate invoice account to book rides on credit and receive monthly invoices.
              </p>
              <button
                onClick={() => setShowCorpForm(true)}
                className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
              >
                Apply for Corporate Account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Company</p>
                  <p className="text-slate-700">{corporateProfile.company_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Reg Number</p>
                  <p className="text-slate-700">{corporateProfile.business_registration}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCorpForm(true)}
                className="w-full py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                Edit Corporate Profile
              </button>
            </div>
          )}
        </div>

        {/* Corporate Profile Form Modal */}
        {showCorpForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCorpForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Corporate Invoice Application</h2>
                <button onClick={() => setShowCorpForm(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CorporateProfileForm 
                onComplete={() => {
                  setShowCorpForm(false);
                  window.location.reload(); // Refresh to show updated status
                }}
                canDismiss={true}
              />
            </div>
          </div>
        )}

        {/* Saved Places */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="font-semibold text-slate-800 mb-2">Saved Places</div>
          {Array.isArray(profile.saved_places) && profile.saved_places.length > 0 ? (
            <ul className="space-y-2">
              {profile.saved_places.map((p, idx) => (
                <li key={idx} className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 truncate">
                  {p?.label || p?.address || 'Place'}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">No saved places yet</div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="font-semibold text-slate-800 mb-2">Payment Methods</div>
          {Array.isArray(profile.payment_methods) && profile.payment_methods.length > 0 ? (
            <ul className="space-y-2">
              {profile.payment_methods.map((pm, idx) => (
                <li key={idx} className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                  {pm?.brand ? `${pm.brand} •••• ${pm.last4}` : (pm?.label || 'Payment method')}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">No payment methods added</div>
          )}
        </div>

        {/* Preferences (read-only snippet for now) */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="font-semibold text-slate-800 mb-2">Preferences</div>
          <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-x-auto text-slate-700">
            {JSON.stringify(profile.preferences || {}, null, 2)}
          </pre>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-800 font-semibold py-3 rounded-xl shadow hover:shadow-md disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Drawer */}
      <PWALeftDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} profileType="individual" />
    </div>
  );
};

export default IndividualProfilePage;

