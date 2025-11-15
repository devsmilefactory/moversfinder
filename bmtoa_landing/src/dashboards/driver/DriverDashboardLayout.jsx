import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardLayout from '../shared/DashboardLayout';
import useAuthStore from '../../stores/authStore';

/**
 * Driver Dashboard Layout Wrapper
 * Uses React Router's Outlet to render child routes
 * Fetches user from auth store (no mock data)
 */
const DriverDashboardLayout = () => {
  const user = useAuthStore((state) => state.user);

  // User is guaranteed to exist because of ProtectedRoute
  // Convert to format expected by DashboardLayout and DashboardHeader
  // Include both camelCase and snake_case for compatibility
  const dashboardUser = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.user_type,
    user_type: user.user_type, // For DashboardHeader compatibility
    phone: user.phone,
    avatar: user.avatar_url,
    avatar_url: user.avatar_url,
    profile_photo: user.avatar_url, // For DashboardHeader compatibility
    full_name: user.name, // For DashboardHeader compatibility
    profile_completion_status: user.profile_completion_status,
    profile_completion_percentage: user.profile_completion_percentage,
    verification_status: user.verification_status,
  } : null;

  if (!dashboardUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="driver" user={dashboardUser}>
      <Outlet />
    </DashboardLayout>
  );
};

export default DriverDashboardLayout;

