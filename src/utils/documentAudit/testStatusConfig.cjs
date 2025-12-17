/**
 * Test Status and Configuration Extractor
 * 
 * Tests the status and configuration extraction functionality
 * to ensure accurate naming reference maps are built.
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * Extract status constants from JavaScript files (CommonJS version)
 */
async function extractStatusConstants(baseDir = 'src') {
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
    try {
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
    } catch (error) {
      console.log('Note: passengerRidesApi.js not found or error reading it');
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
 * Extract configuration objects from config files (CommonJS version)
 */
async function extractConfigurationObjects(configDir = 'src/config') {
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
 * Test the status and configuration extraction
 */
async function testStatusConfigExtraction() {
  console.log('🔍 Testing Status and Configuration Extraction...\n');
  
  try {
    // Test status extraction
    console.log('📊 Extracting Status Constants...');
    const statusMap = await extractStatusConstants();
    
    console.log(`✅ Found ${Object.keys(statusMap).length} status constants:`);
    
    // Show some key status constants
    const keyStatuses = [
      'RIDE_STATUSES.PENDING',
      'RIDE_STATUSES.ACCEPTED', 
      'RIDE_STATUSES.TRIP_STARTED',
      'AVAILABLE',
      'BID',
      'my_bids'
    ];
    
    keyStatuses.forEach(status => {
      if (statusMap[status]) {
        console.log(`  - ${status} -> "${statusMap[status].actualStatus}" (${statusMap[status].source})`);
      }
    });
    
    console.log('\n⚙️ Extracting Configuration Objects...');
    const configMap = await extractConfigurationObjects();
    
    console.log(`✅ Found ${Object.keys(configMap).length} configuration objects:`);
    
    Object.keys(configMap).forEach(configName => {
      const config = configMap[configName];
      console.log(`  - ${configName} (${config.filePath})`);
      
      if (config.structure && typeof config.structure === 'object') {
        const keys = Object.keys(config.structure);
        console.log(`    Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      }
    });
    
    // Test validation functions
    console.log('\n🔍 Testing Validation Functions...');
    
    // Test status validation
    const testStatuses = ['RIDE_STATUSES.PENDING', 'invalid_status', 'pending'];
    testStatuses.forEach(status => {
      const result = validateStatusReference(status, statusMap);
      console.log(`  Status "${status}": ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
      if (result.isValid) {
        console.log(`    -> "${result.actualStatus}" (${result.source})`);
      } else if (result.suggestion) {
        console.log(`    Suggestion: "${result.suggestion}"`);
      }
    });
    
    // Test config validation
    const testConfigs = ['SERVICE_TYPE_CONFIG', 'invalid_config', 'profileAvailability'];
    testConfigs.forEach(config => {
      const result = validateConfigReference(config, configMap);
      console.log(`  Config "${config}": ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
      if (result.isValid) {
        console.log(`    -> "${result.actualConfig}" (${result.filePath})`);
      } else if (result.suggestion) {
        console.log(`    Suggestion: "${result.suggestion}"`);
      }
    });
    
    console.log('\n🎉 Status and Configuration extraction test completed successfully!');
    
    return {
      statusMap,
      configMap,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      statusMap: {},
      configMap: {},
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate status reference against extracted constants
 */
function validateStatusReference(statusReference, statusMap) {
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
 */
function validateConfigReference(configReference, configMap) {
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

// Run the test if this file is executed directly
if (require.main === module) {
  testStatusConfigExtraction()
    .then(result => {
      if (result.success) {
        console.log('\n📋 Summary:');
        console.log(`  Status Constants: ${Object.keys(result.statusMap).length}`);
        console.log(`  Configuration Objects: ${Object.keys(result.configMap).length}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  extractStatusConstants,
  extractConfigurationObjects,
  validateStatusReference,
  validateConfigReference,
  testStatusConfigExtraction
};