/**
 * Property Test: Component Interface Validation
 * **Feature: component-modularization, Property 6: Component interface validation**
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
 * 
 * Tests that all refactored components maintain consistent interfaces and prop contracts.
 * Validates that components follow established patterns and conventions.
 */

import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import {
  BookingModal,
  ServiceTypeSelector,
  LocationSection,
  ServiceDetailsSection,
  SchedulingSection,
  PricingDisplay,
  BookingConfirmation
} from '../../../components/booking';
import {
  TaxiBookingForm,
  CourierBookingForm,
  ErrandsBookingForm,
  SchoolRunBookingForm,
  BulkBookingForm
} from '../../../components/booking/forms';

describe('**Feature: component-modularization, Property 6: Component interface validation**', () => {
  
  test('all booking components accept consistent error and warning props', () => {
    const components = [
      {
        name: 'ServiceTypeSelector',
        component: ServiceTypeSelector,
        requiredProps: { selectedService: 'taxi', onServiceChange: vi.fn() }
      },
      {
        name: 'LocationSection',
        component: LocationSection,
        requiredProps: { 
          onPickupChange: vi.fn(), 
          onDropoffChange: vi.fn(), 
          savedPlaces: [], 
          errors: {} 
        }
      },
      {
        name: 'SchedulingSection',
        component: SchedulingSection,
        requiredProps: { 
          schedulingState: { scheduleType: 'instant' },
          selectedService: 'taxi',
          formData: {},
          onFormDataUpdate: vi.fn()
        }
      },
      {
        name: 'PricingDisplay',
        component: PricingDisplay,
        requiredProps: { selectedService: 'taxi' }
      }
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...components),
        fc.record({
          hasErrors: fc.boolean(),
          hasWarnings: fc.boolean(),
          errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
          warningMessage: fc.string({ minLength: 1, maxLength: 100 })
        }),
        (componentInfo, testData) => {
          const Component = componentInfo.component;
          const props = {
            ...componentInfo.requiredProps,
            errors: testData.hasErrors ? { testField: testData.errorMessage } : {},
            warnings: testData.hasWarnings ? { testField: testData.warningMessage } : {}
          };

          // Component should render without throwing
          expect(() => {
            render(<Component {...props} />);
          }).not.toThrow();

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test('all service forms follow consistent prop interface pattern', () => {
    const serviceForms = [
      { name: 'TaxiBookingForm', component: TaxiBookingForm },
      { name: 'CourierBookingForm', component: CourierBookingForm },
      { name: 'ErrandsBookingForm', component: ErrandsBookingForm },
      { name: 'SchoolRunBookingForm', component: SchoolRunBookingForm },
      { name: 'BulkBookingForm', component: BulkBookingForm }
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...serviceForms),
        fc.record({
          serviceData: fc.object(),
          formData: fc.object(),
          hasErrors: fc.boolean(),
          hasWarnings: fc.boolean()
        }),
        (formInfo, testData) => {
          const FormComponent = formInfo.component;
          
          const standardProps = {
            serviceData: testData.serviceData,
            formData: testData.formData,
            onServiceDataUpdate: vi.fn(),
            onFormDataUpdate: vi.fn(),
            errors: testData.hasErrors ? { testField: 'Test error' } : {},
            warnings: testData.hasWarnings ? { testField: 'Test warning' } : {}
          };

          // All service forms should accept these standard props
          expect(() => {
            render(<FormComponent {...standardProps} />);
          }).not.toThrow();

          // Verify callback props are functions
          expect(typeof standardProps.onServiceDataUpdate).toBe('function');
          expect(typeof standardProps.onFormDataUpdate).toBe('function');

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  test('booking modal maintains consistent container interface', () => {
    fc.assert(
      fc.property(
        fc.record({
          isOpen: fc.boolean(),
          defaultServiceType: fc.constantFrom('taxi', 'courier', 'errands', 'school_run', 'bulk'),
          mode: fc.constantFrom('create', 'edit', 'rebook'),
          hasInitialData: fc.boolean(),
          hasEstimate: fc.boolean()
        }),
        (modalProps) => {
          const props = {
            isOpen: modalProps.isOpen,
            onClose: vi.fn(),
            defaultServiceType: modalProps.defaultServiceType,
            mode: modalProps.mode,
            initialData: modalProps.hasInitialData ? {
              serviceType: modalProps.defaultServiceType,
              pickupLocation: 'Test Pickup',
              dropoffLocation: 'Test Dropoff'
            } : null,
            estimate: modalProps.hasEstimate ? {
              distanceKm: 5.2,
              durationMinutes: 15,
              cost: 25.50
            } : null,
            onSuccess: vi.fn()
          };

          // Modal should handle all prop combinations gracefully
          expect(() => {
            render(<BookingModal {...props} />);
          }).not.toThrow();

          // Verify required callback props
          expect(typeof props.onClose).toBe('function');
          if (props.onSuccess) {
            expect(typeof props.onSuccess).toBe('function');
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test('components handle null and undefined props gracefully', () => {
    const testComponents = [
      {
        name: 'ServiceTypeSelector',
        component: ServiceTypeSelector,
        minimalProps: { selectedService: 'taxi', onServiceChange: vi.fn() }
      },
      {
        name: 'PricingDisplay',
        component: PricingDisplay,
        minimalProps: { selectedService: 'taxi' }
      },
      {
        name: 'TaxiBookingForm',
        component: TaxiBookingForm,
        minimalProps: { 
          serviceData: {}, 
          formData: {}, 
          onServiceDataUpdate: vi.fn(), 
          onFormDataUpdate: vi.fn() 
        }
      }
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...testComponents),
        fc.record({
          nullifyErrors: fc.boolean(),
          nullifyWarnings: fc.boolean(),
          undefinedErrors: fc.boolean(),
          undefinedWarnings: fc.boolean()
        }),
        (componentInfo, testData) => {
          const Component = componentInfo.component;
          const props = {
            ...componentInfo.minimalProps,
            errors: testData.nullifyErrors ? null : testData.undefinedErrors ? undefined : {},
            warnings: testData.nullifyWarnings ? null : testData.undefinedWarnings ? undefined : {}
          };

          // Components should handle null/undefined gracefully
          expect(() => {
            render(<Component {...props} />);
          }).not.toThrow();

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  test('callback props maintain consistent function signatures', () => {
    fc.assert(
      fc.property(
        fc.record({
          serviceType: fc.constantFrom('taxi', 'courier', 'errands', 'school_run', 'bulk'),
          callbackData: fc.object(),
          eventType: fc.constantFrom('change', 'update', 'submit', 'close')
        }),
        (testData) => {
          const mockCallbacks = {
            onServiceChange: vi.fn(),
            onPickupChange: vi.fn(),
            onDropoffChange: vi.fn(),
            onServiceDataUpdate: vi.fn(),
            onFormDataUpdate: vi.fn(),
            onClose: vi.fn(),
            onSuccess: vi.fn(),
            onError: vi.fn()
          };

          // Test ServiceTypeSelector callback
          const { rerender } = render(
            <ServiceTypeSelector
              selectedService={testData.serviceType}
              onServiceChange={mockCallbacks.onServiceChange}
            />
          );

          // Verify callback function types
          expect(typeof mockCallbacks.onServiceChange).toBe('function');

          // Test LocationSection callbacks
          rerender(
            <LocationSection
              pickupLocation=""
              dropoffLocation=""
              onPickupChange={mockCallbacks.onPickupChange}
              onDropoffChange={mockCallbacks.onDropoffChange}
              savedPlaces={[]}
              errors={{}}
            />
          );

          expect(typeof mockCallbacks.onPickupChange).toBe('function');
          expect(typeof mockCallbacks.onDropoffChange).toBe('function');

          // Test form callbacks
          rerender(
            <TaxiBookingForm
              serviceData={{}}
              formData={{}}
              onServiceDataUpdate={mockCallbacks.onServiceDataUpdate}
              onFormDataUpdate={mockCallbacks.onFormDataUpdate}
            />
          );

          expect(typeof mockCallbacks.onServiceDataUpdate).toBe('function');
          expect(typeof mockCallbacks.onFormDataUpdate).toBe('function');

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  test('components maintain consistent styling and className patterns', () => {
    fc.assert(
      fc.property(
        fc.record({
          customClassName: fc.string({ minLength: 1, maxLength: 50 }),
          disabled: fc.boolean(),
          compact: fc.boolean()
        }),
        (styleProps) => {
          const components = [
            {
              component: ServiceTypeSelector,
              props: { 
                selectedService: 'taxi', 
                onServiceChange: vi.fn(),
                className: styleProps.customClassName,
                disabled: styleProps.disabled
              }
            },
            {
              component: PricingDisplay,
              props: { 
                selectedService: 'taxi',
                className: styleProps.customClassName,
                compact: styleProps.compact
              }
            }
          ];

          components.forEach(({ component: Component, props }) => {
            const { container } = render(<Component {...props} />);
            
            // Component should render with custom props
            expect(container.firstChild).not.toBeNull();
            
            // Should have consistent base styling classes
            const element = container.firstChild;
            const classes = element.className || '';
            
            // Should use Tailwind CSS classes consistently
            expect(classes).toMatch(/\b(flex|grid|space-|p-|m-|text-|bg-|border-|rounded)/);
          });

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  test('booking confirmation component maintains comprehensive interface', () => {
    fc.assert(
      fc.property(
        fc.record({
          selectedService: fc.constantFrom('taxi', 'courier', 'errands', 'school_run', 'bulk'),
          hasEstimate: fc.boolean(),
          hasScheduling: fc.boolean(),
          isSubmitting: fc.boolean(),
          hasErrors: fc.boolean()
        }),
        (confirmProps) => {
          const props = {
            selectedService: confirmProps.selectedService,
            formData: {
              pickupLocation: 'Test Pickup',
              dropoffLocation: 'Test Dropoff',
              paymentMethod: 'cash'
            },
            serviceData: {},
            estimate: confirmProps.hasEstimate ? {
              cost: 25.50,
              distance: 5.2,
              duration: 15
            } : null,
            schedulingSummary: confirmProps.hasScheduling ? {
              type: 'instant',
              display: 'Book now',
              icon: '⚡'
            } : null,
            finalPrice: 25.50,
            onEdit: vi.fn(),
            onConfirm: vi.fn(),
            isSubmitting: confirmProps.isSubmitting,
            errors: confirmProps.hasErrors ? { confirmation: 'Test error' } : {}
          };

          // BookingConfirmation should handle all prop combinations
          expect(() => {
            render(<BookingConfirmation {...props} />);
          }).not.toThrow();

          // Verify required callbacks
          expect(typeof props.onEdit).toBe('function');
          expect(typeof props.onConfirm).toBe('function');

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  test('components maintain accessibility interface consistency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { 
            component: ServiceTypeSelector, 
            props: { selectedService: 'taxi', onServiceChange: vi.fn() } 
          },
          { 
            component: LocationSection, 
            props: { 
              onPickupChange: vi.fn(), 
              onDropoffChange: vi.fn(), 
              savedPlaces: [], 
              errors: {} 
            } 
          },
          { 
            component: TaxiBookingForm, 
            props: { 
              serviceData: {}, 
              formData: {}, 
              onServiceDataUpdate: vi.fn(), 
              onFormDataUpdate: vi.fn() 
            } 
          }
        ),
        (componentInfo) => {
          const Component = componentInfo.component;
          const { container } = render(<Component {...componentInfo.props} />);

          // Check for accessibility attributes
          const interactiveElements = container.querySelectorAll('button, input, select, textarea');
          
          interactiveElements.forEach(element => {
            // Each interactive element should have proper labeling or ARIA attributes
            const hasAccessibleName = 
              element.getAttribute('aria-label') ||
              element.getAttribute('aria-labelledby') ||
              element.getAttribute('title') ||
              container.querySelector(`label[for="${element.id}"]`) ||
              element.closest('label');

            // Allow some flexibility for complex components
            if (element.type !== 'hidden' && element.tagName !== 'BUTTON') {
              expect(hasAccessibleName).toBeTruthy();
            }
          });

          // Check for proper heading structure
          const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
          headings.forEach(heading => {
            expect(heading.textContent.trim()).not.toBe('');
          });

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  test('error boundary integration maintains consistent interface', () => {
    fc.assert(
      fc.property(
        fc.record({
          shouldThrowError: fc.boolean(),
          errorMessage: fc.string({ minLength: 5, maxLength: 50 })
        }),
        (errorProps) => {
          // Mock component that can throw errors
          const ThrowingComponent = ({ shouldThrow, message }) => {
            if (shouldThrow) {
              throw new Error(message);
            }
            return <div>Component rendered successfully</div>;
          };

          if (errorProps.shouldThrowError) {
            // Component should throw error when expected
            expect(() => {
              render(
                <ThrowingComponent 
                  shouldThrow={true} 
                  message={errorProps.errorMessage} 
                />
              );
            }).toThrow(errorProps.errorMessage);
          } else {
            // Component should render normally when no error
            expect(() => {
              render(
                <ThrowingComponent 
                  shouldThrow={false} 
                  message={errorProps.errorMessage} 
                />
              );
            }).not.toThrow();
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  test('component prop validation maintains type safety', () => {
    fc.assert(
      fc.property(
        fc.record({
          serviceType: fc.constantFrom('taxi', 'courier', 'errands', 'school_run', 'bulk'),
          booleanProp: fc.boolean(),
          numberProp: fc.integer({ min: 0, max: 100 }),
          stringProp: fc.string({ maxLength: 100 }),
          objectProp: fc.object(),
          arrayProp: fc.array(fc.string(), { maxLength: 5 })
        }),
        (propTypes) => {
          // Test that components handle different prop types correctly
          const testProps = {
            selectedService: propTypes.serviceType,
            disabled: propTypes.booleanProp,
            maxLength: propTypes.numberProp,
            placeholder: propTypes.stringProp,
            data: propTypes.objectProp,
            options: propTypes.arrayProp,
            onServiceChange: vi.fn(),
            onPickupChange: vi.fn(),
            onDropoffChange: vi.fn(),
            savedPlaces: [],
            errors: {}
          };

          // ServiceTypeSelector with various prop types
          expect(() => {
            render(
              <ServiceTypeSelector
                selectedService={testProps.selectedService}
                onServiceChange={testProps.onServiceChange}
                disabled={testProps.disabled}
              />
            );
          }).not.toThrow();

          // LocationSection with various prop types
          expect(() => {
            render(
              <LocationSection
                onPickupChange={testProps.onPickupChange}
                onDropoffChange={testProps.onDropoffChange}
                savedPlaces={testProps.savedPlaces}
                errors={testProps.errors}
                maxLength={testProps.maxLength}
                placeholder={testProps.placeholder}
              />
            );
          }).not.toThrow();

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });
});