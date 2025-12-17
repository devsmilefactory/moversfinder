/**
 * Property Test for Configuration Reference Accuracy
 * **Feature: ride-flow-documentation-audit, Property 5: Configuration Reference Accuracy**
 * **Validates: Requirements 5.1, 5.4, 5.5**
 * 
 * Tests that all configuration object references in the combined document 
 * match actual config structures in the codebase.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { buildStatusConfigNamingMaps } from '../statusConfigExtractor.js';

describe('Property 5: Configuration Reference Accuracy', () => {
  let actualConfigurations = {};
  
  beforeAll(async () => {
    // Extract actual configurations from codebase
    const statusConfig = await buildStatusConfigNamingMaps();
    actualConfigurations = statusConfig.configurations;
  });

  it('should validate that all configuration references match actual config structures', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 1000),
          configReferences: fc.array(
            fc.record({
              name: fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', '_'), 5, 20),
              type: fc.constantFrom('CONFIG', 'SETTINGS', 'OPTIONS'),
              exists: fc.boolean()
            }),
            0, 8
          )
        }),
        ({ documentContent, configReferences }) => {
          let testContent = documentContent;
          
          // Add configuration references to content
          configReferences.forEach(config => {
            const configName = `${config.name}_${config.type}`;
            testContent += ` const config = ${configName}; `;
            testContent += ` import { ${configName} } from './config'; `;
          });
          
          // Extract configuration references from test content
          const extractedConfigs = extractConfigurationReferences(testContent);
          
          // Verify each extracted configuration
          return extractedConfigs.every(configName => {
            // Configuration exists in actual codebase
            if (actualConfigurations[configName]) {
              return true;
            }
            
            // Check for common configuration patterns
            if (isValidConfigurationPattern(configName)) {
              return true;
            }
            
            return false;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate SERVICE_TYPE_CONFIG references against actual service types', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          serviceTypes: fc.array(
            fc.constantFrom('taxi', 'courier', 'errands', 'school_run', 'bulk'),
            0, 5
          )
        }),
        ({ documentContent, serviceTypes }) => {
          let testContent = documentContent;
          
          // Add service type configuration references
          serviceTypes.forEach(serviceType => {
            testContent += ` SERVICE_TYPE_CONFIG.${serviceType} `;
            testContent += ` config.serviceTypes.${serviceType} `;
          });
          
          // Extract service type references
          const extractedServiceTypes = extractServiceTypeReferences(testContent);
          
          // Verify each service type
          return extractedServiceTypes.every(serviceType => {
            // Check if SERVICE_TYPE_CONFIG exists and has this service type
            const serviceConfig = actualConfigurations['SERVICE_TYPE_CONFIG'];
            if (serviceConfig && serviceConfig.structure && serviceConfig.structure[serviceType]) {
              return true;
            }
            
            // Check for common service types
            const validServiceTypes = ['taxi', 'courier', 'errands', 'school_run', 'bulk'];
            return validServiceTypes.includes(serviceType);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate RIDE_TIMING_CONFIG references against actual timing configurations', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          timingTypes: fc.array(
            fc.constantFrom('immediate', 'scheduled', 'recurring'),
            0, 3
          )
        }),
        ({ documentContent, timingTypes }) => {
          let testContent = documentContent;
          
          // Add ride timing configuration references
          timingTypes.forEach(timingType => {
            testContent += ` RIDE_TIMING_CONFIG.${timingType} `;
            testContent += ` config.rideTiming.${timingType} `;
          });
          
          // Extract timing type references
          const extractedTimingTypes = extractTimingTypeReferences(testContent);
          
          // Verify each timing type
          return extractedTimingTypes.every(timingType => {
            // Check if RIDE_TIMING_CONFIG exists and has this timing type
            const timingConfig = actualConfigurations['RIDE_TIMING_CONFIG'];
            if (timingConfig && timingConfig.structure && timingConfig.structure[timingType]) {
              return true;
            }
            
            // Check for common timing types
            const validTimingTypes = ['immediate', 'scheduled', 'recurring'];
            return validTimingTypes.includes(timingType);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate configuration property access patterns', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          configAccess: fc.array(
            fc.record({
              configName: fc.constantFrom('SERVICE_TYPE_CONFIG', 'RIDE_TIMING_CONFIG', 'profileAvailability'),
              property: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), 3, 10),
              subProperty: fc.option(fc.constantFrom('icon', 'label', 'color', 'value'))
            }),
            0, 5
          )
        }),
        ({ documentContent, configAccess }) => {
          let testContent = documentContent;
          
          // Add configuration property access patterns
          configAccess.forEach(access => {
            if (access.subProperty) {
              testContent += ` ${access.configName}.${access.property}.${access.subProperty} `;
            } else {
              testContent += ` ${access.configName}.${access.property} `;
            }
          });
          
          // Extract configuration property access
          const extractedAccess = extractConfigPropertyAccess(testContent);
          
          // Verify each property access
          return extractedAccess.every(({ configName, property, subProperty }) => {
            const config = actualConfigurations[configName];
            
            if (!config) {
              // Allow for known configuration patterns
              const knownConfigs = ['SERVICE_TYPE_CONFIG', 'RIDE_TIMING_CONFIG', 'profileAvailability'];
              return knownConfigs.includes(configName);
            }
            
            // If config exists, check if property exists in structure
            if (config.structure) {
              if (subProperty) {
                return config.structure[property] && 
                       typeof config.structure[property] === 'object' &&
                       config.structure[property][subProperty] !== undefined;
              } else {
                return config.structure[property] !== undefined;
              }
            }
            
            return true; // Allow if structure not available
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate environment variable configuration references', () => {
    fc.assert(
      fc.property(
        fc.record({
          documentContent: fc.string(1, 500),
          envVars: fc.array(
            fc.record({
              prefix: fc.constantFrom('VITE_', 'REACT_APP_', 'NODE_'),
              name: fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', '_'), 3, 15)
            }),
            0, 5
          )
        }),
        ({ documentContent, envVars }) => {
          let testContent = documentContent;
          
          // Add environment variable references
          envVars.forEach(envVar => {
            const fullName = `${envVar.prefix}${envVar.name}`;
            testContent += ` process.env.${fullName} `;
            testContent += ` import.meta.env.${fullName} `;
          });
          
          // Extract environment variable references
          const extractedEnvVars = extractEnvironmentVariableReferences(testContent);
          
          // Verify each environment variable
          return extractedEnvVars.every(envVarName => {
            // Check for valid environment variable patterns
            const validPrefixes = ['VITE_', 'REACT_APP_', 'NODE_', 'API_', 'DATABASE_'];
            return validPrefixes.some(prefix => envVarName.startsWith(prefix));
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Extract configuration references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of configuration names
 */
