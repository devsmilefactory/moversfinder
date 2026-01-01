/**
 * Unified Driver Status Checking Utility
 * 
 * Single source of truth for checking driver profile status
 * Used across DriverRidesPage, ProfileStatusPage, and routing logic
 */

import { computeDriverCompletion } from './driverCompletion';

/**
 * Get unified driver status information
 * @param {Object} activeProfile - The active driver profile from profileStore
 * @param {Array} documents - Array of driver documents
 * @returns {Object} Status object with all relevant information
 */
export function getDriverStatus(activeProfile = {}, documents = []) {
  // Calculate completion percentage
  const completionPercentage = computeDriverCompletion(activeProfile, documents);
  
  // Get status fields
  const profileCompletionStatus = activeProfile?.profile_completion_status || 'incomplete';
  const approvalStatus = activeProfile?.approval_status || 'pending';
  const accountStatus = activeProfile?.account_status || 'active';
  
  // Determine if profile is complete
  const isProfileComplete = (
    String(profileCompletionStatus).toLowerCase() === 'complete' || 
    Number(completionPercentage) >= 100
  );
  
  // Determine current state
  let state = 'loading';
  let shouldShowStatusPage = false;
  
  if (accountStatus === 'suspended') {
    state = 'suspended';
    shouldShowStatusPage = true;
  } else if (accountStatus === 'disabled') {
    state = 'disabled';
    shouldShowStatusPage = true;
  } else if (!isProfileComplete) {
    state = 'incomplete';
    shouldShowStatusPage = true;
  } else if (approvalStatus === 'rejected') {
    state = 'rejected';
    shouldShowStatusPage = true;
  } else if (approvalStatus === 'pending' || approvalStatus === 'under_review') {
    state = 'pending';
    shouldShowStatusPage = true;
  } else if (approvalStatus === 'approved') {
    state = 'approved';
    shouldShowStatusPage = false;
  } else {
    // Fallback: if profile complete but no approval status, assume pending
    state = 'pending';
    shouldShowStatusPage = true;
  }
  
  return {
    state,
    isProfileComplete,
    completionPercentage,
    approvalStatus,
    accountStatus,
    profileCompletionStatus,
    rejectionReason: activeProfile?.rejection_reason,
    suspensionReason: activeProfile?.suspension_reason,
    shouldShowStatusPage,
    canAccessRides: state === 'approved'
  };
}

/**
 * Check if driver should be redirected to status page
 * @param {Object} activeProfile - The active driver profile
 * @param {Array} documents - Array of driver documents
 * @returns {boolean} True if should redirect to status page
 */
export function shouldRedirectToStatus(activeProfile = {}, documents = []) {
  const status = getDriverStatus(activeProfile, documents);
  return status.shouldShowStatusPage;
}






