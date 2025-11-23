import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import PWALeftDrawer from '../../../components/layouts/PWALeftDrawer';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

/**
 * Individual Profile Page - PWA version
 * Shows basic personal info (from auth) and individual profile data
 */
const IndividualProfilePage = () => {
  const { user } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

