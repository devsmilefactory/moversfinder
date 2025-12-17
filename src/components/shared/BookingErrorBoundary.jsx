import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * BookingErrorBoundary Component
 * Specialized error boundary for booking-related components
 */
const BookingErrorBoundary = ({ children, ...props }) => {
  const handleError = (error, errorInfo) => {
    console.error('Booking Error:', error, errorInfo);
    
    // Track booking-specific errors
    if (window.analytics) {
      window.analytics.track('Booking Error', {
        error: error.message,
        component: errorInfo.componentStack?.split('\n')[1]?.trim(),
        timestamp: new Date().toISOString()
      });
    }
  };

  const fallbackUI = (error, retry) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="text-4xl mb-3">🚫</div>
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Booking System Error
      </h3>
      <p className="text-red-600 mb-4">
        We're having trouble with the booking system. Please try again or contact support if the problem persists.
      </p>
      <div className="space-x-3">
        <button
          onClick={retry}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="border border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Refresh Page
        </button>
      </div>
      <p className="text-xs text-red-500 mt-3">
        Error ID: {Date.now().toString()}
      </p>
    </div>
  );

  return (
    <ErrorBoundary
      name="BookingErrorBoundary"
      onError={handleError}
      fallback={fallbackUI}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
};

export default BookingErrorBoundary;