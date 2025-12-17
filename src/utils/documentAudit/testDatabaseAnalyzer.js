/**
 * Test script for database schema analyzer
 */

// Import the functions directly since we're testing
import { 
  extractTableNames, 
  extractFieldDefinitions, 
  extractEnumDefinitions, 
  extractRelationships,
  readMigrationFiles,
  buildDatabaseNamingMap 
} from './databaseSchemaAnalyzer.js';

async function testDatabaseAnalyzer() {
  console.log('Testing Database Schema Analyzer...\n');
  
  try {
    // Read migration files
    const migrationFiles = await readMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration files\n`);
    
    // Extract schema components
    const tables = extractTableNames(migrationFiles);
    const fields = extractFieldDefinitions(migrationFiles);
    const enums = extractEnumDefinitions(migrationFiles);
    const relationships = extractRelationships(migrationFiles);
    
    // Build naming map
    const namingMap = buildDatabaseNamingMap({
      tables, fields, enums, relationships
    });
    
    console.log('=== EXTRACTED TABLES ===');
    Object.keys(namingMap.tables).forEach(table => {
      console.log(`- ${table}`);
    });
    
    console.log('\n=== SAMPLE FIELDS ===');
    const sampleFields = Object.entries(namingMap.fields).slice(0, 10);
    sampleFields.forEach(([key, field]) => {
      console.log(`- ${key}: ${field.dataType} (${field.tableName})`);
    });
    
    console.log('\n=== EXTRACTED ENUMS ===');
    Object.entries(namingMap.enums).forEach(([key, enumDef]) => {
      if (enumDef.values) {
        console.log(`- ${key}: [${enumDef.values.join(', ')}]`);
      }
    });
    
    console.log('\n=== SAMPLE RELATIONSHIPS ===');
    const sampleRels = Object.entries(namingMap.relationships).slice(0, 5);
    sampleRels.forEach(([key, rel]) => {
      console.log(`- ${key} -> ${rel.targetTable}.${rel.targetField}`);
    });
    
    console.log('\n=== METADATA ===');
    console.log(JSON.stringify(namingMap.metadata, null, 2));
    
    return namingMap;
  } catch (error) {
    console.error('Error testing database analyzer:', error);
    return null;
  }
}

// Run test
testDatabaseAnalyzer().then(() => {
  console.log('\nTest completed successfully!');
}).catch(error => {
  console.error('Test failed:', error);
});

export { testDatabaseAnalyzer };