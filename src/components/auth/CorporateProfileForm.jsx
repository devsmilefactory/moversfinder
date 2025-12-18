/**
 * CorporateProfileForm - Required Profile Completion
 * TaxiCab Platform
 * 
 * Corporate users must complete profile for full access
 * Multi-step form with company info, billing, services
 */

import React, { useState } from 'react';
import Icon from '../ui/AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import useAuthStore from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

const CorporateProfileForm = ({ onComplete, canDismiss }) => {
  const user = useAuthStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    company_name: '',
    company_size: '',
    business_registration: '',
    company_address: '',
    billing_method: [], // Array of billing methods (stored as jsonb in database)
    selected_services: [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const COMPANY_SIZES = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' },
  ];

  const BILLING_METHODS = [
    {
      value: 'prepaid_credits',
      label: 'Prepaid Credits',
      description: 'Load credits in advance, use as needed',
      icon: 'CreditCard',
      requiresApproval: false
    },
    {
      value: 'cash',
      label: 'Cash Payment',
      description: 'Pay cash for each trip',
      icon: 'Banknote',
      requiresApproval: false
    },
    {
      value: 'credit_account',
      label: 'Credit Account',
      description: 'Book now, pay later (requires approval)',
      icon: 'FileText',
      requiresApproval: true
    },
  ];

  const SERVICE_TYPES = [
    { 
      id: 'pre-booked', 
      label: 'Pre-Booked Rides',
      description: 'Schedule rides in advance',
      icon: 'Calendar'
    },
    { 
      id: 'staff-transport', 
      label: 'Staff Transportation',
      description: 'Daily commute for employees',
      icon: 'Users'
    },
    { 
      id: 'recurring', 
      label: 'Recurring Trips',
      description: 'Regular scheduled trips',
      icon: 'Repeat'
    },
    { 
      id: 'on-demand', 
      label: 'On-Demand Rides',
      description: 'Instant ride requests',
      icon: 'Zap'
    },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selected_services: prev.selected_services.includes(serviceId)
        ? prev.selected_services.filter(s => s !== serviceId)
        : [...prev.selected_services, serviceId]
    }));
  };

  const toggleBillingMethod = (methodValue) => {
    setFormData(prev => ({
      ...prev,
      billing_method: prev.billing_method.includes(methodValue)
        ? prev.billing_method.filter(m => m !== methodValue)
        : [...prev.billing_method, methodValue]
    }));
    // Clear error when user makes a selection
    if (errors.billing_method) {
      setErrors(prev => ({ ...prev, billing_method: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.company_name?.trim()) newErrors.company_name = 'Company name is required';
      if (!formData.company_size) newErrors.company_size = 'Company size is required';
      if (!formData.business_registration?.trim()) {
        newErrors.business_registration = 'Business registration number is required';
      }
      if (!formData.company_address?.trim()) newErrors.company_address = 'Company address is required';
    }

    if (step === 2) {
      if (formData.billing_method.length === 0) {
        newErrors.billing_method = 'Select at least one billing method';
      }
      if (formData.selected_services.length === 0) {
        newErrors.selected_services = 'Select at least one service';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setSaving(true);
    setErrors({});

    try {
      // Determine approval status based on billing methods
      // Auto-approve if ONLY prepaid_credits and/or cash (no credit_account)
      const requiresApproval = formData.billing_method.includes('credit_account');

      // Corporate profile statuses
      const approvalStatus = requiresApproval ? 'pending' : 'approved';
      const profileStatus = requiresApproval ? 'pending_approval' : 'approved';
      const creditStatus = requiresApproval ? 'pending' : 'approved';

      // Main profile verification status (must match profiles table constraint)
      const verificationStatus = requiresApproval ? 'pending' : 'approved';

      // Check if corporate profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('corporate_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Ignore "not found" errors, but throw other errors
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('corporate_profiles')
          .update({
            company_name: formData.company_name,
            company_size: formData.company_size,
            business_registration: formData.business_registration,
            address: formData.company_address,
            billing_method: formData.billing_method, // Store as jsonb array
            selected_services: formData.selected_services,
            approval_status: approvalStatus,
            profile_status: profileStatus,
            corporate_credit_status: creditStatus,
            completion_percentage: 100,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('corporate_profiles')
          .insert({
            user_id: user.id,
            company_name: formData.company_name,
            company_size: formData.company_size,
            business_registration: formData.business_registration,
            address: formData.company_address,
            billing_method: formData.billing_method, // Store as jsonb array
            selected_services: formData.selected_services,
            approval_status: approvalStatus,
            profile_status: profileStatus,
            corporate_credit_status: creditStatus,
            completion_percentage: 100,
          });

        if (insertError) throw insertError;
      }

      setSaving(false);
      onComplete();
    } catch (err) {
      console.error('Error saving corporate profile:', err);
      setErrors({ general: err.message || 'Failed to save profile. Please try again.' });
      setSaving(false);
    }
  };

  const totalSteps = 2;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step 1: Company Information */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Company Information</h3>
            <p className="text-sm text-gray-600">Tell us about your company</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <Input
              name="company_name"
              value={formData.company_name}
              onChange={handleInputChange}
              placeholder="TechConnect Zimbabwe"
              error={errors.company_name}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Size *
            </label>
            <select
              name="company_size"
              value={formData.company_size}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.company_size ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select company size</option>
              {COMPANY_SIZES.map(size => (
                <option key={size.value} value={size.value}>{size.label}</option>
              ))}
            </select>
            {errors.company_size && (
              <p className="mt-1 text-sm text-red-600">{errors.company_size}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Registration Number *
            </label>
            <Input
              name="business_registration"
              value={formData.business_registration}
              onChange={handleInputChange}
              placeholder="BR-2024-001"
              error={errors.business_registration}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Address *
            </label>
            <textarea
              name="company_address"
              value={formData.company_address}
              onChange={handleInputChange}
              placeholder="123 Enterprise Road, Bulawayo"
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.company_address ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.company_address && (
              <p className="mt-1 text-sm text-red-600">{errors.company_address}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Billing & Services */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Billing & Services</h3>
            <p className="text-sm text-gray-600">Choose your billing method and required services</p>
          </div>

          {/* Billing Methods (Multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Methods * (Select all that apply)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Choose one or more payment methods. Credit Account requires admin approval.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {BILLING_METHODS.map((method) => {
                const isSelected = formData.billing_method.includes(method.value);
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => toggleBillingMethod(method.value)}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <Icon name="Check" className="w-3 h-3 text-white" />
                        )}
                      </div>

                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${
                        isSelected ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Icon name={method.icon} className={`w-5 h-5 ${
                          isSelected ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{method.label}</h5>
                        <p className="text-xs text-gray-600 mt-1">{method.description}</p>
                        {method.requiresApproval && (
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                            <Icon name="AlertCircle" className="w-3 h-3" />
                            <span>Requires admin approval</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.billing_method && (
              <p className="mt-1 text-sm text-red-600">{errors.billing_method}</p>
            )}
          </div>

          {/* Required Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Required Services * (Select all that apply)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SERVICE_TYPES.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    formData.selected_services.includes(service.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      formData.selected_services.includes(service.id)
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}>
                      <Icon name={service.icon} className={`w-5 h-5 ${
                        formData.selected_services.includes(service.id)
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{service.label}</h5>
                      <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                    </div>
                    {formData.selected_services.includes(service.id) && (
                      <Icon name="Check" className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {errors.selected_services && (
              <p className="mt-1 text-sm text-red-600">{errors.selected_services}</p>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {currentStep > 1 && (
          <Button
            onClick={handleBack}
            variant="outline"
            className="flex-1"
          >
            <Icon name="ChevronLeft" className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}

        {currentStep < totalSteps ? (
          <Button
            onClick={handleNext}
            className="flex-1"
          >
            Next
            <Icon name="ChevronRight" className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Complete Profile'}
          </Button>
        )}
      </div>

      {/* Info */}
      {!canDismiss && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            All fields marked with * are required
          </p>
        </div>
      )}
    </div>
  );
};

export default CorporateProfileForm;

