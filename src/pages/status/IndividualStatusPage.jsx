import React from 'react';
import ProfileStatusPage from '../../components/status/ProfileStatusPage';

/**
 * IndividualStatusPage - Status page for Individual profile
 * 
 * Shows dynamic status based on:
 * - account_status (active/disabled/suspended)
 * 
 * Individual profiles are auto-approved, so they only show account status states
 */
const IndividualStatusPage = () => {
  return <ProfileStatusPage profileType="individual" />;
};

export default IndividualStatusPage;

