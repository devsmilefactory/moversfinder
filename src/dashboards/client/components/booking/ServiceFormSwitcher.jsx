import React from 'react';
import CompactTaxiForm from '../CompactTaxiForm';
import CompactCourierForm from '../CompactCourierForm';
import CompactSchoolRunForm from '../CompactSchoolRunForm';
import CompactErrandsForm from '../CompactErrandsForm';
import CompactBulkForm from '../CompactBulkForm';

/**
 * ServiceFormSwitcher Component
 * 
 * Renders the appropriate service form based on selectedService.
 * Extracted from UnifiedBookingModal for better organization.
 * 
 * @param {object} props
 * @param {string} props.selectedService - The selected service type (taxi, courier, school_run, errands, bulk)
 * @param {object} props.formData - The form data object
 * @param {function} props.onFormDataUpdate - Function to update form data (can be a setter function)
 * @param {array} props.savedPlaces - Array of saved places for location inputs
 * @param {object} props.errors - Validation errors object
 */
const ServiceFormSwitcher = ({
  selectedService,
  formData,
  onFormDataUpdate,
  savedPlaces = [],
  errors = {}
}) => {
  // Handle form data updates - support both function updater and direct value
  const handleFormDataChange = (updater) => {
    if (typeof updater === 'function') {
      onFormDataUpdate(updater);
    } else {
      onFormDataUpdate(updater);
    }
  };

  // Render appropriate form based on service type
  switch (selectedService) {
    case 'taxi':
      return (
        <CompactTaxiForm
          formData={formData}
          onChange={handleFormDataChange}
          savedPlaces={savedPlaces}
        />
      );

    case 'courier':
      return (
        <CompactCourierForm
          formData={formData}
          onChange={handleFormDataChange}
          savedPlaces={savedPlaces}
        />
      );

    case 'school_run':
      return (
        <CompactSchoolRunForm
          formData={formData}
          onChange={handleFormDataChange}
          savedPlaces={savedPlaces}
        />
      );

    case 'errands':
      return (
        <CompactErrandsForm
          formData={formData}
          onChange={handleFormDataChange}
          savedPlaces={savedPlaces}
        />
      );

    case 'bulk':
      return (
        <CompactBulkForm
          formData={formData}
          onChange={handleFormDataChange}
          savedPlaces={savedPlaces}
        />
      );

    default:
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">❓</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Unknown Service</h3>
            <p className="text-slate-600">
              The selected service type is not recognized. Please select a valid service.
            </p>
          </div>
        </div>
      );
  }
};

export default ServiceFormSwitcher;







