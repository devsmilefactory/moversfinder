import React from 'react';

/**
 * ToggleSwitch - Modern toggle switch component
 * 
 * @param {boolean} checked - Whether the switch is on
 * @param {function} onChange - Callback when switch is toggled
 * @param {boolean} disabled - Whether the switch is disabled
 * @param {string} label - Optional label text
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 */
const ToggleSwitch = ({ 
  checked = false, 
  onChange, 
  disabled = false, 
  label = '', 
  size = 'md',
  className = ''
}) => {
  const sizes = {
    sm: {
      switch: 'w-9 h-5',
      toggle: 'w-4 h-4',
      translate: 'translate-x-4'
    },
    md: {
      switch: 'w-11 h-6',
      toggle: 'w-5 h-5',
      translate: 'translate-x-5'
    },
    lg: {
      switch: 'w-14 h-7',
      toggle: 'w-6 h-6',
      translate: 'translate-x-7'
    }
  };

  const sizeConfig = sizes[size] || sizes.md;

  return (
    <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={`
            ${sizeConfig.switch}
            bg-gray-300 rounded-full
            peer-focus:ring-4 peer-focus:ring-blue-300
            peer-checked:bg-green-500
            transition-colors duration-200 ease-in-out
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        />
        <div
          className={`
            ${sizeConfig.toggle}
            absolute left-0.5 top-0.5
            bg-white rounded-full
            transition-transform duration-200 ease-in-out
            ${checked ? sizeConfig.translate : 'translate-x-0'}
          `}
        />
      </div>
      {label && (
        <span className="ml-3 text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
    </label>
  );
};

export default ToggleSwitch;

