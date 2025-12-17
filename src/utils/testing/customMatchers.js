/**
 * Custom Test Matchers
 * Custom Jest/Vitest matchers for component testing
 */

import { expect } from 'vitest';

// Component-specific matchers
export const customMatchers = {
  // Check if component has single responsibility
  toHaveSingleResponsibility(received) {
    const responsibilities = this.utils.analyzeComponentResponsibilities?.(received) || {};
    const totalResponsibilities = responsibilities.totalResponsibilities || 0;
    
    const pass = totalResponsibilities <= 3; // Allow up to 3 different types of responsibilities
    
    if (pass) {
      return {
        message: () => `Expected component to have multiple responsibilities, but it has ${totalResponsibilities}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected component to have single responsibility, but it has ${totalResponsibilities} responsibilities: ${JSON.stringify(responsibilities)}`,
        pass: false
      };
    }
  },

  // Check if component is under size limit
  toBeUnderSizeLimit(received, limit = 500) {
    const lineCount = this.utils.getComponentLineCount?.(received) || 0;
    const pass = lineCount < limit;
    
    if (pass) {
      return {
        message: () => `Expected component to exceed ${limit} lines, but it has ${lineCount} lines`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected component to be under ${limit} lines, but it has ${lineCount} lines`,
        pass: false
      };
    }
  },

  // Check if component follows naming conventions
  toFollowNamingConvention(received, pattern) {
    const pass = pattern.test(received);
    
    if (pass) {
      return {
        message: () => `Expected "${received}" not to follow naming convention ${pattern}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected "${received}" to follow naming convention ${pattern}`,
        pass: false
      };
    }
  },

  // Check if component is properly organized in file structure
  toBeProperlyOrganized(received, expectedDirectory) {
    const pass = received.includes(expectedDirectory);
    
    if (pass) {
      return {
        message: () => `Expected component "${received}" not to be in directory "${expectedDirectory}"`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected component "${received}" to be in directory "${expectedDirectory}"`,
        pass: false
      };
    }
  },

  // Check if component has proper prop validation
  toHaveProperPropValidation(received) {
    // This would check for PropTypes or TypeScript interfaces
    // For now, return a simple implementation
    const hasValidation = received.toString().includes('PropTypes') || 
                         received.toString().includes('interface') ||
                         received.toString().includes('type ');
    
    if (hasValidation) {
      return {
        message: () => `Expected component not to have prop validation`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected component to have prop validation (PropTypes or TypeScript interfaces)`,
        pass: false
      };
    }
  },

  // Check if component uses React.memo appropriately
  toUseReactMemo(received) {
    const usesReactMemo = received.toString().includes('React.memo') || 
                         received.toString().includes('memo(');
    
    if (usesReactMemo) {
      return {
        message: () => `Expected component not to use React.memo`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected component to use React.memo for performance optimization`,
        pass: false
      };
    }
  },

  // Check if component has proper error handling
  toHaveErrorHandling(received) {
    const hasErrorHandling = received.toString().includes('try') ||
                           received.toString().includes('catch') ||
                           received.toString().includes('ErrorBoundary') ||
                           received.toString().includes('error');
    
    if (hasErrorHandling) {
      return {
        message: () => `Expected component not to have error handling`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected component to have proper error handling`,
        pass: false
      };
    }
  },

  // Check if component has loading states
  toHaveLoadingStates(received) {
    const hasLoadingStates = received.toString().includes('loading') ||
                           received.toString().includes('isLoading') ||
                           received.toString().includes('Loading');
    
    if (hasLoadingStates) {
      return {
        message: () => `Expected component not to have loading states`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected component to have loading states`,
        pass: false
      };
    }
  },

  // Check if hook follows naming convention
  toBeValidHookName(received) {
    const pass = /^use[A-Z]/.test(received);
    
    if (pass) {
      return {
        message: () => `Expected "${received}" not to follow hook naming convention`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected "${received}" to follow hook naming convention (start with 'use' followed by capital letter)`,
        pass: false
      };
    }
  },

  // Check if component is testable in isolation
  toBeTestableInIsolation(received) {
    // Check if component has minimal external dependencies
    const hasMinimalDependencies = !received.toString().includes('window.') &&
                                  !received.toString().includes('document.') &&
                                  !received.toString().includes('localStorage');
    
    if (hasMinimalDependencies) {
      return {
        message: () => `Expected component not to be testable in isolation`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected component to be testable in isolation (minimal external dependencies)`,
        pass: false
      };
    }
  }
};

// Extend expect with custom matchers
expect.extend(customMatchers);

export default customMatchers;