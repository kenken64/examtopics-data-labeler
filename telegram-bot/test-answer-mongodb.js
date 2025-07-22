// Test script to simulate QuizBlitz answer submission directly to MongoDB
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testAnswerSubmission() {
  try {
    console.log('🎯 Testing QuizBlitz answer submission to MongoDB...');
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    // Find an active quiz session
    let quizSession = await db.collection('quizSessions').findOne({ 
      status: 'active' 
    });
    
    if (!quizSession) {
      console.log('⚠️  No active quiz session found. Creating a test session...');
      
      // Create a test quiz session
      const testSession = {
        quizCode: 'TEST99',
        accessCode: 'TEST-ACCESS',
        questions: [{
          _id: 'test-question-1',
          question: 'What is 2 + 2?',
          options: {
            A: 'Three',
            B: 'Four', 
            C: 'Five',
            D: 'Six'
          },
          correctAnswer: 'B',
          explanation: 'Simple math: 2 + 2 = 4'
        }],
        currentQuestionIndex: 0,
        status: 'active',
        timerDuration: 30,
        playerAnswers: {},
        answeredPlayers: []
      };
      
      await db.collection('quizSessions').insertOne(testSession);
      console.log('✅ Created test quiz session: TEST99');
      quizSession = testSession;
    }
    
    // Simulate a player answer submission
    const playerId = 'telegram-123456789';
    const playerName = 'TestPlayer';
    const selectedAnswer = 'B'; // Correct answer
    const questionIndex = quizSession.currentQuestionIndex || 0;
    const currentQuestion = quizSession.questions[questionIndex];
    
    console.log(`📝 Simulating answer: ${playerName} selected ${selectedAnswer} for question ${questionIndex + 1}`);
    console.log(`   Question: ${currentQuestion.question}`);
    console.log(`   Correct Answer: ${currentQuestion.correctAnswer}`);
    
    // Calculate scoring
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const basePoints = 1000;
    const responseTime = 2000; // 2 seconds
    const maxTime = (quizSession.timerDuration || 30) * 1000;
    const timeBonus = Math.max(0, (maxTime - responseTime) / maxTime * 200);
    const score = isCorrect ? Math.floor(basePoints + timeBonus) : 0;
    
    console.log(`📊 Scoring: ${isCorrect ? 'CORRECT' : 'WRONG'} - ${score} points`);
    
    // Create answer data
    const answerData = {
      playerId,
      playerName,
      questionIndex,
      answer: selectedAnswer,
      isCorrect,
      score,
      timestamp: new Date(),
      responseTime
    };
    
    // Update quiz session with answer
    const updateResult = await db.collection('quizSessions').updateOne(
      { 
        quizCode: quizSession.quizCode,
        status: 'active'
      },
      { 
        $set: { 
          [`playerAnswers.${playerId}.q${questionIndex}`]: answerData
        },
        $addToSet: {
          'answeredPlayers': playerId
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Answer successfully saved to MongoDB!');
      
      // Verify the answer was saved
      const updatedSession = await db.collection('quizSessions').findOne({
        quizCode: quizSession.quizCode
      });
      
      const savedAnswer = updatedSession.playerAnswers?.[playerId]?.[`q${questionIndex}`];
      if (savedAnswer) {
        console.log('✅ Answer verification successful:');
        console.log(`   Player: ${savedAnswer.playerName}`);
        console.log(`   Answer: ${savedAnswer.answer}`);
        console.log(`   Correct: ${savedAnswer.isCorrect}`);
        console.log(`   Score: ${savedAnswer.score}`);
        console.log(`   Answered Players Count: ${updatedSession.answeredPlayers?.length || 0}`);
      } else {
        console.log('❌ Answer not found in updated session');
      }
    } else {
      console.log('❌ Failed to save answer to MongoDB');
    }
    
    await client.close();
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAnswerSubmission();
