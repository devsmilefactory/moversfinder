import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * LoadingState Component
 * Full loading state with spinner, message, and optional progress
 */
const LoadingState = ({
  isLoading = false,
  loadingMessage = 'Loading...',
  progress = null,
  size = 'md',
  className = '',
  spinnerClassName = '',
  messageClassName = '',
  testId,
  children,
  overlay = false,
  ...props
}) => {
  if (!isLoading && !children) {
    return null;
  }

  const loadingContent = (
    <div
      className={`flex flex-col items-center justify-center space-y-3 ${className}`}
      data-testid={testId}
      {...props}
    >
      <LoadingSpinner 
        size={size} 
        className={spinnerClassName}
        testId={testId ? `${testId}-spinner` : undefined}
      />
      
      {loadingMessage && (
        <p className={`text-sm text-slate-600 text-center ${messageClassName}`}>
          {loadingMessage}
        </p>
      )}
      
      {progress !== null && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="relative">
        {children}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            {loadingContent}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return loadingContent;
  }

  return children || null;
};

export default LoadingState;