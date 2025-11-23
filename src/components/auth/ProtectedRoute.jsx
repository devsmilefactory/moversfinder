import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';

/**
 * ProtectedRoute Component - Multi-Profile System
 *
 * Protects routes by checking:
 * 1. User is authenticated
 * 2. User has the required profile type
 * 3. Profile is approved and accessible
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} props.requiredProfile - Required profile type: 'individual', 'corporate', 'driver', 'operator'
 * @param {boolean} props.requireProfileCompletion - Whether to require complete profile (default: false)
 */
const ProtectedRoute = ({
  children,
  requiredProfile = null
}) => {
  const location = useLocation();
  const { user, isAuthenticated, authLoading } = useAuthStore();
  const { getProfileStatus, canAccessProfile, activeProfileType } = useProfileStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Give a moment for auth to initialize
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking auth
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login page
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Get status page route for this profile type
  const getStatusPageRoute = (profileType) => {
    const routes = {
      individual: '/user/status',
      corporate: '/corporate/status',
      driver: '/driver/status',
      operator: '/operator/status'
    };
    return routes[profileType] || '/';
  };

  // Check account status first (highest priority)
  // If account is disabled or suspended, redirect to status page
  if (requiredProfile && user.account_status) {
    const statusRoute = getStatusPageRoute(requiredProfile);

    // Don't redirect if already on status page (prevent infinite loop)
    const isOnStatusPage = location.pathname === statusRoute;

    if (!isOnStatusPage && (user.account_status === 'disabled' || user.account_status === 'suspended')) {
      return <Navigate to={statusRoute} state={{ from: location }} replace />;
    }
  }

  // Check if user has required profile (if specified)
  if (requiredProfile) {
    // CRITICAL FIX: If activeProfileType matches requiredProfile, ALWAYS allow access
    // This ensures seamless profile switching - the destination page will handle showing
    // appropriate status (incomplete, pending, rejected, etc.)
    if (activeProfileType === requiredProfile) {
      return <>{children}</>;
    }

    const profileStatus = getProfileStatus(requiredProfile);
    const statusRoute = getStatusPageRoute(requiredProfile);
    const isOnStatusPage = location.pathname === statusRoute;
    const isOnProfilePage = location.pathname === `/${requiredProfile}/profile`;

    // Profile doesn't exist or is in progress - allow access, ProfileCompletionModal will handle it
    // This allows users to create/complete profiles directly on the page
    if (profileStatus.status === 'not_created' || profileStatus.status === 'in_progress') {
      // Allow access - the page will show ProfileCompletionModal
      return <>{children}</>;
    }


    // Profile is pending approval - redirect to status page
    if (!isOnStatusPage && profileStatus.status === 'pending_approval') {
      return <Navigate to={statusRoute} state={{ from: location }} replace />;
    }

    // Profile is rejected - redirect to status page
    if (!isOnStatusPage && profileStatus.status === 'rejected') {
      return <Navigate to={statusRoute} state={{ from: location }} replace />;
    }

    // Profile is not approved - redirect to status page
    if (!isOnStatusPage && !canAccessProfile(requiredProfile)) {
      return <Navigate to={statusRoute} state={{ from: location }} replace />;
    }
  }

  // All checks passed - render children
  return <>{children}</>;
};

export default ProtectedRoute;

