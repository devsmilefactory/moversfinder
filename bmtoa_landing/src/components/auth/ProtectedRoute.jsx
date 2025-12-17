import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import Icon from '../AppIcon';

/**
 * ProtectedRoute Component - BMTOA Platform
 * 
 * Protects routes by checking:
 * 1. User is authenticated
 * 2. User type matches allowed types for the route
 * 3. User platform is 'bmtoa' or 'both'
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string[]} props.allowedUserTypes - Array of user types allowed to access this route
 * @param {boolean} props.requireProfileCompletion - Whether to require complete profile (default: false)
 */
const ProtectedRoute = ({ 
  children, 
  allowedUserTypes = [], 
  requireProfileCompletion = false 
}) => {
  const location = useLocation();
  const { user, isAuthenticated, authLoading } = useAuthStore();
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to landing page
  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user is a TaxiCab user type (individual, corporate)
  const taxicabUserTypes = ['individual', 'corporate'];
  if (taxicabUserTypes.includes(user.user_type)) {
    // Show friendly redirect message for TaxiCab users
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="Info" className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Welcome to BMTOA!</h2>
          <p className="text-slate-600 mb-2">
            As a <span className="font-semibold text-slate-900">{user.user_type === 'individual' ? 'Passenger' : 'Corporate User'}</span>,
            your dashboard is on the TaxiCab platform.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            BMTOA is for drivers and operators. TaxiCab is for passengers.
          </p>
          <a
            href={import.meta.env.VITE_TAXICAB_URL || 'https://taxicab.co.zw'}
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg mb-3"
          >
            Go to TaxiCab Platform →
          </a>
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              window.location.href = '/';
            }}
            className="w-full text-slate-600 hover:text-slate-900 text-sm"
          >
            Sign out and return to home
          </button>
        </div>
      </div>
    );
  }

  // Check platform - BMTOA users only
  if (user.platform !== 'bmtoa' && user.platform !== 'both') {
    return (
      <Navigate
        to="/"
        state={{
          error: 'Access denied. This platform is for BMTOA members only.',
          from: location
        }}
        replace
      />
    );
  }

  // Check user type authorization
  if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(user.user_type)) {
    // Redirect to correct dashboard based on user type
    const redirectPath = getUserDashboardPath(user.user_type);
    return (
      <Navigate 
        to={redirectPath} 
        state={{ 
          error: 'You do not have permission to access this page.',
          from: location 
        }} 
        replace 
      />
    );
  }

  // Check profile completion if required
  if (requireProfileCompletion && user.profile_completion_status !== 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Incomplete</h2>
          <p className="text-slate-600 mb-6">
            Please complete your profile to access this feature.
          </p>
          <button
            onClick={() => window.location.href = getUserDashboardPath(user.user_type)}
            className="w-full bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check verification status for certain user types
  if ((user.user_type === 'driver' || user.user_type === 'taxi_operator') && 
      user.verification_status === 'pending' && 
      requireProfileCompletion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Pending</h2>
          <p className="text-slate-600 mb-6">
            Your account is under review. You'll be notified once approved.
          </p>
          <button
            onClick={() => window.location.href = getUserDashboardPath(user.user_type)}
            className="w-full bg-slate-700 text-white py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
};

/**
 * Helper function to get dashboard path based on user type
 */
const getUserDashboardPath = (userType) => {
  switch (userType) {
    case 'admin':
      return '/admin';
    case 'driver':
      return '/driver';
    case 'taxi_operator':
    case 'operator':
      return '/operator';
    default:
      return '/';
  }
};

export default ProtectedRoute;

