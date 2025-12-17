/**
 * Test script for content categorizer
 */

async function testContentCategorizer() {
  console.log('Testing Content Categorizer...\n');
  
  try {
    const { 
      categorizeContent,
      separateFlowLogicFromNaming,
      buildContentCategorizationSystem 
    } = await import('./contentCategorizer.js');
    
    // Test different types of content
    const testContents = [
      {
        name: 'Flow Logic',
        content: 'When a user clicks the book ride button, the system first validates the pickup location, then processes the payment, and finally creates a new ride record.',
        context: 'Ride Booking Process'
      },
      {
        name: 'Database Reference',
        content: 'The rides.pickup_location field stores the pickup address, while rides.ride_status indicates the current state of the ride.',
        context: 'Database Schema'
      },
      {
        name: 'Component Reference',
        content: 'The <BookingModal> component renders the ride booking form. Import { RideCard, PaymentForm } from "./components".',
        context: 'UI Components'
      },
      {
        name: 'API Reference',
        content: 'Call get_driver_rides(driver_id) to fetch available rides. The create_ride_request() function handles new bookings.',
        context: 'API Functions'
      },
      {
        name: 'Status Reference',
        content: 'Ride status can be PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, or CANCELLED.',
        context: 'Status Constants'
      }
    ];
    
    console.log('=== CONTENT CATEGORIZATION TESTS ===');
    testContents.forEach(test => {
      const result = categorizeContent(test.content, test.context);
      console.log(`\n${test.name}:`);
      console.log(`  Primary Type: ${result.type}`);
      console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`  Categories: ${result.categories.map(c => `${c.type}(${c.score.toFixed(2)})`).join(', ')}`);
      
      // Show extracted references
      Object.entries(result.extractedReferences).forEach(([refType, refs]) => {
        if (refs.length > 0) {
          console.log(`  ${refType}: ${refs.length} references`);
        }
      });
    });
    
    // Test separation of flow logic from naming
    console.log('\n=== FLOW LOGIC SEPARATION TEST ===');
    const mockCategorizedContent = {
      flow_logic: [
        {
          content: testContents[0].content,
          title: testContents[0].context,
          sourceDocument: 'test.md'
        }
      ],
      database_reference: [
        {
          content: testContents[1].content,
          title: testContents[1].context,
          sourceDocument: 'test.md'
        }
      ]
    };
    
    const separated = separateFlowLogicFromNaming(mockCategorizedContent);
    console.log(`Preservable content: ${separated.preservableContent.length} items`);
    console.log(`Correctable content: ${separated.correctableContent.length} items`);
    
    separated.preservableContent.forEach((item, index) => {
      console.log(`  Preservable ${index + 1}: ${item.preservationReason} (confidence: ${item.confidence.toFixed(2)})`);
    });
    
    separated.correctableContent.forEach((item, index) => {
      console.log(`  Correctable ${index + 1}: ${item.correctionType} (confidence: ${item.confidence.toFixed(2)})`);
    });
    
    return { testResults: testContents.map(test => categorizeContent(test.content, test.context)), separated };
  } catch (error) {
    console.error('Error testing content categorizer:', error);
    return null;
  }
}

// Run test
testContentCategorizer().then(() => {
  console.log('\nContent categorizer test completed!');
}).catch(error => {
  console.error('Test failed:', error);
});

module.exports = { testContentCategorizer };