/**
 * Test script to verify the fix for "answer.replace is not a function" error
 * Tests various data types that might be passed to utility functions
 */

// Import utility functions (simulate the fixed versions)

function normalizeAnswer(answer) {
  // Handle non-string inputs
  if (!answer && answer !== 0) return '';
  
  // Convert to string if it's a number
  const answerStr = String(answer);
  
  // Remove spaces and convert to uppercase
  const normalized = answerStr.replace(/\s+/g, '').toUpperCase();
  
  // Sort letters alphabetically for consistent comparison
  return normalized.split('').sort().join('');
}

function isMultipleAnswerQuestion(correctAnswer) {
  if (!correctAnswer && correctAnswer !== 0) return false;
  
  const normalized = normalizeAnswer(correctAnswer);
  return normalized.length > 1;
}

function validateMultipleAnswers(selectedAnswers, correctAnswer) {
  if (!correctAnswer && correctAnswer !== 0) return false;
  if (!selectedAnswers) return false;
  
  const selectedString = Array.isArray(selectedAnswers) 
    ? selectedAnswers.join('') 
    : String(selectedAnswers);
  
  const normalizedSelected = normalizeAnswer(selectedString);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  return normalizedSelected === normalizedCorrect;
}

function formatAnswerForDisplay(answer) {
  if (!answer && answer !== 0) return '';
  
  const normalized = normalizeAnswer(answer);
  return normalized.split('').join(', ');
}

console.log('Testing fix for "answer.replace is not a function" error:');
console.log('======================================================');

// Test various input types that might cause the error
const testCases = [
  // Normal string cases
  { input: 'BC', expected: 'BC', description: 'Normal string "BC"' },
  { input: 'B C', expected: 'BC', description: 'String with spaces "B C"' },
  { input: 'CBA', expected: 'ABC', description: 'Unsorted string "CBA"' },
  
  // Problematic cases that could cause the error
  { input: null, expected: '', description: 'null value' },
  { input: undefined, expected: '', description: 'undefined value' },
  { input: 0, expected: '0', description: 'number 0' },
  { input: 1, expected: '1', description: 'number 1' },
  { input: 123, expected: '123', description: 'number 123' },
  { input: '', expected: '', description: 'empty string' },
  
  // Edge cases
  { input: false, expected: 'AEFLS', description: 'boolean false (converted to string)' },
  { input: true, expected: 'ERTU', description: 'boolean true (converted to string)' }
];

console.log('\n1. Testing normalizeAnswer function:');
console.log('===================================');

testCases.forEach((testCase, index) => {
  try {
    const result = normalizeAnswer(testCase.input);
    const passed = result === testCase.expected;
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input: ${JSON.stringify(testCase.input)}`);
    console.log(`  Expected: "${testCase.expected}"`);
    console.log(`  Result: "${result}"`);
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
  } catch (error) {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input: ${JSON.stringify(testCase.input)}`);
    console.log(`  Status: ❌ ERROR - ${error.message}`);
    console.log('');
  }
});

console.log('\n2. Testing isMultipleAnswerQuestion function:');
console.log('===========================================');

const multiAnswerTestCases = [
  { input: 'A', expected: false, description: 'Single answer "A"' },
  { input: 'BC', expected: true, description: 'Multiple answer "BC"' },
  { input: null, expected: false, description: 'null value' },
  { input: undefined, expected: false, description: 'undefined value' },
  { input: 0, expected: false, description: 'number 0' },
  { input: 12, expected: true, description: 'number 12 (multiple digits)' }
];

multiAnswerTestCases.forEach((testCase, index) => {
  try {
    const result = isMultipleAnswerQuestion(testCase.input);
    const passed = result === testCase.expected;
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input: ${JSON.stringify(testCase.input)}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Result: ${result}`);
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
  } catch (error) {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input: ${JSON.stringify(testCase.input)}`);
    console.log(`  Status: ❌ ERROR - ${error.message}`);
    console.log('');
  }
});

console.log('\n3. Testing validateMultipleAnswers function:');
console.log('==========================================');

const validationTestCases = [
  { selected: ['B', 'C'], correct: 'BC', expected: true, description: 'Valid multi-answer ["B", "C"] vs "BC"' },
  { selected: ['B', 'C'], correct: null, expected: false, description: 'Valid selection vs null correct answer' },
  { selected: null, correct: 'BC', expected: false, description: 'null selection vs valid correct answer' },
  { selected: 'BC', correct: 123, expected: false, description: 'String selection vs number correct answer' }
];

validationTestCases.forEach((testCase, index) => {
  try {
    const result = validateMultipleAnswers(testCase.selected, testCase.correct);
    const passed = result === testCase.expected;
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Selected: ${JSON.stringify(testCase.selected)}`);
    console.log(`  Correct: ${JSON.stringify(testCase.correct)}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Result: ${result}`);
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
  } catch (error) {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Selected: ${JSON.stringify(testCase.selected)}`);
    console.log(`  Correct: ${JSON.stringify(testCase.correct)}`);
    console.log(`  Status: ❌ ERROR - ${error.message}`);
    console.log('');
  }
});

console.log('\n✅ All tests completed!');
console.log('\nThe fix should now handle non-string inputs gracefully and prevent');
console.log('the "answer.replace is not a function" runtime error.');
