import React from 'react';

/**
 * ErrorState Component
 * Displays error state with message and retry functionality
 */
const ErrorState = ({
  hasError = false,
  errorMessage = 'Something went wrong',
  errorCode = '',
  onRetry = null,
  showRetryButton = true,
  retryLabel = 'Try Again',
  className = '',
  errorClassName = '',
  messageClassName = '',
  retryClassName = '',
  testId,
  size = 'md',
  variant = 'default',
  children,
  ...props
}) => {
  if (!hasError && !children) {
    return null;
  }

  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'text-3xl mb-2',
      title: 'text-base font-medium',
      message: 'text-sm',
      button: 'px-3 py-1.5 text-sm'
    },
    md: {
      container: 'py-8',
      icon: 'text-4xl mb-3',
      title: 'text-lg font-semibold',
      message: 'text-base',
      button: 'px-4 py-2'
    },
    lg: {
      container: 'py-12',
      icon: 'text-5xl mb-4',
      title: 'text-xl font-bold',
      message: 'text-lg',
      button: 'px-6 py-3 text-lg'
    }
  };

  const variantClasses = {
    default: {
      container: 'bg-red-50 border border-red-200 rounded-lg',
      icon: 'text-red-500',
      title: 'text-red-800',
      message: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    minimal: {
      container: '',
      icon: 'text-red-500',
      title: 'text-red-700',
      message: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    outlined: {
      container: 'border-2 border-red-300 rounded-lg',
      icon: 'text-red-500',
      title: 'text-red-800',
      message: 'text-red-600',
      button: 'border border-red-600 text-red-600 hover:bg-red-600 hover:text-white'
    }
  };

  const classes = sizeClasses[size];
  const variantClass = variantClasses[variant];

  if (!hasError) {
    return children || null;
  }

  return (
    <div
      className={`text-center ${classes.container} ${variantClass.container} ${className}`}
      data-testid={testId}
      role="alert"
      {...props}
    >
      <div className={`${classes.icon} ${variantClass.icon}`}>
        ❌
      </div>
      
      <h3 className={`mb-2 ${classes.title} ${variantClass.title}`}>
        Error Occurred
      </h3>
      
      <p className={`mb-4 ${classes.message} ${variantClass.message} ${messageClassName}`}>
        {errorMessage}
      </p>
      
      {errorCode && (
        <p className={`text-xs ${variantClass.message} opacity-75 mb-4`}>
          Error Code: {errorCode}
        </p>
      )}
      
      {showRetryButton && onRetry && (
        <button
          onClick={onRetry}
          className={`
            font-medium rounded-lg transition-colors duration-200 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
            ${classes.button} ${variantClass.button} ${retryClassName}
          `}
          data-testid={testId ? `${testId}-retry` : undefined}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
};

export default ErrorState;