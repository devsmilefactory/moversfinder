import React from 'react';

/**
 * FormInput Component
 * Reusable form input with label, error handling, and validation
 */
const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  disabled = false,
  min,
  max,
  step,
  className = '',
  ...props
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
          error ? 'border-red-500 bg-red-50' : 'border-blue-200 bg-white'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

/**
 * FormSelect Component
 * Reusable select dropdown with label and error handling
 */
export const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  error = '',
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
          error ? 'border-red-500 bg-red-50' : 'border-blue-200 bg-white'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

/**
 * FormTextarea Component
 * Reusable textarea with label and error handling
 */
export const FormTextarea = ({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  disabled = false,
  rows = 3,
  className = '',
  ...props
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

/**
 * FormCheckbox Component
 * Reusable checkbox with label
 */
export const FormCheckbox = ({
  label,
  name,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        id={name}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
        {...props}
      />
      {label && (
        <label
          htmlFor={name}
          className={`ml-2 block text-sm text-slate-700 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

/**
 * FormRadio Component
 * Reusable radio button with label
 */
export const FormRadio = ({
  label,
  name,
  value,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        id={`${name}-${value}`}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
        {...props}
      />
      {label && (
        <label
          htmlFor={`${name}-${value}`}
          className={`ml-2 block text-sm text-slate-700 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default FormInput;

