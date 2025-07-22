const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Test Multiple Choice Answer Handling
 * Simulate a multiple choice answer submission to see if it processes correctly
 */

async function simulateMultipleChoiceAnswer() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    console.log('=== Creating Test Quiz Session for Multiple Choice ===');

    const testQuizCode = 'MTEST1';
    const testPlayerId = '999999999';
    const testPlayerName = 'TestUser';

    // Create a test quiz room
    await db.collection('quizRooms').deleteMany({ quizCode: testQuizCode });
    await db.collection('quizSessions').deleteMany({ quizCode: testQuizCode });

    const quizRoom = {
      quizCode: testQuizCode,
      status: 'active',
      players: [{
        id: testPlayerId,
        name: testPlayerName,
        score: 0,
        joinedAt: new Date()
      }],
      createdAt: new Date()
    };

    await db.collection('quizRooms').insertOne(quizRoom);

    // Create a test quiz session with a multiple choice question
    const quizSession = {
      quizCode: testQuizCode,
      status: 'active',
      currentQuestionIndex: 0,
      questions: [{
        question: 'Which cloud services are serverless? (Select multiple)',
        answers: [
          'A. AWS Lambda',
          'B. AWS RDS',
          'C. Azure Functions',
          'D. AWS EC2'
        ],
        correctAnswer: 'A,C', // Multiple correct answers
        explanation: 'Lambda and Azure Functions are serverless, RDS and EC2 are not.',
        difficulty: 'medium'
      }],
      playerAnswers: {},
      timeRemaining: 30,
      questionStartedAt: new Date(),
      createdAt: new Date()
    };

    await db.collection('quizSessions').insertOne(quizSession);

    console.log('✅ Test quiz created successfully');
    console.log(`Quiz Code: ${testQuizCode}`);
    console.log(`Player: ${testPlayerName} (ID: ${testPlayerId})`);
    console.log('Question: Multiple choice - correct answer is A,C');

    // Test Case 1: Correct multiple answer (A,C)
    console.log('\n=== Test Case 1: Correct Multiple Answer (A,C) ===');
    await simulateAnswerSubmission(db, testQuizCode, testPlayerId, testPlayerName, 'A,C');

    // Check the result
    const updatedRoom1 = await db.collection('quizRooms').findOne({ quizCode: testQuizCode });
    const player1 = updatedRoom1.players.find(p => p.id === testPlayerId);
    console.log(`Player score after correct multiple answer: ${player1?.score || 0} points`);

    // Reset for next test
    await db.collection('quizRooms').updateOne(
      { quizCode: testQuizCode },
      { $set: { 'players.0.score': 0 } }
    );

    // Test Case 2: Partially correct answer (A only)
    console.log('\n=== Test Case 2: Partially Correct Answer (A) ===');
    await simulateAnswerSubmission(db, testQuizCode, testPlayerId, testPlayerName, 'A');

    const updatedRoom2 = await db.collection('quizRooms').findOne({ quizCode: testQuizCode });
    const player2 = updatedRoom2.players.find(p => p.id === testPlayerId);
    console.log(`Player score after partial answer: ${player2?.score || 0} points`);

    // Reset for next test
    await db.collection('quizRooms').updateOne(
      { quizCode: testQuizCode },
      { $set: { 'players.0.score': 0 } }
    );

    // Test Case 3: Wrong answer (B,D)
    console.log('\n=== Test Case 3: Wrong Answer (B,D) ===');
    await simulateAnswerSubmission(db, testQuizCode, testPlayerId, testPlayerName, 'B,D');

    const updatedRoom3 = await db.collection('quizRooms').findOne({ quizCode: testQuizCode });
    const player3 = updatedRoom3.players.find(p => p.id === testPlayerId);
    console.log(`Player score after wrong answer: ${player3?.score || 0} points`);

    // Cleanup
    await db.collection('quizRooms').deleteMany({ quizCode: testQuizCode });
    await db.collection('quizSessions').deleteMany({ quizCode: testQuizCode });
    await db.collection('quizEvents').deleteMany({ quizCode: testQuizCode });

    console.log('\n✅ Test completed and cleanup done');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

async function simulateAnswerSubmission(db, quizCode, playerId, playerName, selectedAnswer) {
  // Get the quiz session
  const quizSession = await db.collection('quizSessions').findOne({
    quizCode: quizCode.toUpperCase(),
    status: 'active'
  });

  if (!quizSession) {
    console.log('❌ Quiz session not found');
    return;
  }

  const currentQuestion = quizSession.questions[0]; // First question
  const correctAnswer = currentQuestion.correctAnswer;

  console.log(`Selected Answer: ${selectedAnswer}`);
  console.log(`Correct Answer: ${correctAnswer}`);

  // Simple answer validation (from answerUtils)
  const selectedSet = new Set(selectedAnswer.split(',').map(s => s.trim()));
  const correctSet = new Set(correctAnswer.split(',').map(s => s.trim()));

  const isCorrect = selectedSet.size === correctSet.size &&
                     [...selectedSet].every(answer => correctSet.has(answer));

  console.log(`Is Correct: ${isCorrect}`);

  // Calculate score (simplified)
  const baseScore = 100;
  const difficultyMultiplier = currentQuestion.difficulty === 'hard' ? 2 :
    currentQuestion.difficulty === 'medium' ? 1.5 : 1;
  const score = isCorrect ? Math.floor(baseScore * difficultyMultiplier) : 0;

  console.log(`Score: ${score} points`);

  // Update quiz session (simplified)
  await db.collection('quizSessions').updateOne(
    { quizCode: quizCode.toUpperCase() },
    {
      $set: {
        [`playerAnswers.${playerId}.q0`]: {
          playerId,
          playerName,
          questionIndex: 0,
          answer: selectedAnswer,
          isCorrect,
          score,
          timestamp: new Date()
        }
      }
    }
  );

  // Update player score in quiz room (this is the critical part we're testing)
  const updateResult = await db.collection('quizRooms').updateOne(
    { quizCode: quizCode.toUpperCase() },
    {
      $inc: {
        ['players.$[player].score']: score
      }
    },
    {
      arrayFilters: [{ 'player.id': playerId }]
    }
  );

  console.log(`Database update result: modified ${updateResult.modifiedCount} documents`);

  // Create quiz event
  await db.collection('quizEvents').insertOne({
    quizCode: quizCode.toUpperCase(),
    type: 'answer_submitted',
    data: {
      playerId,
      playerName,
      answer: selectedAnswer,
      isCorrect,
      score,
      questionIndex: 0
    },
    timestamp: new Date()
  });
}

simulateMultipleChoiceAnswer().catch(console.error);
