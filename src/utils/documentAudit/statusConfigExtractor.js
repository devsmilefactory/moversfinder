/**
 * Status and Configuration Extractor
 * 
 * Extracts status constants and configuration objects from the codebase
 * to build accurate naming reference maps for documentation alignment.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Extract status constants from JavaScript files
 * @param {string} baseDir - Base directory to search from
 * @returns {Promise<Object>} Status mapping object
 */
export async function extractStatusConstants(baseDir = 'src') {
  const statusMap = {};
  
  try {
    // Extract from useRideStatus hook
    const rideStatusPath = path.join(baseDir, 'hooks/useRideStatus.js');
    const rideStatusContent = await fs.readFile(rideStatusPath, 'utf-8');
    
    // Extract RIDE_STATUSES constants
    const rideStatusesMatch = rideStatusContent.match(/export const RIDE_STATUSES = \{([^}]+)\}/s);
    if (rideStatusesMatch) {
      const statusesContent = rideStatusesMatch[1];
      const statusLines = statusesContent.split('\n').filter(line => line.includes(':'));
      
      statusLines.forEach(line => {
        const match = line.match(/(\w+):\s*['"`]([^'"`]+)['"`]/);
        if (match) {
          const [, constantName, statusValue] = match;
          statusMap[`RIDE_STATUSES.${constantName}`] = {
            actualStatus: statusValue,
            source: 'constant_file',
            filePath: 'src/hooks/useRideStatus.js',
            constantName: `RIDE_STATUSES.${constantName}`
          };
        }
      });
    }
    
    // Extract from driverRidesApi service
    const driverApiPath = path.join(baseDir, 'services/driverRidesApi.js');
    const driverApiContent = await fs.readFile(driverApiPath, 'utf-8');
    
    // Extract STATUS_GROUP_TO_FEED_CATEGORY mapping
    const feedCategoryMatch = driverApiContent.match(/const STATUS_GROUP_TO_FEED_CATEGORY = \{([^}]+)\}/s);
    if (feedCategoryMatch) {
      const categoryContent = feedCategoryMatch[1];
      const categoryLines = categoryContent.split('\n').filter(line => line.includes(':'));
      
      categoryLines.forEach(line => {
        const match = line.match(/['"`](\w+)['"`]:\s*['"`]([^'"`]+)['"`]/);
        if (match) {
          const [, statusGroup, feedCategory] = match;
          statusMap[statusGroup] = {
            actualStatus: feedCategory,
            source: 'constant_file',
            filePath: 'src/services/driverRidesApi.js',
            constantName: `STATUS_GROUP_TO_FEED_CATEGORY.${statusGroup}`
          };
        }
      });
    }
    
    // Extract from passengerRidesApi service
    const passengerApiPath = path.join(baseDir, 'services/passengerRidesApi.js');
    const passengerApiContent = await fs.readFile(passengerApiPath, 'utf-8');
    
    // Extract STATUS_GROUP_TO_FEED_CATEGORY mapping
    const passengerFeedMatch = passengerApiContent.match(/const STATUS_GROUP_TO_FEED_CATEGORY = \{([^}]+)\}/s);
    if (passengerFeedMatch) {
      const categoryContent = passengerFeedMatch[1];
      const categoryLines = categoryContent.split('\n').filter(line => line.includes(':'));
      
      categoryLines.forEach(line => {
        const match = line.match(/['"`](\w+)['"`]:\s*['"`]([^'"`]+)['"`]/);
        if (match) {
          const [, statusGroup, feedCategory] = match;
          // Use passenger prefix to distinguish from driver mappings
          statusMap[`PASSENGER_${statusGroup}`] = {
            actualStatus: feedCategory,
            source: 'constant_file',
            filePath: 'src/services/passengerRidesApi.js',
            constantName: `STATUS_GROUP_TO_FEED_CATEGORY.${statusGroup}`
          };
        }
      });
    }
    
    // Extract common status values from various files
    const commonStatuses = [
      'pending', 'accepted', 'in_progress', 'completed', 'cancelled',
      'active', 'paused', 'available', 'my_bids', 'bid'
    ];
    
    commonStatuses.forEach(status => {
      if (!statusMap[status]) {
        statusMap[status] = {
          actualStatus: status,
          source: 'common_status',
          filePath: 'multiple_files',
          constantName: status
        };
      }
    });
    
    return statusMap;
    
  } catch (error) {
    console.error('Error extracting status constants:', error);
    return {};
  }
}

