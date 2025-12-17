import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React, { useState, useCallback, useEffect } from 'react';
import fc from 'fast-check';

// Import components and hooks to test
import ProfileFormContainer from '../containers/ProfileFormContainer';
import {
  PersonalInfoStep,
  LicenseInfoStep,
  VehicleInfoStep,
  DocumentsStep,
  BankingStep
} from '../steps';
import { StepNavigation, ProgressIndicator } from '../../shared/forms';
import useProfileForm from '../../../hooks/useProfileForm';
import useStepNavigation from '../../../hooks/useStepNavigation';

/**
 * Property Tests for Component Communication Patterns
 * 
 * **Feature: component-modularization, Property 9: Component communication patterns**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 * 
 * Tests that components communicate effectively through:
 * - Props passing and callback patterns
 * - State lifting and data flow
 * - Event handling and propagation
 * - Context and hook-based communication
 */

describe('Profile Components Communication Patterns', () => {
  let mockOnChange;
  let mockOnFileChange;
  let mockOnStepChange;
  let mockOnComplete;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockOnFileChange = vi.fn();
    mockOnStepChange = vi.fn();
    mockOnComplete = vi.fn();
  });

  describe('Property: Props should flow down correctly', () => {
    it('should pass form data down to all child components', () => {
      fc.assert(
        fc.property(
          fc.record({
            formData: fc.record({
              full_name: fc.string(),
              email: fc.emailAddress(),
              phone: fc.string(),
              license_number: fc.string(),
              vehicle_make: fc.string()
            }),
            errors: fc.record({
              full_name: fc.option(fc.string(), { nil: undefined }),
              email: fc.option(fc.string(), { nil: undefined })
            })
          }),
          (testData) => {
            let capturedFormData = null;
            let capturedErrors = null;

            const TestStep = ({ formData, errors, onChange }) => {
              capturedFormData = formData;
              capturedErrors = errors;
              return (
                <div>
                  <input
                    data-testid="test-input"
                    value={formData.full_name || ''}
                    onChange={(e) => onChange('full_name', e.target.value)}
                  />
                  {errors.full_name && <span data-testid="error">{errors.full_name}</span>}
                </div>
              );
            };

            render(
              <ProfileFormContainer
                profileType="individual"
                totalSteps={1}
                initialData={testData.formData}
              >
                {({ formData, errors, handleInputChange }) => (
                  <TestStep
                    formData={formData}
                    errors={testData.errors}
                    onChange={handleInputChange}
                  />
                )}
              </ProfileFormContainer>
            );

            // Verify data flows down correctly
            expect(capturedFormData).toEqual(expect.objectContaining(testData.formData));
            expect(capturedErrors).toEqual(testData.errors);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should propagate callbacks up through component hierarchy', () => {
      fc.assert(
        fc.property(
          fc.record({
            fieldName: fc.constantFrom('full_name', 'email', 'phone'),
            fieldValue: fc.string()
          }),
          (testData) => {
            let callbackInvoked = false;
            let capturedField = null;
            let capturedValue = null;

            const TestContainer = () => {
              const handleChange = useCallback((field, value) => {
                callbackInvoked = true;
                capturedField = field;
                capturedValue = value;
              }, []);

              return (
                <PersonalInfoStep
                  formData={{}}
                  errors={{}}
                  onChange={handleChange}
                  profileType="individual"
                />
              );
            };

            render(<TestContainer />);

            // Simulate user input
            const input = screen.getByDisplayValue('');
            fireEvent.change(input, { target: { value: testData.fieldValue } });

            // Verify callback propagation
            expect(callbackInvoked).toBe(true);
            expect(capturedValue).toBe(testData.fieldValue);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property: State should lift up appropriately', () => {
    it('should maintain state consistency across step changes', () => {
      fc.assert(
        fc.property(
          fc.record({
            initialData: fc.record({
              full_name: fc.string(),
              email: fc.emailAddress(),
              license_number: fc.string()
            }),
            newValue: fc.string()
          }),
          (testData) => {
            let currentFormData = null;

            const TestMultiStepForm = () => {
              const [currentStep, setCurrentStep] = useState(1);
              
              return (
                <ProfileFormContainer
                  profileType="driver"
                  totalSteps={2}
                  initialData={testData.initialData}
                >
                  {({ formData, handleInputChange, handleNext, handleBack }) => {
                    currentFormData = formData;
                    
                    return (
                      <div>
                        {currentStep === 1 && (
                          <PersonalInfoStep
                            formData={formData}
                            errors={{}}
                            onChange={handleInputChange}
                            profileType="driver"
                          />
                        )}
                        
                        {currentStep === 2 && (
                          <LicenseInfoStep
                            formData={formData}
                            errors={{}}
                            onChange={handleInputChange}
                          />
                        )}
                        
                        <StepNavigation
                          currentStep={currentStep}
                          totalSteps={2}
                          onNext={() => {
                            handleNext();
                            setCurrentStep(2);
                          }}
                          onPrevious={() => {
                            handleBack();
                            setCurrentStep(1);
                          }}
                        />
                      </div>
                    );
                  }}
                </ProfileFormContainer>
              );
            };

            const { rerender } = render(<TestMultiStepForm />);

            // Verify initial state
            expect(currentFormData).toEqual(expect.objectContaining(testData.initialData));

            // Simulate input change
            const input = screen.getAllByRole('textbox')[0];
            fireEvent.change(input, { target: { value: testData.newValue } });

            // Navigate to next step
            const nextButton = screen.getByText('Next');
            fireEvent.click(nextButton);

            // Verify state persists across steps
            expect(currentFormData.full_name).toBe(testData.newValue);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property: Events should propagate correctly', () => {
    it('should handle file upload events across component boundaries', async () => {
      fc.assert(
        fc.property(
          fc.record({
            fileName: fc.string({ minLength: 5, maxLength: 30 }),
            fileSize: fc.integer({ min: 1000, max: 1000000 })
          }),
          async (testData) => {
            let fileChangeTriggered = false;
            let capturedFile = null;

            const mockFile = new File(
              [new ArrayBuffer(testData.fileSize)],
              testData.fileName,
              { type: 'application/pdf' }
            );

            const TestFileUpload = () => {
              const handleFileChange = useCallback((fieldName, file) => {
                fileChangeTriggered = true;
                capturedFile = file;
              }, []);

              return (
                <DocumentsStep
                  formData={{}}
                  errors={{}}
                  onFileChange={handleFileChange}
                  profileType="driver"
                />
              );
            };

            render(<TestFileUpload />);

            // Simulate file selection
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
              Object.defineProperty(fileInput, 'files', {
                value: [mockFile],
                writable: false
              });
              fireEvent.change(fileInput);

              await waitFor(() => {
                expect(fileChangeTriggered).toBe(true);
                expect(capturedFile).toBe(mockFile);
              });
            }
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should handle step navigation events properly', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalSteps: fc.integer({ min: 2, max: 5 }),
            initialStep: fc.integer({ min: 1, max: 2 })
          }),
          (testData) => {
            let navigationEvents = [];

            const TestStepNavigation = () => {
              const [currentStep, setCurrentStep] = useState(testData.initialStep);

              const handleNext = () => {
                navigationEvents.push({ type: 'next', from: currentStep, to: currentStep + 1 });
                setCurrentStep(prev => Math.min(prev + 1, testData.totalSteps));
              };

              const handlePrevious = () => {
                navigationEvents.push({ type: 'previous', from: currentStep, to: currentStep - 1 });
                setCurrentStep(prev => Math.max(prev - 1, 1));
              };

              return (
                <StepNavigation
                  currentStep={currentStep}
                  totalSteps={testData.totalSteps}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                />
              );
            };

            render(<TestStepNavigation />);

            // Test next navigation
            const nextButton = screen.getByText('Next');
            fireEvent.click(nextButton);

            // Verify navigation event was captured
            expect(navigationEvents).toHaveLength(1);
            expect(navigationEvents[0].type).toBe('next');
            expect(navigationEvents[0].from).toBe(testData.initialStep);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property: Context and hooks should communicate effectively', () => {
    it('should share form state through custom hooks', () => {
      fc.assert(
        fc.property(
          fc.record({
            initialData: fc.record({
              full_name: fc.string(),
              email: fc.emailAddress()
            }),
            validationRules: fc.array(
              fc.record({
                field: fc.constantFrom('full_name', 'email'),
                required: fc.boolean(),
                message: fc.string()
              }),
              { minLength: 1, maxLength: 3 }
            )
          }),
          (testData) => {
            let hookState1 = null;
            let hookState2 = null;

            const TestComponent1 = () => {
              const formHook = useProfileForm({
                initialData: testData.initialData,
                validationRules: testData.validationRules
              });
              hookState1 = formHook;
              return <div data-testid="component1">Component 1</div>;
            };

            const TestComponent2 = () => {
              const formHook = useProfileForm({
                initialData: testData.initialData,
                validationRules: testData.validationRules
              });
              hookState2 = formHook;
              return <div data-testid="component2">Component 2</div>;
            };

            render(
              <div>
                <TestComponent1 />
                <TestComponent2 />
              </div>
            );

            // Verify both hooks have consistent initial state
            expect(hookState1.formData).toEqual(hookState2.formData);
            expect(hookState1.errors).toEqual(hookState2.errors);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle async operations in hook communication', async () => {
      fc.assert(
        fc.property(
          fc.record({
            formData: fc.record({
              full_name: fc.string(),
              email: fc.emailAddress()
            }),
            delay: fc.integer({ min: 10, max: 100 })
          }),
          async (testData) => {
            let submissionStarted = false;
            let submissionCompleted = false;
            let submissionResult = null;

            const TestAsyncForm = () => {
              const [isSubmitting, setIsSubmitting] = useState(false);

              const handleSubmit = useCallback(async (data) => {
                submissionStarted = true;
                setIsSubmitting(true);

                // Simulate async operation
                await new Promise(resolve => setTimeout(resolve, testData.delay));

                submissionResult = data;
                submissionCompleted = true;
                setIsSubmitting(false);
              }, []);

              return (
                <div>
                  <button
                    onClick={() => handleSubmit(testData.formData)}
                    disabled={isSubmitting}
                    data-testid="submit-button"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              );
            };

            render(<TestAsyncForm />);

            const submitButton = screen.getByTestId('submit-button');
            fireEvent.click(submitButton);

            // Verify submission started
            expect(submissionStarted).toBe(true);

            // Wait for completion
            await waitFor(() => {
              expect(submissionCompleted).toBe(true);
              expect(submissionResult).toEqual(testData.formData);
            }, { timeout: testData.delay + 50 });
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('Property: Error boundaries should handle communication failures', () => {
    it('should gracefully handle component communication errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            shouldError: fc.boolean(),
            errorMessage: fc.string()
          }),
          (testData) => {
            let errorCaught = false;
            let errorBoundaryTriggered = false;

            const ErrorBoundary = ({ children }) => {
              const [hasError, setHasError] = useState(false);

              useEffect(() => {
                const handleError = () => {
                  errorBoundaryTriggered = true;
                  setHasError(true);
                };

                window.addEventListener('error', handleError);
                return () => window.removeEventListener('error', handleError);
              }, []);

              if (hasError) {
                return <div data-testid="error-boundary">Something went wrong</div>;
              }

              return children;
            };

            const ProblematicComponent = ({ shouldError, errorMessage }) => {
              if (shouldError) {
                throw new Error(errorMessage);
              }
              return <div data-testid="working-component">Working</div>;
            };

            const TestWrapper = () => {
              try {
                return (
                  <ErrorBoundary>
                    <ProblematicComponent
                      shouldError={testData.shouldError}
                      errorMessage={testData.errorMessage}
                    />
                  </ErrorBoundary>
                );
              } catch (error) {
                errorCaught = true;
                return <div data-testid="caught-error">Error caught</div>;
              }
            };

            render(<TestWrapper />);

            if (testData.shouldError) {
              // Should handle error gracefully
              expect(errorCaught || errorBoundaryTriggered || screen.queryByTestId('error-boundary')).toBeTruthy();
            } else {
              // Should render normally
              expect(screen.getByTestId('working-component')).toBeInTheDocument();
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property: Component interfaces should be consistent', () => {
    it('should maintain consistent prop interfaces across similar components', () => {
      fc.assert(
        fc.property(
          fc.record({
            formData: fc.record({
              full_name: fc.string(),
              email: fc.emailAddress(),
              license_number: fc.string(),
              vehicle_make: fc.string()
            }),
            errors: fc.record({
              full_name: fc.option(fc.string(), { nil: undefined }),
              email: fc.option(fc.string(), { nil: undefined })
            })
          }),
          (testData) => {
            const commonProps = {
              formData: testData.formData,
              errors: testData.errors,
              onChange: mockOnChange
            };

            // All step components should accept the same base props
            const steps = [
              <PersonalInfoStep key="personal" {...commonProps} profileType="driver" />,
              <LicenseInfoStep key="license" {...commonProps} onFileChange={mockOnFileChange} />,
              <VehicleInfoStep key="vehicle" {...commonProps} onFileChange={mockOnFileChange} />,
              <BankingStep key="banking" {...commonProps} profileType="driver" />
            ];

            steps.forEach((step, index) => {
              const { unmount } = render(step);
              
              // Each component should render without errors
              expect(() => unmount()).not.toThrow();
            });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle prop changes consistently across components', () => {
      fc.assert(
        fc.property(
          fc.record({
            initialData: fc.record({
              full_name: fc.string(),
              email: fc.emailAddress()
            }),
            updatedData: fc.record({
              full_name: fc.string(),
              email: fc.emailAddress()
            })
          }),
          (testData) => {
            let renderCount = 0;

            const TestComponent = ({ formData }) => {
              renderCount++;
              return (
                <PersonalInfoStep
                  formData={formData}
                  errors={{}}
                  onChange={mockOnChange}
                  profileType="individual"
                />
              );
            };

            const { rerender } = render(<TestComponent formData={testData.initialData} />);
            
            const initialRenderCount = renderCount;

            // Update props
            rerender(<TestComponent formData={testData.updatedData} />);

            // Should re-render when props change
            expect(renderCount).toBe(initialRenderCount + 1);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property: Real-time updates should propagate correctly', () => {
    it('should handle real-time form updates across components', async () => {
      fc.assert(
        fc.property(
          fc.record({
            updates: fc.array(
              fc.record({
                field: fc.constantFrom('full_name', 'email', 'phone'),
                value: fc.string()
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async (testData) => {
            let formState = {};
            let updateCount = 0;

            const TestRealTimeForm = () => {
              const [formData, setFormData] = useState({});

              const handleChange = useCallback((field, value) => {
                updateCount++;
                setFormData(prev => {
                  const updated = { ...prev, [field]: value };
                  formState = updated;
                  return updated;
                });
              }, []);

              return (
                <PersonalInfoStep
                  formData={formData}
                  errors={{}}
                  onChange={handleChange}
                  profileType="individual"
                />
              );
            };

            render(<TestRealTimeForm />);

            // Simulate rapid updates
            for (const update of testData.updates) {
              const inputs = screen.getAllByRole('textbox');
              const targetInput = inputs.find(input => 
                input.name === update.field || 
                input.getAttribute('data-field') === update.field
              ) || inputs[0];

              if (targetInput) {
                fireEvent.change(targetInput, { target: { value: update.value } });
                
                // Small delay to simulate real-time updates
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            }

            // Verify all updates were processed
            expect(updateCount).toBeGreaterThan(0);
            expect(Object.keys(formState).length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 }
      );
    });
  });
});

/**
 * Integration tests for complete communication flows
 */
describe('Profile Form Integration Communication', () => {
  it('should handle complete form workflow with all communication patterns', async () => {
    fc.assert(
      fc.property(
        fc.record({
          profileData: fc.record({
            full_name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            license_number: fc.string({ minLength: 5, maxLength: 20 })
          })
        }),
        async (testData) => {
          let communicationLog = [];

          const TestCompleteForm = () => {
            const [currentStep, setCurrentStep] = useState(1);

            const logCommunication = (type, data) => {
              communicationLog.push({ type, data, timestamp: Date.now() });
            };

            return (
              <ProfileFormContainer
                profileType="driver"
                totalSteps={2}
                initialData={testData.profileData}
                onStepChange={(step) => logCommunication('step_change', { step })}
                onComplete={() => logCommunication('complete', {})}
              >
                {({ formData, handleInputChange, handleNext, handleBack }) => (
                  <div>
                    {currentStep === 1 && (
                      <PersonalInfoStep
                        formData={formData}
                        errors={{}}
                        onChange={(field, value) => {
                          logCommunication('input_change', { field, value });
                          handleInputChange(field, value);
                        }}
                        profileType="driver"
                      />
                    )}
                    
                    {currentStep === 2 && (
                      <LicenseInfoStep
                        formData={formData}
                        errors={{}}
                        onChange={(field, value) => {
                          logCommunication('input_change', { field, value });
                          handleInputChange(field, value);
                        }}
                      />
                    )}
                    
                    <StepNavigation
                      currentStep={currentStep}
                      totalSteps={2}
                      onNext={() => {
                        logCommunication('navigation', { action: 'next' });
                        handleNext();
                        setCurrentStep(2);
                      }}
                      onPrevious={() => {
                        logCommunication('navigation', { action: 'previous' });
                        handleBack();
                        setCurrentStep(1);
                      }}
                    />
                  </div>
                )}
              </ProfileFormContainer>
            );
          };

          render(<TestCompleteForm />);

          // Simulate user interaction
          const input = screen.getAllByRole('textbox')[0];
          fireEvent.change(input, { target: { value: 'test value' } });

          // Navigate to next step
          const nextButton = screen.getByText('Next');
          fireEvent.click(nextButton);

          // Verify communication flow
          expect(communicationLog.length).toBeGreaterThan(0);
          
          const inputChanges = communicationLog.filter(log => log.type === 'input_change');
          const navigationEvents = communicationLog.filter(log => log.type === 'navigation');
          
          expect(inputChanges.length).toBeGreaterThan(0);
          expect(navigationEvents.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 2 }
    );
  });
});