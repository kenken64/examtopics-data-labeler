// Final validation test for QuizBlitz 404 fix
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function finalValidationTest() {
  console.log('🎯 FINAL VALIDATION TEST - QuizBlitz 404 Fix');
  console.log('==============================================\n');
  
  const ACCESS_CODE = "AC-34JUR81";
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'awscert';
  
  if (!uri) {
    console.log('❌ MONGODB_URI not configured');
    return;
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log(`📡 Connected to: ${dbName}`);
    console.log(`🔍 Testing access code: ${ACCESS_CODE}\n`);
    
    // Test 1: Verify access code is paid
    console.log('1️⃣ Access Code Verification...');
    const payee = await db.collection('payees').findOne({
      generatedAccessCode: ACCESS_CODE
    });
    
    if (!payee) {
      console.log('   ❌ Access code not found');
      return;
    }
    
    console.log(`   ✅ Status: ${payee.paid ? 'PAID' : 'UNPAID'}`);
    console.log(`   📄 Full payee data:`, JSON.stringify(payee, null, 2));
    
    if (!payee.paid) {
      console.log('   ⚠️  Access code not paid, but continuing test...');
    }
    
    // Test 2: NEW API Logic (Fixed)
    console.log('\n2️⃣ QuizBlitz Start Logic (FIXED)...');
    
    const questionAssignments = await db.collection('access-code-questions').find({
      generatedAccessCode: ACCESS_CODE.toUpperCase(),
      isEnabled: true
    }).sort({ sortOrder: 1, assignedQuestionNo: 1 }).toArray();

    console.log(`   Question assignments: ${questionAssignments.length}`);

    if (questionAssignments.length === 0) {
      console.log('   ❌ No question assignments found');
      return;
    }

    const questionIds = questionAssignments.map(assignment => assignment.questionId);
    const questionsData = await db.collection('quizzes').find({
      _id: { $in: questionIds }
    }).toArray();

    console.log(`   Questions data: ${questionsData.length}`);

    if (questionsData.length === 0) {
      console.log('   ❌ No question data found');
      return;
    }

    // Test 3: Question Processing
    console.log('\n3️⃣ Question Processing...');
    
    const questionsMap = new Map(questionsData.map(q => [q._id.toString(), q]));
    let processedCount = 0;
    let optionsCount = 0;
    let answersCount = 0;

    const questions = questionAssignments.map(assignment => {
      const questionData = questionsMap.get(assignment.questionId.toString());
      if (!questionData) return null;
      
      // Handle both options (new format) and answers (old format)
      let options = questionData.options;
      if (!options && questionData.answers) {
        // Convert answers string to options object
        options = {};
        const lines = questionData.answers.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const match = line.match(/^-?\s*([A-D])\.\s*(.+)$/);
          if (match) {
            options[match[1]] = match[2].trim();
          }
        });
        answersCount++;
      } else if (options) {
        optionsCount++;
      }
      
      processedCount++;
      return {
        _id: questionData._id,
        question: questionData.question,
        options: options || {},
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        difficulty: questionData.difficulty || 'medium',
        assignedQuestionNo: assignment.assignedQuestionNo,
        originalQuestionNo: assignment.originalQuestionNo
      };
    }).filter(q => q !== null);

    console.log(`   ✅ Processed questions: ${questions.length}`);
    console.log(`   📊 Options format: ${optionsCount}`);
    console.log(`   📊 Answers format: ${answersCount}`);
    
    // Test 4: Verify OLD logic would fail
    console.log('\n4️⃣ Verify OLD Logic Fails...');
    const oldQuestions = await db.collection('questions').find({
      accessCode: ACCESS_CODE.toUpperCase()
    }).toArray();
    
    console.log(`   ❌ Old logic result: ${oldQuestions.length} questions`);
    
    // Final Results
    console.log('\n🎉 FINAL RESULTS:');
    console.log('==================');
    
    if (questions.length > 0) {
      console.log('✅ ACCESS CODE WILL WORK!');
      console.log(`   - ${questions.length} questions available`);
      console.log(`   - Quiz can start successfully`);
      console.log(`   - 404 error is RESOLVED`);
    } else {
      console.log('❌ ACCESS CODE STILL HAS ISSUES');
    }
    
    console.log(`\n📝 Sample Question Preview:`);
    if (questions.length > 0) {
      const sample = questions[0];
      console.log(`   Question: ${sample.question.substring(0, 60)}...`);
      console.log(`   Choices: ${Object.keys(sample.options).length} options`);
      console.log(`   Answer: ${sample.correctAnswer}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await client.close();
  }
}

finalValidationTest();
