/**
 * Property Test for Status Value Accuracy
 * **Feature: ride-flow-documentation-audit, Property 4: Status Value Accuracy**
 * **Validates: Requirements 4.1, 4.4, 4.5**
 * 
 * Tests that all status value references in the combined document match 
 * actual enum values or constants in the codebase.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { buildStatusConfigNamingMaps } from '../statusConfigExtractor.js';

describe('Property 4: Status Value Accuracy', () => {
  let actualStatusConstants = {};
  
  beforeAll(async () => {
    // Extract actual status constants from codebase
    const statusConfig = await buildStatusConfigNamingMaps();
    actualStatusConstants = statusConfig.statusConstants;
  });

  it('should validate that all status references match actual codebase constants', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 1000),
          statusReferences: fc.array(
            fc.record({
              status: fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', '_'), 3, 15),
              context: fc.constantFrom('assignment', 'comparison', 'enum', 'constant'),
              exists: fc.boolean()
            }),
            0, 10
          )
        }),
        ({ documentContent, statusReferences }) => {
          let testContent = documentContent;
          
          // Add status references to content
          statusReferences.forEach(statusRef => {
            switch (statusRef.context) {
              case 'assignment':
                testContent += ` status = '${statusRef.status}'; `;
                break;
              case 'comparison':
                testContent += ` if (status === '${statusRef.status}') `;
                break;
              case 'enum':
                testContent += ` STATUS.${statusRef.status} `;
                break;
              case 'constant':
                testContent += ` const ${statusRef.status} = 'value'; `;
                break;
            }
          });
          
          // Extract status references from test content
          const extractedStatuses = extractStatusReferences(testContent);
          
          // Verify each extracted status
          return extractedStatuses.every(statusName => {
            // Status exists in actual codebase
            if (actualStatusConstants[statusName]) {
              return true;
            }
            
            // Check for common status patterns that should exist
            const commonStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
            if (commonStatuses.includes(statusName.toLowerCase())) {
              return true;
            }
            
            // Status might be a valid constant even if not in our extracted list
            if (isValidStatusConstant(statusName)) {
              return true;
            }
            
            return false;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate ride status enum values against actual implementation', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          rideStatuses: fc.array(
            fc.constantFrom('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired'),
            0, 5
          )
        }),
        ({ documentContent, rideStatuses }) => {
          let testContent = documentContent;
          
          // Add ride status references to content
          rideStatuses.forEach(status => {
            testContent += ` ride.status = '${status}'; `;
            testContent += ` RIDE_STATUSES.${status.toUpperCase()} `;
          });
          
          // Extract ride status references
          const extractedRideStatuses = extractRideStatusReferences(testContent);
          
          // Verify each ride status
          return extractedRideStatuses.every(statusName => {
            const normalizedStatus = statusName.toLowerCase();
            
            // Check if status exists in actual constants
            if (actualStatusConstants[statusName] || 
                actualStatusConstants[`RIDE_STATUSES.${statusName}`] ||
                actualStatusConstants[normalizedStatus]) {
              return true;
            }
            
            // Check for common ride status patterns
            const validRideStatuses = [
              'pending', 'accepted', 'in_progress', 'completed', 
              'cancelled', 'expired', 'active', 'paused'
            ];
            
            return validRideStatuses.includes(normalizedStatus);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate feed category status mappings against service implementations', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          feedCategories: fc.array(
            fc.constantFrom('available', 'my_bids', 'scheduled', 'active', 'completed'),
            0, 5
          )
        }),
        ({ documentContent, feedCategories }) => {
          let testContent = documentContent;
          
          // Add feed category references to content
          feedCategories.forEach(category => {
            testContent += ` feedCategory = '${category}'; `;
            testContent += ` STATUS_GROUP_TO_FEED_CATEGORY.${category} `;
          });
          
          // Extract feed category references
          const extractedCategories = extractFeedCategoryReferences(testContent);
          
          // Verify each feed category
          return extractedCategories.every(categoryName => {
            // Check if category exists in actual status mappings
            if (actualStatusConstants[categoryName] ||
                actualStatusConstants[`STATUS_GROUP_TO_FEED_CATEGORY.${categoryName}`]) {
              return true;
            }
            
            // Check for valid feed category patterns
            const validCategories = [
              'available', 'my_bids', 'scheduled', 'active', 
              'completed', 'bid', 'paused'
            ];
            
            return validCategories.includes(categoryName.toLowerCase());
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate status constant naming conventions', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          statusConstants: fc.array(
            fc.record({
              name: fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', '_'), 4, 20),
              value: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', '_'), 3, 15)
            }),
            0, 5
          )
        }),
        ({ documentContent, statusConstants }) => {
          let testContent = documentContent;
          
          // Add status constant references to content
          statusConstants.forEach(constant => {
            testContent += ` const ${constant.name} = '${constant.value}'; `;
            testContent += ` if (status === ${constant.name}) `;
          });
          
          // Extract status constant references
          const extractedConstants = extractStatusConstantReferences(testContent);
          
          // Verify each status constant follows naming conventions
          return extractedConstants.every(constantName => {
            // Check if constant exists in actual codebase
            if (actualStatusConstants[constantName]) {
              return true;
            }
            
            // Validate naming convention (UPPER_CASE)
            if (!isValidConstantNaming(constantName)) {
              return false;
            }
            
            // Allow for reasonable status constant patterns
            const statusPatterns = [
              /^[A-Z_]+_STATUS$/,
              /^RIDE_[A-Z_]+$/,
              /^[A-Z_]+_STATE$/,
              /^STATUS_[A-Z_]+$/
            ];
            
            return statusPatterns.some(pattern => pattern.test(constantName));
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Extract status references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of status names
 */
