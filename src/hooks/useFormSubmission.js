import { useState, useCallback } from 'react';

/**
 * useFormSubmission Hook
 * Handles form submission logic with loading states, error handling, and success callbacks
 */
const useFormSubmission = ({
  onSubmit,
  onSuccess,
  onError,
  validateBeforeSubmit = true,
  resetOnSuccess = false,
  showSuccessMessage = true,
  showErrorMessage = true
} = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleSubmit = useCallback(async (formData, validationFn, resetFn) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    setSubmitMessage('');

    try {
      // Validate form if validation function is provided and validation is enabled
      if (validateBeforeSubmit && validationFn) {
        const isValid = await validationFn();
        if (!isValid) {
          setSubmitError('Please fix the validation errors before submitting');
          setIsSubmitting(false);
          return { success: false, error: 'Validation failed' };
        }
      }

      // Call the submit function
      let result;
      if (onSubmit) {
        result = await onSubmit(formData);
      } else {
        throw new Error('No submit handler provided');
      }

      // Handle successful submission
      setSubmitSuccess(true);
      
      if (showSuccessMessage) {
        setSubmitMessage(result?.message || 'Form submitted successfully');
      }

      // Reset form if requested
      if (resetOnSuccess && resetFn) {
        resetFn();
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result, formData);
      }

      setIsSubmitting(false);
      return { success: true, data: result };

    } catch (error) {
      console.error('Form submission error:', error);
      
      const errorMessage = error?.message || error?.error || 'An error occurred while submitting the form';
      setSubmitError(errorMessage);
      
      if (showErrorMessage) {
        setSubmitMessage(errorMessage);
      }

      // Call error callback
      if (onError) {
        onError(error, formData);
      }

      setIsSubmitting(false);
      return { success: false, error: errorMessage };
    }
  }, [
    isSubmitting,
    onSubmit,
    onSuccess,
    onError,
    validateBeforeSubmit,
    resetOnSuccess,
    showSuccessMessage,
    showErrorMessage
  ]);

  const clearSubmitState = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(false);
    setSubmitMessage('');
  }, []);

  const setSubmitLoading = useCallback((loading) => {
    setIsSubmitting(loading);
  }, []);

  return {
    // State
    isSubmitting,
    submitError,
    submitSuccess,
    submitMessage,
    
    // Actions
    handleSubmit,
    clearSubmitState,
    setSubmitLoading,
    
    // Setters for manual control
    setSubmitError,
    setSubmitSuccess,
    setSubmitMessage
  };
};

/**
 * useAsyncSubmission Hook
 * Specialized hook for handling async form submissions with retry logic
 */
export const useAsyncSubmission = ({
  maxRetries = 3,
  retryDelay = 1000,
  ...options
} = {}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const baseSubmission = useFormSubmission(options);

  const handleSubmitWithRetry = useCallback(async (formData, validationFn, resetFn) => {
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        if (attempt > 0) {
          setIsRetrying(true);
          setRetryCount(attempt);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }

        const result = await baseSubmission.handleSubmit(formData, validationFn, resetFn);
        
        if (result.success) {
          setRetryCount(0);
          setIsRetrying(false);
          return result;
        }

        // If it's a validation error, don't retry
        if (result.error === 'Validation failed') {
          setIsRetrying(false);
          return result;
        }

        attempt++;
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) {
          setIsRetrying(false);
          throw error;
        }
      }
    }

    setIsRetrying(false);
    return { success: false, error: 'Maximum retry attempts exceeded' };
  }, [baseSubmission, maxRetries, retryDelay]);

  return {
    ...baseSubmission,
    handleSubmit: handleSubmitWithRetry,
    retryCount,
    isRetrying,
    maxRetries
  };
};

export default useFormSubmission;