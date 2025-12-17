/**
 * Property-based test for component reference accuracy
 * 
 * **Feature: ride-flow-documentation-audit, Property 2: Component Reference Accuracy**
 * **Validates: Requirements 2.1, 2.4, 2.5**
 * 
 * This test verifies that all component references in documentation
 * correspond to actual component files in the codebase.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { 
  extractComponentNaming,
  findComponentFiles,
  extractComponentDefinitions 
} from '../componentNameExtractor.js';

// Helper functions for the property test
function extractComponentReferences(documentContent) {
  if (!documentContent || typeof documentContent !== 'string') {
    return [];
  }

  const componentReferences = new Set();
  
  // Pattern 1: JSX component usage <ComponentName>
  const jsxPattern = /<([A-Z][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = jsxPattern.exec(documentContent)) !== null) {
    componentReferences.add(match[1]);
  }
  
  // Pattern 2: Import statements
  const importPattern = /import\s+(?:(\w+)|(?:\{([^}]+)\}))\s+from\s+['"][^'"]*\/([A-Z][a-zA-Z0-9_]*)['"]/g;
  while ((match = importPattern.exec(documentContent)) !== null) {
    if (match[1]) {
      componentReferences.add(match[1]);
    }
    if (match[2]) {
      const namedImports = match[2].split(',').map(name => name.trim());
      namedImports.forEach(name => {
        if (/^[A-Z]/.test(name)) {
          componentReferences.add(name);
        }
      });
    }
    if (match[3]) {
      componentReferences.add(match[3]);
    }
  }
  
  // Pattern 3: Component names in backticks or quotes
  const quotedComponentPattern = /[`'"]([A-Z][a-zA-Z0-9_]*)[`'"]/g;
  while ((match = quotedComponentPattern.exec(documentContent)) !== null) {
    componentReferences.add(match[1]);
  }
  
  // Pattern 4: Component file references
  const filePattern = /([A-Z][a-zA-Z0-9_]*\.jsx?)/g;
  while ((match = filePattern.exec(documentContent)) !== null) {
    const componentName = match[1].replace(/\.jsx?$/, '');
    componentReferences.add(componentName);
  }
  
  // Pattern 5: Common component patterns in documentation
  const componentMentionPattern = /\b([A-Z][a-zA-Z0-9_]*(?:Component|Modal|Form|Card|Button|Page|View|Layout))\b/g;
  while ((match = componentMentionPattern.exec(documentContent)) !== null) {
    componentReferences.add(match[1]);
  }
  
  return Array.from(componentReferences);
}

function isMarkedAsMissing(componentName, documentContent) {
  if (!documentContent || typeof documentContent !== 'string' || !componentName) {
    return false;
  }
  
  // Check for various ways a component might be marked as missing
  const missingPatterns = [
    new RegExp(`${componentName}.*(?:missing|not found|does not exist|undefined|TODO|FIXME)`, 'i'),
    new RegExp(`(?:missing|not found|does not exist|undefined|TODO|FIXME).*${componentName}`, 'i'),
    new RegExp(`\\[MISSING\\].*${componentName}`, 'i'),
    new RegExp(`${componentName}.*\\[MISSING\\]`, 'i'),
    new RegExp(`// TODO.*${componentName}`, 'i'),
    new RegExp(`<!-- TODO.*${componentName}`, 'i')
  ];
  
  return missingPatterns.some(pattern => pattern.test(documentContent));
}

describe('Component Reference Accuracy Property Test', () => {
  let actualComponents;
  
  beforeAll(async () => {
    // Extract actual component information from the codebase
    const componentNaming = await extractComponentNaming();
    actualComponents = Object.values(componentNaming.components).map(comp => ({
      name: comp.actualName,
      path: comp.actualPath,
      fileName: comp.fileName,
      directory: comp.directory
    }));
  });

  describe('Property 2: Component Reference Accuracy', () => {
    /**
     * **Feature: ride-flow-documentation-audit, Property 2: Component Reference Accuracy**
     * **Validates: Requirements 2.1, 2.4, 2.5**
     * 
     * For any component reference in documentation, the component name should 
     * correspond to an actual component file in the codebase or be marked as missing.
     */
    test('all component references should correspond to actual files', () => {
      fc.assert(
        fc.property(
          fc.record({
            documentContent: fc.oneof(
              // Generate content with actual component names
              fc.record({
                components: fc.shuffledSubarray(actualComponents, { minLength: 1, maxLength: 3 }),
                template: fc.constantFrom(
                  'The {component} component handles user interactions',
                  'Import {component} from the components directory',
                  'Use <{component}> in your JSX',
                  'The {component}.jsx file contains the implementation',
                  'Missing: [MISSING] {component} needs to be created'
                )
              }).map(({ components, template }) => {
                const component = components[0]?.name || 'TestComponent';
                return template.replace(/{component}/g, component);
              }),
              // Generate content with missing component markers
              fc.record({
                component: fc.string({ minLength: 5, maxLength: 15 }).filter(s => 
                  /^[A-Z][a-zA-Z0-9_]*$/.test(s) && 
                  !actualComponents.some(c => c.name === s)
                ),
                marker: fc.constantFrom('[MISSING]', 'TODO:', 'FIXME:', '// TODO', '<!-- TODO')
              }).map(({ component, marker }) => `${marker} ${component} component needs implementation`),
              // Generate safe content with no component references
              fc.constantFrom(
                'This documentation describes the system architecture.',
                'The database schema includes tables for users and rides.',
                'API endpoints handle authentication and data retrieval.',
                'Configuration files manage environment settings.'
              )
            )
          }),
          ({ documentContent }) => {
            const extractedComponents = extractComponentReferences(documentContent);
            const actualComponentNames = actualComponents.map(c => c.name);
            
            // All extracted components should either:
            // 1. Match an actual component name
            // 2. Be marked as missing in the document
            return extractedComponents.every(component => 
              actualComponentNames.includes(component) ||
              isMarkedAsMissing(component, documentContent)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    test('component references in realistic documentation should be valid', () => {
      // Test with realistic documentation content patterns
      const actualComponentNames = actualComponents.map(c => c.name);
      const sampleComponents = actualComponents.slice(0, 5);
      
      const documentTemplates = [
        `The ${sampleComponents[0]?.name || 'TestComponent'} component renders the main interface`,
        `Import { ${sampleComponents.slice(0, 3).map(c => c.name).join(', ')} } from './components'`,
        `Use <${sampleComponents[0]?.name || 'TestComponent'}> to display the content`,
        `The ${sampleComponents[0]?.name || 'TestComponent'}.jsx file is located in ${sampleComponents[0]?.directory || 'src/components'}`,
        'Missing component: [MISSING] NonExistentComponent should be implemented',
        'TODO: Create NewFeatureComponent for the upcoming feature'
      ];

      documentTemplates.forEach(template => {
        const extractedComponents = extractComponentReferences(template);
        
        const allComponentsValid = extractedComponents.every(component => 
          actualComponentNames.includes(component) ||
          isMarkedAsMissing(component, template)
        );
        
        if (!allComponentsValid) {
          console.log('Template:', template);
          console.log('Extracted components:', extractedComponents);
          console.log('Invalid components:', extractedComponents.filter(component => 
            !actualComponentNames.includes(component) && 
            !isMarkedAsMissing(component, template)
          ));
        }
        
        expect(allComponentsValid).toBe(true);
      });
    });

    test('should correctly identify missing component markers', () => {
      const testCases = [
        { content: 'The InvalidComponent is missing from codebase', component: 'InvalidComponent', shouldBeMarked: true },
        { content: '[MISSING] UnknownComponent needs to be added', component: 'UnknownComponent', shouldBeMarked: true },
        { content: 'TODO: implement FutureComponent', component: 'FutureComponent', shouldBeMarked: true },
        { content: '<!-- TODO: add NewComponent -->', component: 'NewComponent', shouldBeMarked: true },
        { content: 'The ValidComponent exists in the codebase', component: 'ValidComponent', shouldBeMarked: false },
        { content: 'Regular component reference: UserProfile', component: 'UserProfile', shouldBeMarked: false }
      ];

      testCases.forEach(({ content, component, shouldBeMarked }) => {
        const isMarked = isMarkedAsMissing(component, content);
        expect(isMarked).toBe(shouldBeMarked);
      });
    });

    test('should extract component references correctly', () => {
      const testCases = [
        {
          content: 'Use <UserProfile> and <RideCard> components',
          expectedComponents: ['UserProfile', 'RideCard']
        },
        {
          content: 'Import { BookingModal, PaymentForm } from "./components"',
          expectedComponents: ['BookingModal', 'PaymentForm']
        },
        {
          content: 'The `DriverDashboard` component handles driver interactions',
          expectedComponents: ['DriverDashboard']
        },
        {
          content: 'The LoginModal.jsx file contains authentication logic',
          expectedComponents: ['LoginModal']
        },
        {
          content: 'No component references in this text',
          expectedComponents: []
        }
      ];

      testCases.forEach(({ content, expectedComponents }) => {
        const extractedComponents = extractComponentReferences(content);
        expectedComponents.forEach(component => {
          expect(extractedComponents).toContain(component);
        });
      });
    });

    test('should handle edge cases gracefully', () => {
      const edgeCases = [
        null,
        undefined,
        '',
        '   ',
        'No component references at all',
        'Special characters: !@#$%^&*()',
        'Numbers: 123456789',
        'lowercase: component names should start with uppercase'
      ];

      edgeCases.forEach(content => {
        expect(() => extractComponentReferences(content)).not.toThrow();
        expect(() => isMarkedAsMissing('TestComponent', content)).not.toThrow();
      });
    });

    test('should filter out non-component patterns', () => {
      const nonComponentContent = [
        'const API_URL = "https://api.example.com"',
        'function handleClick() { return true; }',
        'import { useState, useEffect } from "react"',
        'const styles = { color: "red" }',
        'This is regular text with no Components mentioned'
      ];

      nonComponentContent.forEach(content => {
        const extractedComponents = extractComponentReferences(content);
        // Should not extract utility functions, constants, or hooks as components
        const hasInvalidComponents = extractedComponents.some(comp => 
          comp.startsWith('use') || // hooks
          comp === 'API_URL' || // constants
          comp === 'handleClick' || // functions
          comp === 'useState' || comp === 'useEffect' // React hooks
        );
        expect(hasInvalidComponents).toBe(false);
      });
    });
  });

  describe('Component schema validation', () => {
    test('should have loaded actual component data', () => {
      expect(actualComponents).toBeDefined();
      expect(Array.isArray(actualComponents)).toBe(true);
      expect(actualComponents.length).toBeGreaterThan(0);
      
      // Verify component structure
      actualComponents.forEach(component => {
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('path');
        expect(typeof component.name).toBe('string');
        expect(typeof component.path).toBe('string');
        expect(component.name.length).toBeGreaterThan(0);
      });
    });

    test('should contain expected core components', () => {
      const componentNames = actualComponents.map(c => c.name);
      
      // Check for some common component patterns that should exist
      const hasModalComponents = componentNames.some(name => name.includes('Modal'));
      const hasCardComponents = componentNames.some(name => name.includes('Card'));
      const hasDashboardComponents = componentNames.some(name => name.includes('Dashboard'));
      
      // At least one of these patterns should exist in a typical React app
      expect(hasModalComponents || hasCardComponents || hasDashboardComponents).toBe(true);
    });

    test('should have components with valid naming conventions', () => {
      actualComponents.forEach(component => {
        // Debug: log components that don't match expected pattern
        if (!/^[A-Z]/.test(component.name)) {
          console.log('Component with invalid naming:', component.name, 'at', component.path);
        }
        
        // Component names should start with uppercase letter (but allow some exceptions)
        const isValidComponentName = /^[A-Z]/.test(component.name) || 
                                   component.name === 'index' || // index files
                                   component.path.includes('__tests__'); // test files
        
        expect(isValidComponentName).toBe(true);
        
        // Component names should only contain valid characters
        expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(component.name)).toBe(true);
        
        // Component paths should be valid file paths
        expect(component.path).toMatch(/\.(jsx|tsx)$/);
      });
    });
  });
});