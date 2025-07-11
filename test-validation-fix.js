/**
 * Quick test to verify the multi-answer validation fix
 */

// Simulate the fixed validation logic
function normalizeAnswer(answer) {
  if (!answer) return '';
  const normalized = answer.replace(/\s+/g, '').toUpperCase();
  return normalized.split('').sort().join('');
}

function validateMultipleAnswers(selectedAnswers, correctAnswer) {
  if (!correctAnswer) return false;
  
  const selectedString = Array.isArray(selectedAnswers) 
    ? selectedAnswers.join('') 
    : selectedAnswers;
  
  const normalizedSelected = normalizeAnswer(selectedString);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  return normalizedSelected === normalizedCorrect;
}

console.log('Testing the fix for multi-answer validation:');
console.log('==============================================');

// Test case 1: User selects B, C and correct answer is "AB"
const userSelection1 = ['B', 'C'];
const correctAnswer1 = 'AB';
const result1 = validateMultipleAnswers(userSelection1, correctAnswer1);
console.log(`User selected: [${userSelection1.join(', ')}]`);
console.log(`Correct answer: "${correctAnswer1}"`);
console.log(`Validation result: ${result1}`);
console.log(`Expected: false (B,C ≠ A,B)\n`);

// Test case 2: User selects B, C and correct answer is "BC" 
const userSelection2 = ['B', 'C'];
const correctAnswer2 = 'BC';
const result2 = validateMultipleAnswers(userSelection2, correctAnswer2);
console.log(`User selected: [${userSelection2.join(', ')}]`);
console.log(`Correct answer: "${correctAnswer2}"`);
console.log(`Validation result: ${result2}`);
console.log(`Expected: true (B,C = B,C)\n`);

// Test case 3: User selects B, C and correct answer is "B C" (with space)
const userSelection3 = ['B', 'C'];
const correctAnswer3 = 'B C';
const result3 = validateMultipleAnswers(userSelection3, correctAnswer3);
console.log(`User selected: [${userSelection3.join(', ')}]`);
console.log(`Correct answer: "${correctAnswer3}"`);
console.log(`Validation result: ${result3}`);
console.log(`Expected: true (B,C = B,C)\n`);

// Test case 4: User selects C, B (different order) and correct answer is "BC"
const userSelection4 = ['C', 'B'];
const correctAnswer4 = 'BC';
const result4 = validateMultipleAnswers(userSelection4, correctAnswer4);
console.log(`User selected: [${userSelection4.join(', ')}]`);
console.log(`Correct answer: "${correctAnswer4}"`);
console.log(`Validation result: ${result4}`);
console.log(`Expected: true (C,B = B,C when normalized)\n`);

console.log('✅ All test cases completed!');
console.log('\nThe fix should now correctly validate multi-answer selections.');
console.log('User selections are stored as letter labels ["B", "C"] instead of full option text.');
console.log('This should resolve the issue where "B, C" was incorrectly marked as wrong.');
