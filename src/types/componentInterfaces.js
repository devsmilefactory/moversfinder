/**
 * Common component interface definitions
 * These interfaces define the standard props and patterns for shared components
 */

// Base component props that all components should support
export const BaseComponentProps = {
  className: '',
  testId: '',
  children: null
};

// Form component interfaces
export const FormComponentProps = {
  ...BaseComponentProps,
  value: '',
  onChange: () => {},
  onBlur: () => {},
  error: '',
  disabled: false,
  required: false,
  placeholder: ''
};

// Modal component interfaces
export const ModalProps = {
  ...BaseComponentProps,
  isOpen: false,
  onClose: () => {},
  title: '',
  size: 'md', // 'sm', 'md', 'lg', 'xl'
  closeOnOverlayClick: true,
  showCloseButton: true
};

// Loading state interfaces
export const LoadingStateProps = {
  ...BaseComponentProps,
  isLoading: false,
  loadingMessage: '',
  progress: null // 0-100 for progress bars
};

// Error state interfaces
export const ErrorStateProps = {
  ...BaseComponentProps,
  hasError: false,
  errorMessage: '',
  errorCode: '',
  onRetry: null,
  showRetryButton: true
};

// Step navigation interfaces (for multi-step forms)
export const StepNavigationProps = {
  ...BaseComponentProps,
  currentStep: 1,
  totalSteps: 1,
  onStepChange: () => {},
  stepLabels: [],
  canNavigateToStep: () => true
};

// Progress indicator interfaces
export const ProgressIndicatorProps = {
  ...BaseComponentProps,
  progress: 0, // 0-100
  showPercentage: true,
  color: 'primary',
  size: 'md'
};

// Validation result interface
export const ValidationResult = {
  isValid: true,
  errors: {},
  warnings: {}
};

// Component state interfaces
export const ComponentState = {
  loading: false,
  error: null,
  data: null
};

// Hook return interfaces
export const FormHookReturn = {
  formData: {},
  errors: {},
  isValid: false,
  isSubmitting: false,
  handleChange: () => {},
  handleSubmit: () => {},
  reset: () => {},
  setFieldValue: () => {},
  setFieldError: () => {}
};

export const StepNavigationHookReturn = {
  currentStep: 1,
  totalSteps: 1,
  isFirstStep: true,
  isLastStep: false,
  nextStep: () => {},
  prevStep: () => {},
  goToStep: () => {},
  canProceed: true,
  completedSteps: []
};