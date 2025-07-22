const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Test QuizBlitz Score Display Issue
 * Check if player scores are properly saved and can be retrieved
 */

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Find the most recent completed quiz sessions
    console.log('=== Recent Quiz Sessions ===');
    const recentSessions = await db.collection('quizSessions').find({
      status: { $in: ['active', 'completed'] }
    })
      .sort({ _id: -1 })
      .limit(5)
      .toArray();

    console.log(`Found ${recentSessions.length} recent quiz sessions:`);
    for (const session of recentSessions) {
      console.log(`- ${session.quizCode}: ${session.status} (${session.questions?.length || 0} questions)`);

      // Check if there are player answers
      if (session.playerAnswers) {
        const playerCount = Object.keys(session.playerAnswers).length;
        console.log(`  Players with answers: ${playerCount}`);

        for (const [playerId, answers] of Object.entries(session.playerAnswers)) {
          const answerCount = Object.keys(answers).length;
          console.log(`    Player ${playerId}: ${answerCount} answers`);
        }
      }
    }

    console.log('\n=== Quiz Rooms (Player Scores) ===');
    const recentRooms = await db.collection('quizRooms').find({
      status: { $in: ['active', 'completed'] }
    })
      .sort({ _id: -1 })
      .limit(5)
      .toArray();

    console.log(`Found ${recentRooms.length} recent quiz rooms:`);
    for (const room of recentRooms) {
      console.log(`\n--- Room ${room.quizCode} (${room.status}) ---`);
      console.log(`Players: ${room.players?.length || 0}`);

      if (room.players && room.players.length > 0) {
        room.players.forEach(player => {
          console.log(`  ${player.name} (${player.id}): ${player.score || 0} points`);
        });
      } else {
        console.log('  No players found');
      }
    }

    // Check for quiz events
    console.log('\n=== Recent Quiz Events ===');
    const recentEvents = await db.collection('quizEvents').find()
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    console.log(`Found ${recentEvents.length} recent quiz events:`);
    for (const event of recentEvents) {
      if (event.type === 'answer_submitted') {
        console.log(`- ${event.quizCode}: ${event.data.playerName} answered Q${event.data.questionIndex + 1} - ${event.data.isCorrect ? 'CORRECT' : 'WRONG'} (${event.data.score} pts)`);
      } else {
        console.log(`- ${event.quizCode}: ${event.type}`);
      }
    }

    // Look for specific score issues
    console.log('\n=== Score Analysis ===');
    const activeRooms = await db.collection('quizRooms').find({
      status: { $in: ['active', 'completed'] },
      'players.0': { $exists: true } // Has at least one player
    }).toArray();

    console.log(`Found ${activeRooms.length} rooms with players:`);
    for (const room of activeRooms) {
      const totalScore = room.players.reduce((sum, player) => sum + (player.score || 0), 0);
      const playersWithScore = room.players.filter(p => (p.score || 0) > 0).length;

      console.log(`  ${room.quizCode}: ${playersWithScore}/${room.players.length} players have scores (total: ${totalScore} pts)`);

      if (playersWithScore === 0 && totalScore === 0) {
        console.log('    ⚠️  WARNING: No players have any score!');

        // Check if there are answers in the session
        const session = await db.collection('quizSessions').findOne({
          quizCode: room.quizCode
        });

        if (session && session.playerAnswers) {
          const answerCount = Object.keys(session.playerAnswers).length;
          console.log(`    📊 Session has ${answerCount} players with answers`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
