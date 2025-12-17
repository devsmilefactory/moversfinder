// Simple test to verify database schema extraction works
const fs = require('fs').promises;

// Simple extraction functions
function extractTableNames(migrationFiles) {
  const tableNames = new Set();
  
  migrationFiles.forEach(content => {
    const createTableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      tableNames.add(match[1]);
    }
  });
  
  return Array.from(tableNames).sort();
}

async function testExtraction() {
  try {
    console.log('Testing database schema extraction...\n');
    
    // Read the migration files directly
    const schema = await fs.readFile('supabase/migrations/20251211000001_consolidated_ride_system_schema.sql', 'utf-8');
    const rpcs = await fs.readFile('supabase/migrations/20251211000002_consolidated_feed_rpcs.sql', 'utf-8');
    
    const migrationFiles = [schema, rpcs];
    
    // Extract table names
    const tables = extractTableNames(migrationFiles);
    
    console.log('=== EXTRACTED TABLES ===');
    tables.forEach(table => {
      console.log(`- ${table}`);
    });
    
    // Extract some field names from rides table
    const ridesTableMatch = schema.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+rides\s*\(([\s\S]*?)\);/i);
    if (ridesTableMatch) {
      console.log('\n=== SAMPLE FIELDS FROM RIDES TABLE ===');
      const columnSection = ridesTableMatch[1];
      const lines = columnSection.split('\n');
      
      lines.slice(0, 15).forEach(line => {
        const trimmedLine = line.trim();
        const columnMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+([A-Z][A-Z0-9_()]*)/i);
        
        if (columnMatch) {
          console.log(`- ${columnMatch[1]}: ${columnMatch[2]}`);
        }
      });
    }
    
    // Extract enum values
    console.log('\n=== EXTRACTED ENUMS ===');
    const enumRegex = /CREATE TYPE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s+ENUM\s*\(\s*([^)]+)\s*\)/gi;
    let match;
    
    while ((match = enumRegex.exec(schema)) !== null) {
      const enumName = match[1];
      const valuesString = match[2];
      const values = valuesString.split(',').map(v => v.trim().replace(/^'|'$/g, ''));
      console.log(`- ${enumName}: [${values.join(', ')}]`);
    }
    
    console.log('\nExtraction test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testExtraction();