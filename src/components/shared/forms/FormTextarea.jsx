import React from 'react';

/**
 * Enhanced FormTextarea Component
 * Reusable textarea with comprehensive features
 */
const FormTextarea = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder = '',
  required = false,
  error = '',
  warning = '',
  disabled = false,
  readOnly = false,
  rows = 3,
  maxLength,
  className = '',
  textareaClassName = '',
  labelClassName = '',
  errorClassName = '',
  testId,
  helpText = '',
  size = 'md',
  variant = 'default',
  resize = 'vertical',
  autoFocus = false,
  ...props
}) => {
  const baseTextareaClasses = `
    w-full border rounded-lg transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'bg-white'}
    ${readOnly ? 'bg-slate-50 cursor-default' : ''}
    ${error ? 'border-red-500 focus:ring-red-400' : warning ? 'border-yellow-500 focus:ring-yellow-400' : 'border-blue-200'}
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

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  };

  const textareaId = `${name}-textarea`;
  const errorId = error ? `${name}-error` : undefined;
  const helpId = helpText ? `${name}-help` : undefined;

  const characterCount = value ? value.length : 0;
  const showCharacterCount = maxLength && maxLength > 0;

  return (
    <div className={`space-y-1 ${className}`} data-testid={testId}>
      {label && (
        <label 
          htmlFor={textareaId} 
          className={`block text-sm font-medium text-slate-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          id={textareaId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          maxLength={maxLength}
          autoFocus={autoFocus}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
          className={`
            ${baseTextareaClasses}
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${resizeClasses[resize]}
            ${textareaClassName}
          `}
          {...props}
        />
        
        {showCharacterCount && (
          <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-blue-50/80 px-1 rounded">
            {characterCount}/{maxLength}
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
      
      {showCharacterCount && (
        <div className="flex justify-between text-xs text-slate-500">
          <span>{helpText}</span>
          <span className={characterCount > maxLength ? 'text-red-500' : ''}>
            {characterCount}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
};

export default FormTextarea;