/**
 * Test script for document parser
 */

// Import the functions using dynamic import since we're in CommonJS
async function testDocumentParser() {
  console.log('Testing Document Parser...\n');
  
  try {
    const { 
      parseAllSourceDocuments,
      parseDocumentSections,
      extractDocumentMetadata 
    } = await import('./documentParser.js');
    
    // Test parsing all source documents
    const analysis = await parseAllSourceDocuments();
    
    console.log('=== DOCUMENT ANALYSIS SUMMARY ===');
    console.log(`Total documents: ${analysis.metadata.totalDocuments}`);
    console.log(`Existing documents: ${analysis.metadata.existingDocuments}`);
    console.log(`Total sections: ${analysis.metadata.totalSections}`);
    
    console.log('\n=== DOCUMENTS FOUND ===');
    analysis.documents.forEach(doc => {
      console.log(`- ${doc.filePath}: ${doc.metadata.exists ? 'EXISTS' : 'MISSING'}`);
      if (doc.metadata.exists) {
        console.log(`  Sections: ${doc.sections.length}, Type: ${doc.metadata.documentType}`);
      }
    });
    
    console.log('\n=== CATEGORIZED CONTENT ===');
    Object.entries(analysis.categorizedContent).forEach(([category, items]) => {
      console.log(`${category}: ${items.length} items`);
    });
    
    console.log('\n=== DUPLICATE CONTENT ===');
    console.log(`Found ${analysis.duplicates.length} duplicate content blocks`);
    analysis.duplicates.slice(0, 3).forEach((dup, index) => {
      console.log(`${index + 1}. Duplicated ${dup.duplicateCount} times across:`);
      dup.occurrences.forEach(occ => {
        console.log(`   - ${occ.document}: ${occ.section}`);
      });
    });
    
    return analysis;
  } catch (error) {
    console.error('Error testing document parser:', error);
    return null;
  }
}

// Run test
testDocumentParser().then(() => {
  console.log('\nDocument parser test completed!');
}).catch(error => {
  console.error('Test failed:', error);
});

module.exports = { testDocumentParser };