/**
 * Test Configuration and Setup
 * 
 * Centralized configuration for all testing utilities and frameworks
 */

// =============================================================================
// PERFORMANCE TESTING CONFIGURATION
// =============================================================================

export const PERFORMANCE_CONFIG = {
  // Benchmark settings
  benchmarks: {
    defaultIterations: 100,
    warmupRuns: 10,
    memoryTracking: true,
    renderTracking: true,
    sampleRate: 0.1
  },
  
  // Performance thresholds
  thresholds: {
    renderTime: {
      excellent: 16, // 60fps
      good: 33, // 30fps
      acceptable: 50,
      poor: 100
    },
    memoryUsage: {
      small: 1024 * 1024, // 1MB
      medium: 5 * 1024 * 1024, // 5MB
      large: 10 * 1024 * 1024, // 10MB
      excessive: 50 * 1024 * 1024 // 50MB
    },
    bundleSize: {
      small: 10 * 1024, // 10KB
      medium: 50 * 1024, // 50KB
      large: 100 * 1024, // 100KB
      excessive: 500 * 1024 // 500KB
    },
    renderCount: {
      optimal: 1,
      acceptable: 3,
      concerning: 5,
      problematic: 10
    }
  },
  
  // Optimization recommendations
  optimization: {
    memoThreshold: 0.15, // 15% improvement to recommend React.memo
    callbackThreshold: 0.10, // 10% improvement to recommend useCallback
    lazyLoadingThreshold: 0.7, // Score threshold for lazy loading recommendation
    bundleSplittingThreshold: 100 * 1024 // 100KB threshold for bundle splitting
  }
};

// =============================================================================
// PROPERTY TESTING CONFIGURATION
// =============================================================================

export const PROPERTY_TEST_CONFIG = {
  // Fast-check configuration
  fastCheck: {
    numRuns: 100,
    maxSkipsPerRun: 1000,
    timeout: 5000,
    seed: undefined, // Use random seed by default
    path: undefined, // No specific path by default
    logger: console.log,
    verbose: false
  },
  
  // Property test categories
  categories: {
    componentInterface: {
      numRuns: 50,
      timeout: 3000
    },
    errorHandling: {
      numRuns: 75,
      timeout: 4000
    },
    performance: {
      numRuns: 25,
      timeout: 10000
    },
    accessibility: {
      numRuns: 40,
      timeout: 5000
    },
    stateManagement: {
      numRuns: 60,
      timeout: 4000
    }
  },
  
  // Data generators configuration
  generators: {
    strings: {
      minLength: 1,
      maxLength: 100,
      allowEmpty: false
    },
    numbers: {
      min: -1000,
      max: 1000,
      allowNaN: false,
      allowInfinity: false
    },
    arrays: {
      minLength: 0,
      maxLength: 20
    },
    objects: {
      maxDepth: 3,
      maxKeys: 10
    }
  }
};

// =============================================================================
// COMPONENT TESTING CONFIGURATION
// =============================================================================

export const COMPONENT_TEST_CONFIG = {
  // Rendering configuration
  rendering: {
    timeout: 5000,
    cleanup: true,
    strictMode: true,
    concurrent: false
  },
  
  // Mock configuration
  mocks: {
    supabase: {
      autoMock: true,
      defaultResponses: {
        select: { data: [], error: null },
        insert: { data: null, error: null },
        update: { data: null, error: null },
        delete: { data: null, error: null }
      }
    },
    
    router: {
      autoMock: true,
      defaultLocation: '/',
      historyType: 'memory'
    },
    
    auth: {
      autoMock: true,
      defaultUser: null,
      defaultSession: null
    },
    
    api: {
      autoMock: true,
      delay: 100,
      successRate: 0.9
    }
  },
  
  // Accessibility testing
  accessibility: {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'aria-labels': { enabled: true },
      'focus-management': { enabled: true },
      'semantic-markup': { enabled: true }
    },
    
    standards: 'WCAG21AA',
    
    ignoreRules: [
      // Add rules to ignore if necessary
    ]
  },
  
  // Snapshot testing
  snapshots: {
    enabled: true,
    updateOnFail: false,
    threshold: 0.2, // 20% difference threshold
    
    serializers: [
      'enzyme-to-json/serializer',
      'jest-emotion/serializer'
    ]
  }
};

// =============================================================================
// ERROR HANDLING TEST CONFIGURATION
// =============================================================================

export const ERROR_TEST_CONFIG = {
  // Error boundary testing
  errorBoundaries: {
    testRecovery: true,
    testLogging: true,
    testFallbacks: true,
    maxRetries: 3
  },
  
  // Error types to test
  errorTypes: [
    'TypeError',
    'ReferenceError',
    'RangeError',
    'SyntaxError',
    'Error',
    'NetworkError',
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError'
  ],
  
  // Error scenarios
  scenarios: {
    componentCrash: {
      enabled: true,
      probability: 0.1
    },
    
    apiFailure: {
      enabled: true,
      probability: 0.2,
      statusCodes: [400, 401, 403, 404, 500, 502, 503]
    },
    
    networkTimeout: {
      enabled: true,
      probability: 0.1,
      timeout: 5000
    },
    
    validationFailure: {
      enabled: true,
      probability: 0.3
    }
  },
  
  // Error reporting
  reporting: {
    enabled: true,
    sanitize: true,
    includeStack: true,
    includeContext: true,
    includeUser: false, // Don't include user data in tests
    
    sensitiveFields: [
      'password',
      'token',
      'creditCard',
      'ssn',
      'apiKey',
      'secret'
    ]
  }
};

// =============================================================================
// INTEGRATION TEST CONFIGURATION
// =============================================================================

