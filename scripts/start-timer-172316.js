// Script to manually start timer for quiz 172316
const { MongoClient } = require('mongodb');

async function startTimerForQuiz() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'quizblitz');
    
    // Check if quiz session exists
    const quizSession = await db.collection('quizSessions').findOne({
      quizCode: '172316'
    });
    
    console.log('Quiz session found:', quizSession ? 'YES' : 'NO');
    if (quizSession) {
      console.log('Quiz status:', quizSession.status);
      console.log('Current question index:', quizSession.currentQuestionIndex);
      console.log('Timer duration:', quizSession.timerDuration);
      console.log('Time remaining:', quizSession.timeRemaining);
      console.log('Question started at:', quizSession.questionStartedAt);
    }
    
    // Check quiz room
    const quizRoom = await db.collection('quizRooms').findOne({
      quizCode: '172316'
    });
    
    console.log('Quiz room found:', quizRoom ? 'YES' : 'NO');
    if (quizRoom) {
      console.log('Room status:', quizRoom.status);
      console.log('Players count:', quizRoom.players?.length || 0);
    }
    
    // Start timer by calling the frontend API
    const response = await fetch('http://localhost:3000/api/quizblitz/timer/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quizCode: '172316' })
    });
    
    const result = await response.json();
    console.log('Timer start result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

startTimerForQuiz();
