#!/usr/bin/env node

// Test script to verify question navigation URLs are working correctly
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function testQuestionNavigation() {
  console.log('🧪 Testing Question Navigation URLs');
  console.log('=' .repeat(50));

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Get questions by certificate code
    console.log('\n📋 Test 1: Certificate Questions Navigation');
    
    // Find a certificate
    const certificate = await db.collection('certificates').findOne({});
    if (!certificate) {
      console.log('❌ No certificates found');
      return;
    }
    
    console.log(`📜 Certificate: ${certificate.name} (${certificate.code})`);
    
    // Get questions for this certificate
    const questions = await db.collection('quizzes')
      .find({ certificateId: certificate._id.toString() })
      .sort({ question_no: 1 })
      .limit(3)
      .toArray();
    
    if (questions.length === 0) {
      console.log('❌ No questions found for certificate');
      return;
    }
    
    console.log(`📊 Found ${questions.length} questions for testing`);
    
    // Test navigation URLs
    console.log('\n🔗 Generated Navigation URLs:');
    questions.forEach(q => {
      const url = `/saved-questions/question/${q.question_no}?from=certificate&certificateCode=${certificate.code}`;
      console.log(`  Q${q.question_no}: ${url}`);
    });
    
    // Test 2: Access code questions navigation
    console.log('\n🔑 Test 2: Access Code Questions Navigation');
    
    const accessCodeQuestion = await db.collection('access-code-questions').findOne({});
    if (accessCodeQuestion) {
      console.log(`🎫 Generated Access Code: ${accessCodeQuestion.generatedAccessCode}`);
      console.log(`📝 Assigned Question No: ${accessCodeQuestion.assignedQuestionNo}`);
      
      const url = `/saved-questions/question/${accessCodeQuestion.assignedQuestionNo}?from=search&accessCode=${accessCodeQuestion.generatedAccessCode}`;
      console.log(`🔗 Access Code URL: ${url}`);
    } else {
      console.log('ℹ️  No access code questions found');
    }
    
    // Test 3: Verify question data transformation
    console.log('\n🔄 Test 3: Question Data Format Verification');
    
    const sampleQuestion = questions[0];
    console.log('📄 Sample question structure:');
    console.log(`  _id: ${sampleQuestion._id}`);
    console.log(`  question_no: ${sampleQuestion.question_no}`);
    console.log(`  question: ${sampleQuestion.question.substring(0, 50)}...`);
    console.log(`  answers: ${sampleQuestion.answers ? 'Present' : 'Missing'}`);
    console.log(`  options: ${sampleQuestion.options ? 'Present' : 'Missing'}`);
    console.log(`  correctAnswer: ${sampleQuestion.correctAnswer} (${typeof sampleQuestion.correctAnswer})`);
    
    // Simulate transformation
    function parseAnswersToOptions(answers) {
      if (!answers || typeof answers !== 'string') return [];
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
      if (typeof correctAnswer === 'number') return correctAnswer;
      if (typeof correctAnswer === 'string') {
        const upperCase = correctAnswer.toUpperCase();
        const charCode = upperCase.charCodeAt(0);
        if (charCode >= 65 && charCode <= 90) {
          return charCode - 65;
        }
      }
      return 0;
    }
    
    const transformedOptions = parseAnswersToOptions(sampleQuestion.answers);
    const transformedCorrectAnswer = convertCorrectAnswerToIndex(sampleQuestion.correctAnswer);
    
    console.log('\n✨ After transformation:');
    console.log(`  options: [${transformedOptions.length} items] ${transformedOptions.slice(0, 2).map(opt => `"${opt.substring(0, 20)}..."`).join(', ')}`);
    console.log(`  correctAnswer: ${transformedCorrectAnswer} (index)`);
    console.log(`  correct option: "${transformedOptions[transformedCorrectAnswer]?.substring(0, 30)}..."`);
    
    console.log('\n✅ Question Navigation Test Complete!');
    console.log('🎯 Expected behavior:');
    console.log('  - Clicking question in certificate list → /saved-questions/question/{question_no}');
    console.log('  - Question detail page should find question by question_no property');
    console.log('  - Options should be properly parsed from answers field');
    console.log('  - Correct answer should be converted from letter to index');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testQuestionNavigation().catch(console.error);
}
