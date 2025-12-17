import { vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';

/**
 * Test Helpers
 * 
 * Comprehensive utilities for testing React components and hooks
 */

// =============================================================================
// ASYNC TESTING HELPERS
// =============================================================================

/**
 * Wait for a condition to be true with timeout
 */
export const waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Wait for multiple async operations to complete
 */
export const waitForAll = async (promises, timeout = 10000) => {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Operations timed out after ${timeout}ms`)), timeout)
  );
  
  return Promise.race([
    Promise.all(promises),
    timeoutPromise
  ]);
};

/**
 * Flush all pending promises and timers
 */
export const flushPromises = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

// =============================================================================
// COMPONENT TESTING HELPERS
// =============================================================================

/**
 * Simulate user typing with realistic delays
 */
export const typeText = async (element, text, { delay = 50 } = {}) => {
  for (const char of text) {
    await act(async () => {
      element.focus();
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, delay));
    });
  }
};

/**
 * Simulate file upload
 */
export const uploadFile = async (fileInput, file) => {
  await act(async () => {
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

/**
 * Create a mock file for testing
 */
export const createMockFile = (name = 'test.txt', size = 1024, type = 'text/plain') => {
  const file = new File([new ArrayBuffer(size)], name, { type });
  return file;
};

/**
 * Simulate drag and drop
 */
export const simulateDragDrop = async (source, target, dataTransfer = {}) => {
  const dragStartEvent = new DragEvent('dragstart', {
    bubbles: true,
    dataTransfer: {
      setData: vi.fn(),
      getData: vi.fn(),
      ...dataTransfer
    }
  });
  
  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    dataTransfer: {
      getData: vi.fn(),
      ...dataTransfer
    }
  });

  await act(async () => {
    source.dispatchEvent(dragStartEvent);
    target.dispatchEvent(dropEvent);
  });
};

// =============================================================================
// FORM TESTING HELPERS
// =============================================================================

/**
 * Fill out a form with test data
 */
export const fillForm = async (container, formData) => {
  for (const [fieldName, value] of Object.entries(formData)) {
    const field = container.querySelector(`[name="${fieldName}"]`) ||
                 container.querySelector(`[data-testid="${fieldName}"]`);
    
    if (field) {
      await act(async () => {
        if (field.type === 'checkbox' || field.type === 'radio') {
          field.checked = Boolean(value);
          field.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (field.tagName === 'SELECT') {
          field.value = value;
          field.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }
  }
};

/**
 * Validate form submission
 */
export const submitForm = async (form, expectedData = {}) => {
  const submitHandler = vi.fn();
  form.addEventListener('submit', submitHandler);
  
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true }));
  });
  
  expect(submitHandler).toHaveBeenCalled();
  
  if (Object.keys(expectedData).length > 0) {
    const formData = new FormData(form);
    for (const [key, value] of Object.entries(expectedData)) {
      expect(formData.get(key)).toBe(value);
    }
  }
};

// =============================================================================
// HOOK TESTING HELPERS
// =============================================================================

/**
 * Test hook with multiple re-renders
 */
export const testHookReRenders = async (hookFn, rerenderCount = 5) => {
  const { result, rerender } = renderHook(hookFn);
  const initialResult = result.current;
  
  for (let i = 0; i < rerenderCount; i++) {
    await act(async () => {
      rerender();
    });
  }
  
  return { initialResult, finalResult: result.current };
};

/**
 * Test hook cleanup
 */
export const testHookCleanup = (hookFn) => {
  const cleanupSpy = vi.fn();
  const mockHook = () => {
    const result = hookFn();
    React.useEffect(() => cleanupSpy, []);
    return result;
  };
  
  const { unmount } = renderHook(mockHook);
  unmount();
  
  expect(cleanupSpy).toHaveBeenCalled();
};

// =============================================================================
// API TESTING HELPERS
// =============================================================================

/**
 * Mock API responses with realistic delays
 */
export const mockApiCall = (response, delay = 100, shouldFail = false) => {
  return vi.fn().mockImplementation(() => 
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error(response.error || 'API call failed'));
        } else {
          resolve(response);
        }
      }, delay);
    })
  );
};

/**
 * Create a mock fetch response
 */
export const createMockFetchResponse = (data, status = 200, ok = true) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  });
};

/**
 * Mock network conditions
 */
export const mockNetworkConditions = (condition = 'online') => {
  const originalOnLine = navigator.onLine;
  
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: condition === 'online'
  });
  
  return () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine
    });
  };
};

// =============================================================================
// PERFORMANCE TESTING HELPERS
// =============================================================================

/**
 * Measure component render time
 */
export const measureRenderTime = async (renderFn) => {
  const startTime = performance.now();
  const result = await renderFn();
  const endTime = performance.now();
  
  return {
    renderTime: endTime - startTime,
    result
  };
};

/**
 * Test component re-render count
 */
export const countReRenders = (Component, props = {}) => {
  let renderCount = 0;
  
  const WrappedComponent = (props) => {
    renderCount++;
    return <Component {...props} />;
  };
  
  const { rerender } = render(<WrappedComponent {...props} />);
  
  return {
    getRenderCount: () => renderCount,
    rerender: (newProps) => rerender(<WrappedComponent {...newProps} />)
  };
};

/**
 * Test memory usage (simplified)
 */
export const testMemoryUsage = async (testFn, iterations = 100) => {
  const initialMemory = performance.memory?.usedJSHeapSize || 0;
  
  for (let i = 0; i < iterations; i++) {
    await testFn();
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = performance.memory?.usedJSHeapSize || 0;
  
  return {
    initialMemory,
    finalMemory,
    memoryDelta: finalMemory - initialMemory
  };
};

// =============================================================================
// ACCESSIBILITY TESTING HELPERS
// =============================================================================

/**
 * Test keyboard navigation
 */
export const testKeyboardNavigation = async (container, keys = ['Tab', 'Enter', 'Space']) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const results = [];
  
  for (const key of keys) {
    await act(async () => {
      container.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });
    
    results.push({
      key,
      activeElement: document.activeElement,
      focusableCount: focusableElements.length
    });
  }
  
  return results;
};

/**
 * Test screen reader announcements
 */
export const testScreenReaderAnnouncements = (container) => {
  const liveRegions = container.querySelectorAll('[aria-live]');
  const announcements = [];
  
  liveRegions.forEach(region => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          announcements.push({
            element: region,
            content: region.textContent,
            timestamp: Date.now()
          });
        }
      });
    });
    
    observer.observe(region, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
  
  return {
    getAnnouncements: () => announcements,
    clearAnnouncements: () => announcements.length = 0
  };
};

// =============================================================================
// ERROR TESTING HELPERS
// =============================================================================

/**
 * Test error boundaries
 */
export const testErrorBoundary = async (ErrorBoundary, ThrowingComponent, errorMessage = 'Test error') => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  const ThrowError = () => {
    throw new Error(errorMessage);
  };
  
  const { getByTestId, queryByTestId } = render(
    <ErrorBoundary>
      <ThrowingComponent>
        <ThrowError />
      </ThrowingComponent>
    </ErrorBoundary>
  );
  
  // Error boundary should catch the error
  expect(queryByTestId('error-boundary')).toBeInTheDocument();
  expect(consoleSpy).toHaveBeenCalled();
  
  consoleSpy.mockRestore();
};

/**
 * Capture and analyze console output
 */
export const captureConsoleOutput = (testFn) => {
  const originalConsole = { ...console };
  const captured = {
    log: [],
    warn: [],
    error: []
  };
  
  ['log', 'warn', 'error'].forEach(method => {
    console[method] = (...args) => {
      captured[method].push(args);
      originalConsole[method](...args);
    };
  });
  
  const result = testFn();
  
  // Restore console
  Object.assign(console, originalConsole);
  
  return {
    result,
    captured
  };
};

// =============================================================================
// VISUAL TESTING HELPERS
// =============================================================================

/**
 * Take a snapshot of component styles
 */
export const captureStyles = (element) => {
  const computedStyles = window.getComputedStyle(element);
  const styles = {};
  
  for (let i = 0; i < computedStyles.length; i++) {
    const property = computedStyles[i];
    styles[property] = computedStyles.getPropertyValue(property);
  }
  
  return styles;
};

/**
 * Test responsive behavior
 */
export const testResponsive = async (component, breakpoints = [320, 768, 1024, 1440]) => {
  const results = [];
  
  for (const width of breakpoints) {
    // Mock window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    });
    
    window.dispatchEvent(new Event('resize'));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    const { container } = render(component);
    
    results.push({
      width,
      snapshot: container.innerHTML,
      styles: captureStyles(container.firstChild)
    });
  }
  
  return results;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate random test data
 */
export const generateTestData = (schema) => {
  const generators = {
    string: () => Math.random().toString(36).substring(7),
    number: () => Math.floor(Math.random() * 1000),
    boolean: () => Math.random() > 0.5,
    email: () => `test${Math.random().toString(36).substring(7)}@example.com`,
    date: () => new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    array: (length = 5) => Array.from({ length }, () => Math.random().toString(36).substring(7))
  };
  
  const result = {};
  
  for (const [key, type] of Object.entries(schema)) {
    if (typeof type === 'string' && generators[type]) {
      result[key] = generators[type]();
    } else if (typeof type === 'object' && type.type && generators[type.type]) {
      result[key] = generators[type.type](type.length);
    } else {
      result[key] = type;
    }
  }
  
  return result;
};

/**
 * Deep clone object for testing
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
};

/**
 * Compare objects for testing
 */
export const deepEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }
  
  return obj1 === obj2;
};

export default {
  // Async helpers
  waitForCondition,
  waitForAll,
  flushPromises,
  
  // Component helpers
  typeText,
  uploadFile,
  createMockFile,
  simulateDragDrop,
  
  // Form helpers
  fillForm,
  submitForm,
  
  // Hook helpers
  testHookReRenders,
  testHookCleanup,
  
  // API helpers
  mockApiCall,
  createMockFetchResponse,
  mockNetworkConditions,
  
  // Performance helpers
  measureRenderTime,
  countReRenders,
  testMemoryUsage,
  
  // Accessibility helpers
  testKeyboardNavigation,
  testScreenReaderAnnouncements,
  
  // Error helpers
  testErrorBoundary,
  captureConsoleOutput,
  
  // Visual helpers
  captureStyles,
  testResponsive,
  
  // Utilities
  generateTestData,
  deepClone,
  deepEqual
};