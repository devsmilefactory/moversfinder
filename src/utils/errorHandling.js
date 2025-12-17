/**
 * Error Handling Utilities
 * Centralized error handling patterns and utilities
 */

// Error types
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Standardized error object
 */
export class AppError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, severity = ErrorSeverity.MEDIUM, code = null, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error classification utility
 */
export const classifyError = (error) => {
  if (!error) return { type: ErrorTypes.UNKNOWN, severity: ErrorSeverity.LOW };

  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
    return { type: ErrorTypes.NETWORK, severity: ErrorSeverity.HIGH };
  }

  // HTTP status code based classification
  if (error.status || error.response?.status) {
    const status = error.status || error.response.status;
    
    if (status === 401) {
      return { type: ErrorTypes.AUTHENTICATION, severity: ErrorSeverity.HIGH };
    }
    if (status === 403) {
      return { type: ErrorTypes.AUTHORIZATION, severity: ErrorSeverity.MEDIUM };
    }
    if (status === 404) {
      return { type: ErrorTypes.NOT_FOUND, severity: ErrorSeverity.LOW };
    }
    if (status >= 400 && status < 500) {
      return { type: ErrorTypes.CLIENT, severity: ErrorSeverity.MEDIUM };
    }
    if (status >= 500) {
      return { type: ErrorTypes.SERVER, severity: ErrorSeverity.HIGH };
    }
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return { type: ErrorTypes.VALIDATION, severity: ErrorSeverity.LOW };
  }

  // JavaScript errors
  if (error instanceof TypeError || error instanceof ReferenceError) {
    return { type: ErrorTypes.CLIENT, severity: ErrorSeverity.CRITICAL };
  }

  return { type: ErrorTypes.UNKNOWN, severity: ErrorSeverity.MEDIUM };
};

/**
 * Error message formatter
 */
export const formatErrorMessage = (error, userFriendly = true) => {
  if (!error) return 'An unknown error occurred';

  const classification = classifyError(error);
  
  if (userFriendly) {
    const friendlyMessages = {
      [ErrorTypes.NETWORK]: 'Please check your internet connection and try again',
      [ErrorTypes.AUTHENTICATION]: 'Please log in again to continue',
      [ErrorTypes.AUTHORIZATION]: 'You don\'t have permission to perform this action',
      [ErrorTypes.NOT_FOUND]: 'The requested information could not be found',
      [ErrorTypes.VALIDATION]: 'Please check your input and try again',
      [ErrorTypes.SERVER]: 'Our servers are experiencing issues. Please try again later',
      [ErrorTypes.CLIENT]: 'Something went wrong. Please refresh the page and try again',
      [ErrorTypes.UNKNOWN]: 'An unexpected error occurred. Please try again'
    };
    
    return friendlyMessages[classification.type] || error.message || 'An error occurred';
  }

  return error.message || 'Unknown error';
};

/**
 * Error logging utility
 */
export const logError = (error, context = {}) => {
  const classification = classifyError(error);
  const errorInfo = {
    message: error.message,
    type: classification.type,
    severity: classification.severity,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Console logging based on severity
  if (classification.severity === ErrorSeverity.CRITICAL) {
    console.error('CRITICAL ERROR:', errorInfo);
  } else if (classification.severity === ErrorSeverity.HIGH) {
    console.error('HIGH SEVERITY ERROR:', errorInfo);
  } else if (classification.severity === ErrorSeverity.MEDIUM) {
    console.warn('MEDIUM SEVERITY ERROR:', errorInfo);
  } else {
    console.log('LOW SEVERITY ERROR:', errorInfo);
  }

  // Send to error tracking service if available
  if (window.reportError) {
    window.reportError(error, errorInfo);
  }

  return errorInfo;
};

/**
 * Async error handler wrapper
 */
export const withErrorHandling = (asyncFn, errorHandler = null) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      const errorInfo = logError(error, { function: asyncFn.name, args });
      
      if (errorHandler) {
        return errorHandler(error, errorInfo);
      }
      
      throw error;
    }
  };
};

/**
 * React error handler hook
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);
  
  const handleError = React.useCallback((error, context = {}) => {
    logError(error, context);
    setError(error);
  }, []);
  
  const clearError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const retry = React.useCallback((retryFn) => {
    clearError();
    if (retryFn) {
      retryFn();
    }
  }, [clearError]);
  
  return {
    error,
    hasError: !!error,
    handleError,
    clearError,
    retry,
    errorMessage: error ? formatErrorMessage(error) : null,
    errorType: error ? classifyError(error).type : null
  };
};

/**
 * Global error handler setup
 */
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { type: 'unhandledrejection' });
  });

  // Handle JavaScript errors
  window.addEventListener('error', (event) => {
    logError(event.error, { 
      type: 'javascript',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
};

/**
 * Error recovery strategies
 */
export const ErrorRecoveryStrategies = {
  RETRY: 'retry',
  REFRESH: 'refresh',
  REDIRECT: 'redirect',
  FALLBACK: 'fallback',
  IGNORE: 'ignore'
};

export const getRecoveryStrategy = (error) => {
  const classification = classifyError(error);
  
  switch (classification.type) {
    case ErrorTypes.NETWORK:
      return ErrorRecoveryStrategies.RETRY;
    case ErrorTypes.AUTHENTICATION:
      return ErrorRecoveryStrategies.REDIRECT;
    case ErrorTypes.NOT_FOUND:
      return ErrorRecoveryStrategies.FALLBACK;
    case ErrorTypes.SERVER:
      return ErrorRecoveryStrategies.RETRY;
    case ErrorTypes.CLIENT:
      return ErrorRecoveryStrategies.REFRESH;
    default:
      return ErrorRecoveryStrategies.RETRY;
  }
};