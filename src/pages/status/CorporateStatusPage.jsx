import React from 'react';
import ProfileStatusPage from '../../components/status/ProfileStatusPage';

/**
 * CorporateStatusPage - Status page for Corporate profile
 * 
 * Shows dynamic status based on:
 * - profile_completion_status (incomplete/complete)
 * - approval_status (pending/approved/rejected)
 * - account_status (active/disabled/suspended)
 */
const CorporateStatusPage = () => {
  return <ProfileStatusPage profileType="corporate" />;
};

export default CorporateStatusPage;

