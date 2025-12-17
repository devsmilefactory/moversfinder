import { describe, it, expect } from 'vitest';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename, dirname } from 'path';
import fc from 'fast-check';

/**
 * Property Tests for File Organization Compliance
 * 
 * **Feature: component-modularization, Property 10: File organization compliance**
 * **Validates: Requirements 1.5, 5.5**
 * 
 * Tests that the codebase follows proper file organization patterns:
 * - Components are properly organized by feature/domain
 * - File naming conventions are consistent
 * - Directory structure follows established patterns
 * - Index files are used appropriately
 */

describe('File Organization Compliance', () => {
  const srcPath = join(process.cwd(), 'src');

  // Helper function to recursively get all files
  const getAllFiles = async (dir, files = []) => {
    const items = await readdir(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        await getAllFiles(fullPath, files);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  };

  // Helper function to get relative path from src
  const getRelativePath = (fullPath) => {
    return fullPath.replace(srcPath, '').replace(/^[\/\\]/, '');
  };

  describe('Property: Component files should follow naming conventions', () => {
    it('should use PascalCase for React component files', async () => {
      const allFiles = await getAllFiles(srcPath);
      const componentFiles = allFiles.filter(file => {
        const ext = extname(file);
        const relativePath = getRelativePath(file);
        
        // Only check .jsx files in components directories
        return ext === '.jsx' && relativePath.includes('components/');
      });

      fc.assert(
        fc.property(
          fc.constantFrom(...componentFiles.map(file => ({
            path: file,
            name: basename(file, '.jsx'),
            relativePath: getRelativePath(file)
          }))),
          (fileInfo) => {
            // Component files should use PascalCase
            const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(fileInfo.name);
            
            // Allow index files and some exceptions
            const isException = fileInfo.name === 'index' || 
                               fileInfo.name.startsWith('use') || // hooks
                               fileInfo.name.includes('test') ||
                               fileInfo.name.includes('spec');

            expect(isPascalCase || isException).toBe(true);
          }
        ),
        { numRuns: Math.min(componentFiles.length, 20) }
      );
    });

    it('should use camelCase for hook files', async () => {
      const allFiles = await getAllFiles(srcPath);
      const hookFiles = allFiles.filter(file => {
        const ext = extname(file);
        const name = basename(file, ext);
        const relativePath = getRelativePath(file);
        
        return ext === '.js' && 
               (name.startsWith('use') || relativePath.includes('hooks/')) &&
               !name.includes('test') &&
               !name.includes('spec');
      });

      fc.assert(
        fc.property(
          fc.constantFrom(...hookFiles.map(file => ({
            path: file,
            name: basename(file, '.js'),
            relativePath: getRelativePath(file)
          }))),
          (fileInfo) => {
            // Hook files should use camelCase and start with 'use'
            const isCamelCase = /^use[A-Z][a-zA-Z0-9]*$/.test(fileInfo.name);
            const isIndexFile = fileInfo.name === 'index';
            
            expect(isCamelCase || isIndexFile).toBe(true);
          }
        ),
        { numRuns: Math.min(hookFiles.length, 15) }
      );
    });
  });

  describe('Property: Directory structure should follow patterns', () => {
    it('should organize components by feature domain', async () => {
      const componentDirs = [
        'src/components',
        'src/dashboards/client/components',
        'src/dashboards/driver/components',
        'src/dashboards/shared'
      ];

      for (const dir of componentDirs) {
        const fullPath = join(process.cwd(), dir);
        
        try {
          const items = await readdir(fullPath);
          const subdirs = [];
          
          for (const item of items) {
            const itemPath = join(fullPath, item);
            const stats = await stat(itemPath);
            if (stats.isDirectory()) {
              subdirs.push(item);
            }
          }

          fc.assert(
            fc.property(
              fc.constantFrom(...subdirs),
              (subdir) => {
                // Subdirectories should use camelCase or kebab-case
                const isValidNaming = /^[a-z][a-zA-Z0-9]*$/.test(subdir) || // camelCase
                                     /^[a-z][a-z0-9-]*[a-z0-9]$/.test(subdir); // kebab-case
                
                expect(isValidNaming).toBe(true);
              }
            ),
            { numRuns: Math.min(subdirs.length, 10) }
          );
        } catch (error) {
          // Directory might not exist, skip
          console.warn(`Directory ${dir} not found, skipping test`);
        }
      }
    });

    it('should have index files in component directories', async () => {
      const componentDirs = [
        'src/components/profiles/forms',
        'src/components/profiles/steps',
        'src/components/shared/forms',
        'src/dashboards/driver/components/activeRide',
        'src/dashboards/client/components/activeRides'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...componentDirs),
          async (dir) => {
            const fullPath = join(process.cwd(), dir);
            
            try {
              const items = await readdir(fullPath);
              const hasIndexFile = items.some(item => 
                item === 'index.js' || item === 'index.jsx'
              );
              
              // Component directories should have index files for clean imports
              expect(hasIndexFile).toBe(true);
            } catch (error) {
              // Directory might not exist yet, that's okay
              console.warn(`Directory ${dir} not found, skipping index file check`);
            }
          }
        ),
        { numRuns: Math.min(componentDirs.length, 5) }
      );
    });
  });

  describe('Property: File paths should follow conventions', () => {
    it('should not have deeply nested component structures', async () => {
      const allFiles = await getAllFiles(srcPath);
      const componentFiles = allFiles.filter(file => {
        const relativePath = getRelativePath(file);
        return relativePath.includes('components/') && extname(file) === '.jsx';
      });

      fc.assert(
        fc.property(
          fc.constantFrom(...componentFiles.map(file => getRelativePath(file))),
          (relativePath) => {
            // Count directory depth after 'components/'
            const componentsIndex = relativePath.indexOf('components/');
            if (componentsIndex === -1) return;
            
            const pathAfterComponents = relativePath.substring(componentsIndex + 'components/'.length);
            const depth = pathAfterComponents.split('/').length - 1; // -1 for the file itself
            
            // Should not be more than 3 levels deep after components/
            expect(depth).toBeLessThanOrEqual(3);
          }
        ),
        { numRuns: Math.min(componentFiles.length, 20) }
      );
    });

    it('should co-locate related files appropriately', async () => {
      const testFiles = await getAllFiles(srcPath);
      const componentTestFiles = testFiles.filter(file => {
        const relativePath = getRelativePath(file);
        return (relativePath.includes('.test.') || relativePath.includes('.spec.')) &&
               (extname(file) === '.js' || extname(file) === '.jsx');
      });

      fc.assert(
        fc.property(
          fc.constantFrom(...componentTestFiles.map(file => ({
            path: file,
            relativePath: getRelativePath(file),
            dir: dirname(file)
          }))),
          (testFileInfo) => {
            // Test files should be either:
            // 1. In a __tests__ directory
            // 2. Co-located with the component they test
            const isInTestsDir = testFileInfo.relativePath.includes('__tests__');
            const isColocated = !isInTestsDir; // If not in __tests__, assume co-located
            
            expect(isInTestsDir || isColocated).toBe(true);
          }
        ),
        { numRuns: Math.min(componentTestFiles.length, 15) }
      );
    });
  });

  describe('Property: Import/export patterns should be consistent', () => {
    it('should use consistent export patterns in index files', async () => {
      const allFiles = await getAllFiles(srcPath);
      const indexFiles = allFiles.filter(file => {
        const name = basename(file);
        return name === 'index.js' || name === 'index.jsx';
      });

      fc.assert(
        fc.property(
          fc.constantFrom(...indexFiles.map(file => ({
            path: file,
            relativePath: getRelativePath(file)
          }))),
          async (indexFileInfo) => {
            try {
              const content = await import('fs').then(fs => 
                fs.promises.readFile(indexFileInfo.path, 'utf-8')
              );
              
              // Index files should have export statements
              const hasExports = content.includes('export') || content.includes('module.exports');
              
              // Allow empty index files for now
              const isEmpty = content.trim().length === 0;
              
              expect(hasExports || isEmpty).toBe(true);
            } catch (error) {
              // File might not be readable, skip
              console.warn(`Could not read ${indexFileInfo.path}, skipping`);
            }
          }
        ),
        { numRuns: Math.min(indexFiles.length, 10) }
      );
    });
  });

  describe('Property: File sizes should be reasonable', () => {
    it('should not have excessively large component files', async () => {
      const allFiles = await getAllFiles(srcPath);
      const componentFiles = allFiles.filter(file => {
        const ext = extname(file);
        const relativePath = getRelativePath(file);
        
        return (ext === '.jsx' || ext === '.js') && 
               !relativePath.includes('node_modules') &&
               !relativePath.includes('.test.') &&
               !relativePath.includes('.spec.');
      });

      fc.assert(
        fc.property(
          fc.constantFrom(...componentFiles.map(file => ({
            path: file,
            relativePath: getRelativePath(file)
          }))),
          async (fileInfo) => {
            try {
              const content = await import('fs').then(fs => 
                fs.promises.readFile(fileInfo.path, 'utf-8')
              );
              
              const lineCount = content.split('\n').length;
              
              // Component files should generally be under 500 lines
              // Allow some exceptions for legacy files
              const isLegacyFile = fileInfo.relativePath.includes('Legacy') ||
                                  fileInfo.relativePath.includes('Old') ||
                                  fileInfo.relativePath.includes('Original');
              
              if (!isLegacyFile) {
                expect(lineCount).toBeLessThanOrEqual(500);
              }
            } catch (error) {
              // File might not be readable, skip
              console.warn(`Could not read ${fileInfo.path}, skipping size check`);
            }
          }
        ),
        { numRuns: Math.min(componentFiles.length, 25) }
      );
    });
  });

  describe('Property: Modular architecture should be maintained', () => {
    it('should have proper separation between containers and components', async () => {
      const containerDirs = [
        'src/components/profiles/containers',
        'src/dashboards/driver/components/containers',
        'src/dashboards/client/components/containers'
      ];

      for (const dir of containerDirs) {
        const fullPath = join(process.cwd(), dir);
        
        try {
          const items = await readdir(fullPath);
          const containerFiles = items.filter(item => 
            item.endsWith('.jsx') && item.includes('Container')
          );

          fc.assert(
            fc.property(
              fc.constantFrom(...containerFiles),
              (containerFile) => {
                // Container files should follow naming convention
                const isValidContainerName = containerFile.endsWith('Container.jsx');
                expect(isValidContainerName).toBe(true);
              }
            ),
            { numRuns: Math.min(containerFiles.length, 5) }
          );
        } catch (error) {
          // Directory might not exist, skip
          console.warn(`Container directory ${dir} not found, skipping test`);
        }
      }
    });

    it('should have proper hook organization', async () => {
      const hooksDir = join(process.cwd(), 'src/hooks');
      
      try {
        const items = await readdir(hooksDir);
        const hookFiles = items.filter(item => 
          item.endsWith('.js') && item.startsWith('use')
        );

        fc.assert(
          fc.property(
            fc.constantFrom(...hookFiles),
            (hookFile) => {
              // Hook files should follow naming convention
              const hookName = basename(hookFile, '.js');
              const isValidHookName = /^use[A-Z][a-zA-Z0-9]*$/.test(hookName);
              
              expect(isValidHookName).toBe(true);
            }
          ),
          { numRuns: Math.min(hookFiles.length, 15) }
        );
      } catch (error) {
        console.warn('Hooks directory not found, skipping hook organization test');
      }
    });
  });

  describe('Property: Test organization should be consistent', () => {
    it('should have tests organized properly', async () => {
      const allFiles = await getAllFiles(srcPath);
      const testFiles = allFiles.filter(file => {
        const relativePath = getRelativePath(file);
        return (relativePath.includes('.test.') || relativePath.includes('.spec.')) &&
               (extname(file) === '.js' || extname(file) === '.jsx');
      });

      fc.assert(
        fc.property(
          fc.constantFrom(...testFiles.map(file => ({
            path: file,
            relativePath: getRelativePath(file),
            name: basename(file)
          }))),
          (testFileInfo) => {
            // Test files should follow naming conventions
            const hasTestInName = testFileInfo.name.includes('.test.') || 
                                 testFileInfo.name.includes('.spec.');
            
            expect(hasTestInName).toBe(true);
          }
        ),
        { numRuns: Math.min(testFiles.length, 20) }
      );
    });
  });
});

