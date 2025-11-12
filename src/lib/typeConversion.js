/**
 * Type Conversion Utilities
 * 
 * Safely converts form data to database-compatible types
 * Prevents "invalid input syntax" errors from PostgreSQL
 * 
 * Common Issues Fixed:
 * - Empty strings "" sent for INTEGER fields → NULL
 * - Empty strings "" sent for NUMERIC fields → NULL
 * - Empty strings "" sent for DATE fields → NULL
 * - Empty strings "" sent for UUID fields → NULL
 * - String "true"/"false" sent for BOOLEAN fields → true/false
 */

/**
 * Safely convert to integer
 * @param {any} value - Value to convert
 * @returns {number|null} Integer or null
 */
export const safeInt = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Safely convert to numeric/decimal
 * @param {any} value - Value to convert
 * @returns {number|null} Number or null
 */
export const safeNumeric = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Safely convert to date
 * @param {any} value - Value to convert
 * @returns {string|null} ISO date string or null
 */
export const safeDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  // If already a valid date string, return it
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value;
  }
  return null;
};

/**
 * Safely convert to UUID
 * @param {any} value - Value to convert
 * @returns {string|null} UUID string or null
 */
export const safeUUID = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  // Basic UUID validation
  if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return value;
  }
  return null;
};

/**
 * Safely convert to boolean
 * @param {any} value - Value to convert
 * @returns {boolean} Boolean value
 */
export const safeBoolean = (value) => {
  if (value === null || value === undefined || value === '' || value === 'false' || value === '0' || value === 0 || value === false) {
    return false;
  }
  if (value === 'true' || value === '1' || value === 1 || value === true) {
    return true;
  }
  return false;
};

/**
 * Profile field type definitions
 * Maps field names to their database types
 */
const FIELD_TYPES = {
  // Integer fields
  vehicle_year: 'integer',
  total_employees: 'integer',
  total_drivers: 'integer',
  grace_period_days_remaining: 'integer',
  total_rides: 'integer',
  completion_percentage: 'integer',
  
  // Numeric fields
  monthly_spend: 'numeric',
  credit_balance: 'numeric',
  low_balance_threshold: 'numeric',
  credit_limit: 'numeric',
  monthly_revenue: 'numeric',
  total_spent: 'numeric',
  
  // Date fields
  date_of_birth: 'date',
  license_expiry: 'date',
  bmtoa_member_since: 'date',
  
  // UUID fields
  assigned_operator_id: 'uuid',
  assigned_vehicle_id: 'uuid',
  operator_id: 'uuid',
  approved_by: 'uuid',
  
  // Boolean fields
  bmtoa_member: 'boolean',
  bmtoa_verified: 'boolean',
  documents_verified: 'boolean',
  auto_invoice: 'boolean',
  credit_booking_approved: 'boolean',
  grace_period_active: 'boolean',
};

/**
 * Convert form data to database-safe types
 * @param {Object} data - Form data object
 * @param {Array<string>} allowedFields - List of allowed field names (optional)
 * @returns {Object} Converted data object
 */
export const convertFormData = (data, allowedFields = null) => {
  const converted = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip if field is not in allowed list
    if (allowedFields && !allowedFields.includes(key)) {
      continue;
    }
    
    const fieldType = FIELD_TYPES[key];
    
    switch (fieldType) {
      case 'integer':
        converted[key] = safeInt(value);
        break;
      case 'numeric':
        converted[key] = safeNumeric(value);
        break;
      case 'date':
        converted[key] = safeDate(value);
        break;
      case 'uuid':
        converted[key] = safeUUID(value);
        break;
      case 'boolean':
        converted[key] = safeBoolean(value);
        break;
      default:
        // For text, jsonb, and other types, keep as-is
        converted[key] = value;
    }
  }
  
  return converted;
};

/**
 * Driver profile allowed fields
 */
export const DRIVER_PROFILE_FIELDS = [
  'full_name', 'date_of_birth', 'national_id', 'license_number',
  'license_expiry', 'license_class', 'vehicle_make', 'vehicle_model',
  'vehicle_year', 'vehicle_color', 'license_plate', 'bank_name',
  'account_number', 'account_holder_name', 'ecocash_number', 
  'bmtoa_member', 'bmtoa_membership_number',
  'profile_photo', 'license_document', 'vehicle_photo',
  'vehicle_registration', 'insurance_certificate', 'roadworthy_certificate',
  'assigned_operator_id', 'assigned_vehicle_id', 'operator_id'
];

/**
 * Corporate profile allowed fields
 */
export const CORPORATE_PROFILE_FIELDS = [
  'company_name', 'company_size', 'business_registration', 
  'business_registration_document', 'address', 'industry',
  'primary_contact_name', 'primary_contact_phone', 'primary_contact_email',
  'billing_contact_name', 'billing_contact_email',
  'interested_services', 'selected_services', 'billing_address', 'tax_id',
  'account_tier', 'billing_info', 'total_employees', 'monthly_spend',
  'credit_balance', 'low_balance_threshold', 'auto_invoice',
  'contact_person', 'email', 'credit_booking_approved', 'credit_limit',
  'billing_method'
];

/**
 * Operator profile allowed fields
 */
export const OPERATOR_PROFILE_FIELDS = [
  'company_name', 'business_registration', 'company_address',
  'company_phone', 'company_email', 'bmtoa_member_number',
  'fleet_size', 'operating_areas', 'business_license',
  'tax_clearance', 'bmtoa_certificate', 'bank_name',
  'account_number', 'account_holder_name', 'membership_tier',
  'bmtoa_member_since', 'bmtoa_verified', 'bmtoa_verified_at',
  'grace_period_start', 'grace_period_end', 'grace_period_active',
  'grace_period_days_remaining', 'total_drivers', 'monthly_revenue'
];

/**
 * Individual profile allowed fields
 */
export const INDIVIDUAL_PROFILE_FIELDS = [
  'service_preferences', 'saved_places', 'payment_methods',
  'preferences', 'total_rides', 'total_spent'
];

/**
 * Convert driver profile data
 * @param {Object} data - Form data
 * @returns {Object} Converted data
 */
export const convertDriverProfileData = (data) => {
  return convertFormData(data, DRIVER_PROFILE_FIELDS);
};

/**
 * Convert corporate profile data
 * @param {Object} data - Form data
 * @returns {Object} Converted data
 */
export const convertCorporateProfileData = (data) => {
  return convertFormData(data, CORPORATE_PROFILE_FIELDS);
};

/**
 * Convert operator profile data
 * @param {Object} data - Form data
 * @returns {Object} Converted data
 */
export const convertOperatorProfileData = (data) => {
  return convertFormData(data, OPERATOR_PROFILE_FIELDS);
};

/**
 * Convert individual profile data
 * @param {Object} data - Form data
 * @returns {Object} Converted data
 */
export const convertIndividualProfileData = (data) => {
  return convertFormData(data, INDIVIDUAL_PROFILE_FIELDS);
};

