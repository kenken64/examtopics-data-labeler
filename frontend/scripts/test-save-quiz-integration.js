// Test script to simulate saving a new quiz question via the API
require('dotenv').config();

const testSaveQuiz = async () => {
  const certificateId = '686c02b179d97f09b5278957';
  
  // Mock quiz data for testing
  const testQuiz = {
    certificateId: certificateId,
    question: "Test question for integrity validation - What is the primary benefit of using AI in cloud services?",
    explanation: "This is a test question created to validate the access code questions integrity system.",
    options: [
      { id: 'A', text: 'Reduced costs', isCorrect: true },
      { id: 'B', text: 'Increased complexity', isCorrect: false },
      { id: 'C', text: 'Manual processes', isCorrect: false },
      { id: 'D', text: 'Slower performance', isCorrect: false }
    ],
    questionType: 'multiple-choice',
    tags: ['test', 'integrity-validation']
  };

  try {
    console.log('=== Testing Save Quiz with Integrity Check ===');
    console.log(`Certificate ID: ${certificateId}`);
    console.log(`Question: ${testQuiz.question}\n`);

    const response = await fetch('http://localhost:3000/api/save-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, you'd need proper authentication
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testQuiz)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Quiz saved successfully!');
      console.log(`   Question ID: ${result.id}`);
      console.log(`   Question Number: ${result.questionNo}`);
      console.log(`   Message: ${result.message}`);
    } else {
      console.log('❌ Failed to save quiz:');
      console.log(`   Error: ${result.error}`);
    }

    return result;

  } catch (error) {
    console.error('Error testing save quiz:', error);
    return null;
  }
};

// Run the test
testSaveQuiz().then(result => {
  if (result) {
    console.log('\n=== Next Steps ===');
    console.log('1. Check integrity after save:');
    console.log('   node scripts/test-access-code-questions-integrity.js 686c02b179d97f09b5278957');
    console.log('');
    console.log('2. Clean up mock records:');
    console.log('   node scripts/add-mock-access-code-question.js 686c02b179d97f09b5278957 AC-F2NOKPMQ cleanup');
  }
});
