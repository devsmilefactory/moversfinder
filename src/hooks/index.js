// Form and Validation Hooks
export { default as useFormValidation } from './useFormValidation';
export { default as useFormSubmission } from './useFormSubmission';
export { default as useStepNavigation } from './useStepNavigation';

// Booking Hooks
export { default as useBookingState } from './useBookingState';
export { default as usePricingCalculation } from './usePricingCalculation';
export { default as useScheduling } from './useScheduling';
export { default as useBookingSubmission } from './useBookingSubmission';

// Driver/Ride Request Hooks
export { default as useRideRequests } from './useRideRequests';
export { default as useRideFiltering } from './useRideFiltering';
export { default as useRideActions } from './useRideActions';
export { default as useRealTimeUpdates } from './useRealTimeUpdates';

// Existing Hooks (from the project)
export { default as useActiveRideCheck } from './useActiveRideCheck';
export { default as useDriverRidesFeed } from './useDriverRidesFeed';
export { default as useNewRidesSubscription } from './useNewRidesSubscription';
export { default as usePassengerRidesFeed } from './usePassengerRidesFeed';

// NOTE: removed dead exports (kept code for future reference; see docs/DEPRECATED_CODE_MAP.md)
// export { default as useRideRealtime } from './useRideRealtime';
// export { default as useRideStateListener } from './useRideStateListener';

export { default as useErrandTasks } from './useErrandTasks';
export { default as useFeedTransitions } from './useFeedTransitions';