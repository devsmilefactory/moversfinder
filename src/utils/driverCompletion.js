// Shared presence-based completion calculation for driver profiles
// Usage: computeDriverCompletion(profileLike, docsArray, { queuedDocTypes?: string[], selectedPhotos?: {profile?: File|null, vehicle?: File|null, license?: File|null} })
// Assumptions:
// - profileLike has keys for text fields and payment fields (bank_name, ecocash_number)
// - docsArray entries have document_type and file_url (snake_case)
// - queuedDocTypes: array of document_type ids that are queued for upload in the UI
// - selectedPhotos: local UI state for photo files picked but not yet uploaded

export const REQUIRED_PROFILE_FIELDS = [
  'full_name', 'date_of_birth', 'national_id', 'license_number',
  'license_expiry', 'license_class', 'vehicle_make', 'vehicle_model',
  'vehicle_year', 'vehicle_color', 'license_plate'
];

export const REQUIRED_DOCUMENT_TYPES = [
  'drivers_license', 'psv_license', 'vehicle_registration',
  'insurance', 'roadworthy', 'police_clearance', 'medical_certificate'
];

export const REQUIRED_PHOTO_FIELDS = ['profile_photo', 'vehicle_photo', 'license_document'];

export function computeDriverCompletion(profileLike = {}, docsArray = [], options = {}) {
  const { queuedDocTypes = [], selectedPhotos = {} } = options;

  // Fields
  const filledFields = REQUIRED_PROFILE_FIELDS.filter((f) => !!profileLike[f]).length;


  // Documents presence: count if queued or has file_url in DB
  const queuedSet = new Set(queuedDocTypes);
  const docsPresent = REQUIRED_DOCUMENT_TYPES.filter((dt) => {
    if (queuedSet.has(dt)) return true;
    const dbDoc = (docsArray || []).find((d) => d?.document_type === dt);
    const fileUrl = dbDoc?.file_url || dbDoc?.fileUrl; // tolerate camelCase if provided
    return !!fileUrl;
  }).length;

  // Photo presence: count if selected in UI (truthy) or URL exists in profileLike
  // If selectedPhotos[photoType] === false, treat as an explicit removal (do not count DB value)
  const photosPresent = REQUIRED_PHOTO_FIELDS.filter((field) => {
    const photoType = field === 'profile_photo' ? 'profile' : field === 'vehicle_photo' ? 'vehicle' : 'license';
    if (selectedPhotos && selectedPhotos[photoType] === false) return false; // explicit remove
    if (selectedPhotos && selectedPhotos[photoType]) return true; // queued file
    return !!profileLike[field]; // existing DB value
  }).length;

  const totalRequired = REQUIRED_PROFILE_FIELDS.length + REQUIRED_DOCUMENT_TYPES.length + REQUIRED_PHOTO_FIELDS.length;
  const totalFilled = filledFields + docsPresent + photosPresent;

  return Math.round((totalFilled / totalRequired) * 100);
}

