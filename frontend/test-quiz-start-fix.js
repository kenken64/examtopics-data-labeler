const { MongoClient } = require('mongodb');

async function testQuizStartFix() {
  const client = new MongoClient('mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Testing QuizBlitz Start Fix for AC-34JUR81 ===\n');
    
    const accessCode = 'AC-34JUR81';
    
    // Simulate the new logic from the fixed start API
    console.log('1. Looking up question assignments...');
    const questionAssignments = await db.collection('access-code-questions').find({
      generatedAccessCode: accessCode,
      isEnabled: true
    }).sort({ sortOrder: 1, assignedQuestionNo: 1 }).toArray();
    
    console.log(`   Found ${questionAssignments.length} enabled question assignments`);
    
    if (questionAssignments.length === 0) {
      console.log('   ❌ NO QUESTIONS FOUND - This would cause 404');
      return;
    }
    
    console.log('2. Fetching actual question data...');
    const questionIds = questionAssignments.map(assignment => assignment.questionId);
    const questionsData = await db.collection('quizzes').find({
      _id: { $in: questionIds }
    }).toArray();
    
    console.log(`   Found ${questionsData.length} questions in quizzes collection`);
    
    // Create the questions map like the API does
    const questionsMap = new Map(questionsData.map(q => [q._id.toString(), q]));
    
    const questions = questionAssignments.map(assignment => {
      const questionData = questionsMap.get(assignment.questionId.toString());
      if (!questionData) return null;
      
      return {
        _id: questionData._id,
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        difficulty: questionData.difficulty,
        assignedQuestionNo: assignment.assignedQuestionNo,
        originalQuestionNo: assignment.originalQuestionNo
      };
    }).filter(q => q !== null);
    
    console.log(`   Successfully mapped ${questions.length} questions`);
    
    if (questions.length > 0) {
      console.log('\n✅ SUCCESS! Questions found and mapped correctly');
      console.log('\n📝 Sample question data:');
      console.log(`   Question ${questions[0].assignedQuestionNo}: ${questions[0].question.substring(0, 100)}...`);
      console.log(`   Answers: ${questions[0].answers ? 'Present' : 'Missing'}`);
      console.log(`   Correct Answer: ${questions[0].correctAnswer}`);
      console.log(`   Difficulty: ${questions[0].difficulty || 'Not set'}`);
      
      console.log('\n🎯 This access code should now work in QuizBlitz!');
    } else {
      console.log('\n❌ FAILED! No questions could be mapped');
    }
    
    // Test the old logic for comparison
    console.log('\n=== Testing Old Logic (for comparison) ===');
    const oldQuestions = await db.collection('questions').find({
      accessCode: accessCode.toUpperCase()
    }).toArray();
    
    console.log(`Old logic would find: ${oldQuestions.length} questions`);
    if (oldQuestions.length === 0) {
      console.log('   ❌ This is why it was returning 404!');
    }
    
  } finally {
    await client.close();
  }
}

testQuizStartFix().catch(console.error);
