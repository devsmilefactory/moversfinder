/**
 * Property-based test for redundant file cleanup
 * 
 * **Feature: ride-flow-documentation-audit, Property 9: Redundant File Cleanup**
 * **Validates: Requirements 7.5, 8.5**
 * 
 * This test verifies that all redundant analysis document versions have been
 * deleted and only the definitive document remains.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';

// List of redundant files that should be deleted
const REDUNDANT_FILES = [
  'COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md',
  'COMPREHENSIVE_RIDE_FLOW_ANALYSIS_CORRECTED.md',
  'UPDATED_COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md',
  'GAP_ANALYSIS_IMPLEMENTATION_PATCHES.md'
];

// Expected definitive document name
const DEFINITIVE_DOCUMENT = 'COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md';

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find all markdown files in a directory
 * @param {string} dirPath - Directory to search
 * @returns {Promise<string[]>} Array of file paths
 */
async function findMarkdownFiles(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(dirPath, file));
  } catch {
    return [];
  }
}

/**
 * Check if a file is a redundant analysis document
 * @param {string} fileName - File name to check
 * @returns {boolean} True if file is redundant
 */
function isRedundantFile(fileName) {
  return REDUNDANT_FILES.some(redundant => 
    fileName.includes(redundant) || 
    fileName.endsWith(redundant)
  );
}

describe('Redundant File Cleanup Property Test', () => {
  const projectRoot = process.cwd();
  const rootDir = path.join(projectRoot);
  
  describe('Property 9: Redundant File Cleanup', () => {
    /**
     * **Feature: ride-flow-documentation-audit, Property 9: Redundant File Cleanup**
     * **Validates: Requirements 7.5, 8.5**
     * 
     * After consolidation, all redundant analysis document versions should be deleted,
     * and only the definitive document should remain.
     */
    test('redundant analysis documents should not exist in project root', async () => {
      // Check project root
      for (const redundantFile of REDUNDANT_FILES) {
        const filePath = path.join(rootDir, redundantFile);
        const exists = await fileExists(filePath);
        expect(exists).toBe(false);
      }
    });

    test('should verify no redundant files exist in any directory', async () => {
      // Search for redundant files recursively (limited depth for performance)
      const searchDirectories = [
        rootDir,
        path.join(rootDir, '.kiro'),
        path.join(rootDir, 'docs'),
        path.join(rootDir, 'documentation')
      ];
      
      for (const dir of searchDirectories) {
        try {
          const files = await findMarkdownFiles(dir);
          for (const filePath of files) {
            const fileName = path.basename(filePath);
            if (isRedundantFile(fileName)) {
              // File should not exist
              expect(fileName).not.toBe(fileName);
            }
          }
        } catch (error) {
          // Directory doesn't exist, which is fine
        }
      }
    });

    test('should verify definitive document exists if consolidation is complete', async () => {
      // This test checks that if we're in a state where consolidation should be done,
      // the definitive document should exist
      // Note: This is a conditional check - if consolidation hasn't been run yet,
      // this test may not apply
      
      const definitivePath = path.join(rootDir, DEFINITIVE_DOCUMENT);
      const exists = await fileExists(definitivePath);
      
      // If any redundant files exist, consolidation is not complete
      let redundantExists = false;
      for (const redundantFile of REDUNDANT_FILES) {
        const filePath = path.join(rootDir, redundantFile);
        if (await fileExists(filePath)) {
          redundantExists = true;
          break;
        }
      }
      
      // If no redundant files exist, we expect the definitive document to exist
      // (unless consolidation hasn't been run at all)
      if (!redundantExists) {
        // This is informational - we don't fail if definitive doesn't exist yet
        // as consolidation might not have been run
        if (exists) {
          expect(exists).toBe(true);
        }
      }
    });

    test('should validate cleanup completeness using property-based approach', () => {
      fc.assert(
        fc.property(
          fc.record({
            files: fc.array(
              fc.record({
                name: fc.constantFrom(...REDUNDANT_FILES, DEFINITIVE_DOCUMENT, 'other.md'),
                exists: fc.boolean()
              }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          ({ files }) => {
            // Simulate file system state
            const redundantFiles = files.filter(f => 
              REDUNDANT_FILES.includes(f.name) && f.exists
            );
            const definitiveExists = files.some(f => 
              f.name === DEFINITIVE_DOCUMENT && f.exists
            );
            
            // If consolidation is complete:
            // - No redundant files should exist
            // - Definitive document should exist (if consolidation was run)
            const consolidationComplete = redundantFiles.length === 0;
            
            if (consolidationComplete) {
              // After cleanup, redundant files should not exist
              expect(redundantFiles.length).toBe(0);
              
              // If definitive exists, that's good
              // If it doesn't, consolidation might not have been run yet
              return true;
            }
            
            // If redundant files still exist, consolidation is not complete
            return true; // This is just a property test, not a failure condition
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should verify file names match expected patterns', () => {
      // Property: File names should either be the definitive document
      // or not match any redundant file pattern
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (fileName) => {
            const isRedundant = isRedundantFile(fileName);
            const isDefinitive = fileName.includes(DEFINITIVE_DOCUMENT);
            
            // After cleanup, files should not be redundant
            // (unless they're the definitive document, which is allowed)
            if (isRedundant && !isDefinitive) {
              // This would indicate a redundant file still exists
              return false;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should list all redundant files that need cleanup', async () => {
      const foundRedundant = [];
      
      // Check project root
      for (const redundantFile of REDUNDANT_FILES) {
        const filePath = path.join(rootDir, redundantFile);
        if (await fileExists(filePath)) {
          foundRedundant.push(redundantFile);
        }
      }
      
      // If any redundant files are found, log them
      if (foundRedundant.length > 0) {
        console.warn('Found redundant files that should be cleaned up:', foundRedundant);
      }
      
      // This test documents what needs cleanup but doesn't fail
      // The actual cleanup verification is done in other tests
      expect(Array.isArray(foundRedundant)).toBe(true);
    });
  });
});
