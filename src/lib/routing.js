/**
 * Routing Utilities - TaxiCab Platform
 * Handles user type-based dashboard routing
 */

import { isComingSoon } from '../config/profileAvailability';

/**
 * Get the dashboard path for a user based on their user type
 * @param {string} userType - The user type (individual, corporate, driver, operator, admin)
 * @returns {string} The dashboard path
 */
export const getDashboardPath = (userType) => {
  const dashboardPaths = {
    individual: '/user',
    corporate: '/corporate',
    driver: '/driver',
    // BMTOA-only user types - will be redirected to BMTOA platform
    taxi_operator: null,
    operator: null,
    admin: null,
  };

  return dashboardPaths[userType] || '/';
};

/**
 * Get the default route after login based on user type
 * @param {Object} user - The user object with user_type and platform
 * @returns {string|Object} The route to redirect to, or an object with redirect info
 */
export const getPostLoginRoute = (user) => {
  if (!user) return '/';

  // Check if user is a BMTOA-only user type (operator, admin)
  const bmtoaOnlyUserTypes = ['taxi_operator', 'operator', 'admin'];
  if (bmtoaOnlyUserTypes.includes(user.user_type)) {
    // Return redirect info for BMTOA platform
    return {
      shouldRedirectToBMTOA: true,
      bmtoaUrl: import.meta.env.VITE_BMTOA_URL || 'https://bmtoa.co.zw',
      userType: user.user_type,
      message: `Welcome! As a ${getUserTypeDisplayName(user.user_type)}, please use the BMTOA platform.`
    };
  }

  // Verify user is on correct platform (allow both taxicab and pwa platforms)
  if (user.platform && user.platform !== 'taxicab' && user.platform !== 'pwa' && user.platform !== 'both') {
    console.warn('User platform mismatch - redirecting to home');
    return '/';
  }

  // Phased rollout: route Corporate to status when Coming Soon
  if (user.user_type === 'corporate' && isComingSoon('corporate')) {
    return '/corporate/status';
  }

  return getDashboardPath(user.user_type);
};

/**
 * Check if user has access to a specific route
 * @param {Object} user - The user object
 * @param {string} path - The path to check
 * @returns {boolean} Whether user has access
 */
export const canAccessRoute = (user, path) => {
  if (!user) return false;

  // Check if path matches user's dashboard
  const userDashboard = getDashboardPath(user.user_type);
  return path.startsWith(userDashboard);
};

/**
 * Redirect user to their appropriate dashboard based on profile status
 * @param {Object} user - The user object with profile status fields
 * @param {Function} navigate - React Router navigate function (optional, for client-side nav)
 * @returns {string} The path to navigate to (caller should use navigate() or window.location.href)
 */
export const redirectToDashboard = async (user, navigate = null) => {
  if (!user) {
    const path = '/';
    if (navigate) navigate(path, { replace: true });
    else window.location.href = path;
    return path;
  }

  // Check account status first (applies to all user types)
  if (user.account_status === 'disabled' || user.account_status === 'suspended') {
    const statusPages = {
      individual: '/user/status',
      corporate: '/corporate/status',
      driver: '/driver/status',
      operator: '/operator/status',
    };
    const path = statusPages[user.user_type] || '/';
    if (navigate) navigate(path, { replace: true });
    else window.location.href = path;
    return path;
  }

  // Helper to navigate
  const go = (path) => {
    if (navigate) navigate(path, { replace: true });
    else window.location.href = path;
    return path;
  };

  // For drivers and corporates, derive status from type-specific profile tables
  try {
    if (user.user_type === 'driver') {
      const { supabase } = await import('./supabase');
      const { data: dp } = await supabase
        .from('driver_profiles')
        .select('approval_status, profile_completion_status, account_status')
        .eq('user_id', user.id)
        .maybeSingle();

      const account = dp?.account_status || user.account_status || 'active';
      if (account === 'disabled' || account === 'suspended') return go('/driver/status');

      const completion = dp?.profile_completion_status || 'incomplete';
      const approval = dp?.approval_status || 'pending';

      if (completion === 'incomplete' || completion === 'partial') return go('/driver/profile');
      if (approval === 'pending') return go('/driver/status');
      if (approval === 'approved') return go('/driver/rides');
      if (approval === 'rejected') return go('/driver/status');

      return go('/driver/profile');
    }

    if (user.user_type === 'corporate') {
      // Phased rollout: always send to status when Coming Soon
      if (isComingSoon('corporate')) return go('/corporate/status');

      const { supabase } = await import('./supabase');
      const { data: cp } = await supabase
        .from('corporate_profiles')
        .select('profile_completion_status, approval_status, account_status')
        .eq('user_id', user.id)
        .maybeSingle();

      const account = cp?.account_status || user.account_status || 'active';
      if (account === 'disabled' || account === 'suspended') return go('/corporate/status');

      const completion = cp?.profile_completion_status || 'incomplete';
      if (completion === 'incomplete' || completion === 'partial') return go('/corporate/status');

      // Corporate users are auto-approved once complete (when not Coming Soon)
      return go('/corporate/book-ride');
    }
  } catch (e) {
    console.warn('redirectToDashboard: fallback due to error', e);
  }

  // Individuals: auto-approved and complete on signup
  if (user.user_type === 'individual') return go('/user/book-ride');

  // Fallback to generic routing
  const route = getPostLoginRoute(user);
  go(route);
};

/**
 * Get user type display name
 * @param {string} userType - The user type
 * @returns {string} Display name
 */
export const getUserTypeDisplayName = (userType) => {
  const displayNames = {
    individual: 'Individual User',
    corporate: 'Corporate User',
    driver: 'Driver',
    taxi_operator: 'Taxi Operator',
    operator: 'Taxi Operator',
    admin: 'Administrator',
  };

  return displayNames[userType] || 'User';
};

/**
 * Validate user platform access
 * @param {Object} user - The user object
 * @returns {Object} Validation result with isValid and message
 */
export const validatePlatformAccess = (user) => {
  if (!user) {
    return { isValid: false, message: 'No user provided' };
  }

  // Check if user belongs to TaxiCab/PWA platform
  if (user.platform && user.platform !== 'taxicab' && user.platform !== 'pwa' && user.platform !== 'both') {
    return {
      isValid: false,
      message: 'Access denied. Please use the BMTOA platform at bmtoa.co.zw',
    };
  }

  // Check if user type is allowed on TaxiCab PWA
  const allowedUserTypes = ['individual', 'corporate', 'driver'];
  if (!allowedUserTypes.includes(user.user_type)) {
    return {
      isValid: false,
      message: 'Invalid user type for TaxiCab platform.',
    };
  }

  return { isValid: true, message: 'Access granted' };
};

