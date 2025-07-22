const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Debug QuizRooms Player Structure
 * Check the exact structure of players in quiz rooms to fix score updates
 */

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Get a recent quiz room with players
    const room = await db.collection('quizRooms').findOne({
      'players.0': { $exists: true }
    });

    if (room) {
      console.log('=== Quiz Room Structure ===');
      console.log(`Quiz Code: ${room.quizCode}`);
      console.log(`Status: ${room.status}`);
      console.log('\nPlayers structure:');
      console.log(JSON.stringify(room.players, null, 2));

      // Test the current update query manually
      const testPlayerId = room.players[0].id;
      console.log(`\nTesting score update for player ID: ${testPlayerId}`);

      // Try the update operation in isolation
      const result = await db.collection('quizRooms').updateOne(
        { _id: room._id },
        {
          $inc: {
            ['players.$[player].score']: 100
          }
        },
        {
          arrayFilters: [{ 'player.id': testPlayerId }]
        }
      );

      console.log('Update result:', {
        acknowledged: result.acknowledged,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      });

      if (result.modifiedCount > 0) {
        console.log('✅ Score update successful!');

        // Get the updated room to confirm
        const updatedRoom = await db.collection('quizRooms').findOne({ _id: room._id });
        console.log('Updated player scores:');
        updatedRoom.players.forEach(player => {
          console.log(`  ${player.name}: ${player.score || 0} points`);
        });

      } else {
        console.log('❌ Score update failed');

        // Try alternative query patterns
        console.log('\nTrying alternative update methods...');

        // Method 1: Direct array position
        const result1 = await db.collection('quizRooms').updateOne(
          {
            _id: room._id,
            'players.id': testPlayerId
          },
          {
            $inc: {
              'players.$.score': 50
            }
          }
        );

        console.log('Method 1 result (positional operator):', {
          modifiedCount: result1.modifiedCount
        });

        if (result1.modifiedCount > 0) {
          const updatedRoom1 = await db.collection('quizRooms').findOne({ _id: room._id });
          console.log('Updated scores (method 1):');
          updatedRoom1.players.forEach(player => {
            console.log(`  ${player.name}: ${player.score || 0} points`);
          });
        }
      }

    } else {
      console.log('No quiz room found with players');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
