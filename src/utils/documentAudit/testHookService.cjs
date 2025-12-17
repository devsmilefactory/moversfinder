/**
 * Test Hook and Service Analyzer
 * 
 * Tests the hook and service extraction functionality
 * to ensure accurate naming reference maps are built.
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * Extract hook names and their signatures from hooks directory (CommonJS version)
 */
async function extractHookNames(hooksDir = 'src/hooks') {
  const hookMap = {};
  
  try {
    const files = await fs.readdir(hooksDir);
    const hookFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js');
    
    for (const file of hookFiles) {
      const filePath = path.join(hooksDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract hook name from filename (remove .js extension)
      const hookName = file.replace('.js', '');
      
      // Extract exported functions/hooks from the file
      const exportedFunctions = extractExportedFunctions(content);
      
      // Extract hook description from comments
      const description = extractHookDescription(content);
      
      hookMap[hookName] = {
        actualName: hookName,
        filePath: `src/hooks/${file}`,
        exists: true,
        exportedFunctions,
        description,
        isDefaultExport: content.includes('export default'),
        isNamedExport: content.includes(`export function ${hookName}`) || 
                      content.includes(`export const ${hookName}`)
      };
    }
    
    return hookMap;
    
  } catch (error) {
    console.error('Error extracting hook names:', error);
    return {};
  }
}

/**
 * Extract service function names from services directory (CommonJS version)
 */
async function extractServiceFunctions(servicesDir = 'src/services') {
  const serviceMap = {};
  
  try {
    const files = await fs.readdir(servicesDir);
    const serviceFiles = files.filter(file => file.endsWith('.js') && !file.includes('test'));
    
    for (const file of serviceFiles) {
      const filePath = path.join(servicesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract service name from filename (remove .js extension)
      const serviceName = file.replace('.js', '');
      
      // Extract exported functions from the service
      const exportedFunctions = extractExportedFunctions(content);
      
      // Extract service description from comments
      const description = extractServiceDescription(content);
      
      serviceMap[serviceName] = {
        actualName: serviceName,
        filePath: `src/services/${file}`,
        exists: true,
        exportedFunctions,
        description,
        functionCount: exportedFunctions.length
      };
    }
    
    return serviceMap;
    
  } catch (error) {
    console.error('Error extracting service functions:', error);
    return {};
  }
}

/**
 * Extract exported functions from JavaScript content
 */
function extractExportedFunctions(content) {
  const functions = [];
  
  // Match export function declarations
  const exportFunctionMatches = content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g);
  for (const match of exportFunctionMatches) {
    functions.push({
      name: match[1],
      type: 'function',
      isAsync: match[0].includes('async'),
      exportType: 'named'
    });
  }
  
  // Match export const/let/var declarations
  const exportConstMatches = content.matchAll(/export\s+const\s+(\w+)\s*=/g);
  for (const match of exportConstMatches) {
    functions.push({
      name: match[1],
      type: 'const',
      exportType: 'named'
    });
  }
  
  // Match default exports
  const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  if (defaultExportMatch) {
    functions.push({
      name: defaultExportMatch[1],
      type: 'function',
      exportType: 'default'
    });
  }
  
  // Match arrow function exports
  const arrowFunctionMatches = content.matchAll(/export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g);
  for (const match of arrowFunctionMatches) {
    functions.push({
      name: match[1],
      type: 'arrow_function',
      isAsync: match[0].includes('async'),
      exportType: 'named'
    });
  }
  
  return functions;
}

/**
 * Extract hook description from comments
 */
function extractHookDescription(content) {
  // Look for JSDoc style comments or block comments before hook definition
  const hookDescriptionMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)\s*\n\s*\*\s*\n\s*\*\s*([^*]+)\*\//);
  if (hookDescriptionMatch) {
    return hookDescriptionMatch[1].trim();
  }
  
  // Look for single line comments
  const singleLineMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)\s*Hook/);
  if (singleLineMatch) {
    return singleLineMatch[1].trim();
  }
  
  // Look for simple comment patterns
  const simpleCommentMatch = content.match(/\/\/\s*([^\n]+Hook[^\n]*)/);
  if (simpleCommentMatch) {
    return simpleCommentMatch[1].trim();
  }
  
  return null;
}

