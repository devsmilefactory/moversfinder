import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import fc from 'fast-check';

// Import testing utilities to test
import {
  generateMockRideData,
  generateMockUserData,
  generateMockFormData,
  createMockApiResponse
} from '../mockData';
import {
  renderWithProviders,
  createTestWrapper,
  mockSupabaseClient,
  mockAuthStore
} from '../componentTestUtils';
import {
  generateValidProps,
  generateInvalidProps,
  testComponentProperty
} from '../propertyTestUtils';
import { toBeAccessible, toHaveNoConsoleErrors } from '../customMatchers';

/**
 * Property Tests for Testing Infrastructure
 * 
 * **Feature: component-modularization, Property 11: Testing infrastructure reliability**
 * **Validates: Requirements 6.1, 6.2**
 * 
 * Tests that our testing infrastructure is reliable and consistent:
 * - Mock data generators produce valid data
 * - Test utilities work correctly
 * - Property test helpers are reliable
 * - Custom matchers function properly
 */

describe('Testing Infrastructure Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property: Mock data generators should produce valid data', () => {
    it('should generate valid ride data consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            count: fc.integer({ min: 1, max: 100 }),
            serviceType: fc.constantFrom('taxi', 'courier', 'errands', 'school_run'),
            status: fc.constantFrom('pending', 'accepted', 'completed')
          }),
          (testData) => {
            const mockRides = Array.from({ length: testData.count }, () => 
              generateMockRideData({
                service_type: testData.serviceType,
                ride_status: testData.status
              })
            );

            // All generated rides should be valid
            mockRides.forEach(ride => {
              expect(ride).toHaveProperty('id');
              expect(ride).toHaveProperty('service_type', testData.serviceType);
              expect(ride).toHaveProperty('ride_status', testData.status);
              expect(ride).toHaveProperty('pickup_address');
              expect(ride).toHaveProperty('dropoff_address');
              expect(ride).toHaveProperty('created_at');
              
              // Validate data types
              expect(typeof ride.id).toBe('string');
              expect(typeof ride.pickup_address).toBe('string');
              expect(typeof ride.dropoff_address).toBe('string');
              expect(ride.pickup_address.length).toBeGreaterThan(0);
              expect(ride.dropoff_address.length).toBeGreaterThan(0);
            });

            // All rides should be unique
            const ids = mockRides.map(ride => ride.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(mockRides.length);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should generate valid user data with proper constraints', () => {
      fc.assert(
        fc.property(
          fc.record({
            userType: fc.constantFrom('individual', 'corporate', 'driver'),
            includeProfile: fc.boolean()
          }),
          (testData) => {
            const mockUser = generateMockUserData({
              user_type: testData.userType,
              includeProfile: testData.includeProfile
            });

            // Basic user properties
            expect(mockUser).toHaveProperty('id');
            expect(mockUser).toHaveProperty('email');
            expect(mockUser).toHaveProperty('user_type', testData.userType);
            
            // Email should be valid format
            expect(mockUser.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            
            // Profile data should be included if requested
            if (testData.includeProfile) {
              expect(mockUser).toHaveProperty('full_name');
              expect(mockUser).toHaveProperty('phone');
              expect(typeof mockUser.full_name).toBe('string');
              expect(mockUser.full_name.length).toBeGreaterThan(0);
            }

            // Driver-specific properties
            if (testData.userType === 'driver' && testData.includeProfile) {
              expect(mockUser).toHaveProperty('license_number');
              expect(mockUser).toHaveProperty('vehicle_make');
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should generate valid form data for different form types', () => {
      fc.assert(
        fc.property(
          fc.record({
            formType: fc.constantFrom('profile', 'booking', 'registration'),
            includeErrors: fc.boolean(),
            includeFiles: fc.boolean()
          }),
          (testData) => {
            const mockFormData = generateMockFormData({
              type: testData.formType,
              includeErrors: testData.includeErrors,
              includeFiles: testData.includeFiles
            });

            expect(mockFormData).toHaveProperty('data');
            expect(typeof mockFormData.data).toBe('object');
            
            if (testData.includeErrors) {
              expect(mockFormData).toHaveProperty('errors');
              expect(typeof mockFormData.errors).toBe('object');
            }

            if (testData.includeFiles) {
              expect(mockFormData).toHaveProperty('files');
              expect(Array.isArray(mockFormData.files)).toBe(true);
            }

            // Form-specific validations
            if (testData.formType === 'profile') {
              expect(mockFormData.data).toHaveProperty('full_name');
              expect(mockFormData.data).toHaveProperty('email');
            }

            if (testData.formType === 'booking') {
              expect(mockFormData.data).toHaveProperty('pickup_address');
              expect(mockFormData.data).toHaveProperty('dropoff_address');
            }
          }
        ),
        { numRuns: 12 }
      );
    });
  });

  describe('Property: Test utilities should work consistently', () => {
    it('should render components with providers correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            componentName: fc.string({ minLength: 1, maxLength: 20 }),
            hasProps: fc.boolean(),
            needsAuth: fc.boolean()
          }),
          (testData) => {
            const TestComponent = ({ name, ...props }) => (
              <div data-testid={`test-${name}`} {...props}>
                Test Component: {name}
              </div>
            );

            const renderOptions = {
              initialEntries: ['/'],
              authRequired: testData.needsAuth
            };

            const props = testData.hasProps ? { 
              name: testData.componentName,
              'data-extra': 'test-data' 
            } : { name: testData.componentName };

            const { container, getByTestId } = renderWithProviders(
              <TestComponent {...props} />,
              renderOptions
            );

            // Component should render
            expect(container).toBeInTheDocument();
            expect(getByTestId(`test-${testData.componentName}`)).toBeInTheDocument();
            
            // Props should be passed correctly
            const element = getByTestId(`test-${testData.componentName}`);
            if (testData.hasProps) {
              expect(element).toHaveAttribute('data-extra', 'test-data');
            }
          }
        ),
        { numRuns: 8 }
      );
    });

    it('should create test wrappers with proper context', () => {
      fc.assert(
        fc.property(
          fc.record({
            wrapperType: fc.constantFrom('auth', 'router', 'theme', 'full'),
            initialState: fc.record({
              user: fc.option(fc.record({
                id: fc.string(),
                email: fc.emailAddress()
              }), { nil: null }),
              theme: fc.constantFrom('light', 'dark')
            })
          }),
          (testData) => {
            const TestWrapper = createTestWrapper({
              type: testData.wrapperType,
              initialState: testData.initialState
            });

            const TestComponent = () => <div data-testid="wrapped-component">Test</div>;

            const { getByTestId } = render(
              <TestWrapper>
                <TestComponent />
              </TestWrapper>
            );

            // Component should render within wrapper
            expect(getByTestId('wrapped-component')).toBeInTheDocument();
          }
        ),
        { numRuns: 6 }
      );
    });

    it('should mock Supabase client consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            operation: fc.constantFrom('select', 'insert', 'update', 'delete'),
            table: fc.constantFrom('rides', 'profiles', 'users'),
            shouldSucceed: fc.boolean()
          }),
          async (testData) => {
            const mockClient = mockSupabaseClient({
              [testData.table]: {
                [testData.operation]: testData.shouldSucceed
              }
            });

            // Mock client should have expected methods
            expect(mockClient).toHaveProperty('from');
            expect(typeof mockClient.from).toBe('function');

            // Test the mocked operation
            const query = mockClient.from(testData.table);
            expect(query).toHaveProperty(testData.operation);
            
            if (testData.operation === 'select') {
              const result = await query.select();
              if (testData.shouldSucceed) {
                expect(result).toHaveProperty('data');
                expect(result.error).toBeNull();
              } else {
                expect(result).toHaveProperty('error');
                expect(result.error).not.toBeNull();
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Property test helpers should be reliable', () => {
    it('should generate valid props for components', () => {
      fc.assert(
        fc.property(
          fc.record({
            componentType: fc.constantFrom('button', 'input', 'modal', 'card'),
            includeOptional: fc.boolean(),
            includeCallbacks: fc.boolean()
          }),
          (testData) => {
            const validProps = generateValidProps({
              componentType: testData.componentType,
              includeOptional: testData.includeOptional,
              includeCallbacks: testData.includeCallbacks
            });

            expect(typeof validProps).toBe('object');
            expect(validProps).not.toBeNull();

            // Should have required props for component type
            if (testData.componentType === 'button') {
              expect(validProps).toHaveProperty('children');
            }

            if (testData.componentType === 'input') {
              expect(validProps).toHaveProperty('value');
              expect(validProps).toHaveProperty('onChange');
            }

            if (testData.componentType === 'modal') {
              expect(validProps).toHaveProperty('isOpen');
              expect(validProps).toHaveProperty('onClose');
            }

            // Callbacks should be functions if included
            if (testData.includeCallbacks) {
              Object.entries(validProps).forEach(([key, value]) => {
                if (key.startsWith('on') && key.length > 2) {
                  expect(typeof value).toBe('function');
                }
              });
            }
          }
        ),
        { numRuns: 12 }
      );
    });

    it('should generate invalid props that cause expected failures', () => {
      fc.assert(
        fc.property(
          fc.record({
            componentType: fc.constantFrom('button', 'input', 'modal'),
            invalidationType: fc.constantFrom('missing_required', 'wrong_type', 'invalid_value')
          }),
          (testData) => {
            const invalidProps = generateInvalidProps({
              componentType: testData.componentType,
              invalidationType: testData.invalidationType
            });

            expect(typeof invalidProps).toBe('object');

            // Should have the expected type of invalidity
            if (testData.invalidationType === 'missing_required') {
              // Should be missing some required props
              if (testData.componentType === 'input') {
                expect(invalidProps.value === undefined || invalidProps.onChange === undefined).toBe(true);
              }
            }

            if (testData.invalidationType === 'wrong_type') {
              // Should have props with wrong types
              const hasWrongType = Object.values(invalidProps).some(value => {
                return typeof value === 'string' && value === 'INVALID_TYPE';
              });
              expect(hasWrongType).toBe(true);
            }
          }
        ),
        { numRuns: 8 }
      );
    });

    it('should test component properties reliably', () => {
      fc.assert(
        fc.property(
          fc.record({
            propertyName: fc.constantFrom('accessibility', 'performance', 'error_handling'),
            componentProps: fc.record({
              disabled: fc.boolean(),
              loading: fc.boolean(),
              error: fc.option(fc.string(), { nil: null })
            })
          }),
          async (testData) => {
            const TestComponent = ({ disabled, loading, error }) => (
              <div 
                data-testid="test-component"
                aria-disabled={disabled}
                aria-busy={loading}
                role="button"
              >
                {error && <span data-testid="error">{error}</span>}
                Test Component
              </div>
            );

            const testResult = await testComponentProperty({
              component: TestComponent,
              props: testData.componentProps,
              property: testData.propertyName
            });

            expect(testResult).toHaveProperty('passed');
            expect(typeof testResult.passed).toBe('boolean');
            
            if (testResult.passed === false) {
              expect(testResult).toHaveProperty('error');
              expect(typeof testResult.error).toBe('string');
            }
          }
        ),
        { numRuns: 6 }
      );
    });
  });

  describe('Property: Custom matchers should work correctly', () => {
    it('should validate accessibility correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            hasAriaLabel: fc.boolean(),
            hasRole: fc.boolean(),
            hasTabIndex: fc.boolean(),
            isInteractive: fc.boolean()
          }),
          async (testData) => {
            const TestComponent = () => (
              <button
                {...(testData.hasAriaLabel && { 'aria-label': 'Test button' })}
                {...(testData.hasRole && { role: 'button' })}
                {...(testData.hasTabIndex && { tabIndex: 0 })}
                {...(testData.isInteractive && { onClick: () => {} })}
                data-testid="test-button"
              >
                Click me
              </button>
            );

            const { getByTestId } = render(<TestComponent />);
            const element = getByTestId('test-button');

            // Test our custom accessibility matcher
            if (testData.hasAriaLabel && testData.hasRole && testData.isInteractive) {
              await expect(element).toBeAccessible();
            }
          }
        ),
        { numRuns: 8 }
      );
    });

    it('should detect console errors correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            shouldError: fc.boolean(),
            errorType: fc.constantFrom('error', 'warn', 'log')
          }),
          async (testData) => {
            const originalConsole = console[testData.errorType];
            const consoleSpy = vi.spyOn(console, testData.errorType).mockImplementation(() => {});

            const TestComponent = () => {
              if (testData.shouldError) {
                console[testData.errorType]('Test error message');
              }
              return <div data-testid="test-component">Test</div>;
            };

            render(<TestComponent />);

            // Test our custom console error matcher
            if (testData.shouldError && testData.errorType === 'error') {
              expect(screen.getByTestId('test-component')).not.toHaveNoConsoleErrors();
            } else {
              expect(screen.getByTestId('test-component')).toHaveNoConsoleErrors();
            }

            consoleSpy.mockRestore();
          }
        ),
        { numRuns: 6 }
      );
    });
  });

  describe('Property: API response mocking should be consistent', () => {
    it('should create consistent API responses', () => {
      fc.assert(
        fc.property(
          fc.record({
            success: fc.boolean(),
            dataType: fc.constantFrom('array', 'object', 'string'),
            includeMetadata: fc.boolean()
          }),
          (testData) => {
            const mockResponse = createMockApiResponse({
              success: testData.success,
              dataType: testData.dataType,
              includeMetadata: testData.includeMetadata
            });

            // Basic response structure
            expect(mockResponse).toHaveProperty('success', testData.success);
            
            if (testData.success) {
              expect(mockResponse).toHaveProperty('data');
              expect(mockResponse.error).toBeNull();
              
              // Data type should match request
              if (testData.dataType === 'array') {
                expect(Array.isArray(mockResponse.data)).toBe(true);
              } else if (testData.dataType === 'object') {
                expect(typeof mockResponse.data).toBe('object');
                expect(mockResponse.data).not.toBeNull();
              } else if (testData.dataType === 'string') {
                expect(typeof mockResponse.data).toBe('string');
              }
            } else {
              expect(mockResponse).toHaveProperty('error');
              expect(mockResponse.error).not.toBeNull();
              expect(typeof mockResponse.error).toBe('string');
            }

            // Metadata should be included if requested
            if (testData.includeMetadata) {
              expect(mockResponse).toHaveProperty('metadata');
              expect(typeof mockResponse.metadata).toBe('object');
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Test environment should be stable', () => {
    it('should maintain consistent test environment across runs', () => {
      fc.assert(
        fc.property(
          fc.record({
            testRuns: fc.integer({ min: 1, max: 5 }),
            useTimers: fc.boolean(),
            useMocks: fc.boolean()
          }),
          (testData) => {
            const results = [];

            for (let i = 0; i < testData.testRuns; i++) {
              if (testData.useTimers) {
                vi.useFakeTimers();
              }

              if (testData.useMocks) {
                const mockFn = vi.fn().mockReturnValue('test-result');
                results.push(mockFn());
              } else {
                results.push('test-result');
              }

              if (testData.useTimers) {
                vi.useRealTimers();
              }
            }

            // All results should be consistent
            expect(results.length).toBe(testData.testRuns);
            expect(results.every(result => result === 'test-result')).toBe(true);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should clean up properly between tests', () => {
      fc.assert(
        fc.property(
          fc.record({
            createElements: fc.integer({ min: 1, max: 10 }),
            useEventListeners: fc.boolean()
          }),
          (testData) => {
            const initialBodyChildren = document.body.children.length;
            const elements = [];

            // Create test elements
            for (let i = 0; i < testData.createElements; i++) {
              const element = document.createElement('div');
              element.setAttribute('data-testid', `test-element-${i}`);
              
              if (testData.useEventListeners) {
                element.addEventListener('click', () => {});
              }
              
              document.body.appendChild(element);
              elements.push(element);
            }

            // Verify elements were created
            expect(document.body.children.length).toBe(initialBodyChildren + testData.createElements);

            // Cleanup (simulating afterEach)
            cleanup();
            elements.forEach(el => {
              if (el.parentNode) {
                el.parentNode.removeChild(el);
              }
            });

            // Verify cleanup
            expect(document.body.children.length).toBe(initialBodyChildren);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});

/**
 * Integration tests for testing infrastructure
 */
describe('Testing Infrastructure Integration', () => {
  it('should work together seamlessly', async () => {
    // Generate mock data
    const mockUser = generateMockUserData({ user_type: 'driver' });
    const mockRide = generateMockRideData({ service_type: 'taxi' });
    
    // Create test component
    const TestComponent = ({ user, ride }) => (
      <div data-testid="integration-test">
        <span data-testid="user-name">{user.full_name}</span>
        <span data-testid="ride-service">{ride.service_type}</span>
      </div>
    );

    // Render with providers
    const { getByTestId } = renderWithProviders(
      <TestComponent user={mockUser} ride={mockRide} />,
      { authRequired: true }
    );

    // Verify rendering
    expect(getByTestId('integration-test')).toBeInTheDocument();
    expect(getByTestId('user-name')).toHaveTextContent(mockUser.full_name);
    expect(getByTestId('ride-service')).toHaveTextContent('taxi');

    // Test accessibility
    await expect(getByTestId('integration-test')).toBeAccessible();
    
    // Test no console errors
    expect(getByTestId('integration-test')).toHaveNoConsoleErrors();
  });
});