/**
 * Mock Data Factories
 * Centralized mock data generation for testing
 */

// =============================================================================
// ENHANCED DATA GENERATORS
// =============================================================================

/**
 * Generate mock ride data with realistic variations
 */
export const generateMockRideData = (overrides = {}) => {
  const serviceTypes = ['taxi', 'courier', 'errands', 'school_run'];
  const statuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
  
  const baseRide = {
    id: `ride_${Math.random().toString(36).substring(2, 15)}`,
    service_type: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
    ride_status: statuses[Math.floor(Math.random() * statuses.length)],
    pickup_address: `${Math.floor(Math.random() * 9999)} ${['Main St', 'Oak Ave', 'Park Rd', 'First St'][Math.floor(Math.random() * 4)]}`,
    dropoff_address: `${Math.floor(Math.random() * 9999)} ${['Second St', 'Elm Ave', 'Third Rd', 'Fourth St'][Math.floor(Math.random() * 4)]}`,
    pickup_latitude: -17.8 + Math.random() * 0.2,
    pickup_longitude: 31.0 + Math.random() * 0.2,
    dropoff_latitude: -17.8 + Math.random() * 0.2,
    dropoff_longitude: 31.0 + Math.random() * 0.2,
    passenger_id: `user_${Math.random().toString(36).substring(2, 15)}`,
    driver_id: Math.random() > 0.3 ? `driver_${Math.random().toString(36).substring(2, 15)}` : null,
    estimated_fare: Math.round((Math.random() * 95 + 5) * 100) / 100,
    actual_fare: Math.random() > 0.5 ? Math.round((Math.random() * 95 + 5) * 100) / 100 : null,
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    scheduled_for: Math.random() > 0.7 ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    special_instructions: Math.random() > 0.6 ? 'Please call when you arrive' : null,
    passenger_count: Math.floor(Math.random() * 4) + 1,
    ...overrides
  };

  // Add service-specific fields
  if (baseRide.service_type === 'courier') {
    baseRide.package_details = {
      description: 'Package delivery',
      weight: Math.round((Math.random() * 49.9 + 0.1) * 10) / 10,
      dimensions: {
        length: Math.floor(Math.random() * 90) + 10,
        width: Math.floor(Math.random() * 90) + 10,
        height: Math.floor(Math.random() * 45) + 5
      }
    };
  }

  if (baseRide.service_type === 'errands') {
    const taskCount = Math.floor(Math.random() * 5) + 1;
    baseRide.errand_tasks = Array.from({ length: taskCount }, (_, i) => ({
      id: `task_${Math.random().toString(36).substring(2, 15)}`,
      description: `Task ${i + 1}: Pick up items`,
      location: `${Math.floor(Math.random() * 9999)} ${['Store St', 'Shop Ave', 'Market Rd'][Math.floor(Math.random() * 3)]}`,
      estimated_duration: Math.floor(Math.random() * 105) + 15,
      completed: Math.random() > 0.5
    }));
  }

  return baseRide;
};

/**
 * Generate mock user data with realistic variations
 */
