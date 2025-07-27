// Direct database test for QuizBlitz start logic
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const ACCESS_CODE = "AC-34JUR81";

async function testDatabaseLogic() {
  console.log('=== Direct Database Test for QuizBlitz Start Logic ===');
  
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'main-live';
  
  if (!uri) {
    console.log('❌ MONGODB_URI environment variable not set');
    return;
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log(`\n🔍 Connected to database: ${dbName}`);
    console.log(`🔍 Testing access code: ${ACCESS_CODE}`);
    
    // This is the FIXED logic from our updated API
    console.log('\n1. Using FIXED logic (new approach):');
    
    // Step 1: Find question assignments
    const questionAssignments = await db.collection('access-code-questions').find({
      generatedAccessCode: ACCESS_CODE.toUpperCase(),
      isEnabled: true
    }).sort({ sortOrder: 1, assignedQuestionNo: 1 }).toArray();

    console.log(`   Question assignments found: ${questionAssignments.length}`);

    if (questionAssignments.length === 0) {
      console.log('   ❌ No question assignments found');
      return;
    }

    // Step 2: Get actual question data
    const questionIds = questionAssignments.map(assignment => assignment.questionId);
    const questionsData = await db.collection('quizzes').find({
      _id: { $in: questionIds }
    }).toArray();

    console.log(`   Questions data found: ${questionsData.length}`);

    if (questionsData.length === 0) {
      console.log('   ❌ No question data found');
      return;
    }

    // Step 3: Process questions (as the API does)
    const questionsMap = new Map(questionsData.map(q => [q._id.toString(), q]));

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
      }
      
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

    console.log(`   ✅ Successfully processed: ${questions.length} questions`);
    
    // Test the OLD (broken) logic for comparison
    console.log('\n2. Using OLD logic (broken approach):');
    const oldQuestions = await db.collection('questions').find({
      accessCode: ACCESS_CODE.toUpperCase()
    }).toArray();
    
    console.log(`   ❌ Old logic would find: ${oldQuestions.length} questions`);
    
    // Summary
    console.log('\n📊 RESULTS SUMMARY:');
    console.log('==================');
    console.log(`✅ NEW logic: ${questions.length} questions found`);
    console.log(`❌ OLD logic: ${oldQuestions.length} questions found`);
    
    if (questions.length > 0) {
      console.log('\n🎉 SUCCESS! The 404 error is FIXED!');
      console.log(`   Access code ${ACCESS_CODE} will now work in QuizBlitz`);
      console.log(`   Users can start quizzes with ${questions.length} questions`);
      
      // Show a sample question
      console.log('\n📝 Sample question:');
      const sample = questions[0];
      console.log(`   Question: ${sample.question.substring(0, 100)}...`);
      console.log(`   Options: ${Object.keys(sample.options).length} choices`);
      console.log(`   Correct Answer: ${sample.correctAnswer}`);
    } else {
      console.log('\n❌ Issue still exists - no questions found');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await client.close();
  }
}

testDatabaseLogic();
