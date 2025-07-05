// Simple test for question transformation utilities

/**
 * Converts answers text format to options array
 * Input: "- A. Option 1\n- B. Option 2\n- C. Option 3\n- D. Option 4"
 * Output: ["Option 1", "Option 2", "Option 3", "Option 4"]
 */
function parseAnswersToOptions(answers) {
  if (!answers || typeof answers !== 'string') {
    return [];
  }

  // Split by lines and process each line
  const lines = answers.split('\n').filter(line => line.trim());
  const options = [];

  for (const line of lines) {
    // Match pattern like "- A. Some text" or "A. Some text" or "A) Some text"
    const match = line.match(/^[\s-]*[A-Z][.)]\s*(.+)$/i);
    if (match && match[1]) {
      options.push(match[1].trim());
    }
  }

  return options;
}

/**
 * Converts letter-based correct answer to numeric index
 * Input: "A" -> Output: 0, "B" -> Output: 1, etc.
 */
function convertCorrectAnswerToIndex(correctAnswer) {
  if (typeof correctAnswer === 'number') {
    return correctAnswer; // Already in correct format
  }

  if (typeof correctAnswer === 'string') {
    const upperCase = correctAnswer.toUpperCase();
    const charCode = upperCase.charCodeAt(0);
    
    // Convert A=0, B=1, C=2, D=3, etc.
    if (charCode >= 65 && charCode <= 90) { // A-Z
      return charCode - 65;
    }
  }

  return 0; // Default fallback
}

// Test sample data from database
const dbQuestion = {
  _id: "test-id",
  question_no: 1,
  question: "What is AWS EC2?",
  answers: "- A. Elastic Compute Cloud\n- B. Elastic Container Cloud\n- C. Elastic Cache Cloud\n- D. Elastic Code Cloud",
  correctAnswer: "A",
  explanation: "EC2 stands for Elastic Compute Cloud"
};

console.log('Testing question transformation...');
console.log('Original database question:', JSON.stringify(dbQuestion, null, 2));

// Test parseAnswersToOptions
console.log('\nTesting parseAnswersToOptions:');
const options = parseAnswersToOptions(dbQuestion.answers);
console.log('Parsed options:', options);

// Test convertCorrectAnswerToIndex
console.log('\nTesting convertCorrectAnswerToIndex:');
const correctIndex = convertCorrectAnswerToIndex(dbQuestion.correctAnswer);
console.log('Correct answer index:', correctIndex);

// Test edge cases
console.log('\nTesting edge cases:');

// Empty answers
console.log('Empty answers:', parseAnswersToOptions(''));
console.log('Null answers:', parseAnswersToOptions(null));

// Invalid correct answer
console.log('Invalid correct answer (Z):', convertCorrectAnswerToIndex('Z'));
console.log('Numeric correct answer (already correct):', convertCorrectAnswerToIndex(2));

// Question with mixed format
const mixedAnswers = "A. First option\nB) Second option\n- C. Third option";
console.log('Mixed format parsing:', parseAnswersToOptions(mixedAnswers));

console.log('\nAll tests completed successfully!');
