import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../shared/Button';
import FormInput from '../../shared/FormInput';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';
import useProfileStore from '../../../stores/profileStore';
import PhotoUpload from '../components/PhotoUpload';
import DocumentUploadItem from '../components/DocumentUploadItem';
import DriverPWALayout from '../../../components/layouts/DriverPWALayout';

import { 
  computeDriverCompletion, 
  REQUIRED_PROFILE_FIELDS, 
  REQUIRED_DOCUMENT_TYPES, 
  REQUIRED_PHOTO_FIELDS 
} from '../../../utils/driverCompletion';

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
    category: 'credentials'
  },
  {
    id: 'psv_license',
    name: 'PSV License',
    description: 'Public Service Vehicle license',
    icon: '📋',
    required: true,
    hasExpiry: true,
    category: 'credentials'
  },
  {
    id: 'police_clearance',
    name: 'Police Clearance',
    description: 'Criminal record check',
    icon: '👮',
    required: true,
    hasExpiry: true,
    category: 'credentials'
  },
  {
    id: 'medical_certificate',
    name: 'Medical Certificate',
    description: 'Health fitness certificate',
    icon: '🏥',
    required: true,
    hasExpiry: true,
    category: 'credentials'
  },
  {
    id: 'vehicle_registration',
    name: 'Vehicle Registration',
    description: 'Blue Book (Vehicle Registration)',
    icon: '📘',
    required: true,
    hasExpiry: false,
    category: 'vehicle'
  },
  {
    id: 'insurance',
    name: 'Insurance Certificate',
    description: 'Valid vehicle insurance',
    icon: '🛡️',
    required: true,
    hasExpiry: true,
    category: 'vehicle'
  },
  {
    id: 'roadworthy',
    name: 'Roadworthy Certificate',
    description: 'Vehicle fitness certificate',
    icon: '✅',
    required: true,
    hasExpiry: true,
    category: 'vehicle'
  },
];

/**
 * Driver Profile Page
 *
 * Features:
 * - Organized into sections (Identity, Credentials, Vehicle, Financial)
 * - Profile completion progress indicator
 * - Required fields validation
 * - Inline document upload components
 */
