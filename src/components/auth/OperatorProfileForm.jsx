import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';

const OperatorProfileForm = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const refreshProfiles = useProfileStore((s) => s.refreshProfiles);

  const [form, setForm] = useState({
    company_name: '',
    business_registration: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    // BMTOA membership fields
    bmtoa_member_number: '',
    membership_tier: '',
    bmtoa_member_since: '',
    bmtoa_certificate: '',
    // Banking
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    // Read-only from server (display only)
    bmtoa_verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadExisting = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('operator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) {
        setForm((prev) => ({ ...prev, ...data }));
      }
      setLoading(false);
    };
    loadExisting();
  }, [user]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.company_name?.trim()) errs.company_name = 'Company name is required';
    return errs;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const base = {
        company_name: form.company_name,
        business_registration: form.business_registration || null,
        company_address: form.company_address || null,
        company_phone: form.company_phone || null,
        company_email: form.company_email || null,
        // BMTOA membership mapping
        bmtoa_member_number: form.bmtoa_member_number || null,
        membership_tier: form.membership_tier || null,
        bmtoa_member_since: form.bmtoa_member_since || null,
        bmtoa_certificate: form.bmtoa_certificate || null,
        // Banking
        bank_name: form.bank_name || null,
        account_number: form.account_number || null,
        account_holder_name: form.account_holder_name || null,
        // Status fields
        profile_status: 'pending_approval',
        profile_completion_status: 'complete',
        approval_status: 'pending',
        account_status: 'active',
        completion_percentage: 100,
      };

      const { data: existing } = await supabase
        .from('operator_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('operator_profiles')
          .update(base)
          .eq('user_id', user.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('operator_profiles')
          .insert({ user_id: user.id, ...base });
        if (insertError) throw insertError;
      }

      await refreshProfiles(user.id);
      navigate('/operator/status', { replace: true });
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {errors.submit && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{errors.submit}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Company Name *</label>
        <input
          type="text"
          name="company_name"
          value={form.company_name}
          onChange={onChange}
          className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500"
          placeholder="e.g., Acme Transport Ltd"
          required
        />
        {errors.company_name && (
          <p className="text-xs text-red-600 mt-1">{errors.company_name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Business Registration</label>


          <input name="business_registration" value={form.business_registration} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Company Email</label>
          <input type="email" name="company_email" value={form.company_email} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Company Phone</label>
          <input name="company_phone" value={form.company_phone} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Company Address</label>
          <input name="company_address" value={form.company_address} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Bank Name</label>
          <input name="bank_name" value={form.bank_name} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Account Number</label>
          <input name="account_number" value={form.account_number} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Account Holder Name</label>
          <input name="account_holder_name" value={form.account_holder_name} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" />
        </div>
      </div>


      {/* BMTOA Membership */}
      <div className="pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">BMTOA Membership</h3>
          {typeof form.bmtoa_verified === 'boolean' && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${form.bmtoa_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {form.bmtoa_verified ? 'Verified' : 'Pending Verification'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Membership Number</label>
            <input name="bmtoa_member_number" value={form.bmtoa_member_number} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" placeholder="e.g., BMTOA-12345" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Membership Tier</label>
            <input name="membership_tier" value={form.membership_tier} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" placeholder="e.g., standard" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Member Since</label>
            <input type="date" name="bmtoa_member_since" value={form.bmtoa_member_since || ''} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700">BMTOA Certificate Link</label>
            <input name="bmtoa_certificate" value={form.bmtoa_certificate} onChange={onChange} className="mt-1 w-full rounded border-slate-300 focus:border-yellow-500 focus:ring-yellow-500" placeholder="https://..." />
            <p className="text-xs text-slate-500 mt-1">We will add secure document uploads soon. For now, you may provide a link.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-yellow-500 text-white font-semibold hover:bg-yellow-600 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save & Submit for Approval'}
        </button>
      </div>
    </form>
  );


};

export default OperatorProfileForm;

