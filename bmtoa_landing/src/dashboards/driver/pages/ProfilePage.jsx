import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../shared/Button';
import FormInput from '../../shared/FormInput';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';
import PhotoUpload from '../components/PhotoUpload';

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

// Document types for inline upload
const DOCUMENT_TYPES = [
  {
    id: 'drivers_license',
    name: "Driver's License",
    description: 'Valid Zimbabwe driver\'s license',
    icon: '🪪',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'psv_license',
    name: 'PSV License',
    description: 'Public Service Vehicle license',
    icon: '📋',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'vehicle_registration',
    name: 'Vehicle Registration',
    description: 'Blue Book (Vehicle Registration)',
    icon: '📘',
    required: true,
    hasExpiry: false,
  },
  {
    id: 'insurance',
    name: 'Insurance Certificate',
    description: 'Valid vehicle insurance',
    icon: '🛡️',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'roadworthy',
    name: 'Roadworthy Certificate',
    description: 'Vehicle fitness certificate',
    icon: '✅',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'police_clearance',
    name: 'Police Clearance',
    description: 'Criminal record check',
    icon: '👮',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'medical_certificate',
    name: 'Medical Certificate',
    description: 'Health fitness certificate',
    icon: '🏥',
    required: true,
    hasExpiry: true,
  },
];

/**
 * Driver Profile Page
 *
 * Features:
 * - View and edit driver profile information
 * - Profile completion progress indicator
 * - Required fields validation
 * - Inline document upload forms (no separate page needed)
 */
