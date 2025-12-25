import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';
import { getDriverStatus } from '../../utils/driverStatusCheck';
import { supabase } from '../../lib/supabase';
import { agentLog } from '../../utils/agentLog';

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
  const { getProfileStatus, canAccessProfile, activeProfileType, activeProfile } = useProfileStore();
  const [isChecking, setIsChecking] = useState(true);
  const [driverDocuments, setDriverDocuments] = useState([]);
  const [driverDocsLoaded, setDriverDocsLoaded] = useState(false);

  // Debug logging (disabled by default) — keep side-effects out of render.
  useEffect(() => {
    if (!requiredProfile) return;
    agentLog({
      location: 'ProtectedRoute.jsx',
      message: 'ProtectedRoute render/check',
      data: {
        requiredProfile,
        pathname: location.pathname,
        hasActiveProfile: Boolean(activeProfile),
        activeProfileType,
        isAuthenticated: Boolean(isAuthenticated),
        hasUser: Boolean(user),
      },
    });
  }, [requiredProfile, location.pathname, activeProfile, activeProfileType, isAuthenticated, user]);

  // Load driver documents if needed for status check
  useEffect(() => {
    if (requiredProfile === 'driver' && user?.id && activeProfile && !driverDocsLoaded) {
      supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', user.id)
        .then(({ data }) => {
          setDriverDocuments(data || []);
          setDriverDocsLoaded(true);
        })
        .catch((error) => {
          console.error('Error loading driver documents:', error);
          setDriverDocsLoaded(true);
        });
    }
  }, [requiredProfile, user?.id, activeProfile, driverDocsLoaded]);

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
  // BUT: Always allow access to profile page (users need to view their profile)
  if (requiredProfile && user.account_status) {
    const statusRoute = getStatusPageRoute(requiredProfile);
    const isOnStatusPage = location.pathname === statusRoute;
    const isOnProfilePage = location.pathname === `/${requiredProfile}/profile`;

    // Don't redirect if already on status page or profile page (prevent infinite loop, allow profile access)
    if (!isOnStatusPage && !isOnProfilePage && (user.account_status === 'disabled' || user.account_status === 'suspended')) {
      return <Navigate to={statusRoute} state={{ from: location }} replace />;
    }
  }

  // Check if user has required profile (if specified)
  if (requiredProfile) {
    const statusRoute = getStatusPageRoute(requiredProfile);
    const isOnStatusPage = location.pathname === statusRoute;
    const isOnProfilePage = location.pathname === `/${requiredProfile}/profile`;

    // For drivers, use unified status check with proper completion calculation
    // Predictable driver flow: if driver selected but profile missing, always send to profile creation
    if (requiredProfile === 'driver' && activeProfileType === 'driver' && !activeProfile) {
      if (!isOnProfilePage) {
        return <Navigate to="/driver/profile" state={{ from: location }} replace />;
      }
      return <>{children}</>;
    }

    if (requiredProfile === 'driver' && user?.id && activeProfile && activeProfileType === 'driver') {
      // CRITICAL: Always allow access to profile page for drivers (they need to view/edit their profile)
      // This exception only applies to driver profile pages
      if (isOnProfilePage) {
        return <>{children}</>;
      }
      
      // Use unified status check with documents (if loaded)
      const driverStatus = getDriverStatus(activeProfile, driverDocuments);
      
      // Check account status first
      // Profile page is already allowed above, so only check for other routes
      if (driverStatus.accountStatus === 'disabled' || driverStatus.accountStatus === 'suspended') {
        if (!isOnStatusPage && !isOnProfilePage) {
          return <Navigate to={statusRoute} state={{ from: location }} replace />;
        }
        return <>{children}</>;
      }
      
      // BLOCK ACCESS if profile is incomplete or pending/rejected approval
      // Only allow access to status page (profile page already handled above)
      if (!driverStatus.canAccessRides && !isOnStatusPage) {
        return <Navigate to={statusRoute} state={{ from: location }} replace />;
      }
      
      // Only allow access if profile is complete AND approved (or on status page)
      return <>{children}</>;
    }

    // CRITICAL FIX: For individual/corporate routes, NEVER check driver profile status
    // Only check the profile status for the required profile type
    // This ensures driver profile incompleteness doesn't affect passenger feeds
    if (requiredProfile === 'individual' || requiredProfile === 'corporate') {
      // For individual/corporate routes, only check their own profile status
      // Never check driver profile, even if activeProfileType is 'driver'
      const profileStatus = getProfileStatus(requiredProfile);
      
      // Always allow access to profile page
      if (isOnProfilePage) {
        return <>{children}</>;
      }
      
      // Profile doesn't exist or is in progress - allow access
      if (profileStatus.status === 'not_created' || profileStatus.status === 'in_progress') {
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
      
      // All checks passed for individual/corporate
      return <>{children}</>;
    }

    // CRITICAL FIX: If activeProfileType matches requiredProfile, check approval status
    // For drivers, we already checked above, so allow access
    if (activeProfileType === requiredProfile && requiredProfile !== 'driver') {
      return <>{children}</>;
    }

    const profileStatus = getProfileStatus(requiredProfile);

    // CRITICAL: Always allow access to profile page (users need to view/edit their profile)
    // This exception applies to all profile types
    if (isOnProfilePage) {
      return <>{children}</>;
    }

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

