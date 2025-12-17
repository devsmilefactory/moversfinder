#!/usr/bin/env node

/**
 * Build Verification Script
 * Verifies that deployment configuration files are present in the build directory
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildDir = join(__dirname, '..', 'build');

const requiredFiles = [
  { name: 'index.html', required: true }
];

const optionalFiles = [
  { name: '.htaccess', platform: 'Apache' },
  { name: '_redirects', platform: 'Netlify' },
  { name: 'vercel.json', platform: 'Vercel' }
];

console.log('🔍 Verifying build output...\n');

let allRequiredPresent = true;

// Check required files
requiredFiles.forEach(file => {
  const filePath = join(buildDir, file.name);
  const exists = existsSync(filePath);
  
  if (exists) {
    console.log(`✅ ${file.name} - Present (Required)`);
  } else {
    console.log(`❌ ${file.name} - Missing (Required)`);
    allRequiredPresent = false;
  }
});

console.log('');

// Check optional files
let optionalCount = 0;
optionalFiles.forEach(file => {
  const filePath = join(buildDir, file.name);
  const exists = existsSync(filePath);
  
  if (exists) {
    console.log(`✅ ${file.name} - Present (${file.platform})`);
    optionalCount++;
  } else {
    console.log(`⚠️  ${file.name} - Missing (Optional for ${file.platform})`);
  }
});

console.log('');

if (allRequiredPresent) {
  console.log('✅ Required files are present in build directory!');
  if (optionalCount > 0) {
    console.log(`📦 Found ${optionalCount} deployment configuration file(s).`);
  } else {
    console.log('💡 Note: No deployment config files found. This is OK if you\'re using a different hosting platform.');
  }
  console.log('📦 Your build is ready for deployment.\n');
  process.exit(0);
} else {
  console.log('❌ Required files are missing!');
  console.log('💡 Make sure the build completed successfully.\n');
  process.exit(1);
}

