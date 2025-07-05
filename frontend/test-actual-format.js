// Test the transformation with the actual database question format we discovered

// Sample question from the actual database (from previous investigation)
const actualDbQuestion = {
  "_id": "sample-id",
  "question_no": 1,
  "question": "What is the maximum size of an S3 object?",
  "answers": "- A. 5 GB\n- B. 5 TB\n- C. 500 GB\n- D. 50 TB",
  "correctAnswer": "B",
  "explanation": "The maximum size of an S3 object is 5 TB."
};

/**
 * Converts answers text format to options array
 */
function parseAnswersToOptions(answers) {
  if (!answers || typeof answers !== 'string') {
    return [];
  }

  const lines = answers.split('\n').filter(line => line.trim());
  const options = [];

  for (const line of lines) {
    const match = line.match(/^[\s-]*[A-Z][.)]\s*(.+)$/i);
    if (match && match[1]) {
      options.push(match[1].trim());
    }
  }

  return options;
}

/**
 * Converts letter-based correct answer to numeric index
 */
function convertCorrectAnswerToIndex(correctAnswer) {
  if (typeof correctAnswer === 'number') {
    return correctAnswer;
  }

  if (typeof correctAnswer === 'string') {
    const upperCase = correctAnswer.toUpperCase();
    const charCode = upperCase.charCodeAt(0);
    
    if (charCode >= 65 && charCode <= 90) { // A-Z
      return charCode - 65;
    }
  }

  return 0;
}

/**
 * Full transformation function
 */
function transformQuestionForFrontend(dbQuestion) {
  const question = {
    ...dbQuestion,
    options: [],
    correctAnswer: 0
  };

  // Transform options
  if (dbQuestion.options && Array.isArray(dbQuestion.options)) {
    question.options = dbQuestion.options;
  } else if (dbQuestion.answers) {
    question.options = parseAnswersToOptions(dbQuestion.answers);
  } else {
    question.options = [];
  }

  // Transform correct answer
  question.correctAnswer = convertCorrectAnswerToIndex(dbQuestion.correctAnswer);

  return question;
}

console.log('=== Testing Question Transformation ===');
console.log('\nOriginal database question:');
console.log(JSON.stringify(actualDbQuestion, null, 2));

console.log('\n=== Step-by-step transformation ===');

// Test options parsing
const options = parseAnswersToOptions(actualDbQuestion.answers);
console.log('\n1. Parsed options:');
console.log(options);

// Test correct answer conversion
const correctIndex = convertCorrectAnswerToIndex(actualDbQuestion.correctAnswer);
console.log('\n2. Correct answer conversion:');
console.log(`"${actualDbQuestion.correctAnswer}" -> ${correctIndex}`);

// Test full transformation
const transformedQuestion = transformQuestionForFrontend(actualDbQuestion);
console.log('\n3. Full transformed question:');
console.log(JSON.stringify(transformedQuestion, null, 2));

console.log('\n=== Verification ===');
console.log(`Original correct answer: "${actualDbQuestion.correctAnswer}"`);
console.log(`Transformed correct answer index: ${transformedQuestion.correctAnswer}`);
console.log(`Correct option: "${transformedQuestion.options[transformedQuestion.correctAnswer]}"`);

// Test edge cases
console.log('\n=== Edge Cases ===');

// Test malformed answers
const malformedQuestion = {
  answers: "A) First\nSecond option\n- C. Third",
  correctAnswer: "C"
};

console.log('\nMalformed answers test:');
console.log('Input:', malformedQuestion.answers);
console.log('Parsed:', parseAnswersToOptions(malformedQuestion.answers));

// Test different letter cases
console.log('\nDifferent letter cases:');
console.log('a -> ', convertCorrectAnswerToIndex('a'));
console.log('B -> ', convertCorrectAnswerToIndex('B'));
console.log('d -> ', convertCorrectAnswerToIndex('d'));

console.log('\nAll tests completed!');
