/**
 * Component Testing Utilities
 * Shared utilities for testing React components consistently
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Mock providers for testing components that need context
export const createMockProviders = (initialState = {}) => {
  const MockProvider = ({ children }) => {
    return children;
  };
  return MockProvider;
};

// Common test data generators
export const generateMockProps = (overrides = {}) => ({
  className: 'test-class',
  testId: 'test-component',
  ...overrides
});

export const generateMockFormData = (overrides = {}) => ({
  pickupLocation: 'Test Pickup Location',
  dropoffLocation: 'Test Dropoff Location',
  passengers: 1,
  paymentMethod: 'cash',
  specialInstructions: '',
  ...overrides
});

export const generateMockRideData = (overrides = {}) => ({
  id: 'test-ride-123',
  service_type: 'taxi',
  pickup_location: 'Test Pickup',
  dropoff_location: 'Test Dropoff',
  ride_status: 'pending',
  created_at: new Date().toISOString(),
  ...overrides
});

// Component testing helpers
export const renderWithProviders = (component, options = {}) => {
  const { initialState = {}, ...renderOptions } = options;
  const Wrapper = createMockProviders(initialState);
  
  return render(component, {
    wrapper: Wrapper,
    ...renderOptions
  });
};

// Form testing utilities
export const fillFormField = async (fieldName, value) => {
  const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                screen.getByPlaceholderText(new RegExp(fieldName, 'i'));
  fireEvent.change(field, { target: { value } });
  await waitFor(() => expect(field.value).toBe(value));
};

export const submitForm = async (formTestId = 'form') => {
  const form = screen.getByTestId(formTestId);
  fireEvent.submit(form);
  await waitFor(() => {});
};

// Modal testing utilities
export const openModal = async (triggerTestId) => {
  const trigger = screen.getByTestId(triggerTestId);
  fireEvent.click(trigger);
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
};

export const closeModal = async () => {
  const closeButton = screen.getByLabelText(/close/i) || 
                     screen.getByRole('button', { name: /close/i });
  fireEvent.click(closeButton);
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
};

// Component size testing utility
export const getComponentLineCount = (componentPath) => {
  // This would be implemented to read file and count lines
  // For now, return a mock implementation
  return 100; // Mock line count
};

export const getAllReactComponents = () => {
  // This would scan the src directory for .jsx files
  // For now, return mock component paths
  return [
    'src/components/TestComponent.jsx',
    'src/dashboards/client/components/TestModal.jsx'
  ];
};

// Performance testing utilities
export const measureRenderTime = (component) => {
  const startTime = performance.now();
  render(component);
  const endTime = performance.now();
  return endTime - startTime;
};

export const countRenders = (component) => {
  let renderCount = 0;
  const TestComponent = () => {
    renderCount++;
    return component;
  };
  render(<TestComponent />);
  return renderCount;
};

// Mock function creators
export const createMockCallback = () => vi.fn();
export const createMockAsyncCallback = () => vi.fn().mockResolvedValue({});
export const createMockFailingCallback = (error = new Error('Test error')) => 
  vi.fn().mockRejectedValue(error);

// Component prop validation helpers
export const validateRequiredProps = (component, requiredProps) => {
  requiredProps.forEach(prop => {
    expect(() => {
      render(React.cloneElement(component, { [prop]: undefined }));
    }).toThrow();
  });
};

export const validateOptionalProps = (component, optionalProps) => {
  optionalProps.forEach(prop => {
    expect(() => {
      render(React.cloneElement(component, { [prop]: undefined }));
    }).not.toThrow();
  });
};