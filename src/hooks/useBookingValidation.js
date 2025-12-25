import { useMemo } from 'react';

/**
 * useBookingValidation Hook
 * 
 * Validates booking form data based on service type.
 * Extracted from UnifiedBookingModal for reusability and maintainability.
 * 
 * @param {string} selectedService - The selected service type (taxi, courier, school_run, errands, bulk)
 * @param {object} formData - The form data object containing all booking fields
 * @returns {object} Validation result with isValid boolean and errors object
 */
export function useBookingValidation(selectedService, formData) {
  const validationResult = useMemo(() => {
    const errors = {};
    let isValid = false;

    // Service-specific validations
    switch (selectedService) {
      case 'taxi':
        if (!formData.pickupLocation) {
          errors.pickupLocation = 'Pickup location is required';
        }
        if (!formData.dropoffLocation) {
          errors.dropoffLocation = 'Dropoff location is required';
        }
        isValid = Boolean(formData.pickupLocation && formData.dropoffLocation);
        break;

      case 'courier': {
        const primary = formData.packages?.[0] || {};
        const recipientName = formData.recipientName || primary.recipientName;
        const recipientPhone = formData.recipientPhone || primary.recipientPhone;
        const packageDetails = formData.packageDetails || primary.packageDescription || primary.packageDetails;

        if (!formData.pickupLocation) {
          errors.pickupLocation = 'Pickup location is required';
        }
        if (!formData.dropoffLocation) {
          errors.dropoffLocation = 'Dropoff location is required';
        }
        if (!recipientName) {
          errors.recipientName = 'Recipient name is required';
        }
        if (!recipientPhone) {
          errors.recipientPhone = 'Recipient phone is required';
        }
        if (!packageDetails) {
          errors.packageDetails = 'Package description is required';
        }

        isValid = Boolean(
          formData.pickupLocation &&
          formData.dropoffLocation &&
          recipientName &&
          recipientPhone &&
          packageDetails
        );
        break;
      }

      case 'school_run':
        // Instant-only: do not require trip time
        if (!formData.pickupLocation) {
          errors.pickupLocation = 'Pickup location is required';
        }
        if (!formData.dropoffLocation) {
          errors.dropoffLocation = 'Dropoff location is required';
        }
        if (!formData.passengerName) {
          errors.passengerName = 'Passenger name is required';
        }
        if (!formData.contactNumber) {
          errors.contactNumber = 'Contact number is required';
        }

        isValid = Boolean(
          formData.pickupLocation &&
          formData.dropoffLocation &&
          formData.passengerName &&
          formData.contactNumber
        );
        break;

      case 'errands': {
        const tasks = Array.isArray(formData.tasks) ? formData.tasks : [];
        if (tasks.length === 0) {
          errors.tasks = 'At least one errand task is required';
          isValid = false;
        } else {
          const invalidTasks = tasks.filter(
            (task, index) =>
              !task ||
              !task.startPoint ||
              !task.destinationPoint
          );
          
          if (invalidTasks.length > 0) {
            errors.tasks = 'All tasks must have start and destination points';
            isValid = false;
          } else {
            isValid = true;
          }
        }
        break;
      }

      case 'bulk': {
        const mode = formData.bulkMode || 'multi_pickup';
        if (mode === 'multi_pickup') {
          if (!formData.dropoffLocation) {
            errors.dropoffLocation = 'Dropoff location is required';
          }
          if (!formData.bulkPickups || formData.bulkPickups.length === 0) {
            errors.bulkPickups = 'At least one pickup location is required';
          }
          isValid = Boolean(formData.dropoffLocation && (formData.bulkPickups || []).length > 0);
        } else {
          if (!formData.pickupLocation) {
            errors.pickupLocation = 'Pickup location is required';
          }
          if (!formData.bulkDropoffs || formData.bulkDropoffs.length === 0) {
            errors.bulkDropoffs = 'At least one dropoff location is required';
          }
          isValid = Boolean(formData.pickupLocation && (formData.bulkDropoffs || []).length > 0);
        }
        break;
      }

      default:
        isValid = false;
        errors.general = 'Invalid service type';
    }

    return {
      isValid,
      errors: Object.keys(errors).length > 0 ? errors : {}
    };
  }, [selectedService, formData]);

  /**
   * Validate a specific field
   * @param {string} fieldName - The field name to validate
   * @returns {object} { isValid: boolean, error: string | null }
   */
  const validateField = (fieldName) => {
    const error = validationResult.errors[fieldName];
    return {
      isValid: !error,
      error: error || null
    };
  };

  /**
   * Validate all fields
   * @returns {object} { isValid: boolean, errors: object }
   */
  const validateAll = () => {
    return validationResult;
  };

  return {
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    validateField,
    validateAll
  };
}



