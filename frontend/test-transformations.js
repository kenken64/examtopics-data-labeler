// Test script for question transformation utilities
const { parseAnswersToOptions, convertCorrectAnswerToIndex, transformQuestionForFrontend } = require('./app/utils/questionTransform');

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
console.log('Original database question:', dbQuestion);

// Test parseAnswersToOptions
console.log('\nTesting parseAnswersToOptions:');
const options = parseAnswersToOptions(dbQuestion.answers);
console.log('Parsed options:', options);

// Test convertCorrectAnswerToIndex
console.log('\nTesting convertCorrectAnswerToIndex:');
const correctIndex = convertCorrectAnswerToIndex(dbQuestion.correctAnswer);
console.log('Correct answer index:', correctIndex);

// Test full transformation
console.log('\nTesting full transformation:');
const transformedQuestion = transformQuestionForFrontend(dbQuestion);
console.log('Transformed question:', transformedQuestion);

// Test edge cases
console.log('\nTesting edge cases:');

// Empty answers
console.log('Empty answers:', parseAnswersToOptions(''));
console.log('Null answers:', parseAnswersToOptions(null));

// Invalid correct answer
console.log('Invalid correct answer (Z):', convertCorrectAnswerToIndex('Z'));
console.log('Numeric correct answer (already correct):', convertCorrectAnswerToIndex(2));

// Question with mixed format
const mixedQuestion = {
  question: "Test question",
  answers: "A. First option\nB) Second option\n- C. Third option",
  correctAnswer: "B"
};

console.log('Mixed format question:', transformQuestionForFrontend(mixedQuestion));
