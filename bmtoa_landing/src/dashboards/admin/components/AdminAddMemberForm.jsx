import React, { useState } from 'react';
import Button from '../../shared/Button';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';

/**
 * AdminAddMemberForm - Admin form to manually register BMTOA members
 * 
 * Features:
 * - Create taxi operators or drivers
 * - Generate temporary password
 * - Create auth user and profile records
 * - Set appropriate verification status
 */

const AdminAddMemberForm = ({ onSuccess, onCancel }) => {
  const [memberType, setMemberType] = useState('operator'); // 'operator' or 'driver'
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    email: '',
    phone: '',
    password: '', // Optional - will generate if empty
    
    // Operator-specific
    company_name: '',
    business_registration: '',
    fleet_size: '1-5',
    membership_tier: 'standard',
    
    // Driver-specific
    full_name: '',
    national_id: '',
    license_number: '',
    license_plate: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const FLEET_SIZES = [
    { value: '1-5', label: '1-5 vehicles' },
    { value: '6-10', label: '6-10 vehicles' },
    { value: '11-20', label: '11-20 vehicles' },
    { value: '21-50', label: '21-50 vehicles' },
    { value: '50+', label: '50+ vehicles' },
  ];

  const MEMBERSHIP_TIERS = [
    { value: 'standard', label: 'Standard Member' },
    { value: 'premium', label: 'Premium Member' },
    { value: 'platinum', label: 'Platinum Member' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation (if provided)
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Operator-specific validations
    if (memberType === 'operator') {
      if (!formData.company_name?.trim()) newErrors.company_name = 'Company name is required';
      if (!formData.business_registration?.trim()) newErrors.business_registration = 'Business registration is required';
    }

    // Driver-specific validations
    if (memberType === 'driver') {
      if (!formData.full_name?.trim()) newErrors.full_name = 'Full name is required';
      if (!formData.national_id?.trim()) newErrors.national_id = 'National ID is required';
      if (!formData.license_number?.trim()) newErrors.license_number = 'License number is required';
      if (!formData.license_plate?.trim()) newErrors.license_plate = 'License plate is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        setErrors({ email: 'An account with this email already exists' });
        setSaving(false);
        return;
      }

      // Generate password if not provided
      const password = formData.password || `BMTOA${Math.random().toString(36).slice(-8)}!`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: password,
        options: {
          data: {
            name: formData.name,
            user_type: memberType === 'operator' ? 'taxi_operator' : 'driver',
            platform: 'bmtoa'
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create auth user - no user data returned');
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          user_type: memberType === 'operator' ? 'taxi_operator' : 'driver',
          platform: 'bmtoa',
          auth_method: 'password',
          verification_status: 'approved', // Admin-created users are pre-approved
          profile_completion_status: 'incomplete', // They still need to complete their profile
          profile_completion_percentage: 30,
          login_count: 0
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Create operator or driver profile
      if (memberType === 'operator') {
        const { error: operatorError } = await supabase
          .from('operator_profiles')
          .insert({
            user_id: authData.user.id,
            company_name: formData.company_name,
            business_registration: formData.business_registration,
            fleet_size: formData.fleet_size,
            membership_tier: formData.membership_tier,
            grace_period_active: false,
            bmtoa_verified: true, // Admin-created operators are pre-verified
          });

        if (operatorError) {
          console.error('Operator profile error:', operatorError);
          throw new Error(`Failed to create operator profile: ${operatorError.message}`);
        }
      } else {
        const { error: driverError } = await supabase
          .from('driver_profiles')
          .insert({
            user_id: authData.user.id,
            full_name: formData.full_name,
            national_id: formData.national_id,
            license_number: formData.license_number,
            license_plate: formData.license_plate,
          });

        if (driverError) {
          console.error('Driver profile error:', driverError);
          throw new Error(`Failed to create driver profile: ${driverError.message}`);
        }
      }

      // Show success message with credentials
      const memberTypeLabel = memberType === 'operator' ? 'Taxi Operator' : 'Driver';
      if (formData.password) {
        alert(`✅ ${memberTypeLabel} created successfully!\n\nEmail: ${formData.email}\nPassword: (as provided)\n\n⚠️ Make sure to share the credentials securely with the new member.`);
      } else {
        alert(`✅ ${memberTypeLabel} created successfully!\n\nEmail: ${formData.email}\nTemporary Password: ${password}\n\n⚠️ IMPORTANT: Save this password and share it securely with the new member. They should change it on first login.`);
      }

      setSaving(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating member:', error);
      alert(`Failed to create member: ${error.message}\n\nPlease try again or contact support.`);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Member Type Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Member Type *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="memberType"
              value="operator"
              checked={memberType === 'operator'}
              onChange={(e) => setMemberType(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm">🚕 Taxi Operator</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="memberType"
              value="driver"
              checked={memberType === 'driver'}
              onChange={(e) => setMemberType(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm">👤 Driver</span>
          </label>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-700">Basic Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name *
          </label>
          <Input
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder={memberType === 'operator' ? 'Company Representative Name' : 'Driver Name'}
            error={errors.name}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email *
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="email@example.com"
            error={errors.email}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Phone *
          </label>
          <Input
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+263 77 123 4567"
            error={errors.phone}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password (Optional)
          </label>
          <Input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Leave empty to auto-generate"
            error={errors.password}
          />
          <p className="text-xs text-slate-500 mt-1">
            If left empty, a temporary password will be generated and shown after creation
          </p>
        </div>
      </div>

      {/* Operator-Specific Fields */}
      {memberType === 'operator' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Company Information</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Name *
            </label>
            <Input
              name="company_name"
              value={formData.company_name}
              onChange={handleInputChange}
              placeholder="ABC Taxi Services"
              error={errors.company_name}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Business Registration Number *
            </label>
            <Input
              name="business_registration"
              value={formData.business_registration}
              onChange={handleInputChange}
              placeholder="BR-123456"
              error={errors.business_registration}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fleet Size
            </label>
            <select
              name="fleet_size"
              value={formData.fleet_size}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {FLEET_SIZES.map(size => (
                <option key={size.value} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Membership Tier
            </label>
            <select
              name="membership_tier"
              value={formData.membership_tier}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {MEMBERSHIP_TIERS.map(tier => (
                <option key={tier.value} value={tier.value}>{tier.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Driver-Specific Fields */}
      {memberType === 'driver' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Driver Information</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <Input
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="John Doe"
              error={errors.full_name}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              National ID *
            </label>
            <Input
              name="national_id"
              value={formData.national_id}
              onChange={handleInputChange}
              placeholder="63-123456A12"
              error={errors.national_id}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Driver's License Number *
            </label>
            <Input
              name="license_number"
              value={formData.license_number}
              onChange={handleInputChange}
              placeholder="DL-123456"
              error={errors.license_number}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vehicle License Plate *
            </label>
            <Input
              name="license_plate"
              value={formData.license_plate}
              onChange={handleInputChange}
              placeholder="ABC 1234"
              error={errors.license_plate}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          className="flex-1"
          disabled={saving}
        >
          {saving ? 'Creating...' : `Create ${memberType === 'operator' ? 'Operator' : 'Driver'}`}
        </Button>
      </div>
    </div>
  );
};

export default AdminAddMemberForm;