const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { activeProfile } = useProfileStore();
  const { 
    driverProfile, 
    documents, 
    loading, 
    loadDashboardData, 
    loadDocuments, 
    updateProfilePhoto, 
    uploadDocumentsBatch, 
    uploadPhotosBatch, 
    updateDriverProfile, 
    submitDriverProfileForApproval, 
    batchUploading 
  } = useDriverStore();

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
  const [selectedFiles, setSelectedFiles] = useState({});
  const [expiryDates, setExpiryDates] = useState({});
  const [pendingPhotos, setPendingPhotos] = useState({ profile: null, vehicle: null });

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
      loadDocuments(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!driverProfile) return;

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

    const completionPct = driverProfile.completion_percentage || 0;
    if (completionPct === 0 && !isEditing) {
      setIsEditing(true);
    }
  }, [driverProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileSelect = (docType, file) => {
    setSelectedFiles({ ...selectedFiles, [docType]: file });
  };

  const handleExpiryChange = (docType, date) => {
    setExpiryDates({ ...expiryDates, [docType]: date });
  };

  const handleDocumentAdd = (docType) => {
    const docTypeObj = DOCUMENT_TYPES.find(d => d.id === docType);
    if (docTypeObj?.hasExpiry && !expiryDates[docType]) {
      alert('Please provide an expiry date for this document');
      return;
    }
    alert(`${docTypeObj?.name || docType} added to uploads queue. Don't forget to click Save!`);
  };

  const handleSubmitAllDocuments = async () => {
    if (!user?.id) return alert('User not authenticated');
    
    const entries = Object.entries(selectedFiles).filter(([,v]) => !!v);
    if (entries.length === 0) return alert('No documents selected');

    const items = entries.map(([docType, file]) => {
      const dt = DOCUMENT_TYPES.find(d => d.id === docType);
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
  };

  const handleSave = async (opts = {}) => {
    if (!user?.id) return alert('User not authenticated');
    const silent = !!opts.silent;
    setSaving(true);
    try {
      // 1) Apply removals
      const removalTypes = Object.entries(pendingPhotos).filter(([, v]) => v === false).map(([k]) => k);
      if (removalTypes.length > 0) {
        const removalPayload = {};
        if (removalTypes.includes('profile')) removalPayload.profile_photo = null;
        if (removalTypes.includes('vehicle')) removalPayload.vehicle_photo = null;
        await updateDriverProfile(user.id, removalPayload);
      }

      // 2) Upload Photos
      const photoItems = Object.entries(pendingPhotos)
        .filter(([, v]) => v && v !== false)
        .map(([photoType, file]) => ({ photoType, file }));
      if (photoItems.length > 0) {
        await uploadPhotosBatch(user.id, photoItems, { parallel: true });
        setPendingPhotos({ profile: null, vehicle: null });
      }

      // 3) Upload Documents
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

      // 4) Update Profile
      await updateDriverProfile(user.id, formData);

      if (!silent) {
        alert('Profile saved successfully!');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      if (!silent) alert(`Failed to save profile: ${err?.message || 'Unknown error'}`);
      if (silent) throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!user?.id) return;
    if (completionPercentage < 100) {
      alert('Your profile is not complete yet.');
      return;
    }
    try {
      setSaving(true);
      await handleSave({ silent: true });
      const finalCompletion = calculateCompletion();
      if (finalCompletion < 100) {
        alert('Your profile is not complete yet.');
        setSaving(false);
        return;
      }
      await submitDriverProfileForApproval(user.id);
      navigate('/driver/status');
    } catch (e) {
      console.error('Submit for approval failed:', e);
      alert(e?.message || 'Failed to submit for approval');
    } finally {
      setSaving(false);
    }
  };

  const calculateCompletion = () => {
    const queuedDocTypes = Object.entries(selectedFiles).filter(([, v]) => !!v).map(([k]) => k);
    const profileForCalc = { ...driverProfile, ...formData };
    return computeDriverCompletion(profileForCalc, documents, { queuedDocTypes, selectedPhotos: pendingPhotos });
  };

  const completionPercentage = calculateCompletion();
  const approvalStatus = driverProfile?.approval_status || activeProfile?.approval_status || 'pending';
  const isProfileSubmitted = (completionPercentage === 100) || (approvalStatus === 'pending' || approvalStatus === 'under_review');

  useEffect(() => {
    if (approvalStatus === 'approved' && completionPercentage === 100) {
      navigate('/driver/rides', { replace: true });
      return;
    }
    if (isProfileSubmitted && approvalStatus !== 'approved' && !isEditing) {
      navigate('/driver/status', { replace: true });
    }
  }, [isProfileSubmitted, approvalStatus, completionPercentage, isEditing, navigate]);

  const missingItems = React.useMemo(() => {
    const items = [];
    (REQUIRED_PROFILE_FIELDS || []).forEach((f) => { if (!formData[f]) items.push(f.replaceAll('_', ' ')); });
    if (!formData.bank_name && !formData.ecocash_number) items.push('payment method (EcoCash or Bank)');
    if (formData.bmtoa_member && !formData.bmtoa_membership_number) items.push('BMTOA membership number');
    const queuedDocSet = new Set(Object.entries(selectedFiles).filter(([, v]) => !!v).map(([k]) => k));
    (REQUIRED_DOCUMENT_TYPES || []).forEach((dt) => {
      if (queuedDocSet.has(dt)) return;
      const d = (documents || []).find((x) => x?.document_type === dt);
      if (!d?.file_url) items.push(dt.replaceAll('_', ' '));
    });
    const photoFieldMap = { profile_photo: 'profile', vehicle_photo: 'vehicle' };
    (REQUIRED_PHOTO_FIELDS || []).forEach((field) => {
      const pType = photoFieldMap[field];
      const hasDb = !!(driverProfile && driverProfile[field]);
      const queued = pendingPhotos && pendingPhotos[pType];
      if (!(queued || (pendingPhotos[pType] !== false && hasDb))) items.push(field.replaceAll('_', ' '));
    });
    return items;
  }, [formData, documents, selectedFiles, pendingPhotos, driverProfile]);

  const makeOptions = React.useMemo(() => {
    const base = [...VEHICLE_MAKES];
    if (formData.vehicle_make && !base.some(m => m.toLowerCase() === String(formData.vehicle_make).toLowerCase())) {
      return [formData.vehicle_make, ...base];
    }
    return base;
  }, [formData.vehicle_make]);

  const availableModels = formData.vehicle_make ? (VEHICLE_MODELS[formData.vehicle_make] || []) : [];
  const modelOptions = React.useMemo(() => {
    const base = [...availableModels];
    if (formData.vehicle_model && !base.some(m => m.toLowerCase() === String(formData.vehicle_model).toLowerCase())) {
      return [formData.vehicle_model, ...base];
    }
    return base;
  }, [formData.vehicle_model, availableModels]);

  const colorOptions = React.useMemo(() => {
    const base = [...VEHICLE_COLORS];
    if (formData.vehicle_color && !base.some(c => c.toLowerCase() === String(formData.vehicle_color).toLowerCase())) {
      return [formData.vehicle_color, ...base];
    }
    return base;
  }, [formData.vehicle_color]);

  if (loading) {
    return (
      <DriverPWALayout title="Profile">
        <div className="flex items-center justify-center h-64 text-slate-600">Loading profile...</div>
      </DriverPWALayout>
    );
  }

  return (
    <DriverPWALayout title="Profile">
      <div className="max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-slate-50 -mx-6 -mt-6 px-6 py-4 mb-6 shadow-md border-b">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-700">Driver Profile</h1>
              <p className="text-sm text-slate-500">Manage your identity and vehicle information</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/driver/status')} className="hidden sm:flex">
                ← Status
              </Button>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>Cancel</Button>
                  <Button variant="primary" onClick={completionPercentage === 100 ? handleSubmitForApproval : () => handleSave()} disabled={saving}>
                    {saving ? 'Processing...' : (completionPercentage === 100 ? 'Submit for Approval' : 'Save')}
                  </Button>
                </div>
              ) : (
                <Button variant="primary" onClick={() => setIsEditing(true)} disabled={isProfileSubmitted && approvalStatus !== 'rejected'}>
                  {isProfileSubmitted && approvalStatus !== 'rejected' ? 'Awaiting Approval' : 'Edit Profile'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-slate-700">Completion Progress</h2>
            <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${completionPercentage}%` }} />
          </div>
          {isEditing && missingItems.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded text-sm text-amber-800">
              <p className="font-medium mb-1">Items needed for 100%:</p>
              <ul className="list-disc ml-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                {missingItems.map((m, idx) => <li key={idx}>{m}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* SECTION 1: Identity & Account */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">👤</div>
            <h2 className="text-xl font-bold text-slate-800">Account & Identity</h2>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Profile Photo</h3>
              <PhotoUpload
                photoType="profile"
                currentPhotoUrl={driverProfile?.profile_photo}
                onSelectedFile={(file) => setPendingPhotos(p => ({ ...p, profile: file ?? false }))}
                circular={true}
                disabled={!isEditing || saving}
              />
            </div>
            <div className="p-6">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormInput label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} disabled={!isEditing || saving} required />
                <FormInput label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} disabled={!isEditing || saving} required />
                <FormInput label="National ID" name="national_id" value={formData.national_id} onChange={handleChange} disabled={!isEditing || saving} required />
                <FormInput label="Email" value={user?.email || ''} disabled />
                <FormInput label="Phone" value={user?.phone || ''} disabled />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Professional Credentials */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">🪪</div>
            <h2 className="text-xl font-bold text-slate-800">Driver Credentials</h2>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">License Details</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <FormInput label="License Number" name="license_number" value={formData.license_number} onChange={handleChange} disabled={!isEditing || saving} required />
              <FormInput label="License Expiry" name="license_expiry" type="date" value={formData.license_expiry} onChange={handleChange} disabled={!isEditing || saving} required />
              <FormInput label="License Class" name="license_class" value={formData.license_class} onChange={handleChange} disabled={!isEditing || saving} placeholder="e.g. Class 4" required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {DOCUMENT_TYPES.filter(d => d.category === 'credentials').map(docType => (
              <DocumentUploadItem
                key={docType.id}
                docType={docType}
                document={documents?.find(d => d.document_type === docType.id)}
                selectedFile={selectedFiles[docType.id]}
                expiryDate={expiryDates[docType.id]}
                onFileSelect={handleFileSelect}
                onExpiryChange={handleExpiryChange}
                onUpload={handleDocumentAdd}
                disabled={!isEditing || saving}
                isUploading={batchUploading}
              />
            ))}
          </div>
        </div>

        {/* SECTION 3: Vehicle & Compliance */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-green-100 text-green-600 p-2 rounded-lg">🚗</div>
            <h2 className="text-xl font-bold text-slate-800">Vehicle Information</h2>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Vehicle Photo</h3>
              <PhotoUpload
                photoType="vehicle"
                currentPhotoUrl={driverProfile?.vehicle_photo}
                onSelectedFile={(file) => setPendingPhotos(p => ({ ...p, vehicle: file ?? false }))}
                disabled={!isEditing || saving}
              />
            </div>
            <div className="p-6">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Vehicle Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Make *</label>
                  <select name="vehicle_make" value={formData.vehicle_make} onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value, vehicle_model: '' })} disabled={!isEditing || saving} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100">
                    <option value="">Select Make</option>
                    {makeOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Model *</label>
                  <select name="vehicle_model" value={formData.vehicle_model} onChange={handleChange} disabled={!isEditing || !formData.vehicle_make} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100">
                    <option value="">Select Model</option>
                    {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <FormInput label="Vehicle Year" name="vehicle_year" type="number" value={formData.vehicle_year} onChange={handleChange} disabled={!isEditing || saving} placeholder="e.g. 2020" min="1990" max={new Date().getFullYear() + 1} required />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Color *</label>
                  <select name="vehicle_color" value={formData.vehicle_color} onChange={handleChange} disabled={!isEditing || saving} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100">
                    <option value="">Select Color</option>
                    {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <FormInput label="License Plate" name="license_plate" value={formData.license_plate} onChange={handleChange} disabled={!isEditing || saving} placeholder="e.g. ABC 1234" required />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {DOCUMENT_TYPES.filter(d => d.category === 'vehicle').map(docType => (
              <DocumentUploadItem
                key={docType.id}
                docType={docType}
                document={documents?.find(d => d.document_type === docType.id)}
                selectedFile={selectedFiles[docType.id]}
                expiryDate={expiryDates[docType.id]}
                onFileSelect={handleFileSelect}
                onExpiryChange={handleExpiryChange}
                onUpload={handleDocumentAdd}
                disabled={!isEditing || saving}
                isUploading={batchUploading}
              />
            ))}
          </div>
        </div>

        {/* SECTION 4: Payment & Association */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">💰</div>
            <h2 className="text-xl font-bold text-slate-800">Payment & Association</h2>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Payment Information</h3>
            <p className="text-xs text-slate-500 mb-4">Provide at least one method for receiving earnings</p>
            <div className="grid md:grid-cols-2 gap-4">
              <FormInput label="EcoCash Number" name="ecocash_number" value={formData.ecocash_number} onChange={handleChange} disabled={!isEditing || saving} placeholder="0771234567" />
              <FormInput label="Bank Name" name="bank_name" value={formData.bank_name} onChange={handleChange} disabled={!isEditing || saving} placeholder="e.g. CBZ Bank" />
              <FormInput label="Account Number" name="account_number" value={formData.account_number} onChange={handleChange} disabled={!isEditing || saving} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">BMTOA Membership</h3>
            <div className="flex gap-6 mb-4">
              <label className="flex items-center cursor-pointer">
                <input type="radio" checked={formData.bmtoa_member === true} onChange={() => setFormData({ ...formData, bmtoa_member: true })} disabled={!isEditing || saving} className="w-4 h-4 text-yellow-400" />
                <span className="ml-2 text-sm text-slate-700">Member</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="radio" checked={formData.bmtoa_member === false} onChange={() => setFormData({ ...formData, bmtoa_member: false, bmtoa_membership_number: '' })} disabled={!isEditing || saving} className="w-4 h-4 text-yellow-400" />
                <span className="ml-2 text-sm text-slate-700">Not a Member</span>
              </label>
            </div>
            {formData.bmtoa_member && (
              <FormInput label="Membership Number" name="bmtoa_membership_number" value={formData.bmtoa_membership_number} onChange={handleChange} disabled={!isEditing || saving} placeholder="BMTOA-2024-XXX" required />
            )}
          </div>
        </div>

        {/* Global Batch Upload Status */}
        {Object.values(selectedFiles).filter(Boolean).length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 bg-amber-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-bounce-slow">
            <div className="text-sm font-medium">
              {Object.values(selectedFiles).filter(Boolean).length} documents ready to upload
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setSelectedFiles({}); setExpiryDates({}); }} className="text-xs underline hover:text-amber-100">Clear</button>
              <Button variant="primary" size="sm" onClick={handleSubmitAllDocuments} disabled={batchUploading} className="!bg-white !text-amber-600 border-none">
                {batchUploading ? 'Uploading...' : 'Upload Now'}
              </Button>
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="bg-slate-100 rounded-lg p-6 flex flex-wrap justify-between items-center gap-4 border border-slate-200">
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Approval</p>
              <span className={`px-2 py-1 rounded text-xs font-bold ${approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {approvalStatus.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Verified Docs</p>
              <span className={`px-2 py-1 rounded text-xs font-bold ${driverProfile?.documents_verified ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                {driverProfile?.documents_verified ? 'YES' : 'PENDING'}
              </span>
            </div>
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Discard Changes</Button>
              <Button variant="primary" onClick={() => handleSave()}>Save Profile</Button>
            </div>
          )}
        </div>
      </div>
    </DriverPWALayout>
  );
};

export default ProfilePage;
