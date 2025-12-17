/**
 * Naming Replacement Engine
 * 
 * Replaces database field names, component names, API function names, status values, 
 * and configuration references with actual codebase names using extracted naming reference maps.
 * Implements missing reference marking system for functions and components that don't exist.
 */

import { extractDatabaseNaming } from './databaseSchemaAnalyzer.js';
import { extractComponentNaming } from './componentNameExtractor.js';
import { extractAPIFunctionNaming } from './apiFunctionAnalyzer.js';
import { buildStatusConfigNamingMaps } from './statusConfigExtractor.js';
import { buildHookServiceNamingMaps } from './hookServiceAnalyzer.js';

/**
 * Main class for handling naming replacements across documentation
 */
export class NamingReplacementEngine {
  constructor() {
    this.namingMaps = null;
    this.replacementStats = {
      databaseFields: 0,
      components: 0,
      apiFunctions: 0,
      statusValues: 0,
      configurations: 0,
      hooks: 0,
      services: 0,
      missingReferences: 0
    };
  }

  /**
   * Initialize the engine by loading all naming reference maps
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Loading naming reference maps...');
    
    try {
      const [
        databaseMap,
        componentMap,
        apiMap,
        statusConfigMap,
        hookServiceMap
      ] = await Promise.all([
        extractDatabaseNaming(),
        extractComponentNaming(),
        extractAPIFunctionNaming(),
        buildStatusConfigNamingMaps(),
        buildHookServiceNamingMaps()
      ]);

      this.namingMaps = {
        database: databaseMap,
        components: componentMap,
        api: apiMap,
        statusConfig: statusConfigMap,
        hookService: hookServiceMap
      };

      console.log('Naming reference maps loaded successfully');
      console.log('Database tables:', Object.keys(databaseMap.tables).length);
      console.log('Database fields:', Object.keys(databaseMap.fields).length);
      console.log('Components:', Object.keys(componentMap.components).length);
      console.log('API functions:', Object.keys(apiMap.all).length);
      console.log('Status constants:', Object.keys(statusConfigMap.statusConstants).length);
      console.log('Configurations:', Object.keys(statusConfigMap.configurations).length);
      console.log('Hooks:', Object.keys(hookServiceMap.hooks).length);
      console.log('Services:', Object.keys(hookServiceMap.services).length);

    } catch (error) {
      console.error('Error initializing naming replacement engine:', error);
      throw error;
    }
  }

  /**
   * Apply all naming corrections to document content
   * @param {string} content - Document content to process
   * @returns {string} Content with naming corrections applied
   */
  applyNamingCorrections(content) {
    if (!this.namingMaps) {
      throw new Error('Naming replacement engine not initialized. Call initialize() first.');
    }

    let correctedContent = content;

    // Apply corrections in order of specificity (most specific first)
    correctedContent = this.replaceAPIFunctionNames(correctedContent);
    correctedContent = this.replaceDatabaseFieldNames(correctedContent);
    correctedContent = this.replaceComponentNames(correctedContent);
    correctedContent = this.replaceStatusValues(correctedContent);
    correctedContent = this.replaceConfigurationNames(correctedContent);
    correctedContent = this.replaceHookNames(correctedContent);
    correctedContent = this.replaceServiceNames(correctedContent);

    return correctedContent;
  }

  /**
   * Replace database field names with actual schema names
   * @param {string} content - Content to process
   * @returns {string} Content with database field corrections
   */
  replaceDatabaseFieldNames(content) {
    const { fields, tables } = this.namingMaps.database;
    let processedContent = content;

    // Replace table.field references
    const tableFieldRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    processedContent = processedContent.replace(tableFieldRegex, (match, tableField) => {
      if (fields[tableField]) {
        this.replacementStats.databaseFields++;
        return `${fields[tableField].tableName}.${fields[tableField].actualName}`;
      }
      return match;
    });

    // Replace standalone field names in database contexts
    const fieldContextRegex = /(?:SELECT|INSERT|UPDATE|WHERE|SET|FROM|JOIN)\s+[^;]*?\b([a-zA-Z_][a-zA-Z0-9_]*)\b/gi;
    processedContent = processedContent.replace(fieldContextRegex, (match, fieldName) => {
      if (fields[fieldName]) {
        this.replacementStats.databaseFields++;
        return match.replace(fieldName, fields[fieldName].actualName);
      }
      return match;
    });

    // Replace table names
    Object.keys(tables).forEach(tableName => {
      const tableRegex = new RegExp(`\\b${tableName}\\b`, 'g');
      if (processedContent.includes(tableName) && tables[tableName]) {
        processedContent = processedContent.replace(tableRegex, tables[tableName].actualName);
        this.replacementStats.databaseFields++;
      }
    });

    return processedContent;
  }

  /**
   * Replace component names with actual component names and paths
   * @param {string} content - Content to process
   * @returns {string} Content with component name corrections
   */
  replaceComponentNames(content) {
    const { components } = this.namingMaps.components;
    let processedContent = content;

    // Replace component references in various contexts
    Object.keys(components).forEach(componentName => {
      const component = components[componentName];
      
      // Replace in JSX-like contexts: <ComponentName>
      const jsxRegex = new RegExp(`<${componentName}(?:\\s|>|/)`, 'g');
      if (processedContent.match(jsxRegex)) {
        processedContent = processedContent.replace(jsxRegex, (match) => {
          this.replacementStats.components++;
          return match.replace(componentName, component.actualName);
        });
      }

      // Replace in import contexts: import ComponentName
      const importRegex = new RegExp(`import\\s+${componentName}\\b`, 'g');
      if (processedContent.match(importRegex)) {
        processedContent = processedContent.replace(importRegex, (match) => {
          this.replacementStats.components++;
          return match.replace(componentName, component.actualName);
        });
      }

      // Replace in general text contexts
      const generalRegex = new RegExp(`\\b${componentName}\\b(?=\\s+component|\\s+Component)`, 'g');
      if (processedContent.match(generalRegex)) {
        processedContent = processedContent.replace(generalRegex, (match) => {
          this.replacementStats.components++;
          return component.actualName;
        });
      }
    });

    // Mark missing components that are referenced but don't exist
    const componentReferenceRegex = /<([A-Z][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = componentReferenceRegex.exec(content)) !== null) {
      const referencedComponent = match[1];
      if (!components[referencedComponent]) {
        const markingText = `**[MISSING COMPONENT: ${referencedComponent}]**`;
        processedContent = processedContent.replace(
          new RegExp(`<${referencedComponent}`, 'g'),
          `<${markingText}`
        );
        this.replacementStats.missingReferences++;
      }
    }

    return processedContent;
  }

  /**
   * Replace API function names with actual function names and mark missing ones
   * @param {string} content - Content to process
   * @returns {string} Content with API function corrections
   */
  replaceAPIFunctionNames(content) {
    const { all: apiFunctions } = this.namingMaps.api;
    let processedContent = content;

    // Replace RPC function calls
    const rpcCallRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    processedContent = processedContent.replace(rpcCallRegex, (match, functionName) => {
      if (apiFunctions[functionName]) {
        this.replacementStats.apiFunctions++;
        return match.replace(functionName, apiFunctions[functionName].actualName);
      }
      
      // Check if this looks like an RPC function that should exist
      if (functionName.includes('_') && /^[a-z]/.test(functionName)) {
        const markingText = `**[MISSING RPC: ${functionName}]**`;
        this.replacementStats.missingReferences++;
        return match.replace(functionName, markingText);
      }
      
      return match;
    });

    // Replace service function references
    const serviceFunctionRegex = /\b(get|post|put|delete|fetch|create|update|delete)([A-Z][a-zA-Z0-9_]*)/g;
    processedContent = processedContent.replace(serviceFunctionRegex, (match, verb, noun) => {
      const functionName = verb + noun;
      if (apiFunctions[functionName]) {
        this.replacementStats.apiFunctions++;
        return apiFunctions[functionName].actualName;
      }
      return match;
    });

    return processedContent;
  }

  /**
   * Replace status values with actual status constants
   * @param {string} content - Content to process
   * @returns {string} Content with status value corrections
   */
  replaceStatusValues(content) {
    const { statusConstants } = this.namingMaps.statusConfig;
    let processedContent = content;

    // Replace status references in various contexts
    Object.keys(statusConstants).forEach(statusKey => {
      const status = statusConstants[statusKey];
      
      // Replace in status assignment contexts
      const statusAssignRegex = new RegExp(`status\\s*[=:]\\s*['"\`]${statusKey}['"\`]`, 'gi');
      if (processedContent.match(statusAssignRegex)) {
        processedContent = processedContent.replace(statusAssignRegex, (match) => {
          this.replacementStats.statusValues++;
          return match.replace(statusKey, status.actualStatus);
        });
      }

      // Replace in status comparison contexts
      const statusCompareRegex = new RegExp(`status\\s*[!=]==?\\s*['"\`]${statusKey}['"\`]`, 'gi');
      if (processedContent.match(statusCompareRegex)) {
        processedContent = processedContent.replace(statusCompareRegex, (match) => {
          this.replacementStats.statusValues++;
          return match.replace(statusKey, status.actualStatus);
        });
      }

      // Replace in general status contexts
      const generalStatusRegex = new RegExp(`\\b${statusKey}\\b(?=\\s+status|\\s+state)`, 'gi');
      if (processedContent.match(generalStatusRegex)) {
        processedContent = processedContent.replace(generalStatusRegex, (match) => {
          this.replacementStats.statusValues++;
          return status.actualStatus;
        });
      }
    });

    return processedContent;
  }

  /**
   * Replace configuration names with actual configuration objects
   * @param {string} content - Content to process
   * @returns {string} Content with configuration corrections
   */
  replaceConfigurationNames(content) {
    const { configurations } = this.namingMaps.statusConfig;
    let processedContent = content;

    // Replace configuration object references
    Object.keys(configurations).forEach(configKey => {
      const config = configurations[configKey];
      
      // Replace direct configuration references
      const configRegex = new RegExp(`\\b${configKey}\\b`, 'g');
      if (processedContent.includes(configKey) && config.exists) {
        processedContent = processedContent.replace(configRegex, config.actualConfig);
        this.replacementStats.configurations++;
      }

      // Replace configuration property access
      if (config.structure && typeof config.structure === 'object') {
        Object.keys(config.structure).forEach(propKey => {
          const propRegex = new RegExp(`${configKey}\\.${propKey}`, 'g');
          if (processedContent.includes(`${configKey}.${propKey}`)) {
            processedContent = processedContent.replace(propRegex, `${config.actualConfig}.${propKey}`);
            this.replacementStats.configurations++;
          }
        });
      }
    });

    return processedContent;
  }

  /**
   * Replace hook names with actual hook names
   * @param {string} content - Content to process
   * @returns {string} Content with hook name corrections
   */
  replaceHookNames(content) {
    const { hooks } = this.namingMaps.hookService;
    let processedContent = content;

    // Replace hook references
    Object.keys(hooks).forEach(hookKey => {
      const hook = hooks[hookKey];
      
      // Replace in import contexts
      const importRegex = new RegExp(`import\\s+.*\\b${hookKey}\\b`, 'g');
      if (processedContent.match(importRegex)) {
        processedContent = processedContent.replace(importRegex, (match) => {
          this.replacementStats.hooks++;
          return match.replace(hookKey, hook.actualName);
        });
      }

      // Replace in usage contexts
      const usageRegex = new RegExp(`\\b${hookKey}\\s*\\(`, 'g');
      if (processedContent.match(usageRegex)) {
        processedContent = processedContent.replace(usageRegex, (match) => {
          this.replacementStats.hooks++;
          return match.replace(hookKey, hook.actualName);
        });
      }
    });

    return processedContent;
  }

  /**
   * Replace service names with actual service names
   * @param {string} content - Content to process
   * @returns {string} Content with service name corrections
   */
  replaceServiceNames(content) {
    const { services } = this.namingMaps.hookService;
    let processedContent = content;

    // Replace service references
    Object.keys(services).forEach(serviceKey => {
      const service = services[serviceKey];
      
      // Replace in import contexts
      const importRegex = new RegExp(`from\\s+['"\`][^'"\`]*${serviceKey}['"\`]`, 'g');
      if (processedContent.match(importRegex)) {
        processedContent = processedContent.replace(importRegex, (match) => {
          this.replacementStats.services++;
          return match.replace(serviceKey, service.actualName);
        });
      }

      // Replace service function calls
      if (service.exportedFunctions) {
        service.exportedFunctions.forEach(func => {
          const funcCallRegex = new RegExp(`\\b${func.name}\\s*\\(`, 'g');
          if (processedContent.match(funcCallRegex)) {
            // Function name is already correct, just count the usage
            this.replacementStats.services++;
          }
        });
      }
    });

    return processedContent;
  }

  /**
   * Mark missing references that don't exist in the codebase
   * @param {string} content - Content to process
   * @param {string} referenceType - Type of reference (component, function, etc.)
   * @param {string} referenceName - Name of the missing reference
   * @returns {string} Content with missing reference marked
   */
  markMissingReference(content, referenceType, referenceName) {
    const markingText = `**[MISSING ${referenceType.toUpperCase()}: ${referenceName}]**`;
    const regex = new RegExp(`\\b${referenceName}\\b`, 'g');
    this.replacementStats.missingReferences++;
    return content.replace(regex, markingText);
  }

  /**
   * Get replacement statistics
   * @returns {Object} Statistics about replacements made
   */
  getReplacementStats() {
    return {
      ...this.replacementStats,
      totalReplacements: Object.values(this.replacementStats).reduce((sum, count) => sum + count, 0)
    };
  }

  /**
   * Reset replacement statistics
   */
  resetStats() {
    Object.keys(this.replacementStats).forEach(key => {
      this.replacementStats[key] = 0;
    });
  }

  /**
   * Generate a detailed replacement report
   * @returns {Object} Detailed report of all replacements and corrections
   */
  generateReplacementReport() {
    const stats = this.getReplacementStats();
    
    return {
      summary: {
        totalReplacements: stats.totalReplacements,
        missingReferences: stats.missingReferences,
        successRate: stats.totalReplacements > 0 ? 
          ((stats.totalReplacements - stats.missingReferences) / stats.totalReplacements * 100).toFixed(2) + '%' : 
          '100%'
      },
      details: {
        databaseCorrections: stats.databaseFields,
        componentCorrections: stats.components,
        apiFunctionCorrections: stats.apiFunctions,
        statusValueCorrections: stats.statusValues,
        configurationCorrections: stats.configurations,
        hookCorrections: stats.hooks,
        serviceCorrections: stats.services,
        missingReferences: stats.missingReferences
      },
      namingMapsLoaded: {
        databaseTables: this.namingMaps ? Object.keys(this.namingMaps.database.tables).length : 0,
        databaseFields: this.namingMaps ? Object.keys(this.namingMaps.database.fields).length : 0,
        components: this.namingMaps ? Object.keys(this.namingMaps.components.components).length : 0,
        apiFunctions: this.namingMaps ? Object.keys(this.namingMaps.api.all).length : 0,
        statusConstants: this.namingMaps ? Object.keys(this.namingMaps.statusConfig.statusConstants).length : 0,
        configurations: this.namingMaps ? Object.keys(this.namingMaps.statusConfig.configurations).length : 0,
        hooks: this.namingMaps ? Object.keys(this.namingMaps.hookService.hooks).length : 0,
        services: this.namingMaps ? Object.keys(this.namingMaps.hookService.services).length : 0
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Convenience function to create and initialize a naming replacement engine
 * @returns {Promise<NamingReplacementEngine>} Initialized engine instance
 */
export async function createNamingReplacementEngine() {
  const engine = new NamingReplacementEngine();
  await engine.initialize();
  return engine;
}

/**
 * Convenience function to apply naming corrections to content
 * @param {string} content - Content to process
 * @returns {Promise<Object>} Result with corrected content and statistics
 */
export async function applyNamingCorrections(content) {
  const engine = await createNamingReplacementEngine();
  const correctedContent = engine.applyNamingCorrections(content);
  const stats = engine.getReplacementStats();
  const report = engine.generateReplacementReport();
  
  return {
    originalContent: content,
    correctedContent,
    stats,
    report
  };
}