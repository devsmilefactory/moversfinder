import React, { useState } from 'react';
import Button from '../../shared/Button';
import { supabase } from '../../../lib/supabase';

/**
 * Admin Add Corporate Account Form
 * Allows admins to manually create corporate accounts for TaxiCab platform
 */
const AdminAddCorporateForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    email: '',
    phone: '',
    password: '', // Optional - will generate if empty
    
    // Company Information
    company_name: '',
    company_size: '1-10',
    business_registration: '',
    company_address: '',
    billing_method: 'prepaid_credits',
    selected_services: ['pre-booked', 'on-demand']
  });

  const [submitting, setSubmitting] = useState(false);

  const COMPANY_SIZES = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' },
  ];

  const BILLING_METHODS = [
    { value: 'prepaid_credits', label: 'Prepaid Credits' },
    { value: 'cash', label: 'Cash Payment' },
  ];

  const SERVICE_TYPES = [
    { id: 'pre-booked', label: 'Pre-Booked Rides' },
    { id: 'staff-transport', label: 'Staff Transportation' },
    { id: 'recurring', label: 'Recurring Trips' },
    { id: 'on-demand', label: 'On-Demand Rides' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selected_services: prev.selected_services.includes(serviceId)
        ? prev.selected_services.filter(s => s !== serviceId)
        : [...prev.selected_services, serviceId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);

      // Validate required fields
      if (!formData.name || !formData.email || !formData.company_name || !formData.business_registration) {
        alert('Please fill in all required fields');
        return;
      }

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
          company_address: formData.company_address,
          billing_method: formData.billing_method,
          selected_services: formData.selected_services,
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
        company_address: '',
        billing_method: 'prepaid_credits',
        selected_services: ['pre-booked', 'on-demand']
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
              Billing Method
            </label>
            <select
              name="billing_method"
              value={formData.billing_method}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {BILLING_METHODS.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Address *
            </label>
            <textarea
              name="company_address"
              required
              value={formData.company_address}
              onChange={handleInputChange}
              placeholder="123 Main Street, Bulawayo"
              rows="2"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Service Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Selected Services
        </label>
        <div className="grid md:grid-cols-2 gap-3">
          {SERVICE_TYPES.map(service => (
            <div
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                formData.selected_services.includes(service.id)
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">{service.label}</span>
                {formData.selected_services.includes(service.id) && (
                  <span className="text-yellow-500">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
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

