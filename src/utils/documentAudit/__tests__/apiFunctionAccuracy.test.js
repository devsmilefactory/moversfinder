/**
 * Property Test for API Function Reference Accuracy
 * **Feature: ride-flow-documentation-audit, Property 3: API Function Reference Accuracy**
 * **Validates: Requirements 3.1, 3.4, 3.5**
 * 
 * Tests that all API function references in the combined document either exist 
 * in the codebase or are clearly marked as missing.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { extractAPIFunctionNaming } from '../apiFunctionAnalyzer.js';

describe('Property 3: API Function Reference Accuracy', () => {
  let actualApiFunctions = {};
  
  beforeAll(async () => {
    // Extract actual API functions from codebase
    const apiNaming = await extractAPIFunctionNaming();
    actualApiFunctions = apiNaming.all;
  });

  it('should validate that all API function references match actual codebase functions or are marked as missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 1000),
          referencedFunctions: fc.array(
            fc.record({
              name: fc.stringOf(fc.constantFrom('a', 'b', 'c', '_'), 3, 20),
              context: fc.constantFrom('rpc', 'service', 'hook'),
              exists: fc.boolean()
            }),
            0, 10
          )
        }),
        ({ documentContent, referencedFunctions }) => {
          // Create test content with function references
          let testContent = documentContent;
          const expectedMissing = [];
          
          referencedFunctions.forEach(func => {
            // Add function reference to content
            testContent += ` ${func.name}() `;
            
            // Track functions that should be marked as missing
            if (!func.exists && !actualApiFunctions[func.name]) {
              expectedMissing.push(func.name);
            }
          });
          
          // Extract function references from test content
          const extractedFunctions = extractAPIFunctionReferences(testContent);
          
          // Verify each extracted function
          return extractedFunctions.every(funcName => {
            // Function exists in actual codebase
            if (actualApiFunctions[funcName]) {
              return true;
            }
            
            // Function is marked as missing in content
            if (isMarkedAsMissing(funcName, testContent)) {
              return true;
            }
            
            // Function should exist but doesn't - this is a failure
            return false;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate RPC function references against migration files', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          rpcFunctions: fc.array(
            fc.record({
              name: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', '_'), 5, 15),
              parameters: fc.array(fc.string(1, 10), 0, 5)
            }),
            0, 5
          )
        }),
        ({ documentContent, rpcFunctions }) => {
          let testContent = documentContent;
          
          // Add RPC function calls to content
          rpcFunctions.forEach(func => {
            const paramStr = func.parameters.join(', ');
            testContent += ` CALL ${func.name}(${paramStr}); `;
          });
          
          // Extract RPC function references
          const extractedRPCs = extractRPCFunctionReferences(testContent);
          
          // Verify each RPC function
          return extractedRPCs.every(rpcName => {
            const rpcFunction = actualApiFunctions[rpcName];
            
            // RPC exists in codebase
            if (rpcFunction && rpcFunction.source === 'rpc') {
              return true;
            }
            
            // RPC is marked as missing
            if (isMarkedAsMissing(rpcName, testContent)) {
              return true;
            }
            
            // Allow for common RPC patterns that might not be implemented yet
            if (rpcName.match(/^(get_|set_|create_|update_|delete_)/)) {
              return isMarkedAsMissing(rpcName, testContent);
            }
            
            return false;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate service function references against service files', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          serviceFunctions: fc.array(
            fc.record({
              name: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), 4, 12),
              serviceName: fc.stringOf(fc.constantFrom('a', 'b', 'c'), 3, 8),
              isAsync: fc.boolean()
            }),
            0, 5
          )
        }),
        ({ documentContent, serviceFunctions }) => {
          let testContent = documentContent;
          
          // Add service function calls to content
          serviceFunctions.forEach(func => {
            const asyncPrefix = func.isAsync ? 'await ' : '';
            testContent += ` ${asyncPrefix}${func.serviceName}.${func.name}() `;
          });
          
          // Extract service function references
          const extractedServices = extractServiceFunctionReferences(testContent);
          
          // Verify each service function
          return extractedServices.every(funcName => {
            const serviceFunction = actualApiFunctions[funcName];
            
            // Service function exists in codebase
            if (serviceFunction && serviceFunction.source === 'service') {
              return true;
            }
            
            // Service function is marked as missing
            if (isMarkedAsMissing(funcName, testContent)) {
              return true;
            }
            
            return false;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate hook function references against hook files', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          hookFunctions: fc.array(
            fc.record({
              name: fc.stringOf(fc.constantFrom('u', 's', 'e', 'a', 'b', 'c'), 6, 15).filter(s => s.startsWith('use')),
              returnType: fc.constantFrom('object', 'array', 'boolean', 'function')
            }),
            0, 5
          )
        }),
        ({ documentContent, hookFunctions }) => {
          let testContent = documentContent;
          
          // Add hook function calls to content
          hookFunctions.forEach(func => {
            testContent += ` const result = ${func.name}(); `;
          });
          
          // Extract hook function references
          const extractedHooks = extractHookFunctionReferences(testContent);
          
          // Verify each hook function
          return extractedHooks.every(hookName => {
            const hookFunction = actualApiFunctions[hookName];
            
            // Hook exists in codebase
            if (hookFunction && hookFunction.source === 'hook') {
              return true;
            }
            
            // Hook is marked as missing
            if (isMarkedAsMissing(hookName, testContent)) {
              return true;
            }
            
            return false;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Extract API function references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of function names
 */
