/**
 * Test script to check if the step quiz conversion is working for MLA-C01 question #5
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examtopics-labeler';

// Helper function to convert old step format to new format (same as in the component)
const convertAnswersToSteps = (question) => {
  if (!question.answers || typeof question.answers !== 'object') {
    return null;
  }
  
  const steps = [];
  const answers = question.answers;
  
  // Extract step keys and sort them
  const stepKeys = Object.keys(answers).filter(key => key.startsWith('step')).sort();
  
  for (const stepKey of stepKeys) {
    const stepData = answers[stepKey];
    const stepNumber = parseInt(stepKey.replace('step', ''));
    
    if (stepData && Array.isArray(stepData) && stepData.length > 0) {
      // Get the instruction from the first element
      const instruction = stepData[0];
      
      // Create options from the remaining elements
      const optionTexts = stepData.slice(1);
      const options = optionTexts.map((optionText, index) => ({
        id: String.fromCharCode(65 + index), // A, B, C, D
        label: String.fromCharCode(65 + index),
        value: optionText
      }));
      
      // Get correct answer from correctAnswer field
      const correctAnswerKey = `Step ${stepNumber}`;
      const correctAnswer = question.correctAnswer && typeof question.correctAnswer === 'object' 
        ? question.correctAnswer[correctAnswerKey] 
        : 'A'; // Default to A if not found
      
      steps.push({
        stepNumber,
        title: `Step ${stepNumber}`,
        description: instruction,
        options,
        correctAnswer
      });
    }
  }
  
  return steps.length > 0 ? steps : null;
};

async function testStepQuizConversion() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('saved_questions');
    
    // Find the specific MLA-C01 question #5 - try different search criteria
    let question = await collection.findOne({
      question_no: 5,
      'certificate.certificateId': '688ebb355ac8971d57f813fc'
    });
    
    if (!question) {
      console.log('Trying alternative search by _id...');
      const { ObjectId } = require('mongodb');
      question = await collection.findOne({
        _id: new ObjectId('688ec8f933c233036e2ad64b')
      });
    }
    
    if (!question) {
      console.log('Trying search by question_no 5...');
      question = await collection.findOne({ question_no: 5 });
    }
    
    if (!question) {
      console.log('Trying search by type steps...');
      const stepQuestions = await collection.find({ type: 'steps' }).limit(5).toArray();
      console.log(`Found ${stepQuestions.length} step questions`);
      stepQuestions.forEach(q => {
        console.log(`- Q${q.question_no}: _id=${q._id}, cert=${q.certificate?.certificateId}`);
      });
      
      if (stepQuestions.length > 0) {
        question = stepQuestions[0]; // Use the first step question for testing
        console.log(`Using question ${question.question_no} for testing`);
      }
    }
    
    if (!question) {
      console.log('❌ Question not found');
      return;
    }
    
    console.log('=== Original Question Data ===');
    console.log('Question ID:', question._id);
    console.log('Question Number:', question.question_no);
    console.log('Type:', question.type);
    console.log('Certificate ID:', question.certificate?.certificateId);
    
    console.log('\n=== Original Answers Structure ===');
    console.log('Answers object keys:', Object.keys(question.answers || {}));
    
    if (question.answers) {
      Object.entries(question.answers).forEach(([key, value]) => {
        if (key.startsWith('step')) {
          console.log(`${key}:`, Array.isArray(value) ? `Array with ${value.length} items` : typeof value);
          if (Array.isArray(value)) {
            console.log(`  - Instruction: ${value[0]?.substring(0, 100)}...`);
            console.log(`  - Options: ${value.slice(1).length} options`);
          }
        }
      });
    }
    
    console.log('\n=== Correct Answers ===');
    if (question.correctAnswer && typeof question.correctAnswer === 'object') {
      Object.entries(question.correctAnswer).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    }
    
    console.log('\n=== Conversion Test ===');
    const convertedSteps = convertAnswersToSteps(question);
    
    if (convertedSteps) {
      console.log('✅ Conversion successful!');
      console.log(`📊 Converted ${convertedSteps.length} steps:`);
      
      convertedSteps.forEach(step => {
        console.log(`\nStep ${step.stepNumber}:`);
        console.log(`  Title: ${step.title}`);
        console.log(`  Description: ${step.description?.substring(0, 100)}...`);
        console.log(`  Options: ${step.options.length} options`);
        step.options.forEach(option => {
          console.log(`    ${option.label}: ${option.value?.substring(0, 50)}...`);
        });
        console.log(`  Correct Answer: ${step.correctAnswer}`);
      });
      
      console.log('\n=== Validation ===');
      // Check if all steps have proper structure
      const isValid = convertedSteps.every(step => 
        step.stepNumber &&
        step.title &&
        step.description &&
        Array.isArray(step.options) &&
        step.options.length > 0 &&
        step.correctAnswer
      );
      
      console.log(`Structure valid: ${isValid ? '✅ YES' : '❌ NO'}`);
      
      if (!isValid) {
        console.log('❌ Validation issues found');
        convertedSteps.forEach((step, index) => {
          console.log(`Step ${index + 1} issues:`);
          if (!step.stepNumber) console.log('  - Missing stepNumber');
          if (!step.title) console.log('  - Missing title');
          if (!step.description) console.log('  - Missing description');
          if (!Array.isArray(step.options) || step.options.length === 0) console.log('  - Invalid options');
          if (!step.correctAnswer) console.log('  - Missing correctAnswer');
        });
      }
      
    } else {
      console.log('❌ Conversion failed - no steps generated');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testStepQuizConversion().catch(console.error);