/**
 * Extract configuration objects from config files
 * @param {string} configDir - Configuration directory path
 * @returns {Promise<Object>} Configuration mapping object
 */
export async function extractConfigurationObjects(configDir = 'src/config') {
  const configMap = {};
  
  try {
    // Extract SERVICE_TYPE_CONFIG
    const serviceTypesPath = path.join(configDir, 'serviceTypes.js');
    const serviceTypesContent = await fs.readFile(serviceTypesPath, 'utf-8');
    
    // Extract the main config object
    const serviceConfigMatch = serviceTypesContent.match(/export const SERVICE_TYPE_CONFIG = \{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    if (serviceConfigMatch) {
      const configContent = serviceConfigMatch[1];
      
      // Parse service type keys
      const serviceTypes = {};
      const serviceTypeMatches = configContent.matchAll(/(\w+):\s*\{([^}]+)\}/g);
      
      for (const match of serviceTypeMatches) {
        const [, serviceKey, serviceProps] = match;
        
        // Extract properties
        const iconMatch = serviceProps.match(/icon:\s*(\w+)/);
        const labelMatch = serviceProps.match(/label:\s*['"`]([^'"`]+)['"`]/);
        const colorMatch = serviceProps.match(/color:\s*['"`]([^'"`]+)['"`]/);
        
        serviceTypes[serviceKey] = {
          icon: iconMatch ? iconMatch[1] : null,
          label: labelMatch ? labelMatch[1] : null,
          color: colorMatch ? colorMatch[1] : null
        };
      }
      
      configMap['SERVICE_TYPE_CONFIG'] = {
        actualConfig: 'SERVICE_TYPE_CONFIG',
        filePath: 'src/config/serviceTypes.js',
        structure: serviceTypes,
        exists: true
      };
    }
    
    // Extract RIDE_TIMING_CONFIG
    const rideTimingPath = path.join(configDir, 'rideTiming.js');
    const rideTimingContent = await fs.readFile(rideTimingPath, 'utf-8');
    
    const timingConfigMatch = rideTimingContent.match(/export const RIDE_TIMING_CONFIG = \{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    if (timingConfigMatch) {
      const configContent = timingConfigMatch[1];
      
      // Parse timing type keys
      const timingTypes = {};
      const timingTypeMatches = configContent.matchAll(/(\w+):\s*\{([^}]+)\}/g);
      
      for (const match of timingTypeMatches) {
        const [, timingKey, timingProps] = match;
        
        // Extract properties
        const iconMatch = timingProps.match(/icon:\s*(\w+)/);
        const labelMatch = timingProps.match(/label:\s*['"`]([^'"`]+)['"`]/);
        const colorMatch = timingProps.match(/color:\s*['"`]([^'"`]+)['"`]/);
        
        timingTypes[timingKey] = {
          icon: iconMatch ? iconMatch[1] : null,
          label: labelMatch ? labelMatch[1] : null,
          color: colorMatch ? colorMatch[1] : null
        };
      }
      
      configMap['RIDE_TIMING_CONFIG'] = {
        actualConfig: 'RIDE_TIMING_CONFIG',
        filePath: 'src/config/rideTiming.js',
        structure: timingTypes,
        exists: true
      };
    }
    
    // Extract profileAvailability config
    const profileAvailPath = path.join(configDir, 'profileAvailability.js');
    const profileAvailContent = await fs.readFile(profileAvailPath, 'utf-8');
    
    const profileConfigMatch = profileAvailContent.match(/export const profileAvailability = \{([^}]+)\}/s);
    if (profileConfigMatch) {
      const configContent = profileConfigMatch[1];
      
      // Parse profile availability
      const profileTypes = {};
      const profileMatches = configContent.matchAll(/(\w+):\s*['"`]([^'"`]+)['"`]/g);
      
      for (const match of profileMatches) {
        const [, profileType, availability] = match;
        profileTypes[profileType] = availability;
      }
      
      configMap['profileAvailability'] = {
        actualConfig: 'profileAvailability',
        filePath: 'src/config/profileAvailability.js',
        structure: profileTypes,
        exists: true
      };
    }
    
    return configMap;
    
  } catch (error) {
    console.error('Error extracting configuration objects:', error);
    return {};
  }
}

/**
 * Build comprehensive status and configuration naming reference maps
 * @param {string} baseDir - Base directory for source files
 * @returns {Promise<Object>} Combined naming maps
 */
export async function buildStatusConfigNamingMaps(baseDir = 'src') {
  try {
    const [statusMap, configMap] = await Promise.all([
      extractStatusConstants(baseDir),
      extractConfigurationObjects(path.join(baseDir, 'config'))
    ]);
    
    return {
      statusConstants: statusMap,
      configurations: configMap,
      summary: {
        statusConstantsCount: Object.keys(statusMap).length,
        configurationsCount: Object.keys(configMap).length,
        extractedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Error building status and config naming maps:', error);
    return {
      statusConstants: {},
      configurations: {},
      summary: {
        statusConstantsCount: 0,
        configurationsCount: 0,
        extractedAt: new Date().toISOString(),
        error: error.message
      }
    };
  }
}

/**
 * Validate status reference against extracted constants
 * @param {string} statusReference - Status reference from documentation
 * @param {Object} statusMap - Extracted status constants map
 * @returns {Object} Validation result
 */
export function validateStatusReference(statusReference, statusMap) {
  const normalizedRef = statusReference.trim();
  
  if (statusMap[normalizedRef]) {
    return {
      isValid: true,
      actualStatus: statusMap[normalizedRef].actualStatus,
      source: statusMap[normalizedRef].source,
      filePath: statusMap[normalizedRef].filePath
    };
  }
  
  // Check for partial matches or common variations
  const possibleMatches = Object.keys(statusMap).filter(key => 
    key.toLowerCase().includes(normalizedRef.toLowerCase()) ||
    statusMap[key].actualStatus.toLowerCase().includes(normalizedRef.toLowerCase())
  );
  
  return {
    isValid: false,
    actualStatus: null,
    possibleMatches: possibleMatches.slice(0, 3), // Limit to 3 suggestions
    suggestion: possibleMatches.length > 0 ? possibleMatches[0] : null
  };
}

/**
 * Validate configuration reference against extracted configs
 * @param {string} configReference - Configuration reference from documentation
 * @param {Object} configMap - Extracted configuration map
 * @returns {Object} Validation result
 */
export function validateConfigReference(configReference, configMap) {
  const normalizedRef = configReference.trim();
  
  if (configMap[normalizedRef]) {
    return {
      isValid: true,
      actualConfig: configMap[normalizedRef].actualConfig,
      filePath: configMap[normalizedRef].filePath,
      structure: configMap[normalizedRef].structure
    };
  }
  
  // Check for partial matches
  const possibleMatches = Object.keys(configMap).filter(key => 
    key.toLowerCase().includes(normalizedRef.toLowerCase())
  );
  
  return {
    isValid: false,
    actualConfig: null,
    possibleMatches: possibleMatches.slice(0, 3),
    suggestion: possibleMatches.length > 0 ? possibleMatches[0] : null
  };
}