export const generateMockUserData = (overrides = {}) => {
  const userTypes = ['individual', 'corporate', 'driver', 'operator'];
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Emma'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Miller', 'Moore', 'Taylor'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  const baseUser = {
    id: `user_${Math.random().toString(36).substring(2, 15)}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    user_type: userTypes[Math.floor(Math.random() * userTypes.length)],
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_login: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: Math.random() > 0.1,
    ...overrides
  };

  // Add profile data if specified
  if (overrides.includeProfile !== false) {
    baseUser.full_name = `${firstName} ${lastName}`;
    baseUser.phone = `+263${Math.floor(Math.random() * 900000000) + 100000000}`;
    baseUser.date_of_birth = new Date(1970 + Math.random() * 40, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString();
    
    if (baseUser.user_type === 'driver') {
      baseUser.license_number = `DL${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      baseUser.license_expiry = new Date(Date.now() + Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
      baseUser.vehicle_make = ['Toyota', 'Honda', 'Nissan', 'Mazda'][Math.floor(Math.random() * 4)];
      baseUser.vehicle_model = ['Corolla', 'Civic', 'Sentra', 'Axela'][Math.floor(Math.random() * 4)];
      baseUser.vehicle_year = 2010 + Math.floor(Math.random() * 14);
      baseUser.vehicle_color = ['White', 'Silver', 'Black', 'Blue', 'Red'][Math.floor(Math.random() * 5)];
      baseUser.vehicle_plate = `${String.fromCharCode(65 + Math.random() * 26)}${String.fromCharCode(65 + Math.random() * 26)}${Math.floor(Math.random() * 900) + 100}${String.fromCharCode(65 + Math.random() * 26)}${String.fromCharCode(65 + Math.random() * 26)}`;
    }

    if (baseUser.user_type === 'corporate') {
      baseUser.company_name = ['Tech Solutions Ltd', 'Business Corp', 'Enterprise Inc', 'Global Services'][Math.floor(Math.random() * 4)];
      baseUser.company_registration = Math.random().toString(36).substring(2, 12).toUpperCase();
      baseUser.billing_address = `${Math.floor(Math.random() * 999) + 1} Business Park, Harare`;
    }
  }

  return baseUser;
};

/**
 * Generate mock form data for different form types
 */
export const generateMockFormData = (options = {}) => {
  const { type = 'generic', includeErrors = false, includeFiles = false } = options;
  
  const baseFormData = {
    data: {},
    errors: includeErrors ? {} : null,
    files: includeFiles ? [] : null
  };

  switch (type) {
    case 'profile':
      baseFormData.data = {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+263712345678',
        date_of_birth: '1990-01-15',
        address: '123 Main Street, Harare'
      };
      
      if (includeErrors) {
        baseFormData.errors = {};
        if (Math.random() > 0.5) baseFormData.errors.email = 'Invalid email format';
        if (Math.random() > 0.5) baseFormData.errors.phone = 'Phone number is required';
      }
      break;

    case 'booking':
      baseFormData.data = {
        service_type: ['taxi', 'courier', 'errands'][Math.floor(Math.random() * 3)],
        pickup_address: '123 Pickup Street',
        dropoff_address: '456 Dropoff Avenue',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        passenger_count: Math.floor(Math.random() * 4) + 1,
        special_instructions: 'Please call when you arrive'
      };
      
      if (includeErrors) {
        baseFormData.errors = {};
        if (Math.random() > 0.5) baseFormData.errors.pickup_address = 'Pickup address is required';
        if (Math.random() > 0.5) baseFormData.errors.dropoff_address = 'Dropoff address is required';
      }
      break;

    case 'registration':
      baseFormData.data = {
        email: 'newuser@example.com',
        password: 'password123',
        confirm_password: 'password123',
        user_type: ['individual', 'driver', 'corporate'][Math.floor(Math.random() * 3)],
        terms_accepted: true
      };
      
      if (includeErrors) {
        baseFormData.errors = {};
        if (Math.random() > 0.5) baseFormData.errors.password = 'Password must be at least 8 characters';
        if (Math.random() > 0.5) baseFormData.errors.confirm_password = 'Passwords do not match';
      }
      break;

    default:
      baseFormData.data = {
        field1: 'test value',
        field2: Math.floor(Math.random() * 100),
        field3: Math.random() > 0.5
      };
  }

  if (includeFiles) {
    const fileCount = Math.floor(Math.random() * 3) + 1;
    baseFormData.files = Array.from({ length: fileCount }, (_, i) => ({
      name: `file${i + 1}.${['jpg', 'png', 'pdf'][Math.floor(Math.random() * 3)]}`,
      size: Math.floor(Math.random() * 4999000) + 1000,
      type: ['image/jpeg', 'image/png', 'application/pdf'][Math.floor(Math.random() * 3)],
      lastModified: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
    }));
  }

  return baseFormData;
};

/**
 * Create mock API response with various configurations
 */
export const createMockApiResponse = (options = {}) => {
  const { 
    success = true, 
    dataType = 'object', 
    includeMetadata = false,
    errorMessage = 'Something went wrong'
  } = options;

  const response = {
    success,
    timestamp: new Date().toISOString()
  };

  if (success) {
    switch (dataType) {
      case 'array':
        const arrayLength = Math.floor(Math.random() * 10) + 1;
        response.data = Array.from({ length: arrayLength }, (_, i) => ({
          id: `item_${i + 1}`,
          name: `Item ${i + 1}`,
          value: Math.floor(Math.random() * 100)
        }));
        break;
      case 'object':
        response.data = {
          id: `obj_${Math.random().toString(36).substring(2, 15)}`,
          name: 'Test Object',
          description: 'This is a test object',
          created_at: new Date().toISOString()
        };
        break;
      case 'string':
        response.data = 'Test string response';
        break;
      default:
        response.data = null;
    }
    
    response.error = null;
  } else {
    response.data = null;
    response.error = errorMessage;
  }

  if (includeMetadata) {
    response.metadata = {
      page: Math.floor(Math.random() * 10) + 1,
      limit: [10, 25, 50, 100][Math.floor(Math.random() * 4)],
      total: Math.floor(Math.random() * 1000),
      has_more: Math.random() > 0.5
    };
  }

  return response;
};

// =============================================================================
// LEGACY MOCK DATA (MAINTAINED FOR COMPATIBILITY)
// =============================================================================

// User mock data
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  profile_completion_status: 'complete',
  approval_status: 'approved',
  ...overrides
});

