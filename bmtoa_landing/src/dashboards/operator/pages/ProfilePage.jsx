import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../shared/Button';
import FormInput from '../../shared/FormInput';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import PhotoUpload from '../../driver/components/PhotoUpload';

/**
 * Operator Profile Page (BMTOA)
 * 
 * Allows operators to view and edit their profile information
 * Includes company details, fleet information, and verification status
 */
const OperatorProfilePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [formData, setFormData] = useState({
    // Company Information
    company_name: '',
    business_registration: '',
    company_address: '',
    company_phone: '',
    
    // Fleet Information
    fleet_size: '',
    operating_areas: [],
    
    // Banking Information
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    
    // BMTOA Membership
    membership_tier: 'standard',
    bmtoa_member_number: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadOperatorProfile();
    }
  }, [user?.id]);

  const loadOperatorProfile = async () => {
    try {
      setLoading(true);
      const { data: profile, error } = await supabase
        .from('operator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profile) {
        setOperatorProfile(profile);
        setFormData({
          company_name: profile.company_name || '',
          business_registration: profile.business_registration || '',
          company_address: profile.company_address || '',
          company_phone: profile.company_phone || user?.phone || '',
          fleet_size: profile.fleet_size || '',
          operating_areas: profile.operating_areas || [],
          bank_name: profile.bank_name || '',
          account_number: profile.account_number || '',
          account_holder_name: profile.account_holder_name || '',
          membership_tier: profile.membership_tier || 'standard',
          bmtoa_member_number: profile.bmtoa_member_number || '',
        });
      }
    } catch (error) {
      console.error('Error loading operator profile:', error);
      alert('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOperatingAreasChange = (e) => {
    const value = e.target.value;
    const areas = value.split(',').map(area => area.trim()).filter(area => area);
    setFormData({ ...formData, operating_areas: areas });
  };

  const handleSave = async () => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        company_name: formData.company_name,
        business_registration: formData.business_registration,
        company_address: formData.company_address,
        company_phone: formData.company_phone,
        fleet_size: formData.fleet_size,
        operating_areas: formData.operating_areas,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_holder_name: formData.account_holder_name,
        membership_tier: formData.membership_tier,
        updated_at: new Date().toISOString(),
      };

      if (operatorProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('operator_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('operator_profiles')
          .insert(profileData);

        if (error) throw error;
      }

      // Reload profile
      await loadOperatorProfile();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Sticky Header with Edit Button */}
      <div className="sticky top-0 z-50 bg-slate-50 -mx-6 -mt-6 px-6 py-4 mb-6 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Operator Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your company and fleet information</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Verification Status Banner */}
      {user?.verification_status && (
        <div className={`rounded-xl p-6 mb-6 border-2 ${
          user.verification_status === 'verified' || user.verification_status === 'approved'
            ? 'bg-green-50 border-green-300'
            : user.verification_status === 'rejected'
            ? 'bg-red-50 border-red-300'
            : 'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-start gap-4">
            <div className="text-3xl">
              {user.verification_status === 'verified' || user.verification_status === 'approved' ? '✅' : 
               user.verification_status === 'rejected' ? '❌' : '⏳'}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">
                {user.verification_status === 'verified' || user.verification_status === 'approved'
                  ? 'Profile Verified'
                  : user.verification_status === 'rejected'
                  ? 'Verification Rejected'
                  : 'Verification Pending'}
              </h3>
              <p className="text-sm text-slate-600">
                {user.verification_status === 'verified' || user.verification_status === 'approved'
                  ? 'Your operator profile has been verified by BMTOA admin. You have full access to all features.'
                  : user.verification_status === 'rejected'
                  ? 'Your profile verification was rejected. Please review the feedback and update your information.'
                  : 'Your profile is currently under review by BMTOA admin. Some features may be restricted until verification is complete.'}
              </p>
              {user.rejection_reason && user.verification_status === 'rejected' && (
                <div className="mt-3 p-3 bg-red-100 rounded-lg">
                  <p className="text-sm font-semibold text-red-800">Rejection Reason:</p>
                  <p className="text-sm text-red-700 mt-1">{user.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Completion Status */}
      {user?.profile_completion_status !== 'complete' && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Profile Incomplete</h3>
              <p className="text-sm text-slate-600 mb-3">
                Your profile is {user?.profile_completion_percentage || 0}% complete. 
                Complete all required fields to unlock full access to fleet management features.
              </p>
              <div className="w-full bg-yellow-200 rounded-full h-3">
                <div 
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${user?.profile_completion_percentage || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Form */}
      <div className="space-y-6">
        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Company Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="Company Name"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
            <FormInput
              label="Business Registration Number"
              name="business_registration"
              value={formData.business_registration}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <FormInput
              label="Company Phone"
              name="company_phone"
              value={formData.company_phone}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
            <FormInput
              label="Fleet Size"
              name="fleet_size"
              type="number"
              value={formData.fleet_size}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>
          <div className="mt-4">
            <FormInput
              label="Company Address"
              name="company_address"
              value={formData.company_address}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
          </div>
        </div>

        {/* Operating Areas */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Operating Areas</h2>
          <FormInput
            label="Operating Areas (comma-separated)"
            name="operating_areas"
            value={formData.operating_areas.join(', ')}
            onChange={handleOperatingAreasChange}
            disabled={!isEditing}
            placeholder="e.g., Bulawayo CBD, Suburbs, Harare"
          />
          {formData.operating_areas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.operating_areas.map((area, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Banking Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Banking Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="Bank Name"
              name="bank_name"
              value={formData.bank_name}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <FormInput
              label="Account Holder Name"
              name="account_holder_name"
              value={formData.account_holder_name}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <FormInput
              label="Account Number"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* BMTOA Membership */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">BMTOA Membership</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Membership Tier
              </label>
              <select
                name="membership_tier"
                value={formData.membership_tier}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <FormInput
              label="BMTOA Member Number"
              name="bmtoa_member_number"
              value={formData.bmtoa_member_number}
              onChange={handleChange}
              disabled={true}
              placeholder="Assigned by BMTOA"
            />
          </div>
          {operatorProfile?.bmtoa_verified && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">BMTOA Verified Member</p>
                  <p className="text-xs text-green-700">
                    Member since {operatorProfile.bmtoa_member_since ? new Date(operatorProfile.bmtoa_member_since).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperatorProfilePage;

