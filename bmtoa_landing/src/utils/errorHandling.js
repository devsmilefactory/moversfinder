/**
 * Error Handling Utilities for Admin Dashboard
 * 
 * Provides consistent error handling, user-friendly error messages,
 * and error logging across all admin pages.
 */

/**
 * PostgreSQL error codes mapped to user-friendly messages
 */
const ERROR_CODE_MAP = {
  // Unique violation
  '23505': 'A record with this value already exists. Please use a different value.',
  
  // Foreign key violation
  '23503': 'Cannot delete this record as it is referenced by other records. Please remove related records first.',
  
  // Not null violation
  '23502': 'Required field is missing. Please fill in all required fields.',
  
  // Check constraint violation
  '23514': 'Invalid value provided. Please check your input and try again.',
  
  // Permission denied
  '42501': 'You do not have permission to perform this action.',
  
  // Supabase specific errors
  'PGRST116': 'No records found matching your criteria.',
  'PGRST204': 'No content returned from the server.',
  'PGRST301': 'Request moved permanently.',
  
  // Auth errors
  'auth/invalid-email': 'Invalid email address format.',
  'auth/user-not-found': 'User not found.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/weak-password': 'Password is too weak. Please use a stronger password.',
  'auth/email-already-in-use': 'This email is already registered.',
  
  // Network errors
  'NETWORK_ERROR': 'Network error. Please check your internet connection and try again.',
  'TIMEOUT': 'Request timed out. Please try again.'
};

/**
 * Get user-friendly error message from error object
 * 
 * @param {Error|Object} error - Error object from Supabase or other source
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Check for error code
  if (error.code && ERROR_CODE_MAP[error.code]) {
    return ERROR_CODE_MAP[error.code];
  }

  // Check for error message
  if (error.message) {
    // Check if message contains a known error code
    for (const [code, message] of Object.entries(ERROR_CODE_MAP)) {
      if (error.message.includes(code)) {
        return message;
      }
    }
    
    // Return the error message if it's user-friendly
    if (error.message.length < 200 && !error.message.includes('Error:')) {
      return error.message;
    }
  }

  // Check for hint (PostgreSQL provides helpful hints)
  if (error.hint) {
    return error.hint;
  }

  // Check for details
  if (error.details) {
    return error.details;
  }

  // Default message
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
};

/**
 * Log error to console with context
 * 
 * @param {string} context - Context where error occurred (e.g., 'UsersPage.loadUsers')
 * @param {Error} error - Error object
 * @param {Object} additionalInfo - Additional information to log
 */
export const logError = (context, error, additionalInfo = {}) => {
  console.error(`[${context}] Error:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    ...additionalInfo,
    timestamp: new Date().toISOString()
  });
};

/**
 * Handle async operation with error handling
 * 
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Options
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {string} options.context - Context for error logging
 * @param {string} options.successMessage - Success message to display
 * @returns {Promise<{success: boolean, data: any, error: Error|null}>}
 */
export const handleAsyncOperation = async (operation, options = {}) => {
  const {
    onSuccess = null,
    onError = null,
    context = 'Operation',
    successMessage = null
  } = options;

  try {
    const result = await operation();
    
    if (successMessage) {
      console.log(`[${context}] ${successMessage}`);
    }
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    return { success: true, data: result, error: null };
  } catch (error) {
    logError(context, error);
    
    const errorMessage = getErrorMessage(error);
    
    if (onError) {
      onError(errorMessage, error);
    }
    
    return { success: false, data: null, error: errorMessage };
  }
};

/**
 * Validate form data against schema
 * 
 * @param {Object} formData - Form data to validate
 * @param {Object} schema - Validation schema
 * @returns {{isValid: boolean, errors: Object}} Validation result
 */
export const validateFormData = (formData, schema) => {
  const errors = {};
  let isValid = true;

  Object.entries(schema).forEach(([field, rules]) => {
    const value = formData[field];

    // Required validation
    if (rules.required && (!value || value === '')) {
      errors[field] = `${rules.label || field} is required`;
      isValid = false;
      return;
    }

    // Skip other validations if field is empty and not required
    if (!value && !rules.required) {
      return;
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[field] = 'Invalid email format';
            isValid = false;
          }
          break;
        case 'phone':
          if (!/^\+?[\d\s-()]+$/.test(value)) {
            errors[field] = 'Invalid phone number format';
            isValid = false;
          }
          break;
        case 'number':
          if (isNaN(value)) {
            errors[field] = 'Must be a number';
            isValid = false;
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            errors[field] = 'Invalid URL format';
            isValid = false;
          }
          break;
      }
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = `Must be at least ${rules.minLength} characters`;
      isValid = false;
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = `Must be no more than ${rules.maxLength} characters`;
      isValid = false;
    }

    // Min value validation
    if (rules.min !== undefined && parseFloat(value) < rules.min) {
      errors[field] = `Must be at least ${rules.min}`;
      isValid = false;
    }

    // Max value validation
    if (rules.max !== undefined && parseFloat(value) > rules.max) {
      errors[field] = `Must be no more than ${rules.max}`;
      isValid = false;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.patternMessage || 'Invalid format';
      isValid = false;
    }

    // Custom validation
    if (rules.validate) {
      const customError = rules.validate(value, formData);
      if (customError) {
        errors[field] = customError;
        isValid = false;
      }
    }
  });

  return { isValid, errors };
};

/**
 * Show success toast/alert
 * 
 * @param {string} message - Success message
 */
export const showSuccessToast = (message) => {
  // For now, use alert. Can be replaced with a toast library
  alert(`✅ ${message}`);
};

/**
 * Show error toast/alert
 * 
 * @param {string} message - Error message
 */
export const showErrorToast = (message) => {
  // For now, use alert. Can be replaced with a toast library
  alert(`❌ ${message}`);
};

/**
 * Show confirmation dialog
 * 
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {boolean} User's confirmation choice
 */
export const showConfirmDialog = (message, title = 'Confirm Action') => {
  return window.confirm(`${title}\n\n${message}`);
};

export default {
  getErrorMessage,
  logError,
  handleAsyncOperation,
  validateFormData,
  showSuccessToast,
  showErrorToast,
  showConfirmDialog
};
