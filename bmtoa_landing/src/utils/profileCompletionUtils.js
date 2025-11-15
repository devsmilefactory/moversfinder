/**
 * Profile Completion Utilities
 * BMTOA Platform
 * 
 * Utility functions for calculating profile completion and access control
 * NO MOCK DATA - Pure utility functions only
 */

/**
 * Calculate profile completion percentage based on user type
 * @param {string} userType - Type of user (driver, operator, admin, etc.)
 * @param {Object} profileData - User profile data
 * @returns {number} Completion percentage (0-100)
 */
export const calculateProfileCompletion = (userType, profileData) => {
  if (!profileData) return 0;

  const requiredFields = getRequiredFields(userType);
  if (requiredFields.length === 0) return 100;

  const completedFields = requiredFields.filter(field => {
    const value = profileData[field];
    return value !== null && value !== undefined && value !== '';
  });

  return Math.round((completedFields.length / requiredFields.length) * 100);
};

/**
 * Get required fields for a user type
 * @param {string} userType - Type of user
 * @returns {Array<string>} Array of required field names
 */
export const getRequiredFields = (userType) => {
  const commonFields = ['full_name', 'email', 'phone'];

  switch (userType) {
    case 'driver':
      return [
        ...commonFields,
        'license_number',
        'license_expiry',
        'vehicle_registration',
        'vehicle_make',
        'vehicle_model',
        'vehicle_year',
        'insurance_number',
        'insurance_expiry',
      ];

    case 'taxi_operator':
    case 'operator':
      return [
        ...commonFields,
        'company_name',
        'business_registration',
        'operating_areas',
        'fleet_size',
        'contact_email',
        'contact_phone',
      ];

    case 'admin':
      return commonFields;

    case 'individual':
    case 'corporate':
      return commonFields;

    default:
      return commonFields;
  }
};

/**
 * Determine access level based on profile completion and verification
 * @param {string} userType - Type of user
 * @param {string} completionStatus - Profile completion status (complete, partial, incomplete)
 * @param {string} verificationStatus - Verification status (verified, pending, rejected)
 * @param {boolean} gracePeriodActive - Whether grace period is active (for operators)
 * @returns {string} Access level (full, limited, read-only)
 */
export const determineAccessLevel = (
  userType,
  completionStatus,
  verificationStatus,
  gracePeriodActive = false
) => {
  // Admin always has full access
  if (userType === 'admin') {
    return 'full';
  }

  // Individual and corporate users have full access if profile is complete
  if (userType === 'individual' || userType === 'corporate') {
    return completionStatus === 'complete' ? 'full' : 'limited';
  }

  // Operators with grace period have limited access
  if ((userType === 'taxi_operator' || userType === 'operator') && gracePeriodActive) {
    return 'limited';
  }

  // Drivers and operators need complete profile AND verification
  if (userType === 'driver' || userType === 'taxi_operator' || userType === 'operator') {
    if (completionStatus !== 'complete') {
      return 'read-only';
    }
    if (verificationStatus === 'verified') {
      return 'full';
    }
    return 'limited';
  }

  return 'read-only';
};

/**
 * Check if grace period is still active
 * @param {string|Date} gracePeriodEnd - Grace period end date
 * @returns {boolean} True if grace period is active
 */
export const isGracePeriodActive = (gracePeriodEnd) => {
  if (!gracePeriodEnd) return false;
  const endDate = new Date(gracePeriodEnd);
  const now = new Date();
  return endDate > now;
};

/**
 * Calculate days remaining in grace period
 * @param {string|Date} gracePeriodEnd - Grace period end date
 * @returns {number} Days remaining (0 if expired)
 */
export const calculateGracePeriodDaysRemaining = (gracePeriodEnd) => {
  if (!gracePeriodEnd) return 0;
  const endDate = new Date(gracePeriodEnd);
  const now = new Date();
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Get restricted features based on user type and access level
 * @param {string} userType - Type of user
 * @param {string} accessLevel - Access level (full, limited, read-only)
 * @returns {Array<string>} Array of restricted feature names
 */
export const getRestrictedFeatures = (userType, accessLevel) => {
  if (accessLevel === 'full') {
    return [];
  }

  const commonRestrictions = ['settings', 'billing'];

  if (accessLevel === 'read-only') {
    return [
      ...commonRestrictions,
      'create',
      'edit',
      'delete',
      'accept_rides',
      'manage_fleet',
      'manage_drivers',
      'financial_reports',
    ];
  }

  // Limited access
  if (userType === 'driver') {
    return [...commonRestrictions, 'accept_rides', 'financial_reports'];
  }

  if (userType === 'taxi_operator' || userType === 'operator') {
    return [...commonRestrictions, 'manage_drivers', 'financial_reports'];
  }

  return commonRestrictions;
};

/**
 * Get profile completion message
 * @param {number} percentage - Completion percentage
 * @param {string} userType - Type of user
 * @returns {string} User-friendly message
 */
export const getCompletionMessage = (percentage, userType) => {
  if (percentage === 100) {
    return 'Your profile is complete!';
  }

  if (percentage >= 75) {
    return 'Almost there! Just a few more details needed.';
  }

  if (percentage >= 50) {
    return 'You\'re halfway there! Complete your profile for full access.';
  }

  if (percentage >= 25) {
    return 'Let\'s complete your profile to unlock all features.';
  }

  return 'Welcome! Please complete your profile to get started.';
};

/**
 * Get verification status message
 * @param {string} verificationStatus - Verification status
 * @param {string} userType - Type of user
 * @returns {string} User-friendly message
 */
export const getVerificationMessage = (verificationStatus, userType) => {
  switch (verificationStatus) {
    case 'verified':
      return 'Your profile is verified!';
    case 'pending':
      if (userType === 'driver') {
        return 'Your profile is pending operator approval and BMTOA verification.';
      }
      return 'Your profile is pending BMTOA verification.';
    case 'rejected':
      return 'Your verification was not approved. Please contact support.';
    default:
      return 'Verification status unknown.';
  }
};

