/**
 * Test script for duplicate detector
 */

async function testDuplicateDetector() {
  console.log('Testing Duplicate Detector...\n');
  
  try {
    const { 
      detectDuplicateContent,
      identifyContradictions,
      createDeduplicationPlan,
      detectAndHandleDuplicates 
    } = await import('./duplicateDetector.js');
    
    // Create mock documents with duplicate content
    const mockDocuments = [
      {
        filePath: 'doc1.md',
        sections: [
          {
            title: 'Introduction',
            content: 'This is the introduction to the ride booking system. Users can book rides through the mobile app.',
            type: 'overview',
            level: 1
          },
          {
            title: 'Database Schema',
            content: 'The rides table contains fields: id, user_id, driver_id, pickup_location, dropoff_location, ride_status.',
            type: 'database_reference',
            level: 2
          }
        ]
      },
      {
        filePath: 'doc2.md',
        sections: [
          {
            title: 'Overview',
            content: 'This is the introduction to the ride booking system. Users can book rides through the mobile app.',
            type: 'overview',
            level: 1
          },
          {
            title: 'Database Fields',
            content: 'The rides table contains fields: id, user_id, driver_id, pickup_location, dropoff_location, ride_status, created_at.',
            type: 'database_reference',
            level: 2
          }
        ]
      },
      {
        filePath: 'doc3.md',
        sections: [
          {
            title: 'System Requirements',
            content: 'The system must be available 24/7 and handle high traffic loads.',
            type: 'requirements',
            level: 1
          }
        ]
      }
    ];
    
    console.log('=== DUPLICATE DETECTION TEST ===');
    const duplicateResults = detectDuplicateContent(mockDocuments);
    
    console.log(`Found ${duplicateResults.duplicates.length} exact duplicate groups`);
    console.log(`Found ${duplicateResults.similarities.length} similar content pairs`);
    
    duplicateResults.duplicates.forEach((duplicate, index) => {
      console.log(`\nDuplicate ${index + 1}:`);
      console.log(`  Occurrences: ${duplicate.duplicateCount}`);
      duplicate.occurrences.forEach(occ => {
        console.log(`    - ${occ.document}: ${occ.section}`);
      });
    });
    
    duplicateResults.similarities.forEach((similarity, index) => {
      console.log(`\nSimilarity ${index + 1}:`);
      console.log(`  Similarity: ${similarity.similarity.toFixed(2)}`);
      console.log(`  Content 1: ${similarity.content1.document}: ${similarity.content1.section}`);
      console.log(`  Content 2: ${similarity.content2.document}: ${similarity.content2.section}`);
      console.log(`  Differences: ${similarity.differences.totalChanges} changes`);
    });
    
    console.log('\n=== CONTRADICTION DETECTION TEST ===');
    const contradictions = identifyContradictions(duplicateResults.duplicates, duplicateResults.similarities);
    console.log(`Found ${contradictions.length} contradictions`);
    
    console.log('\n=== DEDUPLICATION PLAN TEST ===');
    const deduplicationPlan = createDeduplicationPlan(duplicateResults);
    console.log(`Items to keep: ${deduplicationPlan.toKeep.length}`);
    console.log(`Items to remove: ${deduplicationPlan.toRemove.length}`);
    console.log(`Items to merge: ${deduplicationPlan.toMerge.length}`);
    console.log(`Conflicts: ${deduplicationPlan.conflicts.length}`);
    
    console.log('\n=== COMPLETE DUPLICATE HANDLING TEST ===');
    const completeResults = await detectAndHandleDuplicates(mockDocuments);
    console.log('Complete Results:');
    console.log(`  Final content items: ${completeResults.metadata.finalContentItems}`);
    console.log(`  Duplicates found: ${completeResults.metadata.duplicatesFound}`);
    console.log(`  Similarities found: ${completeResults.metadata.similaritiesFound}`);
    
    return completeResults;
  } catch (error) {
    console.error('Error testing duplicate detector:', error);
    return null;
  }
}

// Run test
testDuplicateDetector().then(() => {
  console.log('\nDuplicate detector test completed!');
}).catch(error => {
  console.error('Test failed:', error);
});

module.exports = { testDuplicateDetector };