export const INTEGRATION_TEST_CONFIG = {
  // Test environment
  environment: {
    baseUrl: 'http://localhost:4030',
    apiUrl: 'http://localhost:54321',
    timeout: 30000,
    retries: 2
  },
  
  // Database setup
  database: {
    resetBetweenTests: true,
    seedData: true,
    migrations: true,
    cleanup: true
  },
  
  // Authentication
  auth: {
    testUsers: {
      individual: {
        email: 'test.individual@example.com',
        password: 'testpassword123',
        userType: 'individual'
      },
      
      corporate: {
        email: 'test.corporate@example.com',
        password: 'testpassword123',
        userType: 'corporate'
      },
      
      driver: {
        email: 'test.driver@example.com',
        password: 'testpassword123',
        userType: 'driver'
      },
      
      operator: {
        email: 'test.operator@example.com',
        password: 'testpassword123',
        userType: 'operator'
      }
    }
  },
  
  // Feature flags
  features: {
    realTimeUpdates: true,
    pushNotifications: false, // Disable in tests
    analytics: false, // Disable in tests
    errorReporting: false // Disable in tests
  }
};

// =============================================================================
// TEST UTILITIES CONFIGURATION
// =============================================================================

export const TEST_UTILITIES_CONFIG = {
  // Mock data generation
  mockData: {
    locale: 'en',
    seed: 12345, // Fixed seed for reproducible tests
    
    defaults: {
      user: {
        userType: 'individual',
        emailDomain: 'example.com',
        includeProfile: true
      },
      
      ride: {
        serviceType: 'taxi',
        status: 'pending',
        includeLocation: true
      },
      
      form: {
        includeValidation: true,
        includeErrors: false
      }
    }
  },
  
  // Test helpers
  helpers: {
    async: {
      defaultTimeout: 5000,
      retryInterval: 100,
      maxRetries: 50
    },
    
    forms: {
      fillDelay: 50, // ms between keystrokes
      submitDelay: 100 // ms before form submission
    },
    
    api: {
      mockDelay: 100,
      errorRate: 0.1,
      timeoutRate: 0.05
    }
  },
  
  // Custom matchers
  matchers: {
    accessibility: {
      enabled: true,
      strict: false
    },
    
    performance: {
      enabled: true,
      thresholds: PERFORMANCE_CONFIG.thresholds
    },
    
    console: {
      trackErrors: true,
      trackWarnings: false,
      trackLogs: false
    }
  }
};

// =============================================================================
// ENVIRONMENT-SPECIFIC OVERRIDES
// =============================================================================

export const getTestConfig = (environment = 'test') => {
  const baseConfig = {
    performance: PERFORMANCE_CONFIG,
    propertyTest: PROPERTY_TEST_CONFIG,
    component: COMPONENT_TEST_CONFIG,
    error: ERROR_TEST_CONFIG,
    integration: INTEGRATION_TEST_CONFIG,
    utilities: TEST_UTILITIES_CONFIG
  };
  
  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        performance: {
          ...baseConfig.performance,
          benchmarks: {
            ...baseConfig.performance.benchmarks,
            defaultIterations: 10, // Fewer iterations for faster feedback
            sampleRate: 1.0 // Full sampling in development
          }
        },
        propertyTest: {
          ...baseConfig.propertyTest,
          fastCheck: {
            ...baseConfig.propertyTest.fastCheck,
            numRuns: 25, // Fewer runs for faster feedback
            verbose: true
          }
        }
      };
      
    case 'ci':
      return {
        ...baseConfig,
        performance: {
          ...baseConfig.performance,
          benchmarks: {
            ...baseConfig.performance.benchmarks,
            defaultIterations: 200, // More iterations for stable results
            sampleRate: 0.05 // Lower sampling to reduce CI time
          }
        },
        propertyTest: {
          ...baseConfig.propertyTest,
          fastCheck: {
            ...baseConfig.propertyTest.fastCheck,
            numRuns: 150, // More runs for thorough testing
            timeout: 10000 // Longer timeout for CI
          }
        },
        component: {
          ...baseConfig.component,
          rendering: {
            ...baseConfig.component.rendering,
            timeout: 10000 // Longer timeout for CI
          }
        }
      };
      
    case 'production':
      return {
        ...baseConfig,
        error: {
          ...baseConfig.error,
          reporting: {
            ...baseConfig.error.reporting,
            includeUser: true, // Include user data in production error reports
            sanitize: true // Always sanitize in production
          }
        }
      };
      
    default:
      return baseConfig;
  }
};

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

export const validateTestConfig = (config) => {
  const errors = [];
  
  // Validate performance thresholds
  if (config.performance?.thresholds?.renderTime?.excellent > config.performance?.thresholds?.renderTime?.good) {
    errors.push('Performance threshold: excellent render time should be less than good render time');
  }
  
  // Validate property test configuration
  if (config.propertyTest?.fastCheck?.numRuns < 1) {
    errors.push('Property test: numRuns must be at least 1');
  }
  
  // Validate timeout values
  const timeouts = [
    config.component?.rendering?.timeout,
    config.propertyTest?.fastCheck?.timeout,
    config.integration?.environment?.timeout
  ].filter(Boolean);
  
  if (timeouts.some(timeout => timeout < 1000)) {
    errors.push('Timeout values should be at least 1000ms');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  getTestConfig,
  validateTestConfig,
  PERFORMANCE_CONFIG,
  PROPERTY_TEST_CONFIG,
  COMPONENT_TEST_CONFIG,
  ERROR_TEST_CONFIG,
  INTEGRATION_TEST_CONFIG,
  TEST_UTILITIES_CONFIG
};