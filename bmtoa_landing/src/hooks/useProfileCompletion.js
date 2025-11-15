/**
 * useProfileCompletion Hook
 * BMTOA Platform
 * 
 * Manages profile completion state, access control, and grace period
 */

import { useState, useEffect, useCallback } from 'react';
import {
  calculateProfileCompletion,
  determineAccessLevel,
  isGracePeriodActive,
  calculateGracePeriodDaysRemaining,
  getRequiredFields,
  getRestrictedFeatures,
} from '../utils/profileCompletionUtils';

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
  
  // Grace period state (for operators)
  const [gracePeriodActive, setGracePeriodActive] = useState(false);
  const [gracePeriodDaysRemaining, setGracePeriodDaysRemaining] = useState(0);
  const [shouldShowGracePeriodBanner, setShouldShowGracePeriodBanner] = useState(false);

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
      setGracePeriodActive(false);
      setGracePeriodDaysRemaining(0);
      setShouldShowGracePeriodBanner(false);
      return;
    }

    const userType = user.user_type || user.userType;
    const profileData = user;

    // Calculate completion percentage
    const percentage = calculateProfileCompletion(userType, profileData);
    setCompletionPercentage(percentage);

    // Determine completion status
    let status = 'incomplete';
    if (percentage === 100) {
      status = 'complete';
    } else if (percentage >= 50) {
      status = 'partial';
    }
    setCompletionStatus(status);

    // Check grace period (for operators)
    const isOperator = userType === 'taxi_operator' || userType === 'operator';
    let gracePeriodIsActive = false;
    let daysRemaining = 0;

    if (isOperator && user.grace_period_end) {
      gracePeriodIsActive = isGracePeriodActive(user.grace_period_end);
      daysRemaining = calculateGracePeriodDaysRemaining(user.grace_period_end);
      setGracePeriodActive(gracePeriodIsActive);
      setGracePeriodDaysRemaining(daysRemaining);
      setShouldShowGracePeriodBanner(gracePeriodIsActive && daysRemaining <= 3);
    }

    // Determine access level
    const verificationStatus = user.verification_status || 'pending';
    const access = determineAccessLevel(userType, status, verificationStatus, gracePeriodIsActive);
    setAccessLevel(access);

    // Get required fields
    const fields = getRequiredFields(userType);
    setRequiredFields(fields);

    // Get restricted features
    const restricted = getRestrictedFeatures(userType, access);
    setRestrictedFeatures(restricted);

    // Determine if should show completion modal
    const loginCount = user.login_count || 0;
    const forceCompletion = loginCount >= 3 && status !== 'complete' && userType !== 'admin';
    setShouldShowCompletionModal(forceCompletion);

    // Determine if should show banner
    const showBanner = status !== 'complete' && userType !== 'admin';
    setShouldShowBanner(showBanner);
  }, [user]);

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

  /**
   * Get restriction message for a feature
   */
  const getRestrictionMessage = useCallback((featureName) => {
    if (!isFeatureRestricted(featureName)) {
      return null;
    }

    const userType = user?.user_type || user?.userType;

    if (userType === 'taxi_operator' || userType === 'operator') {
      if (gracePeriodActive) {
        return `Limited access during grace period (${gracePeriodDaysRemaining} days remaining). Complete your profile for full access.`;
      }
      if (completionStatus !== 'complete') {
        return 'Complete your operator profile to access this feature';
      }
      return 'Your profile is pending BMTOA verification';
    }

    if (userType === 'driver') {
      if (completionStatus !== 'complete') {
        return 'Complete your driver profile to access this feature';
      }
      return 'Your profile is pending operator approval and BMTOA verification';
    }

    return 'Complete your profile to access this feature';
  }, [isFeatureRestricted, user, completionStatus, gracePeriodActive, gracePeriodDaysRemaining]);

  /**
   * Dismiss completion modal
   */
  const dismissCompletionModal = useCallback(() => {
    setShouldShowCompletionModal(false);
  }, []);

  /**
   * Dismiss banner
   */
  const dismissBanner = useCallback(() => {
    setShouldShowBanner(false);
  }, []);

  /**
   * Dismiss grace period banner
   */
  const dismissGracePeriodBanner = useCallback(() => {
    setShouldShowGracePeriodBanner(false);
  }, []);

  /**
   * Check if user has full access
   */
  const hasFullAccess = accessLevel === 'full';

  /**
   * Check if user has limited access (grace period)
   */
  const hasLimitedAccess = accessLevel === 'limited';

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

  /**
   * Get grace period status color
   */
  const getGracePeriodColor = useCallback(() => {
    if (gracePeriodDaysRemaining <= 1) return 'red';
    if (gracePeriodDaysRemaining <= 3) return 'yellow';
    return 'green';
  }, [gracePeriodDaysRemaining]);

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
    hasLimitedAccess,
    isReadOnly,

    // Grace period state
    gracePeriodActive,
    gracePeriodDaysRemaining,
    shouldShowGracePeriodBanner,

    // Methods
    updateCompletionState,
    isFeatureRestricted,
    getRestrictionMessage,
    dismissCompletionModal,
    dismissBanner,
    dismissGracePeriodBanner,
    getStatusColor,
    getStatusText,
    getGracePeriodColor,
  };
};

/**
 * Hook to check if a specific feature is accessible
 * @param {string} featureName - Name of the feature to check
 * @param {Object} user - Current user object
 * @returns {Object} Feature accessibility state
 */
export const useFeatureAccess = (featureName, user) => {
  const { isFeatureRestricted, getRestrictionMessage, hasFullAccess, hasLimitedAccess } = useProfileCompletion(user);

  const isAccessible = !isFeatureRestricted(featureName);
  const restrictionMessage = getRestrictionMessage(featureName);

  return {
    isAccessible,
    restrictionMessage,
    hasFullAccess,
    hasLimitedAccess,
  };
};

export default useProfileCompletion;