const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { driverProfile, documents, loading, loadDashboardData, loadDocuments, updateDriverProfile, uploadDocument } = useDriverStore();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    national_id: '',
    license_number: '',
    license_expiry: '',
    license_class: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    bank_name: '',
    account_number: '',
    ecocash_number: '',
    bmtoa_member: false,
    bmtoa_membership_number: '',
  });

  // Document upload states
  const [uploadingDocs, setUploadingDocs] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [expiryDates, setExpiryDates] = useState({});

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
      loadDocuments(user.id);
    }
  }, [user?.id, loadDashboardData, loadDocuments]);

  useEffect(() => {
    if (driverProfile) {
      setFormData({
        full_name: driverProfile.full_name || '',
        date_of_birth: driverProfile.date_of_birth || '',
        national_id: driverProfile.national_id || '',
        license_number: driverProfile.license_number || '',
        license_expiry: driverProfile.license_expiry || '',
        license_class: driverProfile.license_class || '',
        vehicle_make: driverProfile.vehicle_make || '',
        vehicle_model: driverProfile.vehicle_model || '',
        vehicle_year: driverProfile.vehicle_year || '',
        vehicle_color: driverProfile.vehicle_color || '',
        license_plate: driverProfile.license_plate || '',
        bank_name: driverProfile.bank_name || '',
        account_number: driverProfile.account_number || '',
        ecocash_number: driverProfile.ecocash_number || '',
        bmtoa_member: driverProfile.bmtoa_member || false,
        bmtoa_membership_number: driverProfile.bmtoa_membership_number || '',
      });
    }
  }, [driverProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    setSaving(true);
    try {
      await updateDriverProfile(user.id, formData);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Document upload handlers
  const handleFileSelect = (docType, file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF, JPG, or PNG file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFiles({ ...selectedFiles, [docType]: file });
  };

  const handleDocumentUpload = async (docType) => {
    const file = selectedFiles[docType];
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    const docTypeObj = DOCUMENT_TYPES.find(d => d.id === docType);
    const expiryDate = expiryDates[docType] || null;

    setUploadingDocs({ ...uploadingDocs, [docType]: true });
    try {
      await uploadDocument(user.id, docType, file, expiryDate);

      // Clear the file and expiry date
      setSelectedFiles({ ...selectedFiles, [docType]: null });
      setExpiryDates({ ...expiryDates, [docType]: '' });

      alert(`${docTypeObj.name} uploaded successfully! It will be reviewed by admin.`);
    } catch (error) {
      alert(`Failed to upload document: ${error.message}`);
    } finally {
      setUploadingDocs({ ...uploadingDocs, [docType]: false });
    }
  };

  const getDocument = (documentType) => {
    return documents?.find(doc => doc.document_type === documentType);
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getStatusBadge = (status) => {
    const badges = {
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: '✓ Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Review' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Expired' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  const calculateCompletion = () => {
    const requiredFields = [
      'full_name', 'date_of_birth', 'national_id', 'license_number',
      'license_expiry', 'license_class', 'vehicle_make', 'vehicle_model',
      'vehicle_year', 'vehicle_color', 'license_plate'
    ];

    // Required documents (7 total)
    const requiredDocuments = [
      'drivers_license', 'psv_license', 'vehicle_registration',
      'insurance', 'roadworthy', 'police_clearance', 'medical_certificate'
    ];

    // Count approved documents
    const approvedDocs = driverProfile?.documents?.filter(doc =>
      requiredDocuments.includes(doc.document_type) && doc.status === 'approved'
    ).length || 0;

    // At least one payment method required (bank OR ecocash)
    const hasPaymentMethod = formData.bank_name || formData.ecocash_number;

    const filledFields = requiredFields.filter(field => formData[field]).length;

    // Total: 11 fields + 1 payment method + 7 documents = 19 items
    const totalRequired = requiredFields.length + 1 + requiredDocuments.length;
    const totalFilled = filledFields + (hasPaymentMethod ? 1 : 0) + approvedDocs;

    return Math.round((totalFilled / totalRequired) * 100);
  };

  const completionPercentage = calculateCompletion();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading profile...</div>
      </div>
    );
  }

  // Get available models based on selected make
  const availableModels = formData.vehicle_make ? (VEHICLE_MODELS[formData.vehicle_make] || []) : [];

  return (
    <div className="p-6">
      {/* Sticky Header with Edit Button */}
      <div className="sticky top-0 z-50 bg-slate-50 -mx-6 -mt-6 px-6 py-4 mb-6 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Driver Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your profile information</p>
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

      {/* Profile Completion Progress */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-slate-700">Profile Completion</h2>
          <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        {completionPercentage < 100 && (
          <p className="text-sm text-slate-500 mt-2">
            Complete your profile to start accepting rides
          </p>
        )}
      </div>

      {/* Profile Photo */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Profile Photo</h2>
        <PhotoUpload
          userId={user?.id}
          photoType="profile"
          currentPhotoUrl={driverProfile?.profile_photo_url}
          onUploadSuccess={() => loadDashboardData(user?.id)}
          circular={true}
        />
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Personal Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Full Name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            disabled={!isEditing}
            required
          />
          <FormInput
            label="Date of Birth"
            name="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={handleChange}
            disabled={!isEditing}
            required
          />
          <FormInput
            label="National ID"
            name="national_id"
            value={formData.national_id}
            onChange={handleChange}
            disabled={!isEditing}
            required
          />
          <FormInput
            label="Email"
            value={user?.email || ''}
            disabled
          />
          <FormInput
            label="Phone"
            value={user?.phone || ''}
            disabled
          />
        </div>
      </div>

      {/* Driver License */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Driver License</h2>

        {/* License Photo Upload */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">License Photo</h3>
          <PhotoUpload
            userId={user?.id}
            photoType="license"
            currentPhotoUrl={driverProfile?.license_photo_url}
            onUploadSuccess={() => loadDashboardData(user?.id)}
            circular={false}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="License Number"
            name="license_number"
            value={formData.license_number}
            onChange={handleChange}
            disabled={!isEditing}
            required
          />
          <FormInput
            label="License Expiry"
            name="license_expiry"
            type="date"
            value={formData.license_expiry}
            onChange={handleChange}
            disabled={!isEditing}
            required
          />
          <FormInput
            label="License Class"
            name="license_class"
            value={formData.license_class}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="e.g., Class 4"
            required
          />
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Vehicle Information</h2>

        {/* Vehicle Photo */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Vehicle Photo</h3>
          <PhotoUpload
            userId={user?.id}
            photoType="vehicle"
            currentPhotoUrl={driverProfile?.vehicle_photo_url}
            onUploadSuccess={() => loadDashboardData(user?.id)}
            circular={false}
          />
        </div>

        {/* Vehicle Details */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Vehicle Make Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vehicle Make <span className="text-red-500">*</span>
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
              }}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
              required
            >
              <option value="">Select Make</option>
              {VEHICLE_MAKES.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Model Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vehicle Model <span className="text-red-500">*</span>
            </label>
            <select
              name="vehicle_model"
              value={formData.vehicle_model}
              onChange={handleChange}
              disabled={!isEditing || !formData.vehicle_make}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
              required
            >
              <option value="">Select Model</option>
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <FormInput
            label="Vehicle Year"
            name="vehicle_year"
            type="number"
            value={formData.vehicle_year}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="e.g., 2020"
            min="1990"
            max={new Date().getFullYear() + 1}
            required
          />

          {/* Vehicle Color Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vehicle Color <span className="text-red-500">*</span>
            </label>
            <select
              name="vehicle_color"
              value={formData.vehicle_color}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
              required
            >
              <option value="">Select Color</option>
              {VEHICLE_COLORS.map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </div>

          <FormInput
            label="License Plate"
            name="license_plate"
            value={formData.license_plate}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="e.g., ABC 1234"
            required
          />
        </div>

      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Payment Information</h2>
        <p className="text-sm text-slate-500 mb-4">
          Provide at least one payment method for receiving your earnings
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="EcoCash Number"
            name="ecocash_number"
            value={formData.ecocash_number}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="e.g., 0771234567"
          />
          <FormInput
            label="Bank Name"
            name="bank_name"
            value={formData.bank_name}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="e.g., CBZ Bank"
          />
          <FormInput
            label="Account Number"
            name="account_number"
            value={formData.account_number}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="Optional if using EcoCash"
          />
        </div>
      </div>

      {/* BMTOA Membership */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">BMTOA Membership</h2>
        <p className="text-sm text-slate-600 mb-4">
          Are you a registered member of the Bulawayo Metered Taxi Operators Association?
        </p>

        {/* Yes/No Radio Buttons */}
        <div className="flex gap-6 mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="bmtoa_member_radio"
              checked={formData.bmtoa_member === true}
              onChange={() => setFormData({ ...formData, bmtoa_member: true })}
              disabled={!isEditing}
              className="w-4 h-4 text-yellow-400 border-slate-300 focus:ring-yellow-400"
            />
            <span className="ml-2 text-sm font-medium text-slate-700">Yes, I am a member</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="bmtoa_member_radio"
              checked={formData.bmtoa_member === false}
              onChange={() => setFormData({ ...formData, bmtoa_member: false, bmtoa_membership_number: '' })}
              disabled={!isEditing}
              className="w-4 h-4 text-yellow-400 border-slate-300 focus:ring-yellow-400"
            />
            <span className="ml-2 text-sm font-medium text-slate-700">No, not yet</span>
          </label>
        </div>

        {/* If Yes - Show Membership Number Field */}
        {formData.bmtoa_member && (
          <FormInput
            label="BMTOA Membership Number"
            name="bmtoa_membership_number"
            value={formData.bmtoa_membership_number}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="e.g., BMTOA-2024-001"
            required={formData.bmtoa_member}
          />
        )}

        {/* If No - Show Registration Info */}
        {!formData.bmtoa_member && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-700 mb-2">Not a BMTOA member yet?</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Join the Bulawayo Metered Taxi Operators Association to access exclusive benefits,
                  support, and opportunities for professional taxi drivers.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.open('http://localhost:4028/operator/dashboard', '_blank')}
                >
                  Register for BMTOA Membership →
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Required Documents - Inline Upload Forms */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Required Documents</h2>
        <p className="text-sm text-slate-500 mb-6">
          Upload all required documents for taxi operation in Zimbabwe. Files must be PDF, JPG, or PNG (max 5MB).
        </p>

        <div className="space-y-6">
          {DOCUMENT_TYPES.map((docType) => {
            const document = getDocument(docType.id);
            const expired = document && isExpired(document.expiryDate);
            const status = expired ? 'expired' : (document?.status || 'not_uploaded');
            const selectedFile = selectedFiles[docType.id];
            const isUploading = uploadingDocs[docType.id];

            return (
              <div
                key={docType.id}
                className="border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors"
              >
                {/* Document Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{docType.icon}</div>
                    <div>
                      <h3 className="font-semibold text-slate-700">{docType.name}</h3>
                      <p className="text-xs text-slate-500">{docType.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {docType.required && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Required
                      </span>
                    )}
                    {document && getStatusBadge(status)}
                  </div>
                </div>

                {/* Existing Document Info */}
                {document && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {document.fileName && (
                        <div>
                          <span className="text-slate-600">File:</span>
                          <p className="font-medium text-slate-700 truncate">{document.fileName}</p>
                        </div>
                      )}
                      {document.uploadedAt && (
                        <div>
                          <span className="text-slate-600">Uploaded:</span>
                          <p className="font-medium text-slate-700">{document.uploadedAt}</p>
                        </div>
                      )}
                      {document.expiryDate && (
                        <div>
                          <span className="text-slate-600">Expires:</span>
                          <p className={`font-medium ${expired ? 'text-red-600' : 'text-slate-700'}`}>
                            {document.expiryDate} {expired && '(Expired)'}
                          </p>
                        </div>
                      )}
                    </div>

                    {document.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-700 font-medium mb-1">Rejection Reason:</p>
                        <p className="text-xs text-red-900">{document.rejectionReason}</p>
                      </div>
                    )}

                    {document.fileUrl && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(document.fileUrl, '_blank')}
                        >
                          View Document
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Form - Show if no document OR if rejected/expired */}
                {(!document || status === 'rejected' || status === 'expired') && (
                  <div className="space-y-3">
                    {/* File Input */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {document ? 'Upload New File' : 'Select File'} (PDF, JPG, PNG - Max 5MB)
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileSelect(docType.id, e.target.files[0])}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                      />
                      {selectedFile && (
                        <p className="text-sm text-green-600 mt-2">✓ {selectedFile.name} selected</p>
                      )}
                    </div>

                    {/* Expiry Date - Only if document has expiry */}
                    {docType.hasExpiry && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiryDates[docType.id] || ''}
                          onChange={(e) => setExpiryDates({ ...expiryDates, [docType.id]: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                        />
                      </div>
                    )}

                    {/* Upload Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDocumentUpload(docType.id)}
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading ? 'Uploading...' : document ? 'Re-upload Document' : 'Upload Document'}
                    </Button>
                  </div>
                )}

                {/* Update option for approved documents with expiry */}
                {document && status === 'approved' && docType.hasExpiry && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-3">Need to update this document?</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Upload Updated File (PDF, JPG, PNG - Max 5MB)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileSelect(docType.id, e.target.files[0])}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                        />
                        {selectedFile && (
                          <p className="text-sm text-green-600 mt-2">✓ {selectedFile.name} selected</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          New Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiryDates[docType.id] || ''}
                          onChange={(e) => setExpiryDates({ ...expiryDates, [docType.id]: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                        />
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDocumentUpload(docType.id)}
                        disabled={!selectedFile || isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Update Document'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Note */}
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> All uploaded documents will be reviewed by our admin team within 24 hours.
            You'll be notified once they're approved.
          </p>
        </div>
      </div>

      {/* Verification Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Verification Status</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Profile Verification</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              driverProfile?.verification_status === 'approved'
                ? 'bg-green-100 text-green-700'
                : driverProfile?.verification_status === 'rejected'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {driverProfile?.verification_status || 'Pending'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Documents Verified</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              driverProfile?.documents_verified
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {driverProfile?.documents_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">BMTOA Verified</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              driverProfile?.bmtoa_verified
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {driverProfile?.bmtoa_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

