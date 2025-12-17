import { useState, useCallback, useEffect } from 'react';

/**
 * useBookingState Hook
 * Manages the main booking state including service selection, form data, and UI state
 */
const useBookingState = ({
  initialService = 'taxi',
  savedTrips = [],
  savedPlaces = [],
  onClose = null
} = {}) => {
  // Service selection state
  const [selectedService, setSelectedService] = useState(initialService);
  
  // Main form data state
  const [formData, setFormData] = useState({
    pickupLocation: '',
    dropoffLocation: '',
    passengers: 1,
    paymentMethod: 'cash',
    scheduleType: 'instant',
    selectedDates: [],
    scheduleMonth: '',
    tripTime: '',
    isRoundTrip: false,
    specialInstructions: ''
  });
  
  // Service-specific data
  const [serviceData, setServiceData] = useState({});
  
  // UI state
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [currentStep, setCurrentStep] = useState('booking'); // 'booking' | 'confirmation'
  
  // Handle service type change
  const handleServiceChange = useCallback((newService) => {
    setSelectedService(newService);
    // Reset service-specific data when changing services
    setServiceData({});
    setErrors({});
    setWarnings({});
  }, []);
  
  // Handle form data updates
  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Handle service data updates
  const updateServiceData = useCallback((updates) => {
    setServiceData(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Set field error
  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);
  
  // Set field warning
  const setFieldWarning = useCallback((field, warning) => {
    setWarnings(prev => ({ ...prev, [field]: warning }));
  }, []);
  
  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);
  
  // Clear warnings
  const clearWarnings = useCallback(() => {
    setWarnings({});
  }, []);
  
  // Reset all state
  const resetState = useCallback(() => {\n    setSelectedService(initialService);\n    setFormData({\n      pickupLocation: '',\n      dropoffLocation: '',\n      passengers: 1,\n      paymentMethod: 'cash',\n      scheduleType: 'instant',\n      selectedDates: [],\n      scheduleMonth: '',\n      tripTime: '',\n      isRoundTrip: false,\n      specialInstructions: ''\n    });\n    setServiceData({});\n    setErrors({});\n    setWarnings({});\n    setCurrentStep('booking');\n  }, [initialService]);\n  \n  // Initialize with saved data if available\n  const initializeWithSavedData = useCallback((savedData) => {\n    if (savedData) {\n      setSelectedService(savedData.serviceType || initialService);\n      setFormData(prev => ({ ...prev, ...savedData.formData }));\n      if (savedData.serviceData) {\n        setServiceData(savedData.serviceData);\n      }\n    }\n  }, [initialService]);\n  \n  // Load from saved trip\n  const loadFromSavedTrip = useCallback((tripId) => {\n    const savedTrip = savedTrips.find(trip => trip.id === tripId);\n    if (savedTrip) {\n      initializeWithSavedData(savedTrip);\n    }\n  }, [savedTrips, initializeWithSavedData]);\n  \n  // Get saved place by ID\n  const getSavedPlace = useCallback((placeId) => {\n    return savedPlaces.find(place => place.id === placeId);\n  }, [savedPlaces]);\n  \n  // Use saved place for pickup\n  const usePickupPlace = useCallback((placeId) => {\n    const place = getSavedPlace(placeId);\n    if (place) {\n      updateFormData({ pickupLocation: place.address });\n    }\n  }, [getSavedPlace, updateFormData]);\n  \n  // Use saved place for dropoff\n  const useDropoffPlace = useCallback((placeId) => {\n    const place = getSavedPlace(placeId);\n    if (place) {\n      updateFormData({ dropoffLocation: place.address });\n    }\n  }, [getSavedPlace, updateFormData]);\n  \n  // Basic form validation\n  useEffect(() => {\n    const hasRequiredFields = formData.pickupLocation && formData.dropoffLocation;\n    const hasNoErrors = Object.keys(errors).length === 0;\n    \n    setIsFormValid(hasRequiredFields && hasNoErrors);\n  }, [formData, errors]);\n  \n  // Handle modal close\n  const handleClose = useCallback(() => {\n    resetState();\n    if (onClose) {\n      onClose();\n    }\n  }, [resetState, onClose]);\n  \n  return {\n    // State\n    selectedService,\n    formData,\n    serviceData,\n    errors,\n    warnings,\n    isFormValid,\n    currentStep,\n    savedTrips,\n    savedPlaces,\n    \n    // Actions\n    handleServiceChange,\n    updateFormData,\n    updateServiceData,\n    setFieldError,\n    setFieldWarning,\n    clearErrors,\n    clearWarnings,\n    resetState,\n    handleClose,\n    setCurrentStep,\n    \n    // Saved data helpers\n    initializeWithSavedData,\n    loadFromSavedTrip,\n    getSavedPlace,\n    usePickupPlace,\n    useDropoffPlace\n  };\n};\n\nexport default useBookingState;\n