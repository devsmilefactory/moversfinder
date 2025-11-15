/**
 * Routing Utilities - BMTOA Platform
 * Handles user type-based dashboard routing
 */

/**
 * Get the dashboard path for a user based on their user type
 * @param {string} userType - The user type (admin, driver, taxi_operator, operator)
 * @returns {string} The dashboard path
 */
export const getDashboardPath = (userType) => {
  const dashboardPaths = {
    admin: '/admin/dashboard',
    driver: '/driver/dashboard',
    taxi_operator: '/operator/dashboard',
    operator: '/operator/dashboard',
  };

  return dashboardPaths[userType] || '/';
};

/**
 * Get the default route after login based on user type
 * @param {Object} user - The user object with user_type and platform
 * @returns {string} The route to redirect to
 */
export const getPostLoginRoute = (user) => {
  if (!user) return '/';

  // Verify user is on correct platform
  if (user.platform !== 'bmtoa' && user.platform !== 'both') {
    console.warn('User platform mismatch - redirecting to home');
    return '/';
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

  // Admin can access all routes
  if (user.user_type === 'admin') return true;

  // Check if path matches user's dashboard
  const userDashboard = getDashboardPath(user.user_type);
  return path.startsWith(userDashboard.split('/')[1]);
};

/**
 * Redirect user to their appropriate dashboard
 * @param {Object} user - The user object
 */
export const redirectToDashboard = (user) => {
  const route = getPostLoginRoute(user);
  window.location.href = route;
};

/**
 * Get user type display name
 * @param {string} userType - The user type
 * @returns {string} Display name
 */
export const getUserTypeDisplayName = (userType) => {
  const displayNames = {
    admin: 'Administrator',
    driver: 'Driver',
    taxi_operator: 'Taxi Operator',
    operator: 'Taxi Operator',
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

  // Check if user belongs to BMTOA platform
  if (user.platform !== 'bmtoa' && user.platform !== 'both') {
    return {
      isValid: false,
      message: 'Access denied. This platform is for BMTOA members only.',
    };
  }

  // Check if user type is allowed on BMTOA
  const allowedUserTypes = ['admin', 'driver', 'taxi_operator', 'operator'];
  if (!allowedUserTypes.includes(user.user_type)) {
    return {
      isValid: false,
      message: 'Invalid user type for BMTOA platform.',
    };
  }

  return { isValid: true, message: 'Access granted' };
};

