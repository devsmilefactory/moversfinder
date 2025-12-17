import React from 'react';
import { BookingErrorBoundary } from '../shared/BookingErrorBoundary';
import { LoadingSpinner } from '../shared/loading/LoadingSpinner';
import BookingModalHeader from './BookingModalHeader';
import BookingModalContent from './BookingModalContent';
import BookingModalFooter from './BookingModalFooter';
import useBookingState from '../../hooks/useBookingState';
import usePricingCalculation from '../../hooks/usePricingCalculation';
import useScheduling from '../../hooks/useScheduling';
import useBookingSubmission from '../../hooks/useBookingSubmission';

/**
 * BookingModal Container Component
 * 
 * Main container for the unified booking modal that orchestrates all booking functionality.
 * Uses custom hooks for state management and provides a clean, modular structure.
 * 
 * Features:
 * - Responsive design (50% width desktop, full width mobile)
 * - Error boundary protection
 * - Loading states
 * - Modal overlay with backdrop
 * - Keyboard navigation support
 */
const BookingModal = ({
  isOpen,
  onClose,
  defaultServiceType = 'taxi',
  savedTrips = [],
  savedPlaces = [],
  initialData = null,
  mode = 'create', // 'create', 'edit', 'rebook'
  onSuccess = null
}) => {
  // Main booking state management
  const bookingState = useBookingState({
    initialService: defaultServiceType,
    savedTrips,
    savedPlaces,
    onClose
  });

  // Scheduling functionality
  const schedulingState = useScheduling({
    initialScheduleType: bookingState.formData.scheduleType
  });

  // Pricing calculations
  const pricingState = usePricingCalculation({
    selectedService: bookingState.selectedService,
    formData: bookingState.formData,
    pickupCoordinates: bookingState.formData.pickupCoordinates,
    dropoffCoordinates: bookingState.formData.dropoffCoordinates,
    isRoundTrip: bookingState.formData.isRoundTrip
  });

  // Booking submission
  const submissionState = useBookingSubmission({
    onSuccess: (result, bookingData) => {
      bookingState.reset();
      schedulingState.reset();
      if (onSuccess) {
        onSuccess(result, bookingData);
      }
      onClose();
    },
    onError: (error) => {
      console.error('Booking submission error:', error);
    }
  });

  // Handle modal close with cleanup
  const handleClose = () => {
    if (!submissionState.isSubmitting) {
      bookingState.reset();
      schedulingState.reset();
      onClose();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !submissionState.isSubmitting) {
      handleClose();
    }
  };

  // Handle booking submission
  const handleBookingSubmit = async () => {
    try {
      const bookingData = {
        selectedService: bookingState.selectedService,
        formData: bookingState.formData,
        estimate: pricingState.estimate,
        schedulingSummary: schedulingState.schedulingSummary
      };

      await submissionState.submitBooking(
        bookingData,
        bookingState.validateForm,
        bookingState.reset
      );
    } catch (error) {
      console.error('Booking submission failed:', error);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <BookingErrorBoundary>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center md:p-4"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
          aria-label="Close modal"
        />

        {/* Modal Container */}
        <div
          className="relative bg-white md:rounded-xl shadow-2xl w-full md:w-1/2 h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
        >
          {/* Loading Overlay */}
          {submissionState.isSubmitting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex items-center justify-center rounded-xl">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-2 text-sm text-slate-600">Processing your booking...</p>
              </div>
            </div>
          )}

          {/* Header */}
          <BookingModalHeader
            onClose={handleClose}
            selectedService={bookingState.selectedService}
            formData={bookingState.formData}
            isSubmitting={submissionState.isSubmitting}
          />

          {/* Content */}
          <BookingModalContent
            // Booking state
            selectedService={bookingState.selectedService}
            formData={bookingState.formData}
            currentServiceData={bookingState.currentServiceData}
            errors={bookingState.errors}
            warnings={bookingState.warnings}
            
            // State handlers
            onServiceChange={bookingState.handleServiceChange}
            onFormDataUpdate={bookingState.updateFormData}
            onServiceDataUpdate={bookingState.updateServiceData}
            
            // Scheduling
            schedulingState={schedulingState}
            
            // Pricing
            estimate={pricingState.estimate}
            isCalculating={pricingState.isCalculating}
            calculationError={pricingState.calculationError}
            formattedPrice={pricingState.formattedPrice}
            
            // External data
            savedTrips={savedTrips}
            savedPlaces={savedPlaces}
            mode={mode}
            initialData={initialData}
          />

          {/* Footer */}
          <BookingModalFooter
            // Form state
            isFormValid={bookingState.isFormValid}
            canProceedToNextStep={bookingState.canProceedToNextStep}
            
            // Pricing
            estimate={pricingState.estimate}
            formattedPrice={pricingState.formattedPrice}
            isCalculating={pricingState.isCalculating}
            
            // Submission
            isSubmitting={submissionState.isSubmitting}
            submitError={submissionState.submitError}
            
            // Actions
            onSubmit={handleBookingSubmit}
            onClose={handleClose}
            
            // Service info
            selectedService={bookingState.selectedService}
            schedulingSummary={schedulingState.schedulingSummary}
          />
        </div>
      </div>
    </BookingErrorBoundary>
  );
};

export default BookingModal;