// Ride mock data
export const createMockRide = (overrides = {}) => ({
  id: 'ride-123',
  user_id: 'user-123',
  service_type: 'taxi',
  pickup_location: 'Test Pickup Location',
  dropoff_location: 'Test Dropoff Location',
  pickup_coordinates: { lat: -20.1594, lng: 28.5833 },
  dropoff_coordinates: { lat: -20.1694, lng: 28.5933 },
  ride_status: 'pending',
  ride_timing: 'instant',
  distance_km: 5.2,
  estimated_duration_minutes: 15,
  fare: 25.50,
  created_at: new Date().toISOString(),
  ...overrides
});

// Form data mock
export const createMockFormData = (overrides = {}) => ({
  pickupLocation: 'Test Pickup',
  dropoffLocation: 'Test Dropoff',
  passengers: 1,
  paymentMethod: 'cash',
  specialInstructions: '',
  isRoundTrip: false,
  scheduleType: 'specific_dates',
  selectedDates: [],
  tripTime: '',
  ...overrides
});

// Driver mock data
export const createMockDriver = (overrides = {}) => ({
  id: 'driver-123',
  full_name: 'Test Driver',
  license_number: 'DL123456',
  vehicle_make: 'Toyota',
  vehicle_model: 'Corolla',
  license_plate: 'ABC123',
  rating: 4.5,
  total_trips: 150,
  is_online: true,
  approval_status: 'approved',
  ...overrides
});

// Profile mock data
export const createMockProfile = (type = 'individual', overrides = {}) => {
  const baseProfile = {
    id: 'profile-123',
    user_id: 'user-123',
    profile_type: type,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  switch (type) {
    case 'individual':
      return {
        ...baseProfile,
        service_preferences: {},
        saved_places: [],
        payment_methods: [],
        total_rides: 0,
        total_spent: 0,
        ...overrides
      };
    
    case 'corporate':
      return {
        ...baseProfile,
        company_name: 'Test Company',
        registration_number: 'REG123',
        billing_method: ['invoice'],
        account_tier: 'starter',
        ...overrides
      };
    
    case 'driver':
      return {
        ...baseProfile,
        full_name: 'Test Driver',
        license_number: 'DL123456',
        vehicle_make: 'Toyota',
        vehicle_model: 'Corolla',
        license_plate: 'ABC123',
        ...overrides
      };
    
    default:
      return { ...baseProfile, ...overrides };
  }
};

// Error mock data
export const createMockError = (overrides = {}) => ({
  message: 'Test error message',
  code: 'TEST_ERROR',
  status: 400,
  ...overrides
});

// API response mock data
export const createMockApiResponse = (data = {}, overrides = {}) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  ...overrides
});

// Component props mock data
export const createMockComponentProps = (overrides = {}) => ({
  className: 'test-component',
  testId: 'test-component',
  disabled: false,
  loading: false,
  ...overrides
});

// Modal props mock data
export const createMockModalProps = (overrides = {}) => ({
  isOpen: true,
  onClose: jest.fn(),
  title: 'Test Modal',
  size: 'md',
  ...overrides
});

// Form validation mock data
export const createMockValidationErrors = (overrides = {}) => ({
  pickupLocation: '',
  dropoffLocation: '',
  passengers: '',
  ...overrides
});

// Zustand store mock data
export const createMockStoreState = (storeName, overrides = {}) => {
  const baseState = {
    loading: false,
    error: null,
    data: null
  };

  switch (storeName) {
    case 'auth':
      return {
        ...baseState,
        user: createMockUser(),
        isAuthenticated: true,
        ...overrides
      };
    
    case 'rides':
      return {
        ...baseState,
        rides: [createMockRide()],
        activeRide: null,
        ...overrides
      };
    
    case 'profile':
      return {
        ...baseState,
        activeProfile: createMockProfile(),
        profiles: [createMockProfile()],
        ...overrides
      };
    
    default:
      return { ...baseState, ...overrides };
  }
};