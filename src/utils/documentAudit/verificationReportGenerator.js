/**
 * Verification Report Generator
 * 
 * Generates a comprehensive verification and correction report showing:
 * - All naming corrections made
 * - Verification results from property tests
 * - Remaining issues or missing references
 * - File cleanup status
 * 
 * **Feature: ride-flow-documentation-audit, Task 4.3**
 * **Validates: Requirements 1.5, 2.5, 3.5, 4.5, 5.5, 6.5**
 */

import fs from 'fs/promises';
import path from 'path';
import { NamingReplacementEngine } from './namingReplacementEngine.js';
import { buildHookServiceNamingMaps } from './hookServiceAnalyzer.js';
import { extractDatabaseNaming } from './databaseSchemaAnalyzer.js';
import { extractComponentNaming } from './componentNameExtractor.js';
import { extractAPIFunctionNaming } from './apiFunctionAnalyzer.js';
import { buildStatusConfigNamingMaps } from './statusConfigExtractor.js';

// List of redundant files that should be deleted
const REDUNDANT_FILES = [
  'COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md',
  'COMPREHENSIVE_RIDE_FLOW_ANALYSIS_CORRECTED.md',
  'UPDATED_COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md',
  'GAP_ANALYSIS_IMPLEMENTATION_PATCHES.md'
];

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
 * Generate comprehensive verification report
 * @param {Object} options - Report generation options
 * @returns {Promise<Object>} Verification report
 */
export async function generateVerificationReport(options = {}) {
  const {
    projectRoot = process.cwd(),
    outputPath = null,
    includeDetailedStats = true
  } = options;

  console.log('Generating verification report...');

  // 1. Load naming maps and get replacement statistics
  const namingEngine = new NamingReplacementEngine();
  await namingEngine.initialize();
  const replacementReport = namingEngine.generateReplacementReport();
  const replacementStats = namingEngine.getReplacementStats();

  // 2. Check file cleanup status
  const fileCleanupStatus = await checkFileCleanupStatus(projectRoot);

  // 3. Get naming map summaries
  const namingMapSummary = await getNamingMapSummary();

  // 4. Build the report
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      projectRoot,
      reportVersion: '1.0.0'
    },
    summary: {
      totalNamingCorrections: replacementStats.totalReplacements || 0,
      missingReferences: replacementStats.missingReferences || 0,
      successRate: replacementReport.summary?.successRate || 'N/A',
      redundantFilesRemaining: fileCleanupStatus.redundantFilesFound.length,
      cleanupComplete: fileCleanupStatus.cleanupComplete,
      definitiveDocumentExists: fileCleanupStatus.definitiveDocumentExists
    },
    namingCorrections: {
      overview: {
        databaseFields: replacementStats.databaseFields || 0,
        components: replacementStats.components || 0,
        apiFunctions: replacementStats.apiFunctions || 0,
        statusValues: replacementStats.statusValues || 0,
        configurations: replacementStats.configurations || 0,
        hooks: replacementStats.hooks || 0,
        services: replacementStats.services || 0
      },
      details: includeDetailedStats ? replacementReport.details : null,
      namingMapsLoaded: replacementReport.namingMapsLoaded || {}
    },
    fileCleanup: {
      status: fileCleanupStatus.cleanupComplete ? 'COMPLETE' : 'INCOMPLETE',
      redundantFilesFound: fileCleanupStatus.redundantFilesFound,
      redundantFilesExpected: REDUNDANT_FILES,
      definitiveDocument: {
        exists: fileCleanupStatus.definitiveDocumentExists,
        path: fileCleanupStatus.definitiveDocumentPath
      }
    },
    namingMapSummary: namingMapSummary,
    propertyTests: {
      status: 'PENDING_EXECUTION',
      note: 'Run property tests separately to verify accuracy. See test files in __tests__ directory.',
      testFiles: [
        'databaseFieldNameAccuracy.test.js',
        'componentReferenceAccuracy.test.js',
        'apiFunctionAccuracy.test.js',
        'statusValueAccuracy.test.js',
        'configurationAccuracy.test.js',
        'hookServiceAccuracy.test.js',
        'contentPreservation.test.js',
        'duplicateElimination.test.js',
        'redundantFileCleanup.test.js'
      ]
    },
    recommendations: generateRecommendations(
      replacementStats,
      fileCleanupStatus,
      namingMapSummary
    ),
    nextSteps: generateNextSteps(
      replacementStats,
      fileCleanupStatus
    )
  };

  // 5. Write report to file if output path is provided
  if (outputPath) {
    const reportContent = formatReportAsMarkdown(report);
    await fs.writeFile(outputPath, reportContent, 'utf-8');
    console.log(`Verification report written to: ${outputPath}`);
  }

  return report;
}

/**
 * Check file cleanup status
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Cleanup status
 */
async function checkFileCleanupStatus(projectRoot) {
  const redundantFilesFound = [];
  let definitiveDocumentExists = false;
  let definitiveDocumentPath = null;

  // Check for redundant files
  for (const redundantFile of REDUNDANT_FILES) {
    const filePath = path.join(projectRoot, redundantFile);
    if (await fileExists(filePath)) {
      redundantFilesFound.push({
        name: redundantFile,
        path: filePath,
        exists: true
      });
    }
  }

  // Check for definitive document
  const definitivePath = path.join(projectRoot, 'COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md');
  definitiveDocumentExists = await fileExists(definitivePath);
  if (definitiveDocumentExists) {
    definitiveDocumentPath = definitivePath;
  }

  return {
    redundantFilesFound,
    cleanupComplete: redundantFilesFound.length === 0,
    definitiveDocumentExists,
    definitiveDocumentPath
  };
}

/**
 * Get summary of naming maps
 * @returns {Promise<Object>} Naming map summary
 */
async function getNamingMapSummary() {
  try {
    const [
      databaseMap,
      componentMap,
      apiMap,
      statusConfigMap,
      hookServiceMap
    ] = await Promise.all([
      extractDatabaseNaming().catch(() => ({ tables: {}, fields: {} })),
      extractComponentNaming().catch(() => ({ components: {} })),
      extractAPIFunctionNaming().catch(() => ({ all: {} })),
      buildStatusConfigNamingMaps().catch(() => ({ statusConstants: {}, configurations: {} })),
      buildHookServiceNamingMaps().catch(() => ({ hooks: {}, services: {} }))
    ]);

    return {
      database: {
        tablesCount: Object.keys(databaseMap.tables || {}).length,
        fieldsCount: Object.keys(databaseMap.fields || {}).length
      },
      components: {
        count: Object.keys(componentMap.components || {}).length
      },
      apiFunctions: {
        count: Object.keys(apiMap.all || {}).length
      },
      statusConfig: {
        statusConstantsCount: Object.keys(statusConfigMap.statusConstants || {}).length,
        configurationsCount: Object.keys(statusConfigMap.configurations || {}).length
      },
      hooksServices: {
        hooksCount: Object.keys(hookServiceMap.hooks || {}).length,
        servicesCount: Object.keys(hookServiceMap.services || {}).length
      }
    };
  } catch (error) {
    console.error('Error getting naming map summary:', error);
    return {
      error: error.message
    };
  }
}

/**
 * Generate recommendations based on report data
 * @param {Object} replacementStats - Replacement statistics
 * @param {Object} fileCleanupStatus - File cleanup status
 * @param {Object} namingMapSummary - Naming map summary
 * @returns {Array<string>} Recommendations
 */
function generateRecommendations(replacementStats, fileCleanupStatus, namingMapSummary) {
  const recommendations = [];

  // Check for missing references
  if (replacementStats.missingReferences > 0) {
    recommendations.push(
      `Review ${replacementStats.missingReferences} missing references marked in documentation. ` +
      'These may need to be implemented or the documentation should be updated.'
    );
  }

  // Check file cleanup
  if (!fileCleanupStatus.cleanupComplete) {
    recommendations.push(
      `Clean up ${fileCleanupStatus.redundantFilesFound.length} redundant analysis document(s). ` +
      'These files should be deleted after consolidation is complete.'
    );
  }

  // Check for definitive document
  if (!fileCleanupStatus.definitiveDocumentExists && fileCleanupStatus.cleanupComplete) {
    recommendations.push(
      'Generate the definitive comprehensive ride flow analysis document. ' +
      'This should be created after consolidation and naming corrections are complete.'
    );
  }

  // Check naming map coverage
  if (namingMapSummary.database?.tablesCount === 0) {
    recommendations.push(
      'Verify database schema analyzer is working correctly. No tables were extracted from migration files.'
    );
  }

  if (namingMapSummary.components?.count === 0) {
    recommendations.push(
      'Verify component name extractor is working correctly. No components were extracted from the codebase.'
    );
  }

  return recommendations;
}

/**
 * Generate next steps based on report data
 * @param {Object} replacementStats - Replacement statistics
 * @param {Object} fileCleanupStatus - File cleanup status
 * @returns {Array<string>} Next steps
 */
function generateNextSteps(replacementStats, fileCleanupStatus) {
  const nextSteps = [];

  // Always recommend running property tests
  nextSteps.push('Run all property-based tests to verify naming accuracy (Task 5.1)');

  // If cleanup is incomplete
  if (!fileCleanupStatus.cleanupComplete) {
    nextSteps.push('Complete redundant file cleanup (Task 4.2)');
  }

  // If definitive document doesn't exist
  if (!fileCleanupStatus.definitiveDocumentExists) {
    nextSteps.push('Generate definitive comprehensive ride flow analysis document (Task 4.1)');
  }

  // Validate content preservation
  nextSteps.push('Validate content preservation and consolidation (Task 5.2)');

  // Confirm cleanup completion
  if (fileCleanupStatus.cleanupComplete) {
    nextSteps.push('Confirm redundant file cleanup completion (Task 5.3)');
  }

  return nextSteps;
}

/**
 * Format report as markdown
 * @param {Object} report - Report object
 * @returns {string} Markdown formatted report
 */
function formatReportAsMarkdown(report) {
  let markdown = `# Verification and Correction Report\n\n`;
  markdown += `**Generated:** ${new Date(report.metadata.generatedAt).toLocaleString()}\n\n`;
  markdown += `**Project Root:** ${report.metadata.projectRoot}\n\n`;

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total Naming Corrections:** ${report.summary.totalNamingCorrections}\n`;
  markdown += `- **Missing References:** ${report.summary.missingReferences}\n`;
  markdown += `- **Success Rate:** ${report.summary.successRate}\n`;
  markdown += `- **Redundant Files Remaining:** ${report.summary.redundantFilesRemaining}\n`;
  markdown += `- **Cleanup Complete:** ${report.summary.cleanupComplete ? '✅ Yes' : '❌ No'}\n`;
  markdown += `- **Definitive Document Exists:** ${report.summary.definitiveDocumentExists ? '✅ Yes' : '❌ No'}\n\n`;

  // Naming Corrections
  markdown += `## Naming Corrections\n\n`;
  markdown += `### Overview\n\n`;
  const corrections = report.namingCorrections.overview;
  markdown += `- Database Fields: ${corrections.databaseFields}\n`;
  markdown += `- Components: ${corrections.components}\n`;
  markdown += `- API Functions: ${corrections.apiFunctions}\n`;
  markdown += `- Status Values: ${corrections.statusValues}\n`;
  markdown += `- Configurations: ${corrections.configurations}\n`;
  markdown += `- Hooks: ${corrections.hooks}\n`;
  markdown += `- Services: ${corrections.services}\n\n`;

  if (report.namingCorrections.namingMapsLoaded) {
    markdown += `### Naming Maps Loaded\n\n`;
    const maps = report.namingCorrections.namingMapsLoaded;
    markdown += `- Database Tables: ${maps.databaseTables || 0}\n`;
    markdown += `- Database Fields: ${maps.databaseFields || 0}\n`;
    markdown += `- Components: ${maps.components || 0}\n`;
    markdown += `- API Functions: ${maps.apiFunctions || 0}\n`;
    markdown += `- Status Constants: ${maps.statusConstants || 0}\n`;
    markdown += `- Configurations: ${maps.configurations || 0}\n`;
    markdown += `- Hooks: ${maps.hooks || 0}\n`;
    markdown += `- Services: ${maps.services || 0}\n\n`;
  }

  // File Cleanup
  markdown += `## File Cleanup Status\n\n`;
  markdown += `**Status:** ${report.fileCleanup.status}\n\n`;
  
  if (report.fileCleanup.redundantFilesFound.length > 0) {
    markdown += `### Redundant Files Found\n\n`;
    report.fileCleanup.redundantFilesFound.forEach(file => {
      markdown += `- ❌ ${file.name} (${file.path})\n`;
    });
    markdown += `\n`;
  } else {
    markdown += `✅ All redundant files have been cleaned up.\n\n`;
  }

  markdown += `**Definitive Document:** ${report.fileCleanup.definitiveDocument.exists ? '✅ Exists' : '❌ Not Found'}\n`;
  if (report.fileCleanup.definitiveDocument.path) {
    markdown += `  - Path: ${report.fileCleanup.definitiveDocument.path}\n`;
  }
  markdown += `\n`;

  // Property Tests
  markdown += `## Property Tests\n\n`;
  markdown += `**Status:** ${report.propertyTests.status}\n\n`;
  markdown += `${report.propertyTests.note}\n\n`;
  markdown += `### Test Files\n\n`;
  report.propertyTests.testFiles.forEach(testFile => {
    markdown += `- ${testFile}\n`;
  });
  markdown += `\n`;

  // Recommendations
  if (report.recommendations.length > 0) {
    markdown += `## Recommendations\n\n`;
    report.recommendations.forEach((rec, index) => {
      markdown += `${index + 1}. ${rec}\n`;
    });
    markdown += `\n`;
  }

  // Next Steps
  if (report.nextSteps.length > 0) {
    markdown += `## Next Steps\n\n`;
    report.nextSteps.forEach((step, index) => {
      markdown += `${index + 1}. ${step}\n`;
    });
    markdown += `\n`;
  }

  return markdown;
}

/**
 * Convenience function to generate and save report
 * @param {string} outputPath - Path to save report
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Path to saved report
 */
export async function generateAndSaveReport(outputPath = 'VERIFICATION_REPORT.md', options = {}) {
  const report = await generateVerificationReport({
    ...options,
    outputPath
  });
  return outputPath;
}