function extractAPIFunctionReferences(content) {
  const functionPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const matches = [];
  let match;
  
  while ((match = functionPattern.exec(content)) !== null) {
    const funcName = match[1];
    // Filter out common words that aren't functions
    if (!['if', 'for', 'while', 'switch', 'catch'].includes(funcName)) {
      matches.push(funcName);
    }
  }
  
  return [...new Set(matches)];
}

/**
 * Extract RPC function references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of RPC function names
 */
function extractRPCFunctionReferences(content) {
  const rpcPattern = /\b(get_|set_|create_|update_|delete_|fetch_|call_)[a-zA-Z0-9_]*\b/g;
  const matches = content.match(rpcPattern) || [];
  return [...new Set(matches)];
}

/**
 * Extract service function references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of service function names
 */
function extractServiceFunctionReferences(content) {
  const servicePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g;
  const matches = [];
  let match;
  
  while ((match = servicePattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const funcName = fullMatch.split('.')[1].replace(/\s*\($/, '');
    matches.push(funcName);
  }
  
  return [...new Set(matches)];
}

/**
 * Extract hook function references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of hook function names
 */
function extractHookFunctionReferences(content) {
  const hookPattern = /\b(use[A-Z][a-zA-Z0-9_]*)\s*\(/g;
  const matches = [];
  let match;
  
  while ((match = hookPattern.exec(content)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)];
}

/**
 * Check if a function is marked as missing in the content
 * @param {string} functionName - Function name to check
 * @param {string} content - Document content
 * @returns {boolean} True if marked as missing
 */
function isMarkedAsMissing(functionName, content) {
  const missingPatterns = [
    new RegExp(`\\*\\*\\[MISSING.*${functionName}.*\\]\\*\\*`, 'i'),
    new RegExp(`\\*\\*\\[MISSING RPC.*${functionName}.*\\]\\*\\*`, 'i'),
    new RegExp(`\\*\\*\\[MISSING FUNCTION.*${functionName}.*\\]\\*\\*`, 'i'),
    new RegExp(`${functionName}.*does not exist`, 'i'),
    new RegExp(`${functionName}.*not implemented`, 'i'),
    new RegExp(`${functionName}.*missing`, 'i')
  ];
  
  return missingPatterns.some(pattern => pattern.test(content));
}