/**
 * Test script for the step quiz API endpoint
 */

async function testStepQuizAPI() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🧪 Testing Step Quiz API...\n');
    
    // Test 1: Submit correct answers for all steps
    console.log('Test 1: Submitting correct answers for all steps');
    const correctAnswers = {
      1: 'A', // Correct answer for step 1
      2: 'B', // Correct answer for step 2  
      3: 'B'  // Correct answer for step 3
    };
    
    const response1 = await fetch(`${baseUrl}/api/saved-questions/999901/step-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers: correctAnswers,
        timeSpent: 120 // 2 minutes
      })
    });
    
    const result1 = await response1.json();
    console.log('✅ Response:', result1);
    console.log('Expected: All correct, score should be 100%\n');
    
    // Test 2: Submit mixed answers (some correct, some incorrect)
    console.log('Test 2: Submitting mixed answers');
    const mixedAnswers = {
      1: 'A', // Correct
      2: 'A', // Incorrect (should be B)
      3: 'B'  // Correct
    };
    
    const response2 = await fetch(`${baseUrl}/api/saved-questions/999901/step-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers: mixedAnswers,
        timeSpent: 90
      })
    });
    
    const result2 = await response2.json();
    console.log('✅ Response:', result2);
    console.log('Expected: Not all correct, score should be 0% (all-or-nothing)\n');
    
    // Test 3: Submit incomplete answers
    console.log('Test 3: Submitting incomplete answers');
    const incompleteAnswers = {
      1: 'A',
      2: 'B'
      // Missing step 3
    };
    
    const response3 = await fetch(`${baseUrl}/api/saved-questions/999901/step-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers: incompleteAnswers,
        timeSpent: 60
      })
    });
    
    const result3 = await response3.json();
    console.log('✅ Response:', result3);
    console.log('Expected: Error or validation message for incomplete answers\n');
    
    // Test 4: Test with invalid question ID
    console.log('Test 4: Testing with invalid question ID');
    const response4 = await fetch(`${baseUrl}/api/saved-questions/invalid-id/step-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers: correctAnswers,
        timeSpent: 120
      })
    });
    
    const result4 = await response4.json();
    console.log('✅ Response:', result4);
    console.log('Expected: Error for invalid question ID\n');
    
  } catch (error) {
    console.error('❌ Error testing step quiz API:', error);
  }
}

// Run the test
testStepQuizAPI().catch(console.error);
