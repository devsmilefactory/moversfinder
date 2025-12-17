/**
 * API Function Analyzer
 * Extracts actual API function names and signatures from RPC functions and service files
 * to build naming reference maps for documentation alignment
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Extract RPC function definitions from migration files
 * @param {string[]} migrationFiles - Array of migration file contents
 * @returns {RPCFunction[]} Array of RPC function definitions
 */
export function extractRPCDefinitions(migrationFiles) {
  const rpcFunctions = [];
  
  migrationFiles.forEach((content, fileIndex) => {
    // Match CREATE OR REPLACE FUNCTION statements
    const functionRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)/gi;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const parametersString = match[2];
      
      // Parse parameters
      const parameters = parseRPCParameters(parametersString);
      
      // Look for RETURNS clause
      const returnsMatch = content.substring(match.index).match(/RETURNS\s+([^\s\n]+)/i);
      const returnType = returnsMatch ? returnsMatch[1] : 'VOID';
      
      rpcFunctions.push({
        name: functionName,
        parameters,
        returnType,
        exists: true,
        source: 'rpc',
        fileIndex,
        definition: match[0]
      });
    }
  });
  
  return rpcFunctions.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Parse RPC function parameters
 * @param {string} parametersString - Parameters string from function definition
 * @returns {ParameterDefinition[]} Array of parameter definitions
 */
function parseRPCParameters(parametersString) {
  if (!parametersString.trim()) {
    return [];
  }
  
  const parameters = [];
  const paramParts = parametersString.split(',');
  
  paramParts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    // Match parameter pattern: name TYPE [DEFAULT value]
    const paramMatch = trimmed.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s+([A-Z][A-Z0-9_()]*(?:\s*\([^)]+\))?)/i);
    
    if (paramMatch) {
      const paramName = paramMatch[1];
      const paramType = paramMatch[2];
      const hasDefault = trimmed.includes('DEFAULT');
      
      parameters.push({
        name: paramName,
        type: paramType,
        hasDefault,
        required: !hasDefault
      });
    }
  });
  
  return parameters;
}

/**
 * Extract service function definitions from service files
 * @param {string[]} serviceFiles - Array of service file contents
 * @returns {Promise<ServiceFunction[]>} Array of service function definitions
 */
export async function extractServiceDefinitions(serviceFiles) {
  const serviceFunctions = [];
  
  for (const filePath of serviceFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const functions = parseServiceFunctions(content, filePath);
      serviceFunctions.push(...functions);
    } catch (error) {
      console.warn(`Warning: Could not read service file ${filePath}:`, error.message);
    }
  }
  
  return serviceFunctions.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Parse service functions from file content
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {ServiceFunction[]} Array of service function definitions
 */
function parseServiceFunctions(content, filePath) {
  const functions = [];
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Match export async function patterns
  const exportFunctionRegex = /export\s+async\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)/g;
  let match;
  
  while ((match = exportFunctionRegex.exec(content)) !== null) {
    const functionName = match[1];
    const parametersString = match[2];
    
    const parameters = parseJSParameters(parametersString);
    
    functions.push({
      name: functionName,
      parameters,
      returnType: 'Promise',
      exists: true,
      source: 'service',
      filePath,
      fileName,
      exportType: 'async_function'
    });
  }
  
  // Match export const patterns
  const exportConstRegex = /export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*async/g;
  
  while ((match = exportConstRegex.exec(content)) !== null) {
    const functionName = match[1];
    
    // Try to find the parameter list
    const afterMatch = content.substring(match.index + match[0].length);
    const paramMatch = afterMatch.match(/\(\s*([^)]*)\s*\)/);
    const parametersString = paramMatch ? paramMatch[1] : '';
    
    const parameters = parseJSParameters(parametersString);
    
    functions.push({
      name: functionName,
      parameters,
      returnType: 'Promise',
      exists: true,
      source: 'service',
      filePath,
      fileName,
      exportType: 'async_const'
    });
  }
  
  return functions;
}

/**
 * Parse JavaScript function parameters
 * @param {string} parametersString - Parameters string from function definition
 * @returns {ParameterDefinition[]} Array of parameter definitions
 */
function parseJSParameters(parametersString) {
  if (!parametersString.trim()) {
    return [];
  }
  
  const parameters = [];
  const paramParts = parametersString.split(',');
  
  paramParts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    // Handle destructured parameters
    if (trimmed.startsWith('{') && trimmed.includes('}')) {
      parameters.push({
        name: 'destructured_object',
        type: 'Object',
        hasDefault: trimmed.includes('='),
        required: !trimmed.includes('='),
        isDestructured: true
      });
      return;
    }
    
    // Handle regular parameters
    const paramName = trimmed.split('=')[0].trim();
    const hasDefault = trimmed.includes('=');
    
    parameters.push({
      name: paramName,
      type: 'unknown', // JavaScript doesn't have explicit types
      hasDefault,
      required: !hasDefault
    });
  });
  
  return parameters;
}

/**
 * Extract hook function definitions from hook files
 * @param {string[]} hookFiles - Array of hook file paths
 * @returns {Promise<HookFunction[]>} Array of hook function definitions
 */
export async function extractHookDefinitions(hookFiles) {
  const hookFunctions = [];
  
  for (const filePath of hookFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const hooks = parseHookFunctions(content, filePath);
      hookFunctions.push(...hooks);
    } catch (error) {
      console.warn(`Warning: Could not read hook file ${filePath}:`, error.message);
    }
  }
  
  return hookFunctions.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Parse hook functions from file content
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {HookFunction[]} Array of hook function definitions
 */
function parseHookFunctions(content, filePath) {
  const hooks = [];
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Match export function patterns for hooks (usually start with 'use')
  const hookRegex = /export\s+(?:function\s+|const\s+)?(use[a-zA-Z0-9_]*)\s*[=]?\s*(?:function\s*)?\(\s*([^)]*)\s*\)/g;
  let match;
  
  while ((match = hookRegex.exec(content)) !== null) {
    const hookName = match[1];
    const parametersString = match[2];
    
    const parameters = parseJSParameters(parametersString);
    
    hooks.push({
      name: hookName,
      parameters,
      returnType: 'HookReturn',
      exists: true,
      source: 'hook',
      filePath,
      fileName,
      isHook: true
    });
  }
  
  return hooks;
}

/**
 * Find service files in the services directory
 * @param {string} servicesPath - Path to services directory
 * @returns {Promise<string[]>} Array of service file paths
 */
export async function findServiceFiles(servicesPath = 'src/services/') {
  try {
    const files = await fs.readdir(servicesPath);
    const serviceFiles = files
      .filter(file => file.endsWith('.js') && !file.endsWith('.test.js'))
      .map(file => path.join(servicesPath, file))
      .sort();
    
    return serviceFiles;
  } catch (error) {
    console.warn(`Warning: Could not read services directory ${servicesPath}:`, error.message);
    return [];
  }
}

/**
 * Find hook files in the hooks directory
 * @param {string} hooksPath - Path to hooks directory
 * @returns {Promise<string[]>} Array of hook file paths
 */
export async function findHookFiles(hooksPath = 'src/hooks/') {
  try {
    const files = await fs.readdir(hooksPath);
    const hookFiles = files
      .filter(file => file.endsWith('.js') && !file.endsWith('.test.js'))
      .map(file => path.join(hooksPath, file))
      .sort();
    
    return hookFiles;
  } catch (error) {
    console.warn(`Warning: Could not read hooks directory ${hooksPath}:`, error.message);
    return [];
  }
}

/**
 * Build API function naming reference map
 * @param {Object} apiAnalysis - Analysis results from extraction functions
 * @returns {Object} API function naming reference map
 */
export function buildAPIFunctionNamingMap(apiAnalysis) {
  const { rpcFunctions, serviceFunctions, hookFunctions } = apiAnalysis;
  
  // Build RPC function mapping
  const rpcMap = {};
  rpcFunctions.forEach(func => {
    rpcMap[func.name] = {
      actualName: func.name,
      parameters: func.parameters,
      returnType: func.returnType,
      exists: func.exists,
      source: func.source,
      definition: func.definition
    };
  });
  
  // Build service function mapping
  const serviceMap = {};
  serviceFunctions.forEach(func => {
    serviceMap[func.name] = {
      actualName: func.name,
      parameters: func.parameters,
      returnType: func.returnType,
      exists: func.exists,
      source: func.source,
      filePath: func.filePath,
      fileName: func.fileName,
      exportType: func.exportType
    };
  });
  
  // Build hook function mapping
  const hookMap = {};
  hookFunctions.forEach(func => {
    hookMap[func.name] = {
      actualName: func.name,
      parameters: func.parameters,
      returnType: func.returnType,
      exists: func.exists,
      source: func.source,
      filePath: func.filePath,
      fileName: func.fileName,
      isHook: func.isHook
    };
  });
  
  // Combine all functions into a unified map
  const allFunctions = {
    ...rpcMap,
    ...serviceMap,
    ...hookMap
  };
  
  return {
    rpc: rpcMap,
    services: serviceMap,
    hooks: hookMap,
    all: allFunctions,
    metadata: {
      totalRPCFunctions: rpcFunctions.length,
      totalServiceFunctions: serviceFunctions.length,
      totalHookFunctions: hookFunctions.length,
      totalFunctions: Object.keys(allFunctions).length,
      extractedAt: new Date().toISOString()
    }
  };
}

/**
 * Main function to extract all API function naming information
 * @param {string} migrationsPath - Path to migrations directory
 * @param {string} servicesPath - Path to services directory
 * @param {string} hooksPath - Path to hooks directory
 * @returns {Promise<Object>} Complete API function naming reference map
 */
export async function extractAPIFunctionNaming(
  migrationsPath = 'supabase/migrations/',
  servicesPath = 'src/services/',
  hooksPath = 'src/hooks/'
) {
  // Read migration files for RPC functions
  const migrationFiles = [];
  try {
    const files = await fs.readdir(migrationsPath);
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
    
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      migrationFiles.push(content);
    }
  } catch (error) {
    console.warn(`Warning: Could not read migrations directory ${migrationsPath}:`, error.message);
  }
  
  // Find service and hook files
  const serviceFiles = await findServiceFiles(servicesPath);
  const hookFiles = await findHookFiles(hooksPath);
  
  const apiAnalysis = {
    rpcFunctions: extractRPCDefinitions(migrationFiles),
    serviceFunctions: await extractServiceDefinitions(serviceFiles),
    hookFunctions: await extractHookDefinitions(hookFiles)
  };
  
  return buildAPIFunctionNamingMap(apiAnalysis);
}