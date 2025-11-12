/**
 * Mock Data for Profile Completion Testing
 * TaxiCab Platform
 */

export const mockProfiles = {
  // Individual - Complete (full access immediately)
  individual_complete: {
    id: 'ind-001',
    email: 'john.doe@example.com',
    name: 'John Doe',
    phone: '+263 77 123 4567',
    user_type: 'individual',
    platform: 'taxicab',
    profile_completion_status: 'complete',
    profile_completion_percentage: 100,
    preferred_services: ['taxi', 'courier'],
    created_at: '2025-01-01T10:00:00Z',
  },

  // Corporate - Incomplete (needs profile completion)
  corporate_incomplete: {
    id: 'corp-001',
    email: 'admin@techconnect.co.zw',
    name: 'Jane Smith',
    phone: '+263 77 234 5678',
    user_type: 'corporate',
    platform: 'taxicab',
    profile_completion_status: 'incomplete',
    profile_completion_percentage: 20,
    company_name: 'TechConnect Zimbabwe',
    created_at: '2025-01-05T14:30:00Z',
  },

  // Corporate - Partial (some fields completed)
  corporate_partial: {
    id: 'corp-002',
    email: 'manager@innovate.co.zw',
    name: 'Sarah Johnson',
    phone: '+263 77 345 6789',
    user_type: 'corporate',
    platform: 'taxicab',
    profile_completion_status: 'partial',
    profile_completion_percentage: 60,
    company_name: 'Innovate Solutions',
    company_size: '51-200',
    business_registration: 'BR-2024-001',
    created_at: '2025-01-03T09:15:00Z',
  },

  // Corporate - Complete
  corporate_complete: {
    id: 'corp-003',
    email: 'ceo@globaltech.co.zw',
    name: 'Michael Brown',
    phone: '+263 77 456 7890',
    user_type: 'corporate',
    platform: 'taxicab',
    profile_completion_status: 'complete',
    profile_completion_percentage: 100,
    company_name: 'Global Tech Ltd',
    company_size: '201-500',
    business_registration: 'BR-2023-045',
    company_address: '123 Enterprise Road, Bulawayo',
    billing_method: 'prepaid_credits',
    selected_services: ['pre-booked', 'staff-transport', 'recurring'],
    created_at: '2024-12-15T11:00:00Z',
  },

  // Driver - Incomplete (just registered)
  driver_incomplete: {
    id: 'drv-001',
    email: 'driver@example.com',
    name: 'Mike Driver',
    phone: '+263 77 567 8901',
    user_type: 'driver',
    platform: 'taxicab',
    profile_completion_status: 'incomplete',
    profile_completion_percentage: 15,
    created_at: '2025-01-08T16:45:00Z',
  },

  // Driver - Partial (license info added)
  driver_partial: {
    id: 'drv-002',
    email: 'james.driver@example.com',
    name: 'James Ncube',
    phone: '+263 77 678 9012',
    user_type: 'driver',
    platform: 'taxicab',
    profile_completion_status: 'partial',
    profile_completion_percentage: 50,
    license_number: 'DL-BYO-123456',
    license_expiry: '2026-12-31',
    vehicle_type: 'sedan',
    created_at: '2025-01-06T13:20:00Z',
  },
};

/**
 * Mock function to calculate profile completion percentage
 */
export const calculateProfileCompletion = (userType, profileData) => {
  // CRITICAL FIX: If profile_completion_status is 'complete', always return 100
  // This prevents the modal from showing after submission
  if (profileData?.profile_completion_status === 'complete') {
    return 100;
  }

  // If profile_completion_percentage exists in database, use it
  if (profileData?.profile_completion_percentage !== undefined &&
      profileData?.profile_completion_percentage !== null) {
    return profileData.profile_completion_percentage;
  }

  // Otherwise, calculate based on fields (for backward compatibility)
  let requiredFields = [];
  let completedFields = 0;

  switch (userType) {
    case 'individual':
      // Individuals get full access immediately
      return 100;

    case 'corporate':
      requiredFields = [
        'company_name',
        'company_size',
        'business_registration',
        'company_address',
        'billing_method',
        'selected_services',
      ];
      completedFields = requiredFields.filter(field => profileData[field]).length;
      break;

    case 'driver':
      requiredFields = [
        'license_number',
        'license_expiry',
        'license_class',
        'vehicle_make',
        'vehicle_model',
        'vehicle_year',
        'vehicle_color',
        'license_plate',
        'bank_name',
        'account_number',
      ];
      completedFields = requiredFields.filter(field => profileData[field]).length;
      break;

    default:
      return 0;
  }

  return Math.round((completedFields / requiredFields.length) * 100);
};

