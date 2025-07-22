const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Debug Recent Quiz Answer Processing
 * Check if recent answers were processed and scores updated correctly
 */

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Find recent quiz events for answer submissions
    const answerEvents = await db.collection('quizEvents').find({
      type: 'answer_submitted'
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    console.log('=== Recent Answer Events ===');
    for (const event of answerEvents) {
      const { quizCode, data } = event;
      console.log(`\nQuiz ${quizCode}: ${data.playerName} (ID: ${data.playerId})`);
      console.log(`  Answer: ${data.answer} | Correct: ${data.isCorrect} | Score: ${data.score}`);

      // Check the corresponding quiz room
      const room = await db.collection('quizRooms').findOne({
        quizCode: quizCode
      });

      if (room) {
        const player = room.players?.find(p => p.id === data.playerId);
        if (player) {
          console.log(`  Room Score: ${player.score || 0} points`);
          console.log(`  Player ID Match: ${player.id} === ${data.playerId} ? ${player.id === data.playerId}`);

          if (data.isCorrect && player.score === 0) {
            console.log('  ⚠️  WARNING: Player answered correctly but has 0 score in room!');

            // Try to manually update this player's score
            console.log('  🔧 Attempting manual score update...');
            const updateResult = await db.collection('quizRooms').updateOne(
              { quizCode: quizCode },
              {
                $inc: {
                  ['players.$[player].score']: data.score
                }
              },
              {
                arrayFilters: [{ 'player.id': data.playerId }]
              }
            );

            console.log(`  Update result: modified ${updateResult.modifiedCount} documents`);

            if (updateResult.modifiedCount > 0) {
              const updatedRoom = await db.collection('quizRooms').findOne({
                quizCode: quizCode
              });
              const updatedPlayer = updatedRoom.players?.find(p => p.id === data.playerId);
              console.log(`  ✅ Fixed! New score: ${updatedPlayer?.score || 0} points`);
            }
          }
        } else {
          console.log('  ❌ Player not found in room!');
        }
      } else {
        console.log('  ❌ Quiz room not found!');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
