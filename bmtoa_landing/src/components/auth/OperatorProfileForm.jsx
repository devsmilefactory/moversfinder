/**
 * OperatorProfileForm - Required Profile Completion with Grace Period
 * BMTOA Platform
 * 
 * Taxi Operator users must complete profile for full access
 * Multi-step form with company info, fleet details, documents, banking
 * Grace period: 7 days limited access, then read-only until complete
 */

import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import useAuthStore from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

const OperatorProfileForm = ({ onComplete, canDismiss }) => {
  const user = useAuthStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // BMTOA Membership Status (NEW)
    is_bmtoa_member: null, // null = not selected, true = yes, false = no
    selected_company_id: '',
    manual_company_name: '',

    // Company Information
    company_name: user?.company_name || '',
    business_registration: '',
    company_address: '',
    company_phone: user?.phone || '',

    // Fleet Information
    fleet_size: '',
    operating_areas: [],

    // BMTOA Membership
    membership_tier: 'standard',
    bmtoa_member_since: new Date().toISOString().split('T')[0],

    // Documents
    business_license: null,
    tax_clearance: null,
    bmtoa_certificate: null,

    // Banking Information
    bank_name: '',
    account_number: '',
    account_holder_name: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [bmtoaCompanies, setBmtoaCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const FLEET_SIZES = [
    { value: '1-5', label: '1-5 vehicles' },
    { value: '6-10', label: '6-10 vehicles' },
    { value: '11-20', label: '11-20 vehicles' },
    { value: '21-50', label: '21-50 vehicles' },
    { value: '50+', label: '50+ vehicles' },
  ];

  const OPERATING_AREAS = [
    'Bulawayo CBD',
    'Suburbs North',
    'Suburbs South',
    'Suburbs East',
    'Suburbs West',
    'Industrial Areas',
    'Airport',
    'Intercity',
  ];

  const MEMBERSHIP_TIERS = [
    { value: 'standard', label: 'Standard Member', description: 'Basic BMTOA membership' },
    { value: 'premium', label: 'Premium Member', description: 'Enhanced features and priority support' },
    { value: 'platinum', label: 'Platinum Member', description: 'Full access to all BMTOA services' },
  ];

  const BANKS = [
    'CBZ Bank',
    'Stanbic Bank',
    'Standard Chartered',
    'FBC Bank',
    'NMB Bank',
    'Steward Bank',
    'ZB Bank',
    'Other',
  ];

  // Fetch existing BMTOA companies
  useEffect(() => {
    const fetchBMTOACompanies = async () => {
      setLoadingCompanies(true);
      try {
        const { data, error } = await supabase
          .from('operator_profiles')
          .select('user_id, company_name, bmtoa_verified')
          .eq('bmtoa_verified', true)
          .order('company_name');

        if (error) throw error;
        setBmtoaCompanies(data || []);
      } catch (error) {
        console.error('Error fetching BMTOA companies:', error);
        setBmtoaCompanies([]);
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchBMTOACompanies();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [fieldName]: file }));
      if (errors[fieldName]) {
        setErrors(prev => ({ ...prev, [fieldName]: '' }));
      }
    }
  };

  const toggleOperatingArea = (area) => {
    setFormData(prev => ({
      ...prev,
      operating_areas: prev.operating_areas.includes(area)
        ? prev.operating_areas.filter(a => a !== area)
        : [...prev.operating_areas, area]
    }));
    if (errors.operating_areas) {
      setErrors(prev => ({ ...prev, operating_areas: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      // BMTOA Membership Selection
      if (formData.is_bmtoa_member === null) {
        newErrors.is_bmtoa_member = 'Please select whether you are a BMTOA member';
      }

      // If existing BMTOA member
      if (formData.is_bmtoa_member === true) {
        if (!formData.selected_company_id && !formData.manual_company_name?.trim()) {
          newErrors.selected_company_id = 'Please select your company or enter it manually';
        }
      }

      // If not a BMTOA member, validate company information
      if (formData.is_bmtoa_member === false) {
        if (!formData.company_name?.trim()) newErrors.company_name = 'Company name is required';
        if (!formData.business_registration?.trim()) {
          newErrors.business_registration = 'Business registration is required';
        }
        if (!formData.company_address?.trim()) newErrors.company_address = 'Company address is required';
        if (!formData.company_phone?.trim()) newErrors.company_phone = 'Company phone is required';
      }
    }

    if (step === 2) {
      // Fleet Information
      if (!formData.fleet_size) newErrors.fleet_size = 'Fleet size is required';
      if (formData.operating_areas.length === 0) {
        newErrors.operating_areas = 'Select at least one operating area';
      }
      if (!formData.membership_tier) newErrors.membership_tier = 'Membership tier is required';
    }

    if (step === 3) {
      // Documents
      if (!formData.business_license) newErrors.business_license = 'Business license is required';
      if (!formData.tax_clearance) newErrors.tax_clearance = 'Tax clearance is required';
      if (!formData.bmtoa_certificate) newErrors.bmtoa_certificate = 'BMTOA certificate is required';
    }

    if (step === 4) {
      // Banking Information
      if (!formData.bank_name) newErrors.bank_name = 'Bank name is required';
      if (!formData.account_number?.trim()) newErrors.account_number = 'Account number is required';
      if (!formData.account_holder_name?.trim()) {
        newErrors.account_holder_name = 'Account holder name is required';
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
    if (!validateStep(4)) return;

    setSaving(true);
    setErrors({});

    try {
      // If existing BMTOA member, just link to the company
      if (formData.is_bmtoa_member === true && formData.selected_company_id && formData.selected_company_id !== 'manual') {
        // Link user to existing company
        const { error: linkError } = await supabase
          .from('profiles')
          .update({
            profile_completion_status: 'complete',
            profile_completion_percentage: 100,
            profile_completed_at: new Date().toISOString(),
            verification_status: 'verified', // Already verified through existing company
          })
          .eq('id', user.id);

        if (linkError) throw linkError;

        // Update user in store
        const result = await useAuthStore.getState().updateProfile({
          profile_completion_status: 'complete',
          profile_completion_percentage: 100,
          profile_completed_at: new Date().toISOString(),
          verification_status: 'verified',
        });

        if (result.success) {
          setSaving(false);
          onComplete();
        } else {
          throw new Error(result.error || 'Failed to update profile');
        }
        return;
      }

      // For new BMTOA registration or manual company entry
      // Check if operator profile exists
      const { data: existingProfile } = await supabase
        .from('operator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Prepare profile data
      const profileData = {
        user_id: user.id,
        company_name: formData.selected_company_id === 'manual' ? formData.manual_company_name : formData.company_name,
        business_registration: formData.business_registration,
        company_address: formData.company_address,
        operating_areas: formData.operating_areas,
        fleet_size: formData.fleet_size,
        membership_tier: formData.membership_tier,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_holder_name: formData.account_holder_name,
        bmtoa_verified: formData.is_bmtoa_member === true, // Pre-verified if existing member
        grace_period_active: false, // Grace period ends when profile is complete
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('operator_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('operator_profiles')
          .insert(profileData);

        if (insertError) throw insertError;
      }

      // Update profile completion status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          profile_completion_status: 'complete',
          profile_completion_percentage: 100,
          profile_completed_at: new Date().toISOString(),
          verification_status: formData.is_bmtoa_member === true ? 'verified' : 'pending', // Verified if existing member
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update user in store
      const result = await useAuthStore.getState().updateProfile({
        profile_completion_status: 'complete',
        profile_completion_percentage: 100,
        profile_completed_at: new Date().toISOString(),
        verification_status: formData.is_bmtoa_member === true ? 'verified' : 'pending',
      });

      if (result.success) {
        setSaving(false);
        onComplete();
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving operator profile:', err);
      setErrors({ general: err.message || 'Failed to save profile. Please try again.' });
      setSaving(false);
    }
  };

  const totalSteps = 4;
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
            className="h-full bg-[#FFC107] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step 1: BMTOA Membership & Company Information */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">BMTOA Membership</h3>
            <p className="text-sm text-gray-600">Are you already a BMTOA member?</p>
          </div>

          {/* BMTOA Membership Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              BMTOA Membership Status *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_bmtoa_member: true }))}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.is_bmtoa_member === true
                    ? 'border-[#FFC107] bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Yes, I'm a member</p>
                    <p className="text-xs text-gray-600 mt-1">Select your company</p>
                  </div>
                  {formData.is_bmtoa_member === true && (
                    <Icon name="Check" className="w-5 h-5 text-[#FFC107]" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_bmtoa_member: false }))}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.is_bmtoa_member === false
                    ? 'border-[#FFC107] bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-medium text-gray-900">No, I'm not a member</p>
                    <p className="text-xs text-gray-600 mt-1">Register for BMTOA</p>
                  </div>
                  {formData.is_bmtoa_member === false && (
                    <Icon name="Check" className="w-5 h-5 text-[#FFC107]" />
                  )}
                </div>
              </button>
            </div>
            {errors.is_bmtoa_member && (
              <p className="mt-1 text-sm text-red-600">{errors.is_bmtoa_member}</p>
            )}
          </div>

          {/* If YES - Show Company Selection */}
          {formData.is_bmtoa_member === true && (
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    If you are part of a taxi company belonging to BMTOA, you don't need to register separately - just choose your company
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Your Company *
                </label>
                <select
                  name="selected_company_id"
                  value={formData.selected_company_id}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-[#FFC107] ${
                    errors.selected_company_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loadingCompanies}
                >
                  <option value="">
                    {loadingCompanies ? 'Loading companies...' : 'Select your company'}
                  </option>
                  {bmtoaCompanies.map((company) => (
                    <option key={company.user_id} value={company.user_id}>
                      {company.company_name}
                    </option>
                  ))}
                  <option value="manual">My company is not listed</option>
                </select>
                {errors.selected_company_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.selected_company_id}</p>
                )}
              </div>

              {/* Manual Company Name Entry */}
              {formData.selected_company_id === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter Company Name *
                  </label>
                  <Input
                    name="manual_company_name"
                    value={formData.manual_company_name}
                    onChange={handleInputChange}
                    placeholder="Enter your company name"
                    error={errors.manual_company_name}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    We'll verify this with BMTOA records
                  </p>
                </div>
              )}
            </div>
          )}

          {/* If NO - Show Full Registration Form */}
          {formData.is_bmtoa_member === false && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Icon name="AlertCircle" className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">New BMTOA Registration</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      You'll need to complete the full registration process and provide business documents
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Address *
                </label>
                <Input
                  name="company_address"
                  value={formData.company_address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street, Bulawayo"
                  error={errors.company_address}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Phone *
                </label>
                <Input
                  name="company_phone"
                  value={formData.company_phone}
                  onChange={handleInputChange}
                  placeholder="+263 XX XXX XXXX"
                  error={errors.company_phone}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Fleet Information */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Fleet Information</h3>
            <p className="text-sm text-gray-600">Details about your taxi fleet</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Fleet Size *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FLEET_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, fleet_size: size.value }))}
                  className={`p-3 border-2 rounded-lg transition-all ${
                    formData.fleet_size === size.value
                      ? 'border-[#FFC107] bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{size.label}</p>
                </button>
              ))}
            </div>
            {errors.fleet_size && (
              <p className="mt-1 text-sm text-red-600">{errors.fleet_size}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Operating Areas * (Select all that apply)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OPERATING_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleOperatingArea(area)}
                  className={`p-2 border-2 rounded-lg transition-all text-sm ${
                    formData.operating_areas.includes(area)
                      ? 'border-[#FFC107] bg-yellow-50 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {formData.operating_areas.includes(area) && (
                    <Icon name="Check" className="w-3 h-3 inline mr-1 text-[#FFC107]" />
                  )}
                  {area}
                </button>
              ))}
            </div>
            {errors.operating_areas && (
              <p className="mt-1 text-sm text-red-600">{errors.operating_areas}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              BMTOA Membership Tier *
            </label>
            <div className="space-y-2">
              {MEMBERSHIP_TIERS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, membership_tier: tier.value }))}
                  className={`w-full p-3 border-2 rounded-lg transition-all text-left ${
                    formData.membership_tier === tier.value
                      ? 'border-[#FFC107] bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{tier.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{tier.description}</p>
                    </div>
                    {formData.membership_tier === tier.value && (
                      <Icon name="Check" className="w-5 h-5 text-[#FFC107]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {errors.membership_tier && (
              <p className="mt-1 text-sm text-red-600">{errors.membership_tier}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Documents */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Required Documents</h3>
            <p className="text-sm text-gray-600">Upload your business and BMTOA documents</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business License *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'business_license')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {formData.business_license && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <Icon name="Check" className="w-4 h-4" />
                {formData.business_license.name}
              </p>
            )}
            {errors.business_license && (
              <p className="mt-1 text-sm text-red-600">{errors.business_license}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Clearance Certificate *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'tax_clearance')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {formData.tax_clearance && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <Icon name="Check" className="w-4 h-4" />
                {formData.tax_clearance.name}
              </p>
            )}
            {errors.tax_clearance && (
              <p className="mt-1 text-sm text-red-600">{errors.tax_clearance}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BMTOA Membership Certificate *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'bmtoa_certificate')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {formData.bmtoa_certificate && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <Icon name="Check" className="w-4 h-4" />
                {formData.bmtoa_certificate.name}
              </p>
            )}
            {errors.bmtoa_certificate && (
              <p className="mt-1 text-sm text-red-600">{errors.bmtoa_certificate}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Document Requirements</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>• All documents must be valid and not expired</li>
                  <li>• Accepted formats: JPG, PNG, PDF</li>
                  <li>• Maximum file size: 5MB per document</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Banking Information */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Banking Information</h3>
            <p className="text-sm text-gray-600">Company banking details for payments</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name *
            </label>
            <select
              name="bank_name"
              value={formData.bank_name}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-[#FFC107] ${
                errors.bank_name ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select your bank</option>
              {BANKS.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            {errors.bank_name && (
              <p className="mt-1 text-sm text-red-600">{errors.bank_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number *
            </label>
            <Input
              name="account_number"
              value={formData.account_number}
              onChange={handleInputChange}
              placeholder="1234567890"
              error={errors.account_number}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Holder Name *
            </label>
            <Input
              name="account_holder_name"
              value={formData.account_holder_name}
              onChange={handleInputChange}
              placeholder="ABC Taxi Services"
              error={errors.account_holder_name}
            />
            <p className="mt-1 text-xs text-gray-500">
              Must match the company name on your bank account
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Icon name="Shield" className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Secure & Encrypted</p>
                <p className="text-xs text-green-700 mt-1">
                  Your banking information is encrypted and stored securely. We never share your details with third parties.
                </p>
              </div>
            </div>
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
            className="flex-1 bg-[#334155] hover:bg-[#FFC107] hover:text-[#334155]"
          >
            Next
            <Icon name="ChevronRight" className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-[#334155] hover:bg-[#FFC107] hover:text-[#334155]"
          >
            {saving ? 'Submitting...' : 'Submit for Verification'}
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          {currentStep === totalSteps
            ? 'Your profile will be reviewed by BMTOA within 24-48 hours. Grace period will end upon completion.'
            : 'All fields marked with * are required'
          }
        </p>
      </div>
    </div>
  );
};

export default OperatorProfileForm;

