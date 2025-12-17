/**
 * Component Name Extractor
 * Extracts actual component names and file paths from the codebase
 * to build naming reference maps for documentation alignment
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Find all component files in specified directories
 * @param {...string} directories - Directories to search for components
 * @returns {Promise<string[]>} Array of component file paths
 */
export async function findComponentFiles(...directories) {
  const componentFiles = [];
  
  for (const dir of directories) {
    try {
      await walkDirectory(dir, componentFiles);
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error.message);
    }
  }
  
  return componentFiles.sort();
}

/**
 * Recursively walk directory to find component files
 * @param {string} dir - Directory to walk
 * @param {string[]} files - Array to collect file paths
 */
async function walkDirectory(dir, files) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await walkDirectory(fullPath, files);
      } else if (entry.isFile() && isComponentFile(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
    console.warn(`Warning: Could not read directory ${dir}:`, error.message);
  }
}

/**
 * Check if a file is a React component file
 * @param {string} filename - File name to check
 * @returns {boolean} True if it's a component file
 */
function isComponentFile(filename) {
  return (filename.endsWith('.jsx') || filename.endsWith('.tsx')) && 
         !filename.endsWith('.test.jsx') && 
         !filename.endsWith('.test.tsx') &&
         !filename.startsWith('.');
}

/**
 * Extract component definitions from component files
 * @param {string[]} componentFiles - Array of component file paths
 * @returns {Promise<ComponentDefinition[]>} Array of component definitions
 */
export async function extractComponentDefinitions(componentFiles) {
  const components = [];
  
  for (const filePath of componentFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const componentDef = parseComponentFromFile(content, filePath);
      
      if (componentDef) {
        components.push(componentDef);
      }
    } catch (error) {
      console.warn(`Warning: Could not read component file ${filePath}:`, error.message);
    }
  }
  
  return components.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Parse component definition from file content
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {ComponentDefinition|null} Component definition or null
 */
function parseComponentFromFile(content, filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const directory = path.dirname(filePath);
  
  // Try to find default export
  // Pattern 1: export default ComponentName
  let defaultExportMatch = content.match(/export\s+default\s+([A-Z][a-zA-Z0-9_]*)/);
  
  // Pattern 2: export default function ComponentName
  if (!defaultExportMatch) {
    defaultExportMatch = content.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9_]*)/);
  }
  
  // Pattern 3: function ComponentName() { ... } ... export default ComponentName
  if (!defaultExportMatch) {
    const functionMatch = content.match(/function\s+([A-Z][a-zA-Z0-9_]*)/);
    const exportMatch = content.match(/export\s+default\s+([A-Z][a-zA-Z0-9_]*)/);
    if (functionMatch && exportMatch && functionMatch[1] === exportMatch[1]) {
      defaultExportMatch = functionMatch;
    }
  }
  
  if (defaultExportMatch) {
    return {
      name: defaultExportMatch[1],
      fileName,
      filePath,
      exportType: 'default',
      directory,
      importPath: filePath.replace(/\\/g, '/') // Normalize path separators
    };
  }
  
  // Try to find named exports
  const namedExportMatches = content.match(/export\s*\{\s*([^}]+)\s*\}/g);
  
  if (namedExportMatches) {
    // For now, just take the first named export
    const firstMatch = namedExportMatches[0];
    const exportNames = firstMatch
      .replace(/export\s*\{\s*/, '')
      .replace(/\s*\}/, '')
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (exportNames.length > 0) {
      return {
        name: exportNames[0], // Take first export
        fileName,
        filePath,
        exportType: 'named',
        directory,
        importPath: filePath.replace(/\\/g, '/'),
        namedExports: exportNames
      };
    }
  }
  
  // If no explicit export found, assume component name matches file name
  if (fileName && /^[A-Z]/.test(fileName)) {
    return {
      name: fileName,
      fileName,
      filePath,
      exportType: 'assumed',
      directory,
      importPath: filePath.replace(/\\/g, '/')
    };
  }
  
  return null;
}

/**
 * Extract import paths from component files
 * @param {string[]} componentFiles - Array of component file paths
 * @returns {Promise<ComponentPath[]>} Array of component paths
 */
export async function extractImportPaths(componentFiles) {
  const paths = [];
  
  for (const filePath of componentFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const imports = parseImportsFromFile(content, filePath);
      paths.push(...imports);
    } catch (error) {
      console.warn(`Warning: Could not read file for imports ${filePath}:`, error.message);
    }
  }
  
  return paths.sort((a, b) => a.importPath.localeCompare(b.importPath));
}

/**
 * Parse import statements from file content
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {ComponentPath[]} Array of import paths
 */
