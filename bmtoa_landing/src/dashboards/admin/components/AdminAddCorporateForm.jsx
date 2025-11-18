import React, { useState } from 'react';
import Button from '../../shared/Button';
import { supabase } from '../../../lib/supabase';

/**
 * Admin Add Corporate Account Form
 * Allows admins to manually create corporate accounts for TaxiCab platform
 */
const AdminAddCorporateForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    // Basic Information (profiles table)
    name: '',
    email: '',
    phone: '',
    password: '', // Optional - will generate if empty
    
    // Company Information (corporate_profiles table)
    company_name: '',
    company_size: '1-10',
    business_registration: '',
    industry: '',
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_email: '',
    account_tier: 'standard',
    total_employees: 0,
    credit_balance: 0,
    credit_booking_approved: false
  });

  const [submitting, setSubmitting] = useState(false);

  const COMPANY_SIZES = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' },
  ];

  const ACCOUNT_TIERS = [
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  const INDUSTRIES = [
    'Technology',
    'Finance',
    'Healthcare',
    'Manufacturing',
    'Retail',
    'Education',
    'Hospitality',
    'Transportation',
    'Real Estate',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);

      // Validate required fields
      if (!formData.name || !formData.email || !formData.company_name || !formData.business_registration || !formData.industry) {
        alert('Please fill in all required fields (Name, Email, Company Name, Business Registration, Industry)');
        return;
      }

      // Set primary contact fields from basic info if not provided
      const primaryContactName = formData.primary_contact_name || formData.name;
      const primaryContactPhone = formData.primary_contact_phone || formData.phone;
      const primaryContactEmail = formData.primary_contact_email || formData.email;

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        alert('A user with this email already exists');
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
            user_type: 'corporate',
            platform: 'taxicab'
          }
        }
      });

      if (authError) throw authError;

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          user_type: 'corporate',
          platform: 'taxicab',
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

      // Create corporate profile
      const { error: corporateError } = await supabase
        .from('corporate_profiles')
        .insert({
          user_id: authData.user.id,
          company_name: formData.company_name,
          company_size: formData.company_size,
          business_registration: formData.business_registration,
          industry: formData.industry,
          primary_contact_name: primaryContactName,
          primary_contact_phone: primaryContactPhone,
          primary_contact_email: primaryContactEmail,
          account_tier: formData.account_tier,
          total_employees: parseInt(formData.total_employees) || 0,
          credit_balance: parseFloat(formData.credit_balance) || 0,
          monthly_spend: 0,
          verification_status: 'verified', // Admin-created accounts are pre-verified
          credit_booking_approved: formData.credit_booking_approved,
          platform: 'taxicab'
        });

      if (corporateError) {
        console.error('Corporate profile error:', corporateError);
        throw new Error(`Failed to create corporate profile: ${corporateError.message}`);
      }

      // Show success message with credentials
      alert(`✅ Corporate Account created successfully!

Email: ${formData.email}
Temporary Password: ${password}

⚠️ IMPORTANT: Save this password and share it securely with the corporate account holder. They should change it on first login.`);

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        company_name: '',
        company_size: '1-10',
        business_registration: '',
        industry: '',
        primary_contact_name: '',
        primary_contact_phone: '',
        primary_contact_email: '',
        account_tier: 'standard',
        total_employees: 0,
        credit_balance: 0,
        credit_booking_approved: false
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating corporate account:', error);
      alert(`Failed to create corporate account: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Person Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              placeholder="corporate@company.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone *
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+263 77 123 4567"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password (Optional)
            </label>
            <input
              type="text"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Leave empty to auto-generate"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <p className="text-xs text-slate-500 mt-1">
              If left empty, a temporary password will be generated and shown after creation
            </p>
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Company Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              name="company_name"
              required
              value={formData.company_name}
              onChange={handleInputChange}
              placeholder="ABC Corporation"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Size
            </label>
            <select
              name="company_size"
              value={formData.company_size}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {COMPANY_SIZES.map(size => (
                <option key={size.value} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Business Registration Number *
            </label>
            <input
              type="text"
              name="business_registration"
              required
              value={formData.business_registration}
              onChange={handleInputChange}
              placeholder="BR-123456"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Industry *
            </label>
            <select
              name="industry"
              required
              value={formData.industry}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Select Industry</option>
              {INDUSTRIES.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Account Tier
            </label>
            <select
              name="account_tier"
              value={formData.account_tier}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {ACCOUNT_TIERS.map(tier => (
                <option key={tier.value} value={tier.value}>{tier.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Total Employees
            </label>
            <input
              type="number"
              name="total_employees"
              min="0"
              value={formData.total_employees}
              onChange={handleInputChange}
              placeholder="0"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Initial Credit Balance
            </label>
            <input
              type="number"
              name="credit_balance"
              min="0"
              step="0.01"
              value={formData.credit_balance}
              onChange={handleInputChange}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <p className="text-xs text-slate-500 mt-1">
              Starting credit balance for the account
            </p>
          </div>
        </div>
      </div>

      {/* Primary Contact (Optional - defaults to basic info) */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Primary Contact (Optional)</h3>
        <p className="text-sm text-slate-500 mb-4">
          If different from the account holder above, specify the primary contact person
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              name="primary_contact_name"
              value={formData.primary_contact_name}
              onChange={handleInputChange}
              placeholder="Leave empty to use account holder name"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              name="primary_contact_phone"
              value={formData.primary_contact_phone}
              onChange={handleInputChange}
              placeholder="Leave empty to use account holder phone"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              name="primary_contact_email"
              value={formData.primary_contact_email}
              onChange={handleInputChange}
              placeholder="Leave empty to use account holder email"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Credit Booking Approval */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="credit_booking_approved"
            checked={formData.credit_booking_approved}
            onChange={(e) => setFormData({ ...formData, credit_booking_approved: e.target.checked })}
            className="w-5 h-5 text-yellow-600 border-slate-300 rounded focus:ring-yellow-400"
          />
          <div>
            <span className="font-medium text-slate-700">Approve Credit Booking</span>
            <p className="text-sm text-slate-500">Allow this account to book rides on credit</p>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
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
          {submitting ? 'Creating...' : 'Create Corporate Account'}
        </Button>
      </div>
    </form>
  );
};

export default AdminAddCorporateForm;

