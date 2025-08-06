/**
 * Test script to verify step question transformation works correctly
 */

const MessageHandlers = require('./src/handlers/messageHandlers');

// Mock dependencies
const mockDatabaseService = {};
const mockQuizService = {};
const mockBotInstance = {};

const messageHandlers = new MessageHandlers(mockDatabaseService, mockQuizService, mockBotInstance);

// Test data similar to what would come from the database
const testStepQuestion = {
  _id: "688ec8f933c233036e2ad64b",
  type: "steps",
  question: "**Topic 1**\n\n**HOTSPOT**\n\nA company wants to build an ML application. Select and order the correct steps from the following list to develop a well-architected ML workload. Each step should be selected one time.",
  answers: JSON.stringify({
    "step1": [
      "Create an Amazon SageMaker batch transform job for data cleaning and feature engineering.",
      "Store the resulting data back in Amazon S3.",
      "Use Amazon Athena to infer the schemas and available columns.",
      "Use AWS Glue crawlers to infer the schemas and available columns.",
      "Use AWS Glue DataBrew for data cleaning and feature engineering."
    ],
    "step2": [
      "Create an Amazon SageMaker batch transform job for data cleaning and feature engineering.",
      "Store the resulting data back in Amazon S3.",
      "Use Amazon Athena to infer the schemas and available columns.",
      "Use AWS Glue crawlers to infer the schemas and available columns.",
      "Use AWS Glue DataBrew for data cleaning and feature engineering."
    ],
    "step3": [
      "Create an Amazon SageMaker batch transform job for data cleaning and feature engineering.",
      "Store the resulting data back in Amazon S3.",
      "Use Amazon Athena to infer the schemas and available columns.",
      "Use AWS Glue crawlers to infer the schemas and available columns.",
      "Use AWS Glue DataBrew for data cleaning and feature engineering."
    ]
  }),
  correctAnswer: JSON.stringify({
    "Step 1": "D", // Use AWS Glue crawlers to infer the schemas and available columns.
    "Step 2": "E", // Use AWS Glue DataBrew for data cleaning and feature engineering.
    "Step 3": "B"  // Store the resulting data back in Amazon S3.
  })
};

console.log('🧪 Testing step question transformation...\n');

console.log('📋 Original question structure:');
console.log('- Type:', testStepQuestion.type);
console.log('- Has answers:', !!testStepQuestion.answers);
console.log('- Has correctAnswer:', !!testStepQuestion.correctAnswer);
console.log('- Question preview:', testStepQuestion.question.substring(0, 100) + '...\n');

try {
  const transformed = messageHandlers.transformDatabaseStepQuestion(testStepQuestion);
  
  console.log('✅ Transformation successful!\n');
  
  console.log('📊 Transformed structure:');
  console.log('- ID:', transformed._id);
  console.log('- Topic:', transformed.topic);
  console.log('- Type:', transformed.type);
  console.log('- Steps count:', transformed.steps.length);
  console.log('- Description preview:', transformed.description.substring(0, 100) + '...\n');
  
  console.log('🔍 Steps details:');
  transformed.steps.forEach((step, index) => {
    console.log(`\nStep ${index + 1}:`);
    console.log('  Question:', step.question);
    console.log('  Options count:', step.options.length);
    console.log('  Correct answer:', step.correctAnswer);
    console.log('  First option:', step.options[0]?.substring(0, 50) + '...');
  });
  
  console.log('\n🎯 Validation:');
  const isValid = transformed.steps.every(step => 
    step.question && 
    Array.isArray(step.options) && 
    step.options.length > 0 && 
    step.correctAnswer && 
    step.correctAnswer.match(/^[A-Z]$/)
  );
  
  console.log('Structure valid:', isValid ? '✅ YES' : '❌ NO');
  
  if (!isValid) {
    console.log('\n❌ Validation issues:');
    transformed.steps.forEach((step, index) => {
      if (!step.question) console.log(`Step ${index + 1}: Missing question`);
      if (!Array.isArray(step.options) || step.options.length === 0) console.log(`Step ${index + 1}: Invalid options`);
      if (!step.correctAnswer || !step.correctAnswer.match(/^[A-Z]$/)) console.log(`Step ${index + 1}: Invalid correct answer`);
    });
  }
  
} catch (error) {
  console.error('❌ Transformation failed:', error.message);
  console.error('Stack trace:', error.stack);
}

console.log('\n🏁 Test completed!');
