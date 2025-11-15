/**
 * DriverProfileForm - Required Profile Completion with Operator Matching
 * BMTOA Platform
 * 
 * Driver users must complete profile for full access
 * Multi-step form with operator matching, personal info, license, vehicle, documents, banking
 * ALL EXISTING DRIVER FIELDS PRESERVED + Operator Matching
 */

import React, { useState } from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import useAuthStore from '../../stores/authStore';
import DriverOperatorMatching from './DriverOperatorMatching';
import { supabase } from '../../lib/supabase';

// Vehicle data for Zimbabwe market
const VEHICLE_MAKES = [
  'Toyota', 'Nissan', 'Honda', 'Mazda', 'Mitsubishi', 'Isuzu', 'Ford', 'Volkswagen',
  'Mercedes-Benz', 'BMW', 'Audi', 'Hyundai', 'Kia', 'Suzuki', 'Subaru', 'Chevrolet',
  'Peugeot', 'Renault', 'Land Rover', 'Jeep', 'Other'
].sort();

const VEHICLE_MODELS = {
  'Toyota': ['Corolla', 'Camry', 'RAV4', 'Hilux', 'Land Cruiser', 'Prado', 'Fortuner', 'Avensis', 'Yaris', 'Vitz', 'Wish', 'Fielder', 'Axio', 'Premio', 'Allion', 'Mark X', 'Harrier', 'Vanguard'],
  'Nissan': ['Almera', 'Sentra', 'Tiida', 'X-Trail', 'Qashqai', 'Patrol', 'Navara', 'NP300', 'Juke', 'Micra', 'Note', 'Wingroad', 'AD Van', 'Caravan'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Fit', 'Jazz', 'City', 'Stream', 'Stepwgn', 'Odyssey'],
  'Mazda': ['Mazda3', 'Mazda6', 'CX-5', 'CX-3', 'Demio', 'Axela', 'Atenza', 'Premacy', 'Biante', 'BT-50'],
  'Mitsubishi': ['Lancer', 'Pajero', 'Outlander', 'ASX', 'Triton', 'L200', 'Colt', 'Galant', 'RVR'],
  'Isuzu': ['D-Max', 'KB', 'MU-X', 'Trooper', 'NPR', 'NQR'],
  'Ford': ['Ranger', 'Everest', 'Focus', 'Fiesta', 'EcoSport', 'Kuga', 'Territory'],
  'Volkswagen': ['Polo', 'Golf', 'Jetta', 'Passat', 'Tiguan', 'Amarok', 'Touareg'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'Vito', 'Sprinter'],
  'BMW': ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6'],
  'Audi': ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7'],
  'Hyundai': ['i10', 'i20', 'Accent', 'Elantra', 'Tucson', 'Santa Fe', 'Creta', 'H100'],
  'Kia': ['Picanto', 'Rio', 'Cerato', 'Sportage', 'Sorento', 'K2700'],
  'Suzuki': ['Swift', 'Vitara', 'Jimny', 'Ertiga', 'Ciaz', 'Alto'],
  'Subaru': ['Impreza', 'Legacy', 'Outback', 'Forester', 'XV'],
  'Chevrolet': ['Spark', 'Aveo', 'Cruze', 'Captiva', 'Utility'],
  'Peugeot': ['206', '207', '208', '308', '508', '2008', '3008', 'Partner'],
  'Renault': ['Clio', 'Sandero', 'Duster', 'Captur', 'Kangoo'],
  'Land Rover': ['Defender', 'Discovery', 'Range Rover', 'Freelander', 'Evoque'],
  'Jeep': ['Wrangler', 'Cherokee', 'Grand Cherokee', 'Compass', 'Renegade'],
  'Other': ['Other Model']
};

const VEHICLE_COLORS = [
  'White', 'Silver', 'Black', 'Grey', 'Blue', 'Red', 'Green', 'Yellow',
  'Brown', 'Beige', 'Gold', 'Orange', 'Purple', 'Maroon', 'Other'
].sort();

const DriverProfileForm = ({ onComplete, canDismiss }) => {
  const user = useAuthStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Operator Association (NEW)
    operator_id: '',
    operator_approval_status: 'pending',
    
    // Personal Information
    full_name: user?.name || '',
    date_of_birth: '',
    national_id: '',
    
    // Driver's License
    license_number: '',
    license_expiry: '',
    license_class: '',
    license_document: null,
    
    // Vehicle Information
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    vehicle_photo: null,
    
    // Vehicle Documents
    vehicle_registration: null,
    insurance_certificate: null,
    roadworthy_certificate: null,
    
    // Banking Information
    bank_name: '',
    account_number: '',
    account_holder_name: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const LICENSE_CLASSES = [
    { value: 'class_1', label: 'Class 1 - Motorcycles' },
    { value: 'class_2', label: 'Class 2 - Light Vehicles' },
    { value: 'class_3', label: 'Class 3 - Heavy Vehicles' },
    { value: 'class_4', label: 'Class 4 - Public Service Vehicles' },
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

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      // Operator Matching - operator_id is optional
      if (!formData.license_plate?.trim()) {
        newErrors.license_plate = 'License plate is required';
      }
    }

    if (step === 2) {
      // Personal Information
      if (!formData.full_name?.trim()) newErrors.full_name = 'Full name is required';
      if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
      if (!formData.national_id?.trim()) newErrors.national_id = 'National ID is required';
    }

    if (step === 3) {
      // Driver's License
      if (!formData.license_number?.trim()) newErrors.license_number = 'License number is required';
      if (!formData.license_expiry) newErrors.license_expiry = 'License expiry date is required';
      if (!formData.license_class) newErrors.license_class = 'License class is required';
      if (!formData.license_document) newErrors.license_document = 'License document is required';
    }

    if (step === 4) {
      // Vehicle Information & Documents (combined)
      if (!formData.vehicle_make?.trim()) newErrors.vehicle_make = 'Vehicle make is required';
      if (!formData.vehicle_model?.trim()) newErrors.vehicle_model = 'Vehicle model is required';
      if (!formData.vehicle_year) newErrors.vehicle_year = 'Vehicle year is required';
      if (!formData.vehicle_color?.trim()) newErrors.vehicle_color = 'Vehicle color is required';
      if (!formData.vehicle_photo) newErrors.vehicle_photo = 'Vehicle photo is required';

      // Vehicle Documents (now inline)
      if (!formData.vehicle_registration) {
        newErrors.vehicle_registration = 'Vehicle registration is required';
      }
      if (!formData.insurance_certificate) {
        newErrors.insurance_certificate = 'Insurance certificate is required';
      }
      if (!formData.roadworthy_certificate) {
        newErrors.roadworthy_certificate = 'Roadworthy certificate is required';
      }
    }

    if (step === 5) {
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
    if (!validateStep(5)) return;

    setSaving(true);
    setErrors({});

    try {
      // Check if driver profile exists
      const { data: existingProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Prepare profile data
      const profileData = {
        user_id: user.id,
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        national_id: formData.national_id,
        license_number: formData.license_number,
        license_expiry: formData.license_expiry,
        license_class: formData.license_class,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: formData.vehicle_year,
        vehicle_color: formData.vehicle_color,
        license_plate: formData.license_plate,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_holder_name: formData.account_holder_name,
        operator_id: formData.operator_id || null,
        operator_approval_status: formData.operator_id ? 'pending' : null,
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('driver_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('driver_profiles')
          .insert(profileData);

        if (insertError) throw insertError;
      }

      // If operator selected, create matching request
      if (formData.operator_id && formData.vehicle_id) {
        const { error: requestError } = await supabase
          .from('driver_operator_requests')
          .insert({
            driver_id: user.id,
            operator_id: formData.operator_id,
            vehicle_id: formData.vehicle_id,
            status: 'pending',
          });

        if (requestError) throw requestError;
      }

      // Update profile completion status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          profile_completion_status: 'complete',
          profile_completion_percentage: 100,
          profile_completed_at: new Date().toISOString(),
          verification_status: 'pending', // Awaiting operator approval + BMTOA verification
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update user in store
      const result = await useAuthStore.getState().updateProfile({
        profile_completion_status: 'complete',
        profile_completion_percentage: 100,
        profile_completed_at: new Date().toISOString(),
        verification_status: 'pending',
      });

      if (result.success) {
        setSaving(false);
        onComplete();
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving driver profile:', err);
      setErrors({ general: err.message || 'Failed to save profile. Please try again.' });
      setSaving(false);
    }
  };

  const totalSteps = 5;
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

      {/* Step 1: Operator Matching */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Operator Association</h3>
            <p className="text-sm text-gray-600">Select a taxi operator or proceed independently</p>
          </div>

          <DriverOperatorMatching 
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
          />
        </div>
      )}

      {/* Step 2: Personal Information */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Personal Information</h3>
            <p className="text-sm text-gray-600">Tell us about yourself</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <Input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleInputChange}
              error={errors.date_of_birth}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              National ID Number *
            </label>
            <Input
              name="national_id"
              value={formData.national_id}
              onChange={handleInputChange}
              placeholder="63-123456A12"
              error={errors.national_id}
            />
          </div>
        </div>
      )}

      {/* Step 3: Driver's License */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Driver's License</h3>
            <p className="text-sm text-gray-600">Provide your driver's license information</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Number *
            </label>
            <Input
              name="license_number"
              value={formData.license_number}
              onChange={handleInputChange}
              placeholder="DL-BYO-123456"
              error={errors.license_number}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Expiry Date *
            </label>
            <Input
              type="date"
              name="license_expiry"
              value={formData.license_expiry}
              onChange={handleInputChange}
              error={errors.license_expiry}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Class *
            </label>
            <select
              name="license_class"
              value={formData.license_class}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-[#FFC107] ${
                errors.license_class ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select license class</option>
              {LICENSE_CLASSES.map(cls => (
                <option key={cls.value} value={cls.value}>{cls.label}</option>
              ))}
            </select>
            {errors.license_class && (
              <p className="mt-1 text-sm text-red-600">{errors.license_class}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Document (Photo/Scan) *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'license_document')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {formData.license_document && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <Icon name="Check" className="w-4 h-4" />
                {formData.license_document.name}
              </p>
            )}
            {errors.license_document && (
              <p className="mt-1 text-sm text-red-600">{errors.license_document}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Vehicle Information & Documents */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Vehicle Information & Documents</h3>
            <p className="text-sm text-gray-600">
              {formData.operator_id ? 'Confirm or update vehicle details and upload required documents' : 'Tell us about your vehicle and upload required documents'}
            </p>
          </div>

          {/* Vehicle Details */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-800">Vehicle Details</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Make *
                </label>
                <select
                  name="vehicle_make"
                  value={formData.vehicle_make}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      vehicle_make: e.target.value,
                      vehicle_model: '' // Reset model when make changes
                    });
                    if (errors.vehicle_make) {
                      setErrors({ ...errors, vehicle_make: '' });
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.vehicle_make ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Make</option>
                  {VEHICLE_MAKES.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
                {errors.vehicle_make && (
                  <p className="mt-1 text-sm text-red-600">{errors.vehicle_make}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Model *
                </label>
                <select
                  name="vehicle_model"
                  value={formData.vehicle_model}
                  onChange={handleInputChange}
                  disabled={!formData.vehicle_make}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.vehicle_model ? 'border-red-500' : 'border-gray-300'
                  } ${!formData.vehicle_make ? 'bg-gray-100' : ''}`}
                >
                  <option value="">Select Model</option>
                  {formData.vehicle_make && VEHICLE_MODELS[formData.vehicle_make]?.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                {errors.vehicle_model && (
                  <p className="mt-1 text-sm text-red-600">{errors.vehicle_model}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Year *
                </label>
                <Input
                  type="number"
                  name="vehicle_year"
                  value={formData.vehicle_year}
                  onChange={handleInputChange}
                  placeholder="2020"
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  error={errors.vehicle_year}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Color *
                </label>
                <select
                  name="vehicle_color"
                  value={formData.vehicle_color}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.vehicle_color ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Color</option>
                  {VEHICLE_COLORS.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                {errors.vehicle_color && (
                  <p className="mt-1 text-sm text-red-600">{errors.vehicle_color}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Plate * (Already entered: {formData.license_plate})
              </label>
              <Input
                name="license_plate"
                value={formData.license_plate}
                onChange={handleInputChange}
                placeholder="ABZ 1234"
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Photo *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'vehicle_photo')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {formData.vehicle_photo && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <Icon name="Check" className="w-4 h-4" />
                  {formData.vehicle_photo.name}
                </p>
              )}
              {errors.vehicle_photo && (
                <p className="mt-1 text-sm text-red-600">{errors.vehicle_photo}</p>
              )}
            </div>
          </div>

          {/* Vehicle Documents - Now Inline */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-800">Required Vehicle Documents</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Registration Document *
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileChange(e, 'vehicle_registration')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {formData.vehicle_registration && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <Icon name="Check" className="w-4 h-4" />
                  {formData.vehicle_registration.name}
                </p>
              )}
              {errors.vehicle_registration && (
                <p className="mt-1 text-sm text-red-600">{errors.vehicle_registration}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Certificate *
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileChange(e, 'insurance_certificate')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {formData.insurance_certificate && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <Icon name="Check" className="w-4 h-4" />
                  {formData.insurance_certificate.name}
                </p>
              )}
              {errors.insurance_certificate && (
                <p className="mt-1 text-sm text-red-600">{errors.insurance_certificate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roadworthy Certificate *
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileChange(e, 'roadworthy_certificate')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {formData.roadworthy_certificate && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <Icon name="Check" className="w-4 h-4" />
                  {formData.roadworthy_certificate.name}
                </p>
              )}
              {errors.roadworthy_certificate && (
                <p className="mt-1 text-sm text-red-600">{errors.roadworthy_certificate}</p>
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
        </div>
      )}

      {/* Step 5: Banking Information */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Banking Information</h3>
            <p className="text-sm text-gray-600">Where should we send your earnings?</p>
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
              placeholder="John Doe"
              error={errors.account_holder_name}
            />
            <p className="mt-1 text-xs text-gray-500">
              Must match the name on your bank account
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
            ? formData.operator_id
              ? 'Your profile will be reviewed by the operator and BMTOA within 24-48 hours'
              : 'Your profile will be reviewed by BMTOA within 24-48 hours'
            : 'All fields marked with * are required'
          }
        </p>
      </div>
    </div>
  );
};

export default DriverProfileForm;

