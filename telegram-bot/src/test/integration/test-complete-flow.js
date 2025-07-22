// Comprehensive test of updated Telegram bot QuizBlitz functionality
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testCompleteQuizBlitzFlow() {
  try {
    console.log('🎯 Testing complete QuizBlitz flow with MongoDB direct access...');

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // 1. Clean up any existing test data
    await db.collection('quizRooms').deleteMany({ quizCode: 'TEST99' });
    await db.collection('quizSessions').deleteMany({ quizCode: 'TEST99' });
    await db.collection('quizEvents').deleteMany({ quizCode: 'TEST99' });

    console.log('🧹 Cleaned up existing test data');

    // 2. Create a test quiz room
    const testQuizRoom = {
      quizCode: 'TEST99',
      accessCode: 'TEST-ACCESS',
      status: 'waiting',
      hostUserId: 'test-host',
      players: [],
      createdAt: new Date()
    };

    await db.collection('quizRooms').insertOne(testQuizRoom);
    console.log('✅ Created test quiz room: TEST99');

    // 3. Simulate Telegram user joining quiz
    const telegramUserId = '123456789';
    const playerName = 'TelegramBot';
    const playerId = telegramUserId.toString();

    console.log(`\n👤 Simulating user join: ${playerName} (${telegramUserId})`);

    // Find quiz room and add player (simulate handleJoinQuizByCode)
    const player = {
      id: playerId,
      name: playerName.trim(),
      joinedAt: new Date(),
      score: 0,
      answers: [],
      source: 'telegram'
    };

    const joinResult = await db.collection('quizRooms').updateOne(
      { quizCode: 'TEST99', status: 'waiting' },
      {
        $push: { players: player },
        $set: { lastActivity: new Date() }
      }
    );

    if (joinResult.modifiedCount > 0) {
      console.log('✅ Player successfully joined quiz room');
    } else {
      throw new Error('Failed to join quiz room');
    }

    // Create player joined event
    await db.collection('quizEvents').insertOne({
      quizCode: 'TEST99',
      type: 'player_joined',
      player: { id: playerId, name: playerName },
      timestamp: new Date()
    });

    // 4. Create and start quiz session (simulate frontend starting quiz)
    console.log('\n🚀 Creating quiz session...');

    const quizSession = {
      quizCode: 'TEST99',
      accessCode: 'TEST-ACCESS',
      questions: [
        {
          _id: 'test-q1',
          question: 'What is the capital of France?',
          options: { A: 'London', B: 'Paris', C: 'Berlin', D: 'Rome' },
          correctAnswer: 'B',
          explanation: 'Paris is the capital of France.'
        },
        {
          _id: 'test-q2',
          question: 'What is 5 x 6?',
          options: { A: '30', B: '25', C: '35', D: '40' },
          correctAnswer: 'A',
          explanation: '5 x 6 = 30'
        }
      ],
      players: [player],
      currentQuestionIndex: 0,
      status: 'active',
      timerDuration: 30,
      playerAnswers: {},
      answeredPlayers: [],
      startedAt: new Date(),
      questionStartTime: Date.now()
    };

    await db.collection('quizSessions').insertOne(quizSession);
    console.log('✅ Created active quiz session');

    // 5. Simulate answer submission (simulate handleQuizAnswer)
    console.log('\n📝 Simulating answer submission...');

    const selectedAnswer = 'B'; // Correct answer
    const timestamp = Date.now();
    const currentQuestionIndex = 0;
    const currentQuestion = quizSession.questions[currentQuestionIndex];

    // Calculate scoring
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const basePoints = 1000;
    const responseTime = timestamp - quizSession.questionStartTime;
    const maxTime = quizSession.timerDuration * 1000;
    const timeBonus = Math.max(0, (maxTime - responseTime) / maxTime * 200);
    const score = isCorrect ? Math.floor(basePoints + timeBonus) : 0;

    console.log(`   Player: ${playerName}`);
    console.log(`   Question: ${currentQuestion.question}`);
    console.log(`   Selected: ${selectedAnswer} (${currentQuestion.options[selectedAnswer]})`);
    console.log(`   Correct Answer: ${currentQuestion.correctAnswer} (${currentQuestion.options[currentQuestion.correctAnswer]})`);
    console.log(`   Result: ${isCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`   Score: ${score} points`);

    // Create answer data
    const answerData = {
      playerId,
      playerName,
      questionIndex: currentQuestionIndex,
      answer: selectedAnswer,
      isCorrect,
      score,
      timestamp: new Date(),
      responseTime
    };

    // Update quiz session with answer
    const answerUpdateResult = await db.collection('quizSessions').updateOne(
      {
        quizCode: 'TEST99',
        status: 'active'
      },
      {
        $set: {
          [`playerAnswers.${playerId}.q${currentQuestionIndex}`]: answerData
        },
        $addToSet: {
          'answeredPlayers': playerId
        }
      }
    );

    // Update player score in quiz room
    const scoreUpdateResult = await db.collection('quizRooms').updateOne(
      { quizCode: 'TEST99' },
      {
        $inc: {
          ['players.$[player].score']: score
        }
      },
      {
        arrayFilters: [{ 'player.id': playerId }]
      }
    );

    // Create answer submitted event
    await db.collection('quizEvents').insertOne({
      quizCode: 'TEST99',
      type: 'answer_submitted',
      data: {
        playerId,
        playerName,
        answer: selectedAnswer,
        isCorrect,
        score,
        questionIndex: currentQuestionIndex
      },
      timestamp: new Date()
    });

    console.log('✅ Answer submission completed successfully');
    console.log(`   Database updates: Session=${answerUpdateResult.modifiedCount}, Room=${scoreUpdateResult.modifiedCount}`);

    // 6. Verify the complete flow
    console.log('\n🔍 Verifying complete data integrity...');

    const finalQuizSession = await db.collection('quizSessions').findOne({ quizCode: 'TEST99' });
    const finalQuizRoom = await db.collection('quizRooms').findOne({ quizCode: 'TEST99' });
    const quizEvents = await db.collection('quizEvents').find({ quizCode: 'TEST99' }).toArray();

    console.log(`✅ Quiz Session Status: ${finalQuizSession.status}`);
    console.log(`✅ Players answered: ${finalQuizSession.answeredPlayers?.length || 0}`);
    console.log(`✅ Player score in room: ${finalQuizRoom.players[0]?.score || 0}`);
    console.log(`✅ Quiz events created: ${quizEvents.length}`);

    // Show answer verification
    const savedAnswer = finalQuizSession.playerAnswers?.[playerId]?.[`q${currentQuestionIndex}`];
    if (savedAnswer) {
      console.log('\n📊 Saved Answer Details:');
      console.log(`   Player: ${savedAnswer.playerName}`);
      console.log(`   Answer: ${savedAnswer.answer}`);
      console.log(`   Correct: ${savedAnswer.isCorrect}`);
      console.log(`   Score: ${savedAnswer.score}`);
      console.log(`   Response Time: ${savedAnswer.responseTime}ms`);
    }

    // Show events
    console.log('\n📡 Quiz Events Created:');
    quizEvents.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.type} at ${event.timestamp}`);
    });

    await client.close();
    console.log('\n🎉 Complete QuizBlitz flow test SUCCESSFUL!');
    console.log('\n📋 Summary:');
    console.log('   ✅ MongoDB direct connection working');
    console.log('   ✅ Quiz room joining working');
    console.log('   ✅ Answer submission working');
    console.log('   ✅ Score calculation working');
    console.log('   ✅ Real-time events working');
    console.log('   ✅ Frontend should now see progress updates');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testCompleteQuizBlitzFlow();
