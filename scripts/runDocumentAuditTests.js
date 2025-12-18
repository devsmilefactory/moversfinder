/**
 * Script to run all document audit property tests
 * 
 * This script runs all property-based tests for the ride flow documentation audit.
 * 
 * Usage: node scripts/runDocumentAuditTests.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function main() {
  console.log('='.repeat(60));
  console.log('Document Audit Property Tests');
  console.log('='.repeat(60));
  console.log('');

  const testFiles = [
    'src/utils/documentAudit/__tests__/databaseFieldNameAccuracy.test.js',
    'src/utils/documentAudit/__tests__/componentReferenceAccuracy.test.js',
    'src/utils/documentAudit/__tests__/apiFunctionAccuracy.test.js',
    'src/utils/documentAudit/__tests__/statusValueAccuracy.test.js',
    'src/utils/documentAudit/__tests__/configurationAccuracy.test.js',
    'src/utils/documentAudit/__tests__/hookServiceAccuracy.test.js',
    'src/utils/documentAudit/__tests__/contentPreservation.test.js',
    'src/utils/documentAudit/__tests__/duplicateElimination.test.js',
    'src/utils/documentAudit/__tests__/redundantFileCleanup.test.js'
  ];

  console.log(`Running ${testFiles.length} property tests...`);
  console.log('');

  // Run tests using vitest
  const testProcess = spawn('npm', ['test', '--', ...testFiles], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });

  testProcess.on('close', (code) => {
    console.log('');
    console.log('='.repeat(60));
    if (code === 0) {
      console.log('✅ All property tests passed!');
    } else {
      console.log(`❌ Tests exited with code ${code}`);
    }
    console.log('='.repeat(60));
    process.exit(code);
  });

  testProcess.on('error', (error) => {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Error running tests');
    console.error('='.repeat(60));
    console.error(error.message);
    console.error('');
    process.exit(1);
  });
}

main();


