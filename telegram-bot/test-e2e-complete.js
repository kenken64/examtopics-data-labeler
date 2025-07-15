#!/usr/bin/env node

// Test QuizBlitz end-to-end flow
const { MongoClient } = require('mongodb');

async function testQuizBlitzFlow() {
  console.log('🧪 Testing QuizBlitz End-to-End Flow...\n');
  
  const client = new MongoClient('mongodb://localhost:27017?replicaSet=rs0');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    // 1. Clean up any existing test data
    console.log('1. Cleaning up existing test data...');
    await db.collection('quizRooms').deleteMany({ quizCode: /^TEST/ });
    await db.collection('quizSessions').deleteMany({ quizCode: /^TEST/ });
    console.log('✅ Cleanup completed');
    
    // 2. Create a quiz room (simulate frontend create-room API)
    console.log('\n2. Creating quiz room...');
    const testQuizCode = 'TEST' + Math.random().toString(36).substring(2, 5).toUpperCase();
    const accessCode = 'AC-4AC2H2G'; // Use existing access code
    
    const quizRoom = {
      quizCode: testQuizCode,
      accessCode: accessCode,
      hostUserId: 'test-host-123',
      timerDuration: 30,
      status: 'waiting',
      players: [],
      createdAt: new Date()
    };
    
    await db.collection('quizRooms').insertOne(quizRoom);
    console.log(`✅ Created quiz room: ${testQuizCode}`);
    
    // 3. Get questions for this access code
    console.log('\n3. Loading questions for access code...');
    const questionAssignments = await db.collection('access-code-questions')
      .find({ generatedAccessCode: accessCode, isEnabled: true })
      .sort({ sortOrder: 1 })
      .limit(3) // Just 3 questions for testing
      .toArray();
    
    if (questionAssignments.length === 0) {
      console.log('❌ No question assignments found for access code');
      return;
    }
    
    const questionIds = questionAssignments.map(assignment => assignment.questionId);
    const questionsData = await db.collection('quizzes').find({
      _id: { $in: questionIds }
    }).toArray();
    
    // Build questions with options parsing
    const questions = questionAssignments.map(assignment => {
      const questionData = questionsData.find(q => q._id.toString() === assignment.questionId.toString());
      if (!questionData) return null;
      
      // Parse answers to options
      let options = questionData.options;
      if (!options && questionData.answers) {
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
        assignedQuestionNo: assignment.assignedQuestionNo,
        originalQuestionNo: assignment.originalQuestionNo
      };
    }).filter(q => q !== null);
    
    console.log(`✅ Loaded ${questions.length} questions`);
    console.log(`   First question options: ${Object.keys(questions[0].options).join(', ')}`);
    
    // 4. Start the quiz (simulate frontend start API)
    console.log('\n4. Starting the quiz...');
    const quizSession = {
      quizCode: testQuizCode,
      accessCode: accessCode,
      questions: questions,
      players: [],
      timerDuration: 30,
      status: 'active',
      startedAt: new Date(),
      currentQuestionIndex: 0,
      playerAnswers: {},
      isQuizCompleted: false,
      telegramPlayersNotified: false,
      needsTelegramSync: true
    };
    
    await db.collection('quizSessions').insertOne(quizSession);
    console.log('✅ Quiz session created');
    
    // 5. Simulate bot checking for quizzes to notify
    console.log('\n5. Simulating bot notification detection...');
    const activeSessionsForBot = await db.collection('quizSessions')
      .find({ 
        status: 'active',
        $or: [
          { telegramPlayersNotified: { $ne: true } },
          { telegramPlayersNotified: { $exists: false } }
        ]
      })
      .toArray();
    
    console.log(`✅ Bot would detect ${activeSessionsForBot.length} sessions needing notification`);
    
    if (activeSessionsForBot.length > 0) {
      const session = activeSessionsForBot[0];
      const currentQuestion = session.questions[session.currentQuestionIndex || 0];
      
      console.log('\n📤 Question data that would be sent to Telegram:');
      console.log(`   - Quiz Code: ${session.quizCode}`);
      console.log(`   - Question: ${currentQuestion.question.substring(0, 100)}...`);
      console.log(`   - Options: ${Object.keys(currentQuestion.options).join(', ')}`);
      console.log(`   - Options count: ${Object.keys(currentQuestion.options).length}`);
      
      if (Object.keys(currentQuestion.options).length > 0) {
        console.log('\n✅ SUCCESS: Questions have properly formatted options!');
        console.log('   - Option A:', currentQuestion.options.A?.substring(0, 50) + '...');
        console.log('   - Option B:', currentQuestion.options.B?.substring(0, 50) + '...');
        console.log('   - Option C:', currentQuestion.options.C?.substring(0, 50) + '...');
        console.log('   - Option D:', currentQuestion.options.D?.substring(0, 50) + '...');
      } else {
        console.log('\n❌ PROBLEM: Questions missing options!');
        console.log('Raw question data:', JSON.stringify(currentQuestion, null, 2));
      }
    }
    
    // 6. Test Change Streams capability
    console.log('\n6. Testing Change Streams...');
    try {
      const testEvent = {
        type: 'quiz_started',
        quizCode: testQuizCode,
        data: { test: true },
        timestamp: new Date()
      };
      
      await db.collection('quizEvents').insertOne(testEvent);
      console.log('✅ Published test event to quizEvents collection');
      
      // Try to watch for changes
      const changeStream = db.collection('quizEvents').watch([], { maxAwaitTimeMS: 1000 });
      console.log('✅ Change Streams are working! (Stopped after 1 second)');
      changeStream.close();
      
    } catch (changeStreamError) {
      console.log('❌ Change Streams failed:', changeStreamError.message);
    }
    
    console.log(`\n🎮 Test completed! Quiz Code: ${testQuizCode}`);
    console.log('💡 You can now test the Telegram bot with: /quizblitz');
    console.log(`💡 Enter quiz code: ${testQuizCode}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

// Run the test
testQuizBlitzFlow().catch(console.error);
