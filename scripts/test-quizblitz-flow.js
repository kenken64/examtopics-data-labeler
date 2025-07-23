#!/usr/bin/env node

// Test script to verify QuizBlitz flow and Telegram bot integration
const { MongoClient } = require('mongodb');

async function testQuizBlitzFlow() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🧪 Testing QuizBlitz flow...\n');
    
    // 1. First verify we have access code data
    console.log('1. Checking access code data...');
    const accessCodeData = await db.collection('access-code-questions').findOne({ 
      accessCode: 'AWSTEST' 
    });
    
    if (!accessCodeData) {
      console.log('❌ No AWSTEST access code found. Creating test data...');
      
      // Create test access code with questions
      const testQuestions = await db.collection('quizzes').find({}).limit(5).toArray();
      if (testQuestions.length === 0) {
        console.log('❌ No questions found in database');
        return;
      }
      
      await db.collection('access-code-questions').insertOne({
        accessCode: 'AWSTEST',
        questions: testQuestions.map(q => q._id),
        createdAt: new Date()
      });
      console.log('✅ Created test access code with questions');
    } else {
      console.log('✅ Access code AWSTEST found with questions');
    }
    
    // 2. Test quiz room creation
    console.log('\n2. Testing quiz room creation...');
    const testQuizCode = 'TGB001';
    
    // Clean up any existing test room
    await db.collection('quizRooms').deleteMany({ quizCode: testQuizCode });
    await db.collection('quizSessions').deleteMany({ quizCode: testQuizCode });
    
    // Create test quiz room
    const quizRoom = {
      quizCode: testQuizCode,
      accessCode: 'AWSTEST',
      hostUserId: 'test-host-123',
      timerDuration: 30,
      status: 'waiting',
      players: [],
      createdAt: new Date()
    };
    
    await db.collection('quizRooms').insertOne(quizRoom);
    console.log(`✅ Created test quiz room: ${testQuizCode}`);
    
    // 3. Test starting the quiz (simulate frontend API call)
    console.log('\n3. Testing quiz start simulation...');
    
    // Get questions for the access code
    const questions = await db.collection('quizzes').find({
      _id: { $in: accessCodeData.questions }
    }).limit(3).toArray();
    
    console.log(`✅ Found ${questions.length} questions for quiz`);
    
    // Create quiz session (simulate what frontend API does)
    const quizSession = {
      quizCode: testQuizCode,
      accessCode: 'AWSTEST',
      questions: questions,
      players: [],
      currentQuestionIndex: 0,
      status: 'active',
      timerDuration: 30,
      timeRemaining: 30,
      startedAt: new Date(),
      telegramPlayersNotified: false,
      needsTelegramSync: true
    };
    
    await db.collection('quizSessions').insertOne(quizSession);
    console.log('✅ Created quiz session with active status');
    
    // 4. Check if bot polling would detect this
    console.log('\n4. Checking what the bot polling system would see...');
    
    const activeSession = await db.collection('quizSessions').findOne({
      quizCode: testQuizCode,
      status: 'active'
    });
    
    if (activeSession) {
      console.log('✅ Bot polling would detect active quiz session');
      console.log(`   - Quiz Code: ${activeSession.quizCode}`);
      console.log(`   - Current Question Index: ${activeSession.currentQuestionIndex}`);
      console.log(`   - Questions: ${activeSession.questions.length}`);
      console.log(`   - Time Remaining: ${activeSession.timeRemaining}`);
      
      if (activeSession.questions && activeSession.questions[0]) {
        const firstQuestion = activeSession.questions[0];
        console.log(`   - First Question: ${firstQuestion.question.substring(0, 100)}...`);
        console.log(`   - Options available: ${firstQuestion.options ? Object.keys(firstQuestion.options).length : 'NONE!'}`);
        
        if (firstQuestion.options) {
          console.log('   - Option A:', firstQuestion.options.A?.substring(0, 50) + '...');
          console.log('   - Option B:', firstQuestion.options.B?.substring(0, 50) + '...');
          console.log('   - Option C:', firstQuestion.options.C?.substring(0, 50) + '...');
          console.log('   - Option D:', firstQuestion.options.D?.substring(0, 50) + '...');
        } else {
          console.log('   ❌ NO OPTIONS FOUND - This is the problem!');
        }
      }
    }
    
    // 5. Test what Telegram bot would receive
    console.log('\n5. Testing Telegram bot integration...');
    
    // Simulate what sendQuestionToTelegramPlayers would send
    if (activeSession && activeSession.questions[0]) {
      const question = activeSession.questions[0];
      const questionData = {
        questionIndex: 0,
        question: question.question,
        options: question.options,
        timeLimit: activeSession.timerDuration
      };
      
      console.log('📤 Question data that would be sent to Telegram bot:');
      console.log('   - Question Text:', questionData.question.substring(0, 100) + '...');
      console.log('   - Options:', questionData.options ? Object.keys(questionData.options) : 'MISSING!');
      console.log('   - Time Limit:', questionData.timeLimit);
      
      if (!questionData.options || Object.keys(questionData.options).length === 0) {
        console.log('\n❌ PROBLEM IDENTIFIED: Questions lack properly formatted options!');
        console.log('Raw question data:', JSON.stringify(question, null, 2));
      }
    }
    
    console.log('\n🧪 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

// Run the test
testQuizBlitzFlow().catch(console.error);
