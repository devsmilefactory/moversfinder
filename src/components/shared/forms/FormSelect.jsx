import React from 'react';

/**
 * Enhanced FormSelect Component
 * Reusable select dropdown with comprehensive features
 */
const FormSelect = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  options = [],
  required = false,
  error = '',
  warning = '',
  disabled = false,
  placeholder = 'Select an option...',
  className = '',
  selectClassName = '',
  labelClassName = '',
  errorClassName = '',
  testId,
  helpText = '',
  size = 'md',
  variant = 'default',
  multiple = false,
  ...props
}) => {
  const baseSelectClasses = `
    w-full border rounded-lg transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
    ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'bg-white cursor-pointer'}
    ${error ? 'border-red-500 focus:ring-red-400' : warning ? 'border-yellow-500 focus:ring-yellow-400' : 'border-slate-300'}
  `;

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-3 text-lg'
  };

  const variantClasses = {
    default: '',
    filled: 'bg-slate-100 border-slate-200',
    outlined: 'border-2'
  };

  const selectId = `${name}-select`;
  const errorId = error ? `${name}-error` : undefined;
  const helpId = helpText ? `${name}-help` : undefined;

  // Handle different option formats
  const normalizedOptions = options.map(option => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    return option;
  });

  return (
    <div className={`space-y-1 ${className}`} data-testid={testId}>
      {label && (
        <label 
          htmlFor={selectId} 
          className={`block text-sm font-medium text-slate-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          multiple={multiple}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
          className={`
            ${baseSelectClasses}
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${selectClassName}
          `}
          {...props}
        >
          {!multiple && placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {normalizedOptions.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        {!multiple && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>
      
      {helpText && !error && !warning && (
        <p id={helpId} className="text-xs text-slate-500">
          {helpText}
        </p>
      )}
      
      {warning && !error && (
        <p className="text-xs text-yellow-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {warning}
        </p>
      )}
      
      {error && (
        <p 
          id={errorId} 
          className={`text-xs text-red-500 flex items-center ${errorClassName}`}
          role="alert"
        >
          <span className="mr-1">❌</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormSelect;