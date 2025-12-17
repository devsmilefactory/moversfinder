import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * RideRequestErrorBoundary Component
 * Specialized error boundary for ride request components
 */
const RideRequestErrorBoundary = ({ children, ...props }) => {
  const handleError = (error, errorInfo) => {
    console.error('Ride Request Error:', error, errorInfo);
    
    // Track ride request specific errors
    if (window.analytics) {
      window.analytics.track('Ride Request Error', {
        error: error.message,
        component: errorInfo.componentStack?.split('\n')[1]?.trim(),
        timestamp: new Date().toISOString()
      });
    }
  };

  const fallbackUI = (error, retry) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
      <div className="text-4xl mb-3">🚗</div>
      <h3 className="text-lg font-semibold text-blue-800 mb-2">
        Ride Request System Error
      </h3>
      <p className="text-blue-700 mb-4">
        We're having trouble loading ride requests. This might be a temporary issue with our servers.
      </p>
      <div className="space-x-3">
        <button
          onClick={retry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Reload Rides
        </button>
        <button
          onClick={() => window.location.href = '/driver/dashboard'}
          className="border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
      <div className="mt-4 p-3 bg-blue-100 rounded text-sm text-blue-800">
        <p className="font-medium">Troubleshooting Tips:</p>
        <ul className="text-left mt-1 space-y-1">
          <li>• Check your internet connection</li>
          <li>• Make sure you're online in the app</li>
          <li>• Try refreshing the page</li>
        </ul>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      name="RideRequestErrorBoundary"
      onError={handleError}
      fallback={fallbackUI}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RideRequestErrorBoundary;