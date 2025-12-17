/**
 * Hook and Service Analyzer
 * 
 * Extracts hook names and service function names from actual implementation files
 * to build accurate naming reference maps for documentation alignment.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Extract hook names and their signatures from hooks directory
 * @param {string} hooksDir - Hooks directory path
 * @returns {Promise<Object>} Hook mapping object
 */
export async function extractHookNames(hooksDir = 'src/hooks') {
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
 * Extract service function names from services directory
 * @param {string} servicesDir - Services directory path
 * @returns {Promise<Object>} Service mapping object
 */
export async function extractServiceFunctions(servicesDir = 'src/services') {
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
 * @param {string} content - File content
 * @returns {Array} Array of function objects
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
 * @param {string} content - File content
 * @returns {string|null} Hook description
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
 * @param {string} content - File content
 * @returns {string|null} Service description
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
 * Build comprehensive hook and service naming reference maps
 * @param {string} baseDir - Base directory for source files
 * @returns {Promise<Object>} Combined naming maps
 */
export async function buildHookServiceNamingMaps(baseDir = 'src') {
  try {
    const [hookMap, serviceMap] = await Promise.all([
      extractHookNames(path.join(baseDir, 'hooks')),
      extractServiceFunctions(path.join(baseDir, 'services'))
    ]);
    
    return {
      hooks: hookMap,
      services: serviceMap,
      summary: {
        hooksCount: Object.keys(hookMap).length,
        servicesCount: Object.keys(serviceMap).length,
        totalFunctions: Object.values(serviceMap).reduce((sum, service) => sum + service.functionCount, 0),
        extractedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Error building hook and service naming maps:', error);
    return {
      hooks: {},
      services: {},
      summary: {
        hooksCount: 0,
        servicesCount: 0,
        totalFunctions: 0,
        extractedAt: new Date().toISOString(),
        error: error.message
      }
    };
  }
}

/**
 * Validate hook reference against extracted hooks
 * @param {string} hookReference - Hook reference from documentation
 * @param {Object} hookMap - Extracted hooks map
 * @returns {Object} Validation result
 */
export function validateHookReference(hookReference, hookMap) {
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
 * @param {string} serviceReference - Service reference from documentation
 * @param {Object} serviceMap - Extracted services map
 * @returns {Object} Validation result
 */
export function validateServiceReference(serviceReference, serviceMap) {
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
 * @param {string} functionName - Function name to validate
 * @param {string} serviceName - Service name containing the function
 * @param {Object} serviceMap - Extracted services map
 * @returns {Object} Validation result
 */
export function validateServiceFunction(functionName, serviceName, serviceMap) {
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