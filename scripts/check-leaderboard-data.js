const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    console.log('=== FINISHED QUIZ SESSIONS WITH PLAYER ANSWERS ===');
    const finishedSessions = await db.collection('quizSessions').find({
      status: 'finished',
      playerAnswers: { $exists: true, $ne: {} }
    }).toArray();
    
    console.log(`Found ${finishedSessions.length} finished sessions with answers`);
    
    if (finishedSessions.length === 0) {
      console.log('\n❌ No finished sessions found. Checking all sessions:');
      const allSessions = await db.collection('quizSessions').find({}).limit(10).toArray();
      console.log(`Total sessions in database: ${allSessions.length}`);
      
      for (const session of allSessions) {
        console.log(`- ${session.quizCode}: status=${session.status}, hasAnswers=${!!session.playerAnswers}, answerCount=${session.playerAnswers ? Object.keys(session.playerAnswers).length : 0}`);
      }
      
      // Check if there are any active sessions with answers
      console.log('\n=== ACTIVE SESSIONS WITH ANSWERS ===');
      const activeSessions = await db.collection('quizSessions').find({
        status: 'active',
        playerAnswers: { $exists: true, $ne: {} }
      }).toArray();
      
      console.log(`Found ${activeSessions.length} active sessions with answers`);
      
      for (const session of activeSessions) {
        console.log(`\nActive Quiz: ${session.quizCode}`);
        console.log(`Current Question: ${session.currentQuestionIndex || 0}`);
        console.log(`Total Questions: ${session.questions?.length || 0}`);
        
        if (session.playerAnswers) {
          const playerIds = Object.keys(session.playerAnswers);
          console.log(`Players with answers: ${playerIds.length}`);
          
          for (const playerId of playerIds) {
            const playerAnswers = session.playerAnswers[playerId];
            const questionAnswers = Object.keys(playerAnswers);
            let totalScore = 0;
            let correctAnswers = 0;
            
            for (const questionKey of questionAnswers) {
              const answer = playerAnswers[questionKey];
              if (answer && answer.score) totalScore += answer.score;
              if (answer && answer.isCorrect) correctAnswers++;
            }
            
            console.log(`  Player ${playerId}: ${totalScore} points, ${correctAnswers} correct answers from ${questionAnswers.length} questions`);
          }
        }
      }
    } else {
      // Show finished session details
      for (const session of finishedSessions) {
        console.log(`\nFinished Quiz: ${session.quizCode}`);
        console.log(`Created: ${session.createdAt}`);
        
        if (session.playerAnswers) {
          const playerIds = Object.keys(session.playerAnswers);
          console.log(`Players with answers: ${playerIds.length}`);
          
          for (const playerId of playerIds) {
            const playerAnswers = session.playerAnswers[playerId];
            const questionAnswers = Object.keys(playerAnswers);
            let totalScore = 0;
            let correctAnswers = 0;
            
            for (const questionKey of questionAnswers) {
              const answer = playerAnswers[questionKey];
              if (answer && answer.score) totalScore += answer.score;
              if (answer && answer.isCorrect) correctAnswers++;
            }
            
            console.log(`  Player ${playerId}: ${totalScore} points, ${correctAnswers} correct`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main();