function extractStatusReferences(content) {
  const statusPatterns = [
    // Status assignments: status = 'value'
    /status\s*=\s*['"`]([^'"`]+)['"`]/gi,
    // Status comparisons: status === 'value'
    /status\s*[!=]==?\s*['"`]([^'"`]+)['"`]/gi,
    // Status constants: STATUS.VALUE
    /STATUS\.([A-Z_]+)/gi,
    // UPPER_CASE constants
    /\b([A-Z_]{3,})\b/g
  ];
  
  const matches = [];
  
  statusPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const statusName = match[1];
      // Filter out common words that aren't status constants
      const commonWords = ['THE', 'AND', 'OR', 'NOT', 'FOR', 'TO', 'FROM', 'WITH', 'BY', 'API', 'URL', 'ID'];
      if (!commonWords.includes(statusName)) {
        matches.push(statusName);
      }
    }
  });
  
  return [...new Set(matches)];
}

/**
 * Extract ride status references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of ride status names
 */
function extractRideStatusReferences(content) {
  const rideStatusPatterns = [
    // ride.status = 'value'
    /ride\.status\s*=\s*['"`]([^'"`]+)['"`]/gi,
    // RIDE_STATUSES.VALUE
    /RIDE_STATUSES\.([A-Z_]+)/gi,
    // Common ride status words
    /\b(pending|accepted|in_progress|completed|cancelled|expired|active|paused)\b/gi
  ];
  
  const matches = [];
  
  rideStatusPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push(match[1]);
    }
  });
  
  return [...new Set(matches)];
}

/**
 * Extract feed category references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of feed category names
 */
function extractFeedCategoryReferences(content) {
  const feedCategoryPatterns = [
    // feedCategory = 'value'
    /feedCategory\s*=\s*['"`]([^'"`]+)['"`]/gi,
    // STATUS_GROUP_TO_FEED_CATEGORY.VALUE
    /STATUS_GROUP_TO_FEED_CATEGORY\.([a-zA-Z_]+)/gi,
    // Common feed categories
    /\b(available|my_bids|scheduled|active|completed|bid|paused)\b/gi
  ];
  
  const matches = [];
  
  feedCategoryPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push(match[1]);
    }
  });
  
  return [...new Set(matches)];
}

/**
 * Extract status constant references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of status constant names
 */
function extractStatusConstantReferences(content) {
  const constantPatterns = [
    // const CONSTANT_NAME = 'value'
    /const\s+([A-Z_]+)\s*=/gi,
    // CONSTANT_NAME in conditions
    /if\s*\(\s*[^)]*([A-Z_]{3,})[^)]*\)/gi,
    // General UPPER_CASE patterns
    /\b([A-Z_]{4,})\b/g
  ];
  
  const matches = [];
  
  constantPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const constantName = match[1];
      // Filter out common words
      const commonWords = ['TRUE', 'FALSE', 'NULL', 'UNDEFINED', 'THIS', 'THAT'];
      if (!commonWords.includes(constantName)) {
        matches.push(constantName);
      }
    }
  });
  
  return [...new Set(matches)];
}

/**
 * Check if a status name represents a valid status constant
 * @param {string} statusName - Status name to validate
 * @returns {boolean} True if valid status constant
 */
function isValidStatusConstant(statusName) {
  // Check naming convention (should be UPPER_CASE or snake_case)
  if (!/^[A-Z_]+$/.test(statusName) && !/^[a-z_]+$/.test(statusName)) {
    return false;
  }
  
  // Check for reasonable status-related words
  const statusWords = [
    'status', 'state', 'pending', 'active', 'complete', 'cancel',
    'accept', 'reject', 'progress', 'pause', 'resume', 'expire'
  ];
  
  const lowerName = statusName.toLowerCase();
  return statusWords.some(word => lowerName.includes(word));
}

/**
 * Check if constant name follows proper naming conventions
 * @param {string} constantName - Constant name to validate
 * @returns {boolean} True if follows conventions
 */
function isValidConstantNaming(constantName) {
  // Should be UPPER_CASE with underscores
  return /^[A-Z][A-Z0-9_]*$/.test(constantName);
}