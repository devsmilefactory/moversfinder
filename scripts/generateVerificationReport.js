/**
 * Script to generate verification report
 * 
 * This script generates a comprehensive verification and correction report
 * for the ride flow documentation audit process.
 * 
 * Usage: node scripts/generateVerificationReport.js [output-path]
 */

import { generateAndSaveReport } from '../src/utils/documentAudit/verificationReportGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function main() {
  const outputPath = process.argv[2] || path.join(projectRoot, 'VERIFICATION_REPORT.md');
  
  console.log('='.repeat(60));
  console.log('Verification Report Generator');
  console.log('='.repeat(60));
  console.log(`Project Root: ${projectRoot}`);
  console.log(`Output Path: ${outputPath}`);
  console.log('');

  try {
    const reportPath = await generateAndSaveReport(outputPath, {
      projectRoot,
      includeDetailedStats: true
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Verification report generated successfully!');
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the verification report');
    console.log('2. Run property tests: npm test -- documentAudit');
    console.log('3. Address any recommendations in the report');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Error generating verification report');
    console.error('='.repeat(60));
    console.error(error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();