/**
 * Extract service description from comments
 */
function extractServiceDescription(content) {
  // Look for JSDoc style comments or block comments at the top
  const serviceDescriptionMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)\s*(?:API\s*)?Service/);
  if (serviceDescriptionMatch) {
    return serviceDescriptionMatch[1].trim();
  }
  
  // Look for single line comments
  const singleLineMatch = content.match(/\/\/\s*([^\n]+Service[^\n]*)/);
  if (singleLineMatch) {
    return singleLineMatch[1].trim();
  }
  
  return null;
}

/**
 * Validate hook reference against extracted hooks
 */
function validateHookReference(hookReference, hookMap) {
  const normalizedRef = hookReference.trim();
  
  if (hookMap[normalizedRef]) {
    return {
      isValid: true,
      actualName: hookMap[normalizedRef].actualName,
      filePath: hookMap[normalizedRef].filePath,
      description: hookMap[normalizedRef].description,
      exportedFunctions: hookMap[normalizedRef].exportedFunctions
    };
  }
  
  // Check for partial matches
  const possibleMatches = Object.keys(hookMap).filter(key => 
    key.toLowerCase().includes(normalizedRef.toLowerCase()) ||
    normalizedRef.toLowerCase().includes(key.toLowerCase())
  );
  
  return {
    isValid: false,
    actualName: null,
    possibleMatches: possibleMatches.slice(0, 3),
    suggestion: possibleMatches.length > 0 ? possibleMatches[0] : null
  };
}

/**
 * Validate service reference against extracted services
 */
function validateServiceReference(serviceReference, serviceMap) {
  const normalizedRef = serviceReference.trim();
  
  if (serviceMap[normalizedRef]) {
    return {
      isValid: true,
      actualName: serviceMap[normalizedRef].actualName,
      filePath: serviceMap[normalizedRef].filePath,
      description: serviceMap[normalizedRef].description,
      exportedFunctions: serviceMap[normalizedRef].exportedFunctions
    };
  }
  
  // Check for partial matches
  const possibleMatches = Object.keys(serviceMap).filter(key => 
    key.toLowerCase().includes(normalizedRef.toLowerCase()) ||
    normalizedRef.toLowerCase().includes(key.toLowerCase())
  );
  
  return {
    isValid: false,
    actualName: null,
    possibleMatches: possibleMatches.slice(0, 3),
    suggestion: possibleMatches.length > 0 ? possibleMatches[0] : null
  };
}

/**
 * Validate function reference within a service
 */
function validateServiceFunction(functionName, serviceName, serviceMap) {
  if (!serviceMap[serviceName]) {
    return {
      isValid: false,
      error: `Service "${serviceName}" not found`
    };
  }
  
  const service = serviceMap[serviceName];
  const functionExists = service.exportedFunctions.some(func => func.name === functionName);
  
  if (functionExists) {
    const functionInfo = service.exportedFunctions.find(func => func.name === functionName);
    return {
      isValid: true,
      actualName: functionName,
      serviceName: serviceName,
      filePath: service.filePath,
      functionInfo
    };
  }
  
  // Check for similar function names
  const similarFunctions = service.exportedFunctions
    .filter(func => func.name.toLowerCase().includes(functionName.toLowerCase()))
    .map(func => func.name);
  
  return {
    isValid: false,
    actualName: null,
    possibleMatches: similarFunctions.slice(0, 3),
    suggestion: similarFunctions.length > 0 ? similarFunctions[0] : null
  };
}

/**
 * Test the hook and service extraction
 */
async function testHookServiceExtraction() {
  console.log('🔍 Testing Hook and Service Extraction...\n');
  
  try {
    // Test hook extraction
    console.log('🪝 Extracting Hooks...');
    const hookMap = await extractHookNames();
    
    console.log(`✅ Found ${Object.keys(hookMap).length} hooks:`);
    
    // Show some key hooks
    const keyHooks = [
      'useActiveRides',
      'useDriverRidesFeed', 
      'useRideStatus',
      'useNotifications',
      'useBookingState'
    ];
    
    keyHooks.forEach(hook => {
      if (hookMap[hook]) {
        const hookInfo = hookMap[hook];
        console.log(`  - ${hook} (${hookInfo.exportedFunctions.length} exports)`);
        if (hookInfo.description) {
          console.log(`    Description: ${hookInfo.description}`);
        }
      }
    });
    
    console.log('\n⚙️ Extracting Services...');
    const serviceMap = await extractServiceFunctions();
    
    console.log(`✅ Found ${Object.keys(serviceMap).length} services:`);
    
    Object.keys(serviceMap).forEach(serviceName => {
      const service = serviceMap[serviceName];
      console.log(`  - ${serviceName} (${service.functionCount} functions)`);
      if (service.description) {
        console.log(`    Description: ${service.description}`);
      }
      
      // Show first few functions
      if (service.exportedFunctions.length > 0) {
        const functionNames = service.exportedFunctions.slice(0, 3).map(f => f.name);
        console.log(`    Functions: ${functionNames.join(', ')}${service.exportedFunctions.length > 3 ? '...' : ''}`);
      }
    });
    
    // Test validation functions
    console.log('\n🔍 Testing Validation Functions...');
    
    // Test hook validation
    const testHooks = ['useActiveRides', 'invalid_hook', 'useRideStatus'];
    testHooks.forEach(hook => {
      const result = validateHookReference(hook, hookMap);
      console.log(`  Hook "${hook}": ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
      if (result.isValid) {
        console.log(`    -> "${result.actualName}" (${result.filePath})`);
      } else if (result.suggestion) {
        console.log(`    Suggestion: "${result.suggestion}"`);
      }
    });
    
    // Test service validation
    const testServices = ['driverRidesApi', 'invalid_service', 'notificationService'];
    testServices.forEach(service => {
      const result = validateServiceReference(service, serviceMap);
      console.log(`  Service "${service}": ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
      if (result.isValid) {
        console.log(`    -> "${result.actualName}" (${result.filePath})`);
      } else if (result.suggestion) {
        console.log(`    Suggestion: "${result.suggestion}"`);
      }
    });
    
    // Test service function validation
    console.log('\n  Testing Service Function Validation:');
    const testFunctions = [
      { service: 'driverRidesApi', function: 'fetchDriverRides' },
      { service: 'driverRidesApi', function: 'invalid_function' },
      { service: 'notificationService', function: 'sendRideNotification' }
    ];
    
    testFunctions.forEach(({ service, function: funcName }) => {
      const result = validateServiceFunction(funcName, service, serviceMap);
      console.log(`    Function "${funcName}" in "${service}": ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
      if (result.isValid) {
        console.log(`      -> ${result.functionInfo.type} (${result.functionInfo.exportType} export)`);
      } else if (result.suggestion) {
        console.log(`      Suggestion: "${result.suggestion}"`);
      }
    });
    
    console.log('\n🎉 Hook and Service extraction test completed successfully!');
    
    return {
      hookMap,
      serviceMap,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      hookMap: {},
      serviceMap: {},
      success: false,
      error: error.message
    };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testHookServiceExtraction()
    .then(result => {
      if (result.success) {
        console.log('\n📋 Summary:');
        console.log(`  Hooks: ${Object.keys(result.hookMap).length}`);
        console.log(`  Services: ${Object.keys(result.serviceMap).length}`);
        const totalFunctions = Object.values(result.serviceMap).reduce((sum, service) => sum + service.functionCount, 0);
        console.log(`  Total Service Functions: ${totalFunctions}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  extractHookNames,
  extractServiceFunctions,
  validateHookReference,
  validateServiceReference,
  validateServiceFunction,
  testHookServiceExtraction
};