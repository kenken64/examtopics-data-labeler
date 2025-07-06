#!/usr/bin/env node

// Test script to verify the question transformation functionality end-to-end
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

// Import transformation functions (simulate what the API does)
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

async function testEndToEndTransformation() {
  console.log('🧪 Testing End-to-End Question Transformation');
  console.log('=' .repeat(50));

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Get a sample question from database
    console.log('\n📋 Test 1: Database Question Format');
    const sampleQuestion = await db.collection('quizzes').findOne({});
    
    if (!sampleQuestion) {
      console.log('❌ No questions found in database');
      return;
    }
    
    console.log('📄 Original database question:');
    console.log(`  ID: ${sampleQuestion._id}`);
    console.log(`  Question: ${sampleQuestion.question}`);
    console.log(`  Answers field: ${sampleQuestion.answers || 'N/A'}`);
    console.log(`  Options field: ${sampleQuestion.options || 'N/A'}`);
    console.log(`  Correct Answer: ${sampleQuestion.correctAnswer}`);
    
    // Test 2: Transform the question
    console.log('\n🔄 Test 2: Question Transformation');
    const transformedQuestion = transformQuestionForFrontend(sampleQuestion);
    
    console.log('✨ Transformed question:');
    console.log(`  Options: [${transformedQuestion.options.join(', ')}]`);
    console.log(`  Correct Answer Index: ${transformedQuestion.correctAnswer}`);
    console.log(`  Correct Answer Text: "${transformedQuestion.options[transformedQuestion.correctAnswer]}"`);
    
    // Test 3: Test API simulation
    console.log('\n🌐 Test 3: API Response Simulation');
    
    // Simulate what the API would return
    const questions = [sampleQuestion];
    const transformedQuestions = questions.map(transformQuestionForFrontend);
    
    console.log('📡 API would return:');
    console.log(JSON.stringify({
      success: true,
      questions: transformedQuestions.map(q => ({
        _id: q._id,
        question_no: q.question_no,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      })),
      totalQuestions: transformedQuestions.length
    }, null, 2));
    
    // Test 4: Test with access code questions if available
    console.log('\n🔑 Test 4: Access Code Questions Test');
    
    const accessCodeQuestion = await db.collection('access-code-questions').findOne({});
    
    if (accessCodeQuestion) {
      console.log('📋 Found access code assignment:');
      console.log(`  Generated Code: ${accessCodeQuestion.generatedAccessCode}`);
      console.log(`  Assigned Question No: ${accessCodeQuestion.assignedQuestionNo}`);
      
      // Get the actual question details
      const questionDetails = await db.collection('quizzes').findOne({
        _id: accessCodeQuestion.questionId
      });
      
      if (questionDetails) {
        const transformedACQ = transformQuestionForFrontend(questionDetails);
        console.log('✨ Transformed access code question:');
        console.log(`  Original Q${questionDetails.question_no} -> Assigned Q${accessCodeQuestion.assignedQuestionNo}`);
        console.log(`  Options: ${transformedACQ.options.length} choices`);
        console.log(`  Correct: "${transformedACQ.options[transformedACQ.correctAnswer]}"`);
      }
    } else {
      console.log('ℹ️  No access code questions found (run seed script to create them)');
    }
    
    // Test 5: Verify transformation consistency
    console.log('\n✅ Test 5: Transformation Verification');
    
    if (transformedQuestion.options.length === 0) {
      console.log('⚠️  Warning: No options parsed from answers field');
      console.log(`   Raw answers: "${sampleQuestion.answers}"`);
    } else {
      console.log(`✅ Successfully parsed ${transformedQuestion.options.length} options`);
    }
    
    if (transformedQuestion.correctAnswer < 0 || transformedQuestion.correctAnswer >= transformedQuestion.options.length) {
      console.log('⚠️  Warning: Correct answer index out of bounds');
    } else {
      console.log('✅ Correct answer index is valid');
    }
    
    console.log('\n🎉 End-to-End Test Complete!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testEndToEndTransformation().catch(console.error);
}

module.exports = {
  parseAnswersToOptions,
  convertCorrectAnswerToIndex,
  transformQuestionForFrontend,
  testEndToEndTransformation
};
