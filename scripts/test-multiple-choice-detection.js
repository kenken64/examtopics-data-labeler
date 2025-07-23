const { isMultipleAnswerQuestion } = require('./src/utils/answerUtils');

console.log('=== Testing Multiple Choice Detection ===');

const testCases = [
    'A',      // Single choice
    'B',      // Single choice
    'A B',    // Multiple choice (space separated)
    'B C',    // Multiple choice (space separated) - Your case
    'A,B',    // Multiple choice (comma separated)
    'BC',     // Multiple choice (no separator)
    'A B C',  // Multiple choice (3 options)
    '',       // Empty
    null,     // Null
    undefined // Undefined
];

testCases.forEach(testCase => {
    const result = isMultipleAnswerQuestion(testCase);
    console.log(`"${testCase}" -> ${result ? 'MULTIPLE' : 'SINGLE'} choice`);
});

console.log('\n=== Your Specific Case ===');
const yourCase = "B C";
const isMultiple = isMultipleAnswerQuestion(yourCase);
console.log(`correctAnswer: "${yourCase}"`);
console.log(`isMultipleAnswerQuestion result: ${isMultiple}`);
console.log(`Expected: true (should be MULTIPLE choice)`);

if (isMultiple) {
    console.log('✅ Detection is working correctly');
} else {
    console.log('❌ Detection is NOT working - this is the bug!');
}