/**
 * Mock function to determine access level based on profile completion
 */
export const determineAccessLevel = (userType, profileCompletionStatus, verificationStatus) => {
  // Individual users always have full access
  if (userType === 'individual') {
    return 'full';
  }

  // Corporate users need profile completion
  if (userType === 'corporate') {
    return profileCompletionStatus === 'complete' ? 'full' : 'read-only';
  }

  // Drivers need profile completion AND admin verification
  if (userType === 'driver') {
    if (profileCompletionStatus !== 'complete') {
      return 'read-only';
    }
    return verificationStatus === 'verified' ? 'full' : 'read-only';
  }

  return 'read-only';
};

/**
 * Mock function to get required fields for profile completion
 */
export const getRequiredFields = (userType) => {
  switch (userType) {
    case 'individual':
      return {
        fields: [],
        message: 'No additional information required. You have full access!',
      };

    case 'corporate':
      return {
        fields: [
          { name: 'company_name', label: 'Company Name', type: 'text', required: true },
          { name: 'company_size', label: 'Company Size', type: 'select', required: true },
          { name: 'business_registration', label: 'Business Registration Number', type: 'text', required: true },
          { name: 'company_address', label: 'Company Address', type: 'textarea', required: true },
          { name: 'billing_method', label: 'Billing Method', type: 'select', required: true, options: ['prepaid_credits', 'cash'] },
          { name: 'selected_services', label: 'Required Services', type: 'multiselect', required: true },
        ],
        message: 'Complete your company profile to start booking rides.',
      };

    case 'driver':
      return {
        fields: [
          { name: 'license_number', label: 'Driver License Number', type: 'text', required: true },
          { name: 'license_expiry', label: 'License Expiry Date', type: 'date', required: true },
          { name: 'license_class', label: 'License Class', type: 'select', required: true },
          { name: 'vehicle_make', label: 'Vehicle Make', type: 'text', required: true },
          { name: 'vehicle_model', label: 'Vehicle Model', type: 'text', required: true },
          { name: 'vehicle_year', label: 'Vehicle Year', type: 'number', required: true },
          { name: 'vehicle_color', label: 'Vehicle Color', type: 'text', required: true },
          { name: 'license_plate', label: 'License Plate', type: 'text', required: true },
          { name: 'bank_name', label: 'Bank Name', type: 'text', required: true },
          { name: 'account_number', label: 'Account Number', type: 'text', required: true },
        ],
        message: 'Complete your driver profile to start accepting rides.',
      };

    default:
      return { fields: [], message: '' };
  }
};

/**
 * Mock function to check if profile completion should be forced
 */
export const shouldForceProfileCompletion = (loginCount, profileCompletionStatus, userType) => {
  // Never force profile completion modal
  // Users can access the status page and choose to complete profile from there
  return false;
};

/**
 * Mock restricted features by user type and completion status
 */
export const getRestrictedFeatures = (userType, accessLevel) => {
  if (accessLevel === 'full') {
    return [];
  }

  const restrictions = {
    corporate: [
      'book_ride',
      'schedule_trip',
      'add_passenger',
      'bulk_booking',
      'view_billing',
    ],
    driver: [
      'accept_rides',
      'go_online',
      'view_earnings',
      'update_availability',
    ],
  };

  return restrictions[userType] || [];
};

export default {
  mockProfiles,
  calculateProfileCompletion,
  determineAccessLevel,
  getRequiredFields,
  shouldForceProfileCompletion,
  getRestrictedFeatures,
};

