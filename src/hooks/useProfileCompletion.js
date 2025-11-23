/**
 * useProfileCompletion Hook
 * TaxiCab Platform
 *
 * Manages profile completion state and access control
 */

import { useState, useEffect, useCallback } from 'react';
import {
  calculateProfileCompletion,
  determineAccessLevel,
  getRequiredFields,
  shouldForceProfileCompletion,
  getRestrictedFeatures,
} from '../mocks/profileCompletionMocks';
import useProfileStore from '../stores/profileStore';
import useDriverStore from '../stores/driverStore';
import { computeDriverCompletion } from '../utils/driverCompletion';

/**
 * Hook to manage profile completion for a user
 * @param {Object} user - Current user object
 * @returns {Object} Profile completion state and methods
 */
export const useProfileCompletion = (user) => {
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [completionStatus, setCompletionStatus] = useState('incomplete');
  const [accessLevel, setAccessLevel] = useState('read-only');
  const [requiredFields, setRequiredFields] = useState([]);
  const [restrictedFeatures, setRestrictedFeatures] = useState([]);
  const [shouldShowCompletionModal, setShouldShowCompletionModal] = useState(false);
  const [shouldShowBanner, setShouldShowBanner] = useState(false);

  // Get active profile from profileStore for multi-profile users (driver, corporate)
  const activeProfile = useProfileStore((state) => state.activeProfile);
  // Driver docs for client-side completion
  const { documents, loadDocuments } = useDriverStore();

  const activeProfileType = useProfileStore((state) => state.activeProfileType);

  /**
   * Calculate and update profile completion state
   */
  const updateCompletionState = useCallback(() => {
    if (!user) {
      setCompletionPercentage(0);
      setCompletionStatus('incomplete');
      setAccessLevel('read-only');
      setRequiredFields([]);
      setRestrictedFeatures([]);
      setShouldShowCompletionModal(false);
      setShouldShowBanner(false);
      return;
    }

    const userType = user.user_type || user.userType;

    // For driver and corporate users, use activeProfile data if available
    // This contains the actual profile_status, approval_status, completion_percentage
    let profileData = user;
    let percentage = 0;
    let status = 'incomplete';

    if ((userType === 'driver' || userType === 'corporate') && activeProfile) {
      // For driver: compute client-side using unified presence-based utility
      if (userType === 'driver') {
        percentage = computeDriverCompletion(activeProfile, documents || []);
      } else {
        // Corporate: continue using DB-stored percentage
        percentage = activeProfile.completion_percentage || 0;
      }

      // Determine status based on profile_status and approval_status
      const profileStatus = activeProfile.profile_status;
      const approvalStatus = activeProfile.approval_status;

      if (approvalStatus === 'approved' && profileStatus === 'approved') {
        status = 'complete';
        percentage = 100;
      } else if (profileStatus === 'pending_approval') {
        status = 'partial';
      } else if (profileStatus === 'in_progress') {
        status = percentage >= 50 ? 'partial' : 'incomplete';
      } else {
        status = 'incomplete';
      }
    } else {
      // For individual users or when activeProfile not loaded, use legacy mocks fallback
      percentage = calculateProfileCompletion(userType, profileData);

      if (percentage === 100) {
        status = 'complete';
      } else if (percentage >= 50) {
        status = 'partial';
      }
    }

    setCompletionPercentage(percentage);
    setCompletionStatus(status);

    // Determine access level
    // Use type-specific verification/approval status for multi-profile users
    let verificationStatus = 'approved';
    if ((userType === 'driver' || userType === 'corporate')) {
      const appr = activeProfile?.approval_status;
      verificationStatus = appr === 'approved' ? 'approved' : (appr === 'rejected' ? 'rejected' : 'pending');
    }
    const access = determineAccessLevel(userType, status, verificationStatus);
    setAccessLevel(access);

    // Get required fields
    const fields = getRequiredFields(userType);
    setRequiredFields(fields);

    // Get restricted features
    const restricted = getRestrictedFeatures(userType, access);
    setRestrictedFeatures(restricted);

    // Determine if should show completion modal
    // Don't show modal if profile is already complete (approved), even if login count is high
    const loginCount = user.login_count || 0;
    const forceCompletion = status !== 'complete' && shouldForceProfileCompletion(loginCount, status, userType);
    setShouldShowCompletionModal(forceCompletion);

    // Determine if should show banner
    const showBanner = status !== 'complete' && userType !== 'individual';
    setShouldShowBanner(showBanner);
  }, [user, activeProfile, activeProfileType, documents]);

  /**
   * Update state when user changes
   */
  useEffect(() => {
    updateCompletionState();
  }, [updateCompletionState]);

  /**
   * Check if a feature is restricted
   */
  const isFeatureRestricted = useCallback((featureName) => {
    return restrictedFeatures.includes(featureName);
  }, [restrictedFeatures]);

  // Ensure driver documents are loaded for accurate client-side completion
  useEffect(() => {
    const userType = user?.user_type || user?.userType;
    if (userType !== 'driver' || !user?.id) return;
    loadDocuments(user.id);
  }, [user?.id, user?.user_type, user?.userType]);

  /**
   * Get restriction message for a feature
   */
  const getRestrictionMessage = useCallback((featureName) => {
    if (!isFeatureRestricted(featureName)) {
      return null;
    }

    const userType = user?.user_type || user?.userType;

    if (userType === 'corporate') {
      return 'Complete your company profile to access this feature';
    }

    if (userType === 'driver') {
      if (completionStatus !== 'complete') {
        return 'Complete your driver profile to access this feature';
      }
      return 'Your profile is pending admin verification';
    }

    return 'Complete your profile to access this feature';
  }, [isFeatureRestricted, user, completionStatus]);

  /**
   * Dismiss completion modal (user can dismiss, but will show again after 3 logins)
   */
  const dismissCompletionModal = useCallback(() => {
    setShouldShowCompletionModal(false);
  }, []);

  /**
   * Dismiss banner (temporary, will show again on next page load)
   */
  const dismissBanner = useCallback(() => {
    setShouldShowBanner(false);
  }, []);

  /**
   * Check if user has full access
   */
  const hasFullAccess = accessLevel === 'full';

  /**
   * Check if user is in read-only mode
   */
  const isReadOnly = accessLevel === 'read-only';

  /**
   * Get completion status color
   */
  const getStatusColor = useCallback(() => {
    if (completionPercentage === 100) return 'green';
    if (completionPercentage >= 50) return 'yellow';
    return 'red';
  }, [completionPercentage]);

  /**
   * Get completion status text
   */
  const getStatusText = useCallback(() => {
    if (completionPercentage === 100) return 'Complete';
    if (completionPercentage >= 50) return 'Partially Complete';
    return 'Incomplete';
  }, [completionPercentage]);

  return {
    // State
    completionPercentage,
    completionStatus,
    accessLevel,
    requiredFields,
    restrictedFeatures,
    shouldShowCompletionModal,
    shouldShowBanner,
    hasFullAccess,
    isReadOnly,

    // Methods
    updateCompletionState,
    isFeatureRestricted,
    getRestrictionMessage,
    dismissCompletionModal,
    dismissBanner,
    getStatusColor,
    getStatusText,
  };
};

/**
 * Hook to check if a specific feature is accessible
 * @param {string} featureName - Name of the feature to check
 * @param {Object} user - Current user object
 * @returns {Object} Feature accessibility state
 */
export const useFeatureAccess = (featureName, user) => {
  const { isFeatureRestricted, getRestrictionMessage, hasFullAccess } = useProfileCompletion(user);

  const isAccessible = !isFeatureRestricted(featureName);
  const restrictionMessage = getRestrictionMessage(featureName);

  return {
    isAccessible,
    restrictionMessage,
    hasFullAccess,
  };
};

export default useProfileCompletion;

