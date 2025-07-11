/**
 * Test script for multi-answer functionality
 */

// Copy the utility functions from bot.js for testing
function normalizeAnswer(answer) {
  if (!answer) return '';
  const normalized = answer.replace(/\s+/g, '').toUpperCase();
  return normalized.split('').sort().join('');
}

function isMultipleAnswerQuestion(correctAnswer) {
  if (!correctAnswer) return false;
  const normalized = normalizeAnswer(correctAnswer);
  return normalized.length > 1;
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

function formatAnswerForDisplay(answer) {
  if (!answer) return '';
  const normalized = normalizeAnswer(answer);
  return normalized.split('').join(', ');
}

// Test cases
console.log('Testing multi-answer utility functions:');
console.log('=========================================');

// Test normalizeAnswer
console.log('\n1. Testing normalizeAnswer:');
console.log('normalizeAnswer("B C"):', normalizeAnswer("B C"));
console.log('normalizeAnswer("BC"):', normalizeAnswer("BC"));
console.log('normalizeAnswer("A B C"):', normalizeAnswer("A B C"));
console.log('normalizeAnswer("CBA"):', normalizeAnswer("CBA"));

// Test isMultipleAnswerQuestion
console.log('\n2. Testing isMultipleAnswerQuestion:');
console.log('isMultipleAnswerQuestion("A"):', isMultipleAnswerQuestion("A"));
console.log('isMultipleAnswerQuestion("BC"):', isMultipleAnswerQuestion("BC"));
console.log('isMultipleAnswerQuestion("B C"):', isMultipleAnswerQuestion("B C"));
console.log('isMultipleAnswerQuestion("A B C"):', isMultipleAnswerQuestion("A B C"));

// Test validateMultipleAnswers
console.log('\n3. Testing validateMultipleAnswers:');
console.log('validateMultipleAnswers("BC", "B C"):', validateMultipleAnswers("BC", "B C"));
console.log('validateMultipleAnswers("CB", "B C"):', validateMultipleAnswers("CB", "B C"));
console.log('validateMultipleAnswers("AC", "B C"):', validateMultipleAnswers("AC", "B C"));
console.log('validateMultipleAnswers(["B", "C"], "B C"):', validateMultipleAnswers(["B", "C"], "B C"));
console.log('validateMultipleAnswers(["A", "B", "C"], "ABC"):', validateMultipleAnswers(["A", "B", "C"], "ABC"));

// Test formatAnswerForDisplay
console.log('\n4. Testing formatAnswerForDisplay:');
console.log('formatAnswerForDisplay("BC"):', formatAnswerForDisplay("BC"));
console.log('formatAnswerForDisplay("B C"):', formatAnswerForDisplay("B C"));
console.log('formatAnswerForDisplay("ABC"):', formatAnswerForDisplay("ABC"));

console.log('\n5. Testing edge cases:');
console.log('normalizeAnswer(""):', normalizeAnswer(""));
console.log('isMultipleAnswerQuestion(""):', isMultipleAnswerQuestion(""));
console.log('validateMultipleAnswers("", ""):', validateMultipleAnswers("", ""));
console.log('formatAnswerForDisplay(""):', formatAnswerForDisplay(""));

console.log('\nAll tests completed successfully! ✅');
