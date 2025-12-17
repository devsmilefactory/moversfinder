// Test component name extraction
const fs = require('fs').promises;
const path = require('path');

// Simple component extraction for testing
async function findComponentFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findComponentFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}:`, error.message);
  }
  
  return files;
}

async function extractComponentNames(files) {
  const components = [];
  
  for (const filePath of files) { // Test all files
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, '.jsx');
      
      // Look for default export
      const defaultExportMatch = content.match(/export\s+default\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      
      if (defaultExportMatch) {
        components.push({
          name: defaultExportMatch[1],
          fileName,
          filePath: filePath.replace(/\\/g, '/'),
          exportType: 'default'
        });
      } else if (/^[A-Z]/.test(fileName)) {
        // Assume component name matches file name
        components.push({
          name: fileName,
          fileName,
          filePath: filePath.replace(/\\/g, '/'),
          exportType: 'assumed'
        });
      }
    } catch (error) {
      console.warn(`Could not read ${filePath}:`, error.message);
    }
  }
  
  return components;
}

async function testComponentExtraction() {
  try {
    console.log('Testing component name extraction...\n');
    
    // Find component files in driver dashboard
    const driverComponents = await findComponentFiles('src/dashboards/driver/components');
    console.log(`Found ${driverComponents.length} driver component files\n`);
    
    // Extract component names
    const components = await extractComponentNames(driverComponents);
    
    console.log('=== EXTRACTED COMPONENTS ===');
    components.forEach(comp => {
      console.log(`- ${comp.name} (${comp.exportType}) -> ${comp.filePath}`);
    });
    
    // Test some specific components mentioned in analysis documents
    const testComponents = [
      'DriverRideCard',
      'PlaceBidModal', 
      'RecurringSeriesCard',
      'RideList',
      'ActiveRideOverlay'
    ];
    
    console.log('\n=== COMPONENT VERIFICATION ===');
    testComponents.forEach(testComp => {
      const found = components.find(comp => comp.name === testComp);
      if (found) {
        console.log(`✓ ${testComp} -> ${found.filePath}`);
      } else {
        console.log(`✗ ${testComp} -> NOT FOUND`);
      }
    });
    
    console.log('\nComponent extraction test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testComponentExtraction();