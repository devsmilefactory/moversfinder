import React from 'react';
import {
  TaxiBookingForm,
  CourierBookingForm,
  ErrandsBookingForm,
  SchoolRunBookingForm,
  BulkBookingForm
} from './forms';

/**
 * ServiceDetailsSection Component
 * 
 * Renders service-specific form fields based on the selected service type.
 * Routes to the appropriate form component for each service.
 */
const ServiceDetailsSection = ({
  selectedService,
  serviceData,
  formData,
  onServiceDataUpdate,
  onFormDataUpdate,
  errors = {},
  warnings = {}
}) => {
  // Common props for all service forms
  const commonProps = {
    serviceData,
    formData,
    onServiceDataUpdate,
    onFormDataUpdate,
    errors,
    warnings
  };

  // Render the appropriate form based on selected service
  const renderServiceForm = () => {
    switch (selectedService) {
      case 'taxi':
        return <TaxiBookingForm {...commonProps} />;
      
      case 'courier':
        return <CourierBookingForm {...commonProps} />;
      
      case 'errands':
        return <ErrandsBookingForm {...commonProps} />;
      
      case 'school_run':
        return <SchoolRunBookingForm {...commonProps} />;
      
      case 'bulk':
        return <BulkBookingForm {...commonProps} />;
      
      default:
        return (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-center text-slate-500">
              <div className="text-2xl mb-2">🚧</div>
              <p className="font-medium">Service form not available</p>
              <p className="text-sm mt-1">
                Form for "{selectedService}" service is not implemented yet.
              </p>
            </div>
          </div>
        );
    }
  };

  return renderServiceForm();
};

export default ServiceDetailsSection;