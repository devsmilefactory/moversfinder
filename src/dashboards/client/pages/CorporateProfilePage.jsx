import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, CreditCard, Save } from 'lucide-react';
import CorporatePWALayout from '../../../components/layouts/CorporatePWALayout';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

/**
 * Corporate Profile Page - PWA Version
 * View and edit corporate profile information
 */
const CorporateProfilePage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    company_name: '',
    registration_number: '',
    email: '',
    phone: '',
    address: '',
    billing_method: [],
    account_tier: 'starter'
  });

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('corporate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!user?.id) return;

      const { error } = await supabase
        .from('corporate_profiles')
        .update({
          company_name: profile.company_name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getBillingMethodLabel = (method) => {
    const labels = {
      prepaid_credits: 'Prepaid Credits',
      cash_payment: 'Cash Payment',
      credit_account: 'Credit Account'
    };
    return labels[method] || method;
  };

  const getTierBadge = (tier) => {
    const badges = {
      starter: 'bg-blue-100 text-blue-700',
      professional: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-yellow-100 text-yellow-700'
    };
    return badges[tier] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <CorporatePWALayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Loading profile...</div>
        </div>
      </CorporatePWALayout>
    );
  }

  return (
    <CorporatePWALayout title="Profile">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile.company_name?.charAt(0) || 'C'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{profile.company_name || 'Company Name'}</h2>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTierBadge(profile.account_tier)}`}>
                {profile.account_tier?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="space-y-4">
          {/* Company Name */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Building2 className="w-4 h-4" />
              Company Name
            </label>
            <input
              type="text"
              value={profile.company_name || ''}
              onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter company name"
            />
          </div>

          {/* Registration Number */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Building2 className="w-4 h-4" />
              Registration Number
            </label>
            <input
              type="text"
              value={profile.registration_number || ''}
              onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-slate-50"
              placeholder="Registration number"
              disabled
            />
            <p className="text-xs text-slate-500 mt-1">Contact support to change registration number</p>
          </div>

          {/* Email */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="company@example.com"
            />
          </div>

          {/* Phone */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Phone className="w-4 h-4" />
              Phone
            </label>
            <input
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="+263 771 234 567"
            />
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MapPin className="w-4 h-4" />
              Address
            </label>
            <textarea
              value={profile.address || ''}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Company address"
              rows={3}
            />
          </div>

          {/* Billing Methods */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <CreditCard className="w-4 h-4" />
              Billing Methods
            </label>
            <div className="space-y-2">
              {Array.isArray(profile.billing_method) && profile.billing_method.length > 0 ? (
                profile.billing_method.map((method, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{getBillingMethodLabel(method)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No billing methods configured</p>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">Contact support to change billing methods</p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </CorporatePWALayout>
  );
};

export default CorporateProfilePage;

