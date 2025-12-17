import React from 'react';
import { X } from 'lucide-react';

/**
 * BookingModalHeader Component
 * 
 * Header section for the booking modal containing:
 * - Close button
 * - Modal title
 * - Progress indicator for form completion
 * - Service type indicator
 */
const BookingModalHeader = ({
  onClose,
  selectedService,
  formData,
  isSubmitting = false,
  showProgress = true
}) => {
  // Calculate form completion progress
  const getFormProgress = () => {
    const steps = [
      { key: 'pickup', completed: !!formData.pickupLocation, label: 'Pickup' },
      { key: 'dropoff', completed: !!formData.dropoffLocation, label: 'Dropoff' },
      { key: 'details', completed: isFormDetailsComplete(), label: 'Details' },
      { key: 'ready', completed: isFormReady(), label: 'Ready' }
    ];
    
    return steps;
  };

  // Check if service-specific details are complete
  const isFormDetailsComplete = () => {
    if (!formData.pickupLocation || !formData.dropoffLocation) return false;
    
    switch (selectedService) {
      case 'courier':
        return formData.courier?.recipientName && formData.courier?.recipientPhone;
      case 'errands':
        return formData.errands?.tasks?.length > 0;
      case 'schoolRun':
        return formData.schoolRun?.studentName && formData.schoolRun?.guardianPhone;
      case 'bulk':
        return formData.bulk?.rides?.length > 0;
      default:
        return true;
    }
  };

  // Check if form is ready for submission
  const isFormReady = () => {
    return isFormDetailsComplete() && formData.paymentMethod;
  };

  // Get service display info
  const getServiceInfo = () => {
    const serviceMap = {
      taxi: { name: 'Taxi', icon: '🚕', color: 'blue' },
      courier: { name: 'Courier', icon: '📦', color: 'green' },
      errands: { name: 'Errands', icon: '🛒', color: 'purple' },
      schoolRun: { name: 'School Run', icon: '🎒', color: 'orange' },
      bulk: { name: 'Bulk Booking', icon: '🚌', color: 'indigo' }
    };
    
    return serviceMap[selectedService] || serviceMap.taxi;
  };

  const serviceInfo = getServiceInfo();
  const progressSteps = getFormProgress();

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200 md:rounded-t-xl">
      {/* Main Header Row */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          {/* Left: Close button and title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-slate-500 hover:text-slate-700 transition-colors rounded-full p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close booking modal"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2">
              <h2 id="booking-modal-title" className="text-lg font-bold text-slate-700">
                Book a Trip
              </h2>
              
              {/* Service indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${serviceInfo.color}-100 text-${serviceInfo.color}-700`}>
                <span>{serviceInfo.icon}</span>
                <span>{serviceInfo.name}</span>
              </div>
            </div>
          </div>

          {/* Right: Additional actions or status */}
          <div className="flex items-center gap-2">
            {isSubmitting && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        {showProgress && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-3">
            {progressSteps.map((step, index) => (
              <React.Fragment key={step.key}>
                {/* Step indicator */}
                <div className="flex items-center gap-1">
                  <div 
                    className={`w-2 h-2 rounded-full transition-colors ${
                      step.completed 
                        ? 'bg-green-500' 
                        : 'bg-slate-300'
                    }`}
                    aria-label={`${step.label} ${step.completed ? 'completed' : 'pending'}`}
                  />
                  <span className={step.completed ? 'text-green-600 font-medium' : 'text-slate-500'}>
                    {step.label}
                  </span>
                </div>
                
                {/* Connector line */}
                {index < progressSteps.length - 1 && (
                  <div className="flex-1 h-px bg-slate-200 max-w-[60px]" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Optional: Service-specific header info */}
      {selectedService === 'bulk' && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center gap-2 text-sm text-indigo-700">
            <span className="font-medium">💼 Corporate Booking</span>
            <span className="text-indigo-500">•</span>
            <span>Multiple rides for your team</span>
          </div>
        </div>
      )}
      
      {selectedService === 'errands' && formData.errands?.tasks?.length > 0 && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-100">
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <span className="font-medium">🛒 {formData.errands.tasks.length} Task{formData.errands.tasks.length !== 1 ? 's' : ''}</span>
            <span className="text-purple-500">•</span>
            <span>Multi-stop errand service</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingModalHeader;