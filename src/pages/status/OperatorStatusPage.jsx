import React from 'react';
import ProfileStatusPage from '../../components/status/ProfileStatusPage';

/**
 * OperatorStatusPage - Status page for Operator profile
 * 
 * Shows dynamic status based on:
 * - profile_completion_status (incomplete/complete)
 * - approval_status (pending/approved/rejected)
 * - account_status (active/disabled/suspended)
 * - subscription_status (active/expired/pending_verification)
 * 
 * Note: Operator profiles are only accessible from BMTOA landing, not PWA
 * This page is included for completeness but may not be used in PWA
 */
const OperatorStatusPage = () => {
  return <ProfileStatusPage profileType="operator" />;
};

export default OperatorStatusPage;

