/**
 * Property-based test for hook and service reference accuracy
 * 
 * **Feature: ride-flow-documentation-audit, Property 6: Hook and Service Reference Accuracy**
 * **Validates: Requirements 6.1, 6.4, 6.5**
 * 
 * This test verifies that all hook and service references in documentation
 * correspond to actual hook files and service functions in the codebase.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { 
  buildHookServiceNamingMaps,
  validateHookReference,
  validateServiceReference,
  validateServiceFunction
} from '../hookServiceAnalyzer.js';

// Helper functions for the property test
function extractHookReferences(documentContent) {
  if (!documentContent || typeof documentContent !== 'string') {
    return [];
  }

  const hookReferences = new Set();
  
  // Pattern 1: useHookName() pattern
  const useHookPattern = /use([A-Z][a-zA-Z0-9_]*)\s*\(/g;
  let match;
  while ((match = useHookPattern.exec(documentContent)) !== null) {
    hookReferences.add(`use${match[1]}`);
  }
  
  // Pattern 2: Hook imports
  const hookImportPattern = /import\s+(?:(\w+)|(?:\{([^}]+)\}))\s+from\s+['"][^'"]*\/hooks\/[^'"]*['"]/g;
  while ((match = hookImportPattern.exec(documentContent)) !== null) {
    if (match[1]) {
      hookReferences.add(match[1]);
    }
    if (match[2]) {
      const namedImports = match[2].split(',').map(name => name.trim());
      namedImports.forEach(name => {
        if (/^use/.test(name)) {
          hookReferences.add(name);
        }
      });
    }
  }
  
  // Pattern 3: Hook file references
  const hookFilePattern = /hooks\/(use[A-Z][a-zA-Z0-9_]*\.js)/g;
  while ((match = hookFilePattern.exec(documentContent)) !== null) {
    const hookName = match[1].replace(/\.js$/, '');
    hookReferences.add(hookName);
  }
  
  // Pattern 4: Hook mentions in documentation
  const hookMentionPattern = /\b(use[A-Z][a-zA-Z0-9_]*)\b/g;
  while ((match = hookMentionPattern.exec(documentContent)) !== null) {
    hookReferences.add(match[1]);
  }
  
  return Array.from(hookReferences);
}

function extractServiceReferences(documentContent) {
  if (!documentContent || typeof documentContent !== 'string') {
    return [];
  }

  const serviceReferences = new Set();
  
  // Pattern 1: Service imports
  const serviceImportPattern = /import\s+(?:(\w+)|(?:\{([^}]+)\}))\s+from\s+['"][^'"]*\/services\/[^'"]*['"]/g;
  let match;
  while ((match = serviceImportPattern.exec(documentContent)) !== null) {
    if (match[1]) {
      serviceReferences.add(match[1]);
    }
    if (match[2]) {
      const namedImports = match[2].split(',').map(name => name.trim());
      namedImports.forEach(name => {
        serviceReferences.add(name);
      });
    }
  }
  
  // Pattern 2: Service file references
  const serviceFilePattern = /services\/([a-zA-Z][a-zA-Z0-9_]*\.js)/g;
  while ((match = serviceFilePattern.exec(documentContent)) !== null) {
    const serviceName = match[1].replace(/\.js$/, '');
    serviceReferences.add(serviceName);
  }
  
  // Pattern 3: Service function calls (serviceName.functionName)
  const serviceFunctionPattern = /([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z][a-zA-Z0-9_]*)\s*\(/g;
  while ((match = serviceFunctionPattern.exec(documentContent)) !== null) {
    serviceReferences.add(match[1]);
    // Also track the function name
    serviceReferences.add(`${match[1]}.${match[2]}`);
  }
  
  // Pattern 4: Service mentions in documentation
  const serviceMentionPattern = /\b([a-zA-Z][a-zA-Z0-9_]*(?:Service|Api|Client))\b/g;
  while ((match = serviceMentionPattern.exec(documentContent)) !== null) {
    serviceReferences.add(match[1]);
  }
  
  return Array.from(serviceReferences);
}

function isMarkedAsMissing(reference, documentContent) {
  if (!documentContent || typeof documentContent !== 'string' || !reference) {
    return false;
  }
  
  // Check for various ways a hook or service might be marked as missing
  const missingPatterns = [
    new RegExp(`${reference}.*(?:missing|not found|does not exist|undefined|TODO|FIXME)`, 'i'),
    new RegExp(`(?:missing|not found|does not exist|undefined|TODO|FIXME).*${reference}`, 'i'),
    new RegExp(`\\[MISSING\\].*${reference}`, 'i'),
    new RegExp(`${reference}.*\\[MISSING\\]`, 'i'),
    new RegExp(`// TODO.*${reference}`, 'i'),
    new RegExp(`<!-- TODO.*${reference}`, 'i')
  ];
  
  return missingPatterns.some(pattern => pattern.test(documentContent));
}

describe('Hook and Service Reference Accuracy Property Test', () => {
  let actualHooks;
  let actualServices;
  
  beforeAll(async () => {
    // Extract actual hook and service information from the codebase
    const namingMaps = await buildHookServiceNamingMaps();
    actualHooks = namingMaps.hooks;
    actualServices = namingMaps.services;
  });

  describe('Property 6: Hook and Service Reference Accuracy', () => {
    /**
     * **Feature: ride-flow-documentation-audit, Property 6: Hook and Service Reference Accuracy**
     * **Validates: Requirements 6.1, 6.4, 6.5**
     * 
     * For any hook or service reference in documentation, the reference should 
     * correspond to an actual hook file or service function in the codebase or be marked as missing.
     */
    test('all hook references should correspond to actual hook files', () => {
      fc.assert(
        fc.property(
          fc.record({
            documentContent: fc.oneof(
              // Generate content with actual hook names
              fc.record({
                hooks: fc.shuffledSubarray(Object.keys(actualHooks), { minLength: 1, maxLength: 3 }),
                template: fc.constantFrom(
                  'The {hook} hook manages state',
                  'Import {hook} from hooks directory',
                  'Use {hook}() in your component',
                  'The {hook}.js file contains the hook implementation',
                  'Missing: [MISSING] {hook} needs to be created'
                )
              }).map(({ hooks, template }) => {
                const hook = hooks[0] || 'useTestHook';
                return template.replace(/{hook}/g, hook);
              }),
              // Generate content with missing hook markers
              fc.record({
                hook: fc.string({ minLength: 7, maxLength: 20 }).filter(s => 
                  /^use[A-Z][a-zA-Z0-9_]*$/.test(s) && 
                  !actualHooks[s]
                ),
                marker: fc.constantFrom('[MISSING]', 'TODO:', 'FIXME:', '// TODO', '<!-- TODO')
              }).map(({ hook, marker }) => `${marker} ${hook} hook needs implementation`),
              // Generate safe content with no hook references
              fc.constantFrom(
                'This documentation describes the system architecture.',
                'The database schema includes tables for users and rides.',
                'API endpoints handle authentication and data retrieval.'
              )
            )
          }),
          ({ documentContent }) => {
            const extractedHooks = extractHookReferences(documentContent);
            
            return extractedHooks.every(hookName => {
              // Hook exists in actual codebase
              if (actualHooks[hookName]) {
                return true;
              }
              
              // Hook is marked as missing in content
              if (isMarkedAsMissing(hookName, documentContent)) {
                return true;
              }
              
              // Hook reference might be a false positive (not a real hook reference)
              // Allow if it's not clearly a hook pattern
              if (!/^use[A-Z]/.test(hookName)) {
                return true;
              }
              
              // Hook should exist but doesn't - this is a failure
              return false;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('all service references should correspond to actual service files', () => {
      fc.assert(
        fc.property(
          fc.record({
            documentContent: fc.oneof(
              // Generate content with actual service names
              fc.record({
                services: fc.shuffledSubarray(Object.keys(actualServices), { minLength: 1, maxLength: 3 }),
                template: fc.constantFrom(
                  'The {service} service handles API calls',
                  'Import {service} from services directory',
                  'Use {service}.functionName() to call the API',
                  'The {service}.js file contains the service implementation',
                  'Missing: [MISSING] {service} needs to be created'
                )
              }).map(({ services, template }) => {
                const service = services[0] || 'testService';
                return template.replace(/{service}/g, service);
              }),
              // Generate content with missing service markers
              fc.record({
                service: fc.string({ minLength: 5, maxLength: 20 }).filter(s => 
                  /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s) && 
                  !actualServices[s]
                ),
                marker: fc.constantFrom('[MISSING]', 'TODO:', 'FIXME:', '// TODO', '<!-- TODO')
              }).map(({ service, marker }) => `${marker} ${service} service needs implementation`),
              // Generate safe content with no service references
              fc.constantFrom(
                'This documentation describes the system architecture.',
                'The database schema includes tables for users and rides.',
                'Components handle user interface interactions.'
              )
            )
          }),
          ({ documentContent }) => {
            const extractedServices = extractServiceReferences(documentContent);
            
            return extractedServices.every(serviceRef => {
              // Check if it's a service.function reference
              if (serviceRef.includes('.')) {
                const [serviceName, functionName] = serviceRef.split('.');
                
                // Service exists
                if (actualServices[serviceName]) {
                  const service = actualServices[serviceName];
                  const functionExists = service.exportedFunctions?.some(
                    func => func.name === functionName
                  );
                  
                  // Function exists in service
                  if (functionExists) {
                    return true;
                  }
                  
                  // Function is marked as missing
                  if (isMarkedAsMissing(serviceRef, documentContent)) {
                    return true;
                  }
                  
                  // Function should exist but doesn't
                  return false;
                }
                
                // Service doesn't exist but is marked as missing
                if (isMarkedAsMissing(serviceName, documentContent)) {
                  return true;
                }
                
                return false;
              }
              
              // It's just a service name
              // Service exists in actual codebase
              if (actualServices[serviceRef]) {
                return true;
              }
              
              // Service is marked as missing in content
              if (isMarkedAsMissing(serviceRef, documentContent)) {
                return true;
              }
              
              // Service reference might be a false positive
              // Allow if it's not clearly a service pattern
              if (!/[a-zA-Z][a-zA-Z0-9_]*(?:Service|Api|Client)$/.test(serviceRef)) {
                return true;
              }
              
              // Service should exist but doesn't - this is a failure
              return false;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate hook references against actual codebase', async () => {
      const testHooks = Object.keys(actualHooks).slice(0, 5);
      
      for (const hookName of testHooks) {
        const validation = validateHookReference(hookName, actualHooks);
        expect(validation.isValid).toBe(true);
        expect(validation.actualName).toBe(hookName);
        expect(validation.filePath).toBeDefined();
      }
    });

    test('should validate service references against actual codebase', async () => {
      const testServices = Object.keys(actualServices).slice(0, 5);
      
      for (const serviceName of testServices) {
        const validation = validateServiceReference(serviceName, actualServices);
        expect(validation.isValid).toBe(true);
        expect(validation.actualName).toBe(serviceName);
        expect(validation.filePath).toBeDefined();
      }
    });

    test('should validate service function references', async () => {
      const testServices = Object.keys(actualServices).slice(0, 3);
      
      for (const serviceName of testServices) {
        const service = actualServices[serviceName];
        if (service.exportedFunctions && service.exportedFunctions.length > 0) {
          const functionName = service.exportedFunctions[0].name;
          const validation = validateServiceFunction(functionName, serviceName, actualServices);
          expect(validation.isValid).toBe(true);
          expect(validation.actualName).toBe(functionName);
          expect(validation.serviceName).toBe(serviceName);
        }
      }
    });
  });
});
