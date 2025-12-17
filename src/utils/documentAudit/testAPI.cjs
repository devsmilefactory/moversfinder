// Test API function extraction
const fs = require('fs').promises;

async function testAPIExtraction() {
  try {
    console.log('Testing API function extraction...\n');
    
    // Test RPC function extraction
    const schema = await fs.readFile('supabase/migrations/20251211000001_consolidated_ride_system_schema.sql', 'utf-8');
    const rpcs = await fs.readFile('supabase/migrations/20251211000002_consolidated_feed_rpcs.sql', 'utf-8');
    
    const migrationFiles = [schema, rpcs];
    
    // Extract RPC functions
    console.log('=== EXTRACTED RPC FUNCTIONS ===');
    const functionRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)/gi;
    let match;
    
    migrationFiles.forEach(content => {
      while ((match = functionRegex.exec(content)) !== null) {
        const functionName = match[1];
        const parametersString = match[2];
        
        console.log(`- ${functionName}`);
        if (parametersString.trim()) {
          const params = parametersString.split(',').map(p => p.trim().split(/\s+/)[0]);
          console.log(`  Parameters: ${params.join(', ')}`);
        }
      }
    });
    
    // Test service function extraction from one file
    console.log('\n=== SAMPLE SERVICE FUNCTIONS ===');
    try {
      const driverRidesApi = await fs.readFile('src/services/driverRidesApi.js', 'utf-8');
      
      // Match export async function patterns
      const exportFunctionRegex = /export\s+async\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
      let serviceMatch;
      
      while ((serviceMatch = exportFunctionRegex.exec(driverRidesApi)) !== null) {
        console.log(`- ${serviceMatch[1]} (from driverRidesApi.js)`);
      }
      
      // Match export const patterns
      const exportConstRegex = /export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*async/g;
      
      while ((serviceMatch = exportConstRegex.exec(driverRidesApi)) !== null) {
        console.log(`- ${serviceMatch[1]} (const from driverRidesApi.js)`);
      }
      
    } catch (error) {
      console.log('Could not read driverRidesApi.js:', error.message);
    }
    
    // Test hook function extraction from one file
    console.log('\n=== SAMPLE HOOK FUNCTIONS ===');
    try {
      const driverFeedHook = await fs.readFile('src/hooks/useDriverRidesFeed.js', 'utf-8');
      
      // Match hook patterns
      const hookRegex = /export\s+(?:function\s+|const\s+)?(use[a-zA-Z0-9_]*)/g;
      let hookMatch;
      
      while ((hookMatch = hookRegex.exec(driverFeedHook)) !== null) {
        console.log(`- ${hookMatch[1]} (from useDriverRidesFeed.js)`);
      }
      
    } catch (error) {
      console.log('Could not read useDriverRidesFeed.js:', error.message);
    }
    
    console.log('\nAPI function extraction test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPIExtraction();