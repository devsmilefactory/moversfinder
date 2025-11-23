import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../shared/Button';
import FormInput from '../../shared/FormInput';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';
import useProfileStore from '../../../stores/profileStore';
import PhotoUpload from '../components/PhotoUpload';
import DriverPWALayout from '../../../components/layouts/DriverPWALayout';

import { computeDriverCompletion, REQUIRED_PROFILE_FIELDS, REQUIRED_DOCUMENT_TYPES, REQUIRED_PHOTO_FIELDS } from '../../../utils/driverCompletion';

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
  const { activeProfile } = useProfileStore();
  const { driverProfile, documents, loading, loadDashboardData, loadDocuments, updateProfilePhoto, uploadDocumentsBatch, uploadPhotosBatch, updateDriverProfile, submitDriverProfileForApproval, batchUploading } = useDriverStore();
  // Start in editing mode if profile is incomplete (0% completion)
  const [isEditing, setIsEditing] = useState(false);

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

  // Document upload states (batch selection)
  const [selectedFiles, setSelectedFiles] = useState({});
  const [expiryDates, setExpiryDates] = useState({});
  // Photo uploads pending (deferred until Save)
  const [pendingPhotos, setPendingPhotos] = useState({ profile: null, license: null, vehicle: null });

  // Save state
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
      loadDocuments(user.id);
    }
  }, [user?.id]); // Removed loadDashboardData and loadDocuments from dependencies to prevent infinite loops

  useEffect(() => {
    if (!driverProfile) return;

    // Canonicalize saved values to match dropdown options (case-insensitive)
    const toCanonical = (val, options) => {
      if (!val) return '';
      const found = (options || []).find(opt => String(opt).toLowerCase() === String(val).toLowerCase());
      return found || val;
    };

    const canonicalMake = toCanonical(driverProfile.vehicle_make || '', VEHICLE_MAKES);
    const modelsForMake = VEHICLE_MODELS[canonicalMake] || [];
    const canonicalModel = toCanonical(driverProfile.vehicle_model || '', modelsForMake);
    const canonicalColor = toCanonical(driverProfile.vehicle_color || '', VEHICLE_COLORS);

    setFormData({
      full_name: driverProfile.full_name || '',
      date_of_birth: driverProfile.date_of_birth || '',
      national_id: driverProfile.national_id || '',
      license_number: driverProfile.license_number || '',
      license_expiry: driverProfile.license_expiry || '',
      license_class: driverProfile.license_class || '',
      vehicle_make: canonicalMake,
      vehicle_model: canonicalModel,
      vehicle_year: driverProfile.vehicle_year || '',
      vehicle_color: canonicalColor,
      license_plate: driverProfile.license_plate || '',
      bank_name: driverProfile.bank_name || '',
      account_number: driverProfile.account_number || '',
      ecocash_number: driverProfile.ecocash_number || '',
      bmtoa_member: driverProfile.bmtoa_member || false,
      bmtoa_membership_number: driverProfile.bmtoa_membership_number || '',
    });

    // Auto-enable editing mode for new/incomplete profiles
    // This provides better UX for drivers just starting their profile
    const completionPct = driverProfile.completion_percentage || 0;
    if (completionPct === 0 && !isEditing) {
      setIsEditing(true);
    }
  }, [driverProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  // Queue document into batch (do not upload immediately)
  const handleDocumentUpload = async (docType) => {
    const file = selectedFiles[docType];
    if (!file) {
      alert('Please select a file to add');
      return;
    }
    const docTypeObj = DOCUMENT_TYPES.find(d => d.id === docType);
    if (docTypeObj?.hasExpiry && !expiryDates[docType]) {
      alert('Please provide an expiry date for this document');
      return;
    }
    alert(`${docTypeObj?.name || docType} added to uploads queue`);
  };

  // Submit all queued documents
  const handleSubmitAllDocuments = async () => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }
    const entries = Object.entries(selectedFiles).filter(([,v]) => !!v);
    if (entries.length === 0) {
      alert('No documents selected');
      return;
    }

    const items = entries.map(([docType, file]) => {
      const dt = DOCUMENT_TYPES.find(d => d.id === docType);
      const exp = dt?.hasExpiry ? (expiryDates[docType] || null) : null;
      return { documentType: docType, file, expiryDate: exp };
    });

    const results = await uploadDocumentsBatch(user.id, items, { parallel: true });

    // Clear successfully uploaded items only
    const nextSelected = { ...selectedFiles };
    const nextExpiry = { ...expiryDates };
    results.forEach((r) => {
      if (r.success) {
        delete nextSelected[r.documentType];
        delete nextExpiry[r.documentType];
      }
    });
    setSelectedFiles(nextSelected);
    setExpiryDates(nextExpiry);
  };


  // Save all profile changes (text fields + queued photos + queued documents)
  const handleSave = async (opts = {}) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }
    const silent = !!opts.silent;

    setSaving(true);
    try {
      // 1) Apply photo removals (explicitly clear DB fields)
      const removalTypes = Object.entries(pendingPhotos)
        .filter(([, v]) => v === false)
        .map(([photoType]) => photoType);
      if (removalTypes.length > 0) {
        const removalPayload = {};
        if (removalTypes.includes('profile')) removalPayload.profile_photo = null;
        if (removalTypes.includes('vehicle')) removalPayload.vehicle_photo = null;
        if (removalTypes.includes('license')) removalPayload.license_document = null;
        if (Object.keys(removalPayload).length > 0) {
          await updateDriverProfile(user.id, removalPayload);
        }
      }

      // 2) Upload queued photos (if any)
      const photoItems = Object.entries(pendingPhotos)
        .filter(([, v]) => v && v !== false)
        .map(([photoType, file]) => ({ photoType, file }));
      if (photoItems.length > 0) {
        await uploadPhotosBatch(user.id, photoItems, { parallel: true });
        // Clear photo queue
        setPendingPhotos({ profile: null, license: null, vehicle: null });
      }

      // 3) Upload queued documents (if any)
      const docEntries = Object.entries(selectedFiles).filter(([, v]) => !!v);
      if (docEntries.length > 0) {
        const items = docEntries.map(([docType, file]) => {
          const dt = DOCUMENT_TYPES.find((d) => d.id === docType);
          const exp = dt?.hasExpiry ? (expiryDates[docType] || null) : null;
          return { documentType: docType, file, expiryDate: exp };
        });

        const results = await uploadDocumentsBatch(user.id, items, { parallel: true });
        const nextSelected = { ...selectedFiles };
        const nextExpiry = { ...expiryDates };
        results.forEach((r) => {
          if (r.success) {
            delete nextSelected[r.documentType];
            delete nextExpiry[r.documentType];
          }
        });
        setSelectedFiles(nextSelected);
        setExpiryDates(nextExpiry);
      }

      // 4) Persist text fields and recompute completion after uploads
      await updateDriverProfile(user.id, formData);

      if (!silent) {
        alert('Profile saved successfully!');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      if (!silent) {
        alert(`Failed to save profile: ${err?.message || 'Unknown error'}`);
      }
      if (silent) throw err;
    } finally {
      setSaving(false);
    }
  };

  // Submit profile for approval when complete
  const handleSubmitForApproval = async () => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }
    if (completionPercentage < 100) {
      alert('Your profile is not complete yet. Please fill all required fields and uploads before submitting.');
      return;
    }
    try {
      setSaving(true);
      // Ensure latest changes are persisted before submitting
      await handleSave({ silent: true });

      // Recompute in case queued changes affected completion
      const finalCompletion = calculateCompletion();
      if (finalCompletion < 100) {
        alert('Your profile is not complete yet. Please fill all required fields and uploads before submitting.');
        setSaving(false);
        return;
      }

      await submitDriverProfileForApproval(user.id);
      // After successful submission, redirect to status page (read-only)
      navigate('/driver/status');
    } catch (e) {
      console.error('Submit for approval failed:', e);
      alert(e?.message || 'Failed to submit for approval');
    } finally {
      setSaving(false);
    }
  };



  const getDocument = (documentType) => {
    return documents?.find(doc => doc.document_type === documentType);
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Helper to get document property with correct database column name
  const getDocProp = (doc, prop) => {
    if (!doc) return null;
    // Map camelCase to snake_case for database columns
    const propMap = {
      fileUrl: 'file_url',
      expiryDate: 'expiry_date',
      documentNumber: 'document_number',
      documentType: 'document_type',
    };
    return doc[propMap[prop] || prop];
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


  const missingItems = React.useMemo(() => {
    const items = [];
    // Required fields
    (REQUIRED_PROFILE_FIELDS || []).forEach((f) => {
      if (!formData[f]) items.push(f.replaceAll('_', ' '));
    });
    // Payment method
    if (!formData.bank_name && !formData.ecocash_number) items.push('payment method (EcoCash or Bank)');
    // Documents
    const queuedDocSet = new Set(
      Object.entries(selectedFiles).filter(([, v]) => !!v).map(([k]) => k)
    );
    (REQUIRED_DOCUMENT_TYPES || []).forEach((dt) => {
      if (queuedDocSet.has(dt)) return;
      const d = (documents || []).find((x) => x?.document_type === dt);
      const hasFile = !!(d?.file_url || d?.fileUrl);
      if (!hasFile) items.push(dt.replaceAll('_', ' '));
    });
    // Photos
    const photoFieldMap = { profile_photo: 'profile', vehicle_photo: 'vehicle', license_document: 'license' };
    (REQUIRED_PHOTO_FIELDS || []).forEach((field) => {
      const pType = photoFieldMap[field];
      const removal = pendingPhotos && pendingPhotos[pType] === false;
      const queued = pendingPhotos && pendingPhotos[pType] && pendingPhotos[pType] !== false;
      const hasDb = !!(driverProfile && driverProfile[field]);
      if (!(queued || (!removal && hasDb))) items.push(field.replaceAll('_', ' '));
    });
    return items;
  }, [formData, documents, selectedFiles, pendingPhotos, driverProfile]);

  const calculateCompletion = () => {
    const queuedDocTypes = Object.entries(selectedFiles)
      .filter(([, v]) => !!v)
      .map(([k]) => k);
    const profileForCalc = {
      ...formData,
      profile_photo: driverProfile?.profile_photo || null,
      vehicle_photo: driverProfile?.vehicle_photo || null,
      license_document: driverProfile?.license_document || null,
    };
    return computeDriverCompletion(profileForCalc, documents, { queuedDocTypes, selectedPhotos: pendingPhotos });
  };

  const completionPercentage = calculateCompletion();

  // Determine profile status

  const approvalStatus = activeProfile?.approval_status || driverProfile?.approval_status || 'pending';

  const isSubmittedForApproval = (completionPercentage === 100) && (approvalStatus === 'pending' || approvalStatus === 'under_review');

  // Check if profile has been submitted for approval (legacy flag from user)
  const isProfileSubmitted = user?.verification_status === 'pending' ||
                            user?.verification_status === 'approved' ||
                            user?.verification_status === 'rejected';

  // IMPORTANT: This useEffect must be BEFORE any early returns to avoid hooks order issues
  useEffect(() => {
    if (isProfileSubmitted && approvalStatus !== 'approved') {
      // Profile submitted and not yet approved - show status page
      navigate('/driver/status');
    }
  }, [isProfileSubmitted, approvalStatus, navigate]);

  // Get available models based on selected make
  const availableModels = formData.vehicle_make ? (VEHICLE_MODELS[formData.vehicle_make] || []) : [];

  // Ensure saved values appear in dropdowns even if case or value differs from predefined lists
  const makeOptions = React.useMemo(() => {
    const base = [...VEHICLE_MAKES];
    const cur = formData.vehicle_make;
    if (cur && !base.some(m => m.toLowerCase() === String(cur).toLowerCase())) {
      return [cur, ...base];
    }
    return base;
  }, [formData.vehicle_make]);

  const modelOptions = React.useMemo(() => {
    const base = [...availableModels];
    const cur = formData.vehicle_model;
    if (cur && !base.some(m => m.toLowerCase() === String(cur).toLowerCase())) {
      return [cur, ...base];
    }
    return base;
  }, [formData.vehicle_model, availableModels]);

  const colorOptions = React.useMemo(() => {
    const base = [...VEHICLE_COLORS];
    const cur = formData.vehicle_color;
    if (cur && !base.some(c => c.toLowerCase() === String(cur).toLowerCase())) {
      return [cur, ...base];
    }
    return base;
  }, [formData.vehicle_color]);
  if (loading) {
    return (
      <DriverPWALayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Loading profile...</div>
        </div>
      </DriverPWALayout>
    );
  }



  return (
    <DriverPWALayout title="Profile">
      <div>
      {/* Sticky Header with Edit Button */}
      <div className="sticky top-0 z-50 bg-slate-50 -mx-6 -mt-6 px-6 py-4 mb-6 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Driver Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your profile information</p>
          </div>
          <div className="flex gap-2">
            {/* Back to Status View Button */}
            <Button
              variant="outline"
              onClick={() => navigate('/driver/status')}
              className="hidden sm:flex"
            >
              ← Back to Status
            </Button>

            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={completionPercentage === 100 ? handleSubmitForApproval : () => handleSave()}
                  disabled={saving}
                >
                  {saving
                    ? (completionPercentage === 100 ? 'Submitting…' : 'Saving…')
                    : (completionPercentage === 100 ? 'Submit for Approval' : 'Save')}
                </Button>
              </div>
            ) : (
              <Button variant="primary" onClick={() => setIsEditing(true)} disabled={isSubmittedForApproval}>
                {isSubmittedForApproval ? 'Awaiting Approval' : 'Edit Profile'}
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
        {isEditing && missingItems.length > 0 && (
          <div className="mt-3 text-sm text-slate-600">
            <div className="font-medium mb-1">Missing:</div>
            <ul className="list-disc ml-5 space-y-0.5">
              {missingItems.slice(0, 5).map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
              {missingItems.length > 5 && (
                <li>+{missingItems.length - 5} more…</li>
              )}
            </ul>
          </div>
        )}

      </div>

      {/* Profile Photo */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Profile Photo</h2>
        <PhotoUpload
          userId={user?.id}
          photoType="profile"
          currentPhotoUrl={driverProfile?.profile_photo}
          onUploadSuccess={(photoUrl) => updateProfilePhoto('profile', photoUrl)}
          onSelectedFile={(file) => setPendingPhotos((p) => ({ ...p, profile: file ?? false }))}
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
            disabled={!isEditing || saving}
            required
          />
          <FormInput
            label="Date of Birth"
            name="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={handleChange}
            disabled={!isEditing || saving}
            required
          />
          <FormInput
            label="National ID"
            name="national_id"
            value={formData.national_id}
            onChange={handleChange}
            disabled={!isEditing || saving}
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
            currentPhotoUrl={driverProfile?.license_document}
            onUploadSuccess={(photoUrl) => updateProfilePhoto('license', photoUrl)}
            onSelectedFile={(file) => setPendingPhotos((p) => ({ ...p, license: file ?? false }))}
            circular={false}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="License Number"
            name="license_number"
            value={formData.license_number}
            onChange={handleChange}
            disabled={!isEditing || saving}
            required
          />
          <FormInput
            label="License Expiry"
            name="license_expiry"
            type="date"
            value={formData.license_expiry}
            onChange={handleChange}
            disabled={!isEditing || saving}
            required
          />
          <FormInput
            label="License Class"
            name="license_class"
            value={formData.license_class}
            onChange={handleChange}
            disabled={!isEditing || saving}
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
            currentPhotoUrl={driverProfile?.vehicle_photo}
            onUploadSuccess={(photoUrl) => updateProfilePhoto('vehicle', photoUrl)}
            onSelectedFile={(file) => setPendingPhotos((p) => ({ ...p, vehicle: file ?? false }))}
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
              disabled={!isEditing || saving}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
              required
            >
              <option value="">Select Make</option>
              {makeOptions.map(make => (
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
              {modelOptions.map(model => (
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
            disabled={!isEditing || saving}
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
              disabled={!isEditing || saving}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
              required
            >
              <option value="">Select Color</option>
              {colorOptions.map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </div>

          <FormInput
            label="License Plate"
            name="license_plate"
            value={formData.license_plate}
            onChange={handleChange}
            disabled={!isEditing || saving}
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
            disabled={!isEditing || saving}
            placeholder="e.g., 0771234567"
          />
          <FormInput
            label="Bank Name"
            name="bank_name"
            value={formData.bank_name}
            onChange={handleChange}
            disabled={!isEditing || saving}
            placeholder="e.g., CBZ Bank"
          />
          <FormInput
            label="Account Number"
            name="account_number"
            value={formData.account_number}
            onChange={handleChange}
            disabled={!isEditing || saving}
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
              disabled={!isEditing || saving}
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
              disabled={!isEditing || saving}
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
            disabled={!isEditing || saving}
            placeholder="e.g., BMTOA-2024-001"
            required={formData.bmtoa_member}
          />
        )}

        {/* If No - Show BMTOA Info */}
        {!formData.bmtoa_member && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-700 mb-2">BMTOA Membership</h3>
                <p className="text-sm text-slate-600">
                  BMTOA membership is optional but provides additional benefits including professional support,
                  networking opportunities, and advocacy for taxi drivers in Bulawayo.

                </p>
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


        {/* Batch upload bar for queued files */}
        {Object.values(selectedFiles).filter(Boolean).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="text-sm text-amber-800">
                <strong>{Object.values(selectedFiles).filter(Boolean).length}</strong> document(s) queued for upload
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedFiles({}); setExpiryDates({}); }}
                >
                  Clear All
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitAllDocuments}
                  disabled={batchUploading}
                >
                  {batchUploading ? 'Uploading...' : 'Submit All Documents'}
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(selectedFiles).filter(([, v]) => !!v).map(([key]) => (
                <span key={key} className="px-2 py-1 bg-white border border-amber-200 rounded text-xs text-amber-900">
                  {DOCUMENT_TYPES.find((d) => d.id === key)?.name || key}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {DOCUMENT_TYPES.map((docType) => {
            const document = getDocument(docType.id);
            const expired = document && isExpired(getDocProp(document, 'expiryDate'));
            const status = expired ? 'expired' : (document?.status || 'not_uploaded');
            const selectedFile = selectedFiles[docType.id];
            const isUploading = !!batchUploading;

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
                      {getDocProp(document, 'documentNumber') && (
                        <div>
                          <span className="text-slate-600">Number:</span>
                          <p className="font-medium text-slate-700 truncate">{getDocProp(document, 'documentNumber')}</p>
                        </div>
                      )}
                      {document.created_at && (
                        <div>
                          <span className="text-slate-600">Uploaded:</span>
                          <p className="font-medium text-slate-700">{new Date(document.created_at).toLocaleDateString()}</p>
                        </div>
                      )}
                      {getDocProp(document, 'expiryDate') && (
                        <div>
                          <span className="text-slate-600">Expires:</span>
                          <p className={`font-medium ${expired ? 'text-red-600' : 'text-slate-700'}`}>
                            {getDocProp(document, 'expiryDate')} {expired && '(Expired)'}
                          </p>
                        </div>
                      )}
                    </div>

                    {document.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-700 font-medium mb-1">Rejection Reason:</p>
                        <p className="text-xs text-red-900">{document.rejection_reason}</p>
                      </div>
                    )}

                    {getDocProp(document, 'fileUrl') && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getDocProp(document, 'fileUrl'), '_blank')}
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
                      {isUploading ? 'Uploading...' : document ? 'Add to Uploads' : 'Add to Uploads'}
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
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-sm text-green-600">✓ {selectedFile.name} selected</p>
                            <button
                              type="button"
                              className="text-xs text-red-600 underline"
                              onClick={() => setSelectedFiles({ ...selectedFiles, [docType.id]: undefined })}
                            >
                              Clear
                            </button>
                          </div>
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
                        {isUploading ? 'Uploading...' : 'Add to Uploads'}
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
    </DriverPWALayout>
  );
};

export default ProfilePage;