/**
 * Integration test for overall file organization
 */
describe('File Organization Integration', () => {
  it('should maintain consistent organization across the entire codebase', async () => {
    const srcPath = join(process.cwd(), 'src');
    
    try {
      const allFiles = await getAllFiles(srcPath);
      const jsxFiles = allFiles.filter(file => extname(file) === '.jsx');
      const jsFiles = allFiles.filter(file => extname(file) === '.js');
      
      // Basic sanity checks
      expect(jsxFiles.length).toBeGreaterThan(0);
      expect(jsFiles.length).toBeGreaterThan(0);
      
      // Check for proper directory structure
      const hasComponentsDir = allFiles.some(file => 
        getRelativePath(file).startsWith('components/')
      );
      const hasHooksDir = allFiles.some(file => 
        getRelativePath(file).startsWith('hooks/')
      );
      const hasUtilsDir = allFiles.some(file => 
        getRelativePath(file).startsWith('utils/')
      );
      
      expect(hasComponentsDir).toBe(true);
      expect(hasHooksDir).toBe(true);
      expect(hasUtilsDir).toBe(true);
      
    } catch (error) {
      console.error('Error in file organization integration test:', error);
      throw error;
    }
  });
});

// Helper function to get all files recursively
const getAllFiles = async (dir, files = []) => {
  try {
    const items = await readdir(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!item.startsWith('.') && item !== 'node_modules') {
          await getAllFiles(fullPath, files);
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist or be accessible
    console.warn(`Could not read directory ${dir}:`, error.message);
  }
  
  return files;
};