function parseImportsFromFile(content, filePath) {
  const imports = [];
  
  // Match import statements
  const importRegex = /import\s+(?:(\w+)|(?:\{([^}]+)\})|(?:(\w+)\s*,\s*\{([^}]+)\}))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const [, defaultImport, namedImports, defaultWithNamed, namedWithDefault, importPath] = match;
    
    // Skip relative imports that don't look like components
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      if (!/[A-Z]/.test(importPath)) {
        continue; // Skip utility imports
      }
    }
    
    if (defaultImport) {
      imports.push({
        componentName: defaultImport,
        importPath,
        importType: 'default',
        sourceFile: filePath
      });
    }
    
    if (namedImports) {
      const names = namedImports.split(',').map(name => name.trim());
      names.forEach(name => {
        imports.push({
          componentName: name,
          importPath,
          importType: 'named',
          sourceFile: filePath
        });
      });
    }
    
    if (defaultWithNamed && namedWithDefault) {
      imports.push({
        componentName: defaultWithNamed,
        importPath,
        importType: 'default',
        sourceFile: filePath
      });
      
      const names = namedWithDefault.split(',').map(name => name.trim());
      names.forEach(name => {
        imports.push({
          componentName: name,
          importPath,
          importType: 'named',
          sourceFile: filePath
        });
      });
    }
  }
  
  return imports;
}

/**
 * Extract prop interfaces from component files (basic implementation)
 * @param {string[]} componentFiles - Array of component file paths
 * @returns {Promise<PropDefinition[]>} Array of prop definitions
 */
export async function extractPropInterfaces(componentFiles) {
  const props = [];
  
  for (const filePath of componentFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const componentProps = parsePropTypesFromFile(content, filePath);
      props.push(...componentProps);
    } catch (error) {
      console.warn(`Warning: Could not read file for props ${filePath}:`, error.message);
    }
  }
  
  return props.sort((a, b) => a.componentName.localeCompare(b.componentName));
}

/**
 * Parse prop types from file content (basic implementation)
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {PropDefinition[]} Array of prop definitions
 */
function parsePropTypesFromFile(content, filePath) {
  const props = [];
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Look for function parameters that might be props
  const functionRegex = new RegExp(`function\\s+${fileName}\\s*\\(\\s*\\{([^}]+)\\}`, 'i');
  const arrowFunctionRegex = new RegExp(`const\\s+${fileName}\\s*=\\s*\\(\\s*\\{([^}]+)\\}`, 'i');
  
  let match = functionRegex.exec(content) || arrowFunctionRegex.exec(content);
  
  if (match) {
    const propsString = match[1];
    const propNames = propsString
      .split(',')
      .map(prop => prop.trim().split(/[=:]/)[0].trim())
      .filter(prop => prop.length > 0 && /^[a-zA-Z_]/.test(prop));
    
    propNames.forEach(propName => {
      props.push({
        componentName: fileName,
        propName,
        propType: 'unknown', // Would need more sophisticated parsing for types
        sourceFile: filePath,
        isRequired: !propsString.includes(`${propName} =`) // Basic check for default values
      });
    });
  }
  
  return props;
}

/**
 * Build component naming reference map
 * @param {Object} componentAnalysis - Analysis results from extraction functions
 * @returns {Object} Component naming reference map
 */
export function buildComponentNamingMap(componentAnalysis) {
  const { components, paths, props } = componentAnalysis;
  
  // Build component mapping
  const componentMap = {};
  components.forEach(comp => {
    componentMap[comp.name] = {
      actualName: comp.name,
      actualPath: comp.filePath,
      fileName: comp.fileName,
      directory: comp.directory,
      exportType: comp.exportType,
      importPath: comp.importPath,
      exists: true
    };
    
    // Also map by file name if different from component name
    if (comp.fileName !== comp.name) {
      componentMap[comp.fileName] = {
        actualName: comp.name,
        actualPath: comp.filePath,
        fileName: comp.fileName,
        directory: comp.directory,
        exportType: comp.exportType,
        importPath: comp.importPath,
        exists: true
      };
    }
  });
  
  // Build import path mapping
  const importMap = {};
  paths.forEach(pathInfo => {
    const key = `${pathInfo.componentName}:${pathInfo.importPath}`;
    importMap[key] = {
      componentName: pathInfo.componentName,
      importPath: pathInfo.importPath,
      importType: pathInfo.importType,
      sourceFile: pathInfo.sourceFile
    };
  });
  
  // Build props mapping
  const propsMap = {};
  props.forEach(prop => {
    const key = `${prop.componentName}.${prop.propName}`;
    propsMap[key] = {
      componentName: prop.componentName,
      propName: prop.propName,
      propType: prop.propType,
      isRequired: prop.isRequired,
      sourceFile: prop.sourceFile
    };
  });
  
  return {
    components: componentMap,
    imports: importMap,
    props: propsMap,
    metadata: {
      totalComponents: components.length,
      totalImports: paths.length,
      totalProps: props.length,
      extractedAt: new Date().toISOString()
    }
  };
}

/**
 * Main function to extract all component naming information
 * @param {...string} directories - Directories to search for components
 * @returns {Promise<Object>} Complete component naming reference map
 */
export async function extractComponentNaming(...directories) {
  const defaultDirectories = [
    'src/components/',
    'src/dashboards/',
    'src/pages/'
  ];
  
  const searchDirectories = directories.length > 0 ? directories : defaultDirectories;
  
  const componentFiles = await findComponentFiles(...searchDirectories);
  
  const componentAnalysis = {
    components: await extractComponentDefinitions(componentFiles),
    paths: await extractImportPaths(componentFiles),
    props: await extractPropInterfaces(componentFiles)
  };
  
  return buildComponentNamingMap(componentAnalysis);
}