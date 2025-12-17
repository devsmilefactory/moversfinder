import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import fc from 'fast-check';

// Import error handling components and utilities
import { ErrorBoundary } from '../../../components/shared/ErrorBoundary';
import { BookingErrorBoundary } from '../../../components/shared/BookingErrorBoundary';
import { ProfileErrorBoundary } from '../../../components/shared/ProfileErrorBoundary';
import { RideRequestErrorBoundary } from '../../../components/shared/RideRequestErrorBoundary';
import { ErrorState } from '../../../components/shared/loading/ErrorState';
import { handleError, createErrorHandler, ErrorTypes } from '../../../utils/errorHandling';

// Import test utilities
import { renderWithProviders, createTestWrapper } from '../componentTestUtils';
import { generateMockError, createMockApiResponse } from '../mockData';

/**
 * Property Tests for Error Handling Consistency
 * 
 * **Feature: component-modularization, Property 12: Error handling consistency**
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 * 
 * Tests that error handling is consistent across all components:
 * - All error boundaries catch and display errors consistently
 * - Error states are handled uniformly
 * - Error recovery mechanisms work properly
 * - Error logging and reporting is consistent
 */

describe('Error Handling Consistency Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks and clear console
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Property: Error boundaries should handle all error types consistently', () => {
    it('should catch and display all types of errors uniformly', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorType: fc.constantFrom('TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'Error'),
            errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
            boundaryType: fc.constantFrom('booking', 'profile', 'rideRequest', 'generic'),
            hasRecovery: fc.boolean(),
            shouldLog: fc.boolean()
          }),
          (testData) => {
            const ThrowingComponent = () => {
              const error = new window[testData.errorType](testData.errorMessage);
              throw error;
            };

            const getBoundaryComponent = (type) => {
              switch (type) {
                case 'booking': return BookingErrorBoundary;
                case 'profile': return ProfileErrorBoundary;
                case 'rideRequest': return RideRequestErrorBoundary;
                default: return ErrorBoundary;
              }
            };

            const BoundaryComponent = getBoundaryComponent(testData.boundaryType);
            const mockOnError = vi.fn();
            const mockOnRecover = vi.fn();

            const { container, queryByTestId, queryByText } = render(
              <BoundaryComponent 
                onError={testData.shouldLog ? mockOnError : undefined}
                onRecover={testData.hasRecovery ? mockOnRecover : undefined}
              >
                <ThrowingComponent />
              </BoundaryComponent>
            );

            // Error boundary should catch the error
            expect(queryByTestId('error-boundary')).toBeInTheDocument();
            
            // Error message should be displayed (may be generic for security)
            const errorDisplay = container.querySelector('[data-testid="error-message"], .error-message');
            expect(errorDisplay).toBeInTheDocument();
            
            // Error should be logged if logging is enabled
            if (testData.shouldLog) {
              expect(mockOnError).toHaveBeenCalled();
            }

            // Recovery button should be present if recovery is enabled
            if (testData.hasRecovery) {
              const recoveryButton = queryByTestId('error-recovery-button') || 
                                   queryByText(/try again|retry|reload/i);
              expect(recoveryButton).toBeInTheDocument();
            }

            // Error boundary should prevent app crash
            expect(container).toBeInTheDocument();
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should provide consistent error recovery mechanisms', () => {
      fc.assert(
        fc.property(
          fc.record({
            recoveryType: fc.constantFrom('retry', 'reload', 'reset', 'navigate'),
            errorCount: fc.integer({ min: 1, max: 5 }),
            shouldSucceedAfterRetry: fc.boolean()
          }),
          async (testData) => {
            let attemptCount = 0;
            const ThrowingComponent = () => {
              attemptCount++;
              if (attemptCount <= testData.errorCount && !testData.shouldSucceedAfterRetry) {
                throw new Error(`Attempt ${attemptCount} failed`);
              }
              if (attemptCount <= testData.errorCount && testData.shouldSucceedAfterRetry && attemptCount < testData.errorCount) {
                throw new Error(`Attempt ${attemptCount} failed`);
              }
              return <div data-testid="success-component">Success!</div>;
            };

            const { queryByTestId, rerender } = render(
              <ErrorBoundary enableRecovery={true}>
                <ThrowingComponent />
              </ErrorBoundary>
            );

            // Should show error initially
            expect(queryByTestId('error-boundary')).toBeInTheDocument();

            // Try recovery
            const retryButton = queryByTestId('error-retry-button');
            if (retryButton) {
              await act(async () => {
                fireEvent.click(retryButton);
              });

              if (testData.shouldSucceedAfterRetry) {
                // Should eventually succeed
                await waitFor(() => {
                  expect(queryByTestId('success-component')).toBeInTheDocument();
                });
              } else {
                // Should still show error
                expect(queryByTestId('error-boundary')).toBeInTheDocument();
              }
            }
          }
        ),
        { numRuns: 8 }
      );
    });
  });

  describe('Property: Error states should be handled uniformly across components', () => {
    it('should display error states consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorCode: fc.integer({ min: 400, max: 599 }),
            errorMessage: fc.string({ minLength: 5, maxLength: 50 }),
            hasRetry: fc.boolean(),
            hasDetails: fc.boolean(),
            componentType: fc.constantFrom('form', 'list', 'card', 'modal')
          }),
          (testData) => {
            const mockError = {
              code: testData.errorCode,
              message: testData.errorMessage,
              details: testData.hasDetails ? 'Additional error details' : null
            };

            const { container, queryByTestId, queryByText } = render(
              <ErrorState 
                error={mockError}
                onRetry={testData.hasRetry ? vi.fn() : undefined}
                componentType={testData.componentType}
              />
            );

            // Error state should be displayed
            expect(queryByTestId('error-state')).toBeInTheDocument();

            // Error message should be shown
            expect(queryByText(testData.errorMessage)).toBeInTheDocument();

            // Retry button should be present if retry is enabled
            if (testData.hasRetry) {
              const retryButton = queryByTestId('retry-button') || queryByText(/retry|try again/i);
              expect(retryButton).toBeInTheDocument();
            }

            // Error details should be shown if available
            if (testData.hasDetails) {
              const detailsElement = container.querySelector('[data-testid="error-details"]');
              expect(detailsElement).toBeInTheDocument();
            }

            // Should have appropriate styling for component type
            const errorContainer = queryByTestId('error-state');
            expect(errorContainer).toHaveClass(expect.stringMatching(/error/i));
          }
        ),
        { numRuns: 12 }
      );
    });

    it('should handle async errors consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            delay: fc.integer({ min: 10, max: 500 }),
            shouldReject: fc.boolean(),
            errorType: fc.constantFrom('network', 'validation', 'server', 'timeout'),
            retryCount: fc.integer({ min: 0, max: 3 })
          }),
          async (testData) => {
            const mockAsyncOperation = vi.fn().mockImplementation(() => {
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  if (testData.shouldReject) {
                    reject(new Error(`${testData.errorType} error occurred`));
                  } else {
                    resolve({ success: true, data: 'test data' });
                  }
                }, testData.delay);
              });
            });

            const TestComponent = () => {
              const [error, setError] = React.useState(null);
              const [loading, setLoading] = React.useState(false);
              const [data, setData] = React.useState(null);

              const handleOperation = async () => {
                setLoading(true);
                setError(null);
                try {
                  const result = await mockAsyncOperation();
                  setData(result);
                } catch (err) {
                  setError(err);
                } finally {
                  setLoading(false);
                }
              };

              React.useEffect(() => {
                handleOperation();
              }, []);

              if (loading) return <div data-testid="loading">Loading...</div>;
              if (error) return <ErrorState error={error} onRetry={handleOperation} />;
              if (data) return <div data-testid="success">Success</div>;
              return null;
            };

            const { queryByTestId } = render(<TestComponent />);

            // Should show loading initially
            expect(queryByTestId('loading')).toBeInTheDocument();

            // Wait for async operation to complete
            await waitFor(() => {
              if (testData.shouldReject) {
                expect(queryByTestId('error-state')).toBeInTheDocument();
              } else {
                expect(queryByTestId('success')).toBeInTheDocument();
              }
            }, { timeout: testData.delay + 1000 });

            // Verify error handling
            if (testData.shouldReject) {
              const errorState = queryByTestId('error-state');
              expect(errorState).toBeInTheDocument();
              
              // Should contain error type in message
              expect(errorState.textContent).toContain(testData.errorType);
            }
          }
        ),
        { numRuns: 8 }
      );
    });
  });

  describe('Property: Error logging and reporting should be consistent', () => {
    it('should log errors with consistent format and metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorLevel: fc.constantFrom('error', 'warn', 'info'),
            includeStack: fc.boolean(),
            includeContext: fc.boolean(),
            includeUser: fc.boolean(),
            errorSource: fc.constantFrom('component', 'api', 'validation', 'network')
          }),
          (testData) => {
            const mockLogger = vi.fn();
            const originalConsole = console[testData.errorLevel];
            console[testData.errorLevel] = mockLogger;

            const testError = new Error('Test error message');
            const context = testData.includeContext ? { component: 'TestComponent', action: 'submit' } : null;
            const user = testData.includeUser ? { id: 'user123', email: 'test@example.com' } : null;

            const errorHandler = createErrorHandler({
              level: testData.errorLevel,
              includeStack: testData.includeStack,
              includeContext: testData.includeContext,
              includeUser: testData.includeUser,
              source: testData.errorSource
            });

            errorHandler(testError, context, user);

            // Should have called the logger
            expect(mockLogger).toHaveBeenCalled();

            const logCall = mockLogger.mock.calls[0];
            const loggedData = logCall[0];

            // Should include error message
            expect(loggedData).toContain('Test error message');

            // Should include source
            expect(loggedData).toContain(testData.errorSource);

            // Should include stack trace if requested
            if (testData.includeStack) {
              expect(logCall.some(arg => 
                typeof arg === 'string' && arg.includes('Error:')
              )).toBe(true);
            }

            // Should include context if provided
            if (testData.includeContext && context) {
              expect(logCall.some(arg => 
                typeof arg === 'object' && arg.component === 'TestComponent'
              )).toBe(true);
            }

            // Should include user info if provided
            if (testData.includeUser && user) {
              expect(logCall.some(arg => 
                typeof arg === 'object' && arg.id === 'user123'
              )).toBe(true);
            }

            // Restore console
            console[testData.errorLevel] = originalConsole;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle error reporting with proper sanitization', () => {
      fc.assert(
        fc.property(
          fc.record({
            includeSensitiveData: fc.boolean(),
            errorType: fc.constantFrom(ErrorTypes.VALIDATION, ErrorTypes.NETWORK, ErrorTypes.SERVER, ErrorTypes.CLIENT),
            shouldSanitize: fc.boolean()
          }),
          (testData) => {
            const sensitiveData = {
              password: 'secret123',
              token: 'bearer-token-xyz',
              creditCard: '4111-1111-1111-1111',
              ssn: '123-45-6789'
            };

            const errorData = testData.includeSensitiveData ? 
              { ...sensitiveData, message: 'Error with sensitive data' } :
              { message: 'Regular error message', userId: 'user123' };

            const mockReporter = vi.fn();
            
            const reportError = (error, data, options = {}) => {
              let sanitizedData = data;
              
              if (options.sanitize && testData.shouldSanitize) {
                sanitizedData = Object.keys(data).reduce((acc, key) => {
                  const sensitiveKeys = ['password', 'token', 'creditCard', 'ssn'];
                  if (sensitiveKeys.includes(key)) {
                    acc[key] = '[REDACTED]';
                  } else {
                    acc[key] = data[key];
                  }
                  return acc;
                }, {});
              }
              
              mockReporter({ error, data: sanitizedData, type: testData.errorType });
            };

            const testError = new Error('Test error');
            reportError(testError, errorData, { sanitize: testData.shouldSanitize });

            expect(mockReporter).toHaveBeenCalled();
            const reportedData = mockReporter.mock.calls[0][0];

            // Should include error type
            expect(reportedData.type).toBe(testData.errorType);

            // Should sanitize sensitive data if enabled
            if (testData.shouldSanitize && testData.includeSensitiveData) {
              expect(reportedData.data.password).toBe('[REDACTED]');
              expect(reportedData.data.token).toBe('[REDACTED]');
              expect(reportedData.data.creditCard).toBe('[REDACTED]');
              expect(reportedData.data.ssn).toBe('[REDACTED]');
            }

            // Should preserve non-sensitive data
            expect(reportedData.data.message).toContain('error');
          }
        ),
        { numRuns: 8 }
      );
    });
  });

  describe('Property: Error recovery mechanisms should work consistently', () => {
    it('should provide consistent retry mechanisms across components', () => {
      fc.assert(
        fc.property(
          fc.record({
            maxRetries: fc.integer({ min: 1, max: 5 }),
            retryDelay: fc.integer({ min: 100, max: 1000 }),
            backoffMultiplier: fc.float({ min: 1.0, max: 3.0 }),
            shouldEventuallySucceed: fc.boolean()
          }),
          async (testData) => {
            let attemptCount = 0;
            const mockOperation = vi.fn().mockImplementation(() => {
              attemptCount++;
              if (attemptCount <= testData.maxRetries && !testData.shouldEventuallySucceed) {
                throw new Error(`Attempt ${attemptCount} failed`);
              }
              if (attemptCount < testData.maxRetries && testData.shouldEventuallySucceed) {
                throw new Error(`Attempt ${attemptCount} failed`);
              }
              return Promise.resolve({ success: true, attempt: attemptCount });
            });

            const RetryComponent = () => {
              const [error, setError] = React.useState(null);
              const [loading, setLoading] = React.useState(false);
              const [result, setResult] = React.useState(null);
              const [retryCount, setRetryCount] = React.useState(0);

              const executeOperation = async () => {
                setLoading(true);
                setError(null);
                
                try {
                  const response = await mockOperation();
                  setResult(response);
                } catch (err) {
                  setError(err);
                } finally {
                  setLoading(false);
                }
              };

              const handleRetry = async () => {
                if (retryCount < testData.maxRetries) {
                  setRetryCount(prev => prev + 1);
                  
                  // Apply backoff delay
                  const delay = testData.retryDelay * Math.pow(testData.backoffMultiplier, retryCount);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  
                  await executeOperation();
                }
              };

              React.useEffect(() => {
                executeOperation();
              }, []);

              if (loading) return <div data-testid="loading">Loading...</div>;
              if (result) return <div data-testid="success">Success: {result.attempt}</div>;
              if (error) {
                return (
                  <div data-testid="error-with-retry">
                    <div data-testid="error-message">{error.message}</div>
                    {retryCount < testData.maxRetries && (
                      <button 
                        data-testid="retry-button" 
                        onClick={handleRetry}
                      >
                        Retry ({retryCount}/{testData.maxRetries})
                      </button>
                    )}
                  </div>
                );
              }
              return null;
            };

            const { queryByTestId } = render(<RetryComponent />);

            // Should show loading initially
            expect(queryByTestId('loading')).toBeInTheDocument();

            // Wait for initial operation
            await waitFor(() => {
              expect(queryByTestId('loading')).not.toBeInTheDocument();
            });

            if (testData.shouldEventuallySucceed) {
              // Should eventually succeed after retries
              let currentRetries = 0;
              while (currentRetries < testData.maxRetries && queryByTestId('error-with-retry')) {
                const retryButton = queryByTestId('retry-button');
                if (retryButton) {
                  await act(async () => {
                    fireEvent.click(retryButton);
                  });
                  
                  await waitFor(() => {
                    expect(queryByTestId('loading')).not.toBeInTheDocument();
                  });
                  
                  currentRetries++;
                }
              }
              
              // Should eventually show success
              expect(queryByTestId('success')).toBeInTheDocument();
            } else {
              // Should show error with retry option
              expect(queryByTestId('error-with-retry')).toBeInTheDocument();
              expect(queryByTestId('retry-button')).toBeInTheDocument();
            }
          }
        ),
        { numRuns: 6 }
      );
    });

    it('should handle error boundaries with consistent fallback UI', () => {
      fc.assert(
        fc.property(
          fc.record({
            fallbackType: fc.constantFrom('minimal', 'detailed', 'custom'),
            showErrorDetails: fc.boolean(),
            allowReporting: fc.boolean(),
            componentContext: fc.constantFrom('booking', 'profile', 'rides', 'general')
          }),
          (testData) => {
            const ThrowingComponent = () => {
              throw new Error('Component crashed');
            };

            const CustomFallback = ({ error, resetError, context }) => (
              <div data-testid="custom-fallback">
                <h2>Something went wrong in {context}</h2>
                {testData.showErrorDetails && (
                  <details data-testid="error-details">
                    <summary>Error Details</summary>
                    <pre>{error.message}</pre>
                  </details>
                )}
                <button data-testid="reset-button" onClick={resetError}>
                  Try Again
                </button>
                {testData.allowReporting && (
                  <button data-testid="report-button">
                    Report Issue
                  </button>
                )}
              </div>
            );

            const getBoundaryProps = () => {
              const baseProps = {
                context: testData.componentContext,
                onError: vi.fn()
              };

              switch (testData.fallbackType) {
                case 'minimal':
                  return { ...baseProps, fallback: 'minimal' };
                case 'detailed':
                  return { ...baseProps, fallback: 'detailed', showDetails: testData.showErrorDetails };
                case 'custom':
                  return { 
                    ...baseProps, 
                    fallback: CustomFallback,
                    showDetails: testData.showErrorDetails,
                    allowReporting: testData.allowReporting
                  };
                default:
                  return baseProps;
              }
            };

            const { queryByTestId, queryByText } = render(
              <ErrorBoundary {...getBoundaryProps()}>
                <ThrowingComponent />
              </ErrorBoundary>
            );

            // Should show fallback UI
            const fallbackElement = queryByTestId('error-boundary') || 
                                   queryByTestId('custom-fallback') ||
                                   queryByText(/something went wrong/i);
            expect(fallbackElement).toBeInTheDocument();

            // Should include context information
            expect(fallbackElement.textContent).toContain(testData.componentContext);

            // Should show error details if enabled
            if (testData.showErrorDetails) {
              const detailsElement = queryByTestId('error-details');
              expect(detailsElement).toBeInTheDocument();
            }

            // Should show reporting option if enabled
            if (testData.allowReporting && testData.fallbackType === 'custom') {
              const reportButton = queryByTestId('report-button');
              expect(reportButton).toBeInTheDocument();
            }

            // Should have reset/retry functionality
            const resetButton = queryByTestId('reset-button') || 
                               queryByTestId('error-retry-button') ||
                               queryByText(/try again|retry/i);
            expect(resetButton).toBeInTheDocument();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property: Error handling should be accessible and user-friendly', () => {
    it('should provide accessible error messages and controls', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorSeverity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            hasScreenReaderText: fc.boolean(),
            hasKeyboardNavigation: fc.boolean(),
            hasAriaLabels: fc.boolean()
          }),
          (testData) => {
            const mockError = {
              message: 'Test error occurred',
              severity: testData.errorSeverity,
              code: 'TEST_ERROR'
            };

            const { container, queryByTestId } = render(
              <ErrorState 
                error={mockError}
                accessible={true}
                screenReaderText={testData.hasScreenReaderText ? 'Error occurred, please try again' : undefined}
                keyboardNavigable={testData.hasKeyboardNavigation}
                ariaLabels={testData.hasAriaLabels}
              />
            );

            const errorContainer = queryByTestId('error-state');
            expect(errorContainer).toBeInTheDocument();

            // Should have appropriate ARIA attributes
            if (testData.hasAriaLabels) {
              expect(errorContainer).toHaveAttribute('role', 'alert');
              expect(errorContainer).toHaveAttribute('aria-live', 'polite');
            }

            // Should have screen reader text if enabled
            if (testData.hasScreenReaderText) {
              const srText = container.querySelector('.sr-only, [aria-label*="Error"]');
              expect(srText).toBeInTheDocument();
            }

            // Should support keyboard navigation if enabled
            if (testData.hasKeyboardNavigation) {
              const focusableElements = container.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              );
              expect(focusableElements.length).toBeGreaterThan(0);
              
              // First focusable element should be focusable
              if (focusableElements[0]) {
                expect(focusableElements[0]).not.toHaveAttribute('tabindex', '-1');
              }
            }

            // Should have appropriate color contrast for severity
            const severityClass = container.querySelector(`[class*="${testData.errorSeverity}"]`);
            if (severityClass) {
              expect(severityClass).toBeInTheDocument();
            }
          }
        ),
        { numRuns: 8 }
      );
    });
  });

  describe('Integration: Error handling across component boundaries', () => {
    it('should handle errors consistently across nested components', async () => {
      const NestedComponent = ({ shouldError, level }) => {
        if (shouldError && level === 0) {
          throw new Error(`Error at level ${level}`);
        }
        
        if (level > 0) {
          return (
            <ErrorBoundary context={`level-${level}`}>
              <NestedComponent shouldError={shouldError} level={level - 1} />
            </ErrorBoundary>
          );
        }
        
        return <div data-testid="success-nested">Nested success</div>;
      };

      const { queryByTestId } = render(
        <ErrorBoundary context="root">
          <NestedComponent shouldError={true} level={3} />
        </ErrorBoundary>
      );

      // Should catch error at the appropriate level
      expect(queryByTestId('error-boundary')).toBeInTheDocument();
      
      // Should not crash the entire app
      expect(document.body).toBeInTheDocument();
    });

    it('should maintain error state consistency during component updates', async () => {
      const DynamicComponent = ({ errorProbability, updateCount }) => {
        const [count, setCount] = React.useState(0);
        
        React.useEffect(() => {
          if (count < updateCount) {
            const timer = setTimeout(() => setCount(c => c + 1), 100);
            return () => clearTimeout(timer);
          }
        }, [count, updateCount]);

        if (Math.random() < errorProbability && count > 0) {
          throw new Error(`Random error at update ${count}`);
        }

        return <div data-testid="dynamic-content">Update: {count}</div>;
      };

      const { queryByTestId } = render(
        <ErrorBoundary>
          <DynamicComponent errorProbability={0.3} updateCount={5} />
        </ErrorBoundary>
      );

      // Wait for potential errors or completion
      await waitFor(() => {
        const errorBoundary = queryByTestId('error-boundary');
        const dynamicContent = queryByTestId('dynamic-content');
        
        // Should either show error or content, not both
        expect(errorBoundary || dynamicContent).toBeInTheDocument();
        expect(!(errorBoundary && dynamicContent)).toBe(true);
      }, { timeout: 2000 });
    });
  });
});

/**
 * Error Handling Utility Tests
 */
describe('Error Handling Utilities', () => {
  it('should create consistent error objects', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('validation', 'network', 'server', 'client'),
          message: fc.string({ minLength: 1, maxLength: 100 }),
          code: fc.integer({ min: 1000, max: 9999 }),
          details: fc.option(fc.object(), { nil: null })
        }),
        (testData) => {
          const error = handleError(testData.type, testData.message, {
            code: testData.code,
            details: testData.details
          });

          expect(error).toHaveProperty('type', testData.type);
          expect(error).toHaveProperty('message', testData.message);
          expect(error).toHaveProperty('code', testData.code);
          expect(error).toHaveProperty('timestamp');
          expect(error.timestamp).toBeInstanceOf(Date);

          if (testData.details) {
            expect(error).toHaveProperty('details', testData.details);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});