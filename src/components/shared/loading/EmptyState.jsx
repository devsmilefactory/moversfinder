import React from 'react';

/**
 * EmptyState Component
 * Displays empty state with icon, message, and optional action
 */
const EmptyState = ({
  icon = '📭',
  title = 'No data found',
  message = 'There are no items to display.',
  actionLabel,
  onAction,
  className = '',
  iconClassName = '',
  titleClassName = '',
  messageClassName = '',
  actionClassName = '',
  testId,
  size = 'md',
  ...props
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'text-4xl mb-2',
      title: 'text-lg font-medium',
      message: 'text-sm',
      action: 'px-3 py-1.5 text-sm'
    },
    md: {
      container: 'py-12',
      icon: 'text-6xl mb-4',
      title: 'text-xl font-semibold',
      message: 'text-base',
      action: 'px-4 py-2'
    },
    lg: {
      container: 'py-16',
      icon: 'text-8xl mb-6',
      title: 'text-2xl font-bold',
      message: 'text-lg',
      action: 'px-6 py-3 text-lg'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={`text-center ${classes.container} ${className}`}
      data-testid={testId}
      {...props}
    >
      <div className={`${classes.icon} ${iconClassName}`}>
        {icon}
      </div>
      
      <h3 className={`text-slate-700 mb-2 ${classes.title} ${titleClassName}`}>
        {title}
      </h3>
      
      {message && (
        <p className={`text-slate-500 mb-6 max-w-md mx-auto ${classes.message} ${messageClassName}`}>
          {message}
        </p>
      )}
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={`
            bg-yellow-400 hover:bg-yellow-500 text-white font-medium rounded-lg
            transition-colors duration-200 focus:outline-none focus:ring-2 
            focus:ring-yellow-400 focus:ring-offset-2
            ${classes.action} ${actionClassName}
          `}
          data-testid={testId ? `${testId}-action` : undefined}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;