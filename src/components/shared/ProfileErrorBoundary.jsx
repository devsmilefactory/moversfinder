import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * ProfileErrorBoundary Component
 * Specialized error boundary for profile-related components
 */
const ProfileErrorBoundary = ({ children, ...props }) => {
  const handleError = (error, errorInfo) => {
    console.error('Profile Error:', error, errorInfo);
    
    // Track profile-specific errors
    if (window.analytics) {
      window.analytics.track('Profile Error', {
        error: error.message,
        component: errorInfo.componentStack?.split('\n')[1]?.trim(),
        timestamp: new Date().toISOString()
      });
    }
  };

  const fallbackUI = (error, retry) => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <div className="text-4xl mb-3">👤</div>
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
        Profile System Error
      </h3>
      <p className="text-yellow-700 mb-4">
        We're having trouble loading your profile information. Your data is safe, but please try refreshing the page.
      </p>
      <div className="space-x-3">
        <button
          onClick={retry}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="border border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
      <p className="text-xs text-yellow-600 mt-3">
        If this problem continues, please contact support.
      </p>
    </div>
  );

  return (
    <ErrorBoundary
      name="ProfileErrorBoundary"
      onError={handleError}
      fallback={fallbackUI}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ProfileErrorBoundary;