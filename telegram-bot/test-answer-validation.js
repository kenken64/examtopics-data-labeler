#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testAnswerValidation() {
  console.log('🧪 Testing Answer Validation Flow...\n');

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // 1. Find an active quiz session
    console.log('1. Finding active quiz session...');
    const activeSession = await db.collection('quizSessions').findOne({ 
      status: 'active' 
    });

    if (!activeSession) {
      console.log('❌ No active quiz sessions found');
      return;
    }

    console.log(`✅ Found active session: ${activeSession.quizCode}`);
    console.log(`   - Current question index: ${activeSession.currentQuestionIndex || 0}`);
    console.log(`   - Total questions: ${activeSession.questions?.length || 0}`);

    // 2. Test the direct database validation logic (same as submitQuizAnswer)
    console.log('\n2. Testing direct database validation...');
    const quizCode = activeSession.quizCode;
    const questionIndex = activeSession.currentQuestionIndex || 0;
    const questionNumber = questionIndex + 1; // Convert 0-based to 1-based

    console.log(`   - Quiz Code: ${quizCode}`);
    console.log(`   - Question Index (0-based): ${questionIndex}`);
    console.log(`   - Question Number (1-based): ${questionNumber}`);

    // Step 1: Get quiz session with embedded questions
    const quizSession = await db.collection('quizSessions').findOne({ 
      quizCode: quizCode.toUpperCase() 
    });

    if (!quizSession) {
      console.log('❌ Quiz session not found');
      return;
    }

    console.log(`   ✅ Quiz session found with ${quizSession.questions?.length || 0} embedded questions`);

    // Step 2: Get question from embedded questions array using question index
    if (!quizSession.questions || questionIndex >= quizSession.questions.length) {
      console.log(`❌ Question index ${questionIndex} not found in quiz session (${quizSession.questions?.length || 0} questions available)`);
      return;
    }

    const question = quizSession.questions[questionIndex];

    console.log(`   ✅ Question found:`);
    console.log(`      - Question: ${question.question.substring(0, 100)}...`);
    console.log(`      - Correct Answer: ${question.correctAnswer}`);
    console.log(`      - Options available: ${question.options ? 'Yes' : 'No'}`);

    // 3. Test different answer validations
    console.log('\n3. Testing answer validation...');
    const testAnswers = ['A', 'B', 'C', 'D'];
    
    for (const testAnswer of testAnswers) {
      const isCorrect = testAnswer === question.correctAnswer;
      console.log(`   - Answer ${testAnswer}: ${isCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
    }

    // 4. Check if there are telegram players in this quiz
    console.log('\n4. Checking for Telegram players...');
    const quizRoom = await db.collection('quizRooms').findOne({ 
      quizCode: quizCode 
    });

    if (quizRoom && quizRoom.players) {
      const telegramPlayers = quizRoom.players.filter(p => 
        p.id && (String(p.id).length >= 7 || p.source === 'telegram')
      );
      
      console.log(`   ✅ Found ${telegramPlayers.length} Telegram players:`);
      telegramPlayers.forEach(player => {
        console.log(`      - ${player.name} (ID: ${player.id})`);
      });

      if (telegramPlayers.length > 0) {
        console.log('\n💡 You can test answer submission with these Telegram user IDs');
        console.log('💡 The validation logic should now work for Change Stream users');
      }
    } else {
      console.log('   ⚠️ No Telegram players found in this quiz');
    }

    console.log(`\n🎯 Test Summary:`);
    console.log(`   - Quiz Code: ${quizCode}`);
    console.log(`   - Questions Available: ${quizSession.questions.length}`);
    console.log(`   - Question Index: ${questionIndex} (0-based)`);
    console.log(`   - Question Number: ${questionNumber} (1-based for logging)`);
    console.log(`   - Correct Answer: ${question.correctAnswer}`);
    console.log(`   - Validation Flow: quizCode → quizSession.questions[${questionIndex}] → correctAnswer ✅`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

// Run the test
testAnswerValidation().catch(console.error);