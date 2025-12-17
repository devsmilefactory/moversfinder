import { useState, useCallback, useMemo } from 'react';

/**
 * useFormValidation Hook
 * Provides form validation logic with customizable validation rules
 */
const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  // Validation functions
  const validateField = useCallback(async (fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return { isValid: true, error: null, warning: null };

    // Handle array of rules
    const ruleArray = Array.isArray(rules) ? rules : [rules];
    
    for (const rule of ruleArray) {
      if (typeof rule === 'function') {
        try {
          const result = await rule(value, values);
          if (result && !result.isValid) {
            return {
              isValid: false,
              error: result.error || null,
              warning: result.warning || null
            };
          }
        } catch (error) {
          return {
            isValid: false,
            error: 'Validation error occurred',
            warning: null
          };
        }
      } else if (typeof rule === 'object') {
        // Handle rule objects with conditions
        if (rule.required && (!value || value.toString().trim() === '')) {
          return {
            isValid: false,
            error: rule.message || `${fieldName} is required`,
            warning: null
          };
        }
        
        if (rule.minLength && value && value.length < rule.minLength) {
          return {
            isValid: false,
            error: rule.message || `${fieldName} must be at least ${rule.minLength} characters`,
            warning: null
          };
        }
        
        if (rule.maxLength && value && value.length > rule.maxLength) {
          return {
            isValid: false,
            error: rule.message || `${fieldName} must be no more than ${rule.maxLength} characters`,
            warning: null
          };
        }
        
        if (rule.pattern && value && !rule.pattern.test(value)) {
          return {
            isValid: false,
            error: rule.message || `${fieldName} format is invalid`,
            warning: null
          };
        }
        
        if (rule.min && value && parseFloat(value) < rule.min) {
          return {
            isValid: false,
            error: rule.message || `${fieldName} must be at least ${rule.min}`,
            warning: null
          };
        }
        
        if (rule.max && value && parseFloat(value) > rule.max) {
          return {
            isValid: false,
            error: rule.message || `${fieldName} must be no more than ${rule.max}`,
            warning: null
          };
        }
        
        if (rule.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            isValid: false,
            error: rule.message || 'Please enter a valid email address',
            warning: null
          };
        }
        
        if (rule.phone && value && !/^\+?[\d\s\-\(\)]+$/.test(value)) {
          return {
            isValid: false,
            error: rule.message || 'Please enter a valid phone number',
            warning: null
          };
        }
        
        // Warning conditions
        if (rule.warnLength && value && value.length > rule.warnLength) {
          return {
            isValid: true,
            error: null,
            warning: rule.warnMessage || `${fieldName} is getting long`
          };
        }
      }
    }

    return { isValid: true, error: null, warning: null };
  }, [validationRules, values]);

  const validateForm = useCallback(async () => {
    setIsValidating(true);
    const newErrors = {};
    const newWarnings = {};
    
    const fieldNames = Object.keys(validationRules);
    
    for (const fieldName of fieldNames) {
      const result = await validateField(fieldName, values[fieldName]);
      if (result.error) {
        newErrors[fieldName] = result.error;
      }
      if (result.warning) {
        newWarnings[fieldName] = result.warning;
      }
    }
    
    setErrors(newErrors);
    setWarnings(newWarnings);
    setIsValidating(false);
    
    return Object.keys(newErrors).length === 0;
  }, [validateField, validationRules, values]);

  // Form handlers
  const handleChange = useCallback(async (fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate field if it has been touched
    if (touched[fieldName]) {
      const result = await validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: result.error }));
      setWarnings(prev => ({ ...prev, [fieldName]: result.warning }));
    }
  }, [validateField, touched]);

  const handleBlur = useCallback(async (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    const result = await validateField(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: result.error }));
    setWarnings(prev => ({ ...prev, [fieldName]: result.warning }));
  }, [validateField, values]);

  const setFieldValue = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  const setFieldWarning = useCallback((fieldName, warning) => {
    setWarnings(prev => ({ ...prev, [fieldName]: warning }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setWarnings({});
    setTouched({});
  }, [initialValues]);

  const resetField = useCallback((fieldName) => {
    setValues(prev => ({ ...prev, [fieldName]: initialValues[fieldName] || '' }));
    setErrors(prev => ({ ...prev, [fieldName]: null }));
    setWarnings(prev => ({ ...prev, [fieldName]: null }));
    setTouched(prev => ({ ...prev, [fieldName]: false }));
  }, [initialValues]);

  // Computed values
  const isValid = useMemo(() => {
    return Object.keys(errors).every(key => !errors[key]);
  }, [errors]);

  const hasErrors = useMemo(() => {
    return Object.keys(errors).some(key => errors[key]);
  }, [errors]);

  const hasWarnings = useMemo(() => {
    return Object.keys(warnings).some(key => warnings[key]);
  }, [warnings]);

  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => values[key] !== initialValues[key]);
  }, [values, initialValues]);

  return {
    // Values
    values,
    errors,
    warnings,
    touched,
    
    // State
    isValid,
    hasErrors,
    hasWarnings,
    isDirty,
    isValidating,
    
    // Actions
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setFieldWarning,
    validateField,
    validateForm,
    reset,
    resetField
  };
};

export default useFormValidation;