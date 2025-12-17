import React from 'react';
import { FormComponentProps } from '../../../types/componentInterfaces';

/**
 * Enhanced FormInput Component
 * Reusable form input with comprehensive validation, accessibility, and styling
 */
const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder = '',
  required = false,
  error = '',
  warning = '',
  disabled = false,
  readOnly = false,
  min,
  max,
  step,
  pattern,
  autoComplete,
  autoFocus = false,
  className = '',
  inputClassName = '',
  labelClassName = '',
  errorClassName = '',
  testId,
  helpText = '',
  icon,
  iconPosition = 'left',
  size = 'md',
  variant = 'default',
  ...props
}) => {
  const baseInputClasses = `
    w-full border rounded-lg transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
    ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'bg-white'}
    ${readOnly ? 'bg-slate-50 cursor-default' : ''}
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
    outlined: 'border-2',
    minimal: 'border-0 border-b-2 rounded-none bg-transparent'
  };

  const inputId = `${name}-input`;
  const errorId = error ? `${name}-error` : undefined;
  const helpId = helpText ? `${name}-help` : undefined;

  return (
    <div className={`space-y-1 ${className}`} data-testid={testId}>
      {label && (
        <label 
          htmlFor={inputId} 
          className={`block text-sm font-medium text-slate-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-slate-400">{icon}</span>
          </div>
        )}
        
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
          className={`
            ${baseInputClasses}
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${inputClassName}
          `}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-slate-400">{icon}</span>
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

export default FormInput;