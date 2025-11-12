import React from 'react';
import ProfileStatusPage from '../../components/status/ProfileStatusPage';
import DriverPWALayout from '../../components/layouts/DriverPWALayout';

/**
 * DriverStatusPage - Status page for Driver profile
 *
 * Shows dynamic status based on:
 * - profile_completion_status (incomplete/complete)
 * - approval_status (pending/approved/rejected)
 * - account_status (active/disabled/suspended)
 */
const DriverStatusPage = () => {
  return (
    <DriverPWALayout title="Status">
      <ProfileStatusPage profileType="driver" />
    </DriverPWALayout>
  );
};

export default DriverStatusPage;