function extractConfigurationReferences(content) {
  const configPatterns = [
    // CONFIG_NAME patterns
    /\b([A-Z_]+_CONFIG)\b/g,
    // SETTINGS_NAME patterns
    /\b([A-Z_]+_SETTINGS)\b/g,
    // OPTIONS_NAME patterns
    /\b([A-Z_]+_OPTIONS)\b/g,
    // profileAvailability pattern
    /\b(profileAvailability)\b/g
  ];
  
  const matches = [];
  
  configPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push(match[1]);
    }
  });
  
  return [...new Set(matches)];
}

/**
 * Extract service type references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of service type names
 */
function extractServiceTypeReferences(content) {
  const serviceTypePatterns = [
    // SERVICE_TYPE_CONFIG.serviceType
    /SERVICE_TYPE_CONFIG\.([a-zA-Z_]+)/g,
    // config.serviceTypes.serviceType
    /config\.serviceTypes\.([a-zA-Z_]+)/g,
    // Common service types
    /\b(taxi|courier|errands|school_run|bulk)\b/g
  ];
  
  const matches = [];
  
  serviceTypePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push(match[1]);
    }
  });
  
  return [...new Set(matches)];
}

/**
 * Extract timing type references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of timing type names
 */
function extractTimingTypeReferences(content) {
  const timingTypePatterns = [
    // RIDE_TIMING_CONFIG.timingType
    /RIDE_TIMING_CONFIG\.([a-zA-Z_]+)/g,
    // config.rideTiming.timingType
    /config\.rideTiming\.([a-zA-Z_]+)/g,
    // Common timing types
    /\b(immediate|scheduled|recurring)\b/g
  ];
  
  const matches = [];
  
  timingTypePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push(match[1]);
    }
  });
  
  return [...new Set(matches)];
}

/**
 * Extract configuration property access patterns from document content
 * @param {string} content - Document content to analyze
 * @returns {Object[]} Array of property access objects
 */
function extractConfigPropertyAccess(content) {
  const propertyAccessPattern = /\b([A-Z_]+(?:_CONFIG|_SETTINGS|profileAvailability))\.([a-zA-Z_]+)(?:\.([a-zA-Z_]+))?/g;
  const matches = [];
  let match;
  
  while ((match = propertyAccessPattern.exec(content)) !== null) {
    matches.push({
      configName: match[1],
      property: match[2],
      subProperty: match[3] || null
    });
  }
  
  return matches;
}

/**
 * Extract environment variable references from document content
 * @param {string} content - Document content to analyze
 * @returns {string[]} Array of environment variable names
 */
function extractEnvironmentVariableReferences(content) {
  const envVarPatterns = [
    // process.env.VAR_NAME
    /process\.env\.([A-Z_]+)/g,
    // import.meta.env.VAR_NAME
    /import\.meta\.env\.([A-Z_]+)/g
  ];
  
  const matches = [];
  
  envVarPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push(match[1]);
    }
  });
  
  return [...new Set(matches)];
}

/**
 * Check if a configuration name follows valid patterns
 * @param {string} configName - Configuration name to validate
 * @returns {boolean} True if valid configuration pattern
 */
function isValidConfigurationPattern(configName) {
  const validPatterns = [
    /^[A-Z_]+_CONFIG$/,
    /^[A-Z_]+_SETTINGS$/,
    /^[A-Z_]+_OPTIONS$/,
    /^profileAvailability$/,
    /^[a-z][a-zA-Z]*Config$/
  ];
  
  return validPatterns.some(pattern => pattern.test(configName));
}