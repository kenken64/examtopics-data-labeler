// Test the specific joinQuizRoom function that was causing the error
require('dotenv').config();

const QuizBot = require('./bot');

async function testJoinQuizRoom() {
  console.log('🧪 Testing Bot joinQuizRoom Function...\n');

  try {
    // Create bot instance (but don't start the full bot)
    const bot = new QuizBot();

    console.log('1. Connecting to database...');
    await bot.connectToDatabase();

    if (!bot.db) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connected successfully');

    console.log('\n2. Creating test quiz room...');

    const testQuizRoom = {
      quizCode: 'TEST999',
      hostUserId: 'test-host',
      title: 'Join Function Test',
      status: 'waiting',
      players: [],
      maxPlayers: 10,
      createdAt: new Date(),
      questionsCount: 3
    };

    // Clean up any existing test room
    await bot.db.collection('quizRooms').deleteOne({ quizCode: 'TEST999' });

    // Insert test room
    await bot.db.collection('quizRooms').insertOne(testQuizRoom);
    console.log('✅ Test quiz room created');

    console.log('\n3. Testing joinQuizRoom function...');

    const testPlayer = {
      userId: 'test-telegram-user-123',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'Player',
      joinedAt: new Date()
    };

    const joinResult = await bot.joinQuizRoom('TEST999', testPlayer);

    if (joinResult.success) {
      console.log('✅ joinQuizRoom function executed successfully!');
      console.log('  - Success:', joinResult.success);
      console.log('  - Player count:', joinResult.playerCount);
    } else {
      console.log('❌ joinQuizRoom function failed:', joinResult.error);
    }

    console.log('\n4. Verifying database state...');
    const updatedRoom = await bot.db.collection('quizRooms').findOne({ quizCode: 'TEST999' });

    if (updatedRoom && updatedRoom.players.length > 0) {
      console.log('✅ Player successfully added to database');
      console.log('  - Total players in room:', updatedRoom.players.length);
      console.log('  - Player name:', updatedRoom.players[0].firstName);
    } else {
      console.log('❌ Player not found in database');
    }

    console.log('\n5. Cleaning up...');
    await bot.db.collection('quizRooms').deleteOne({ quizCode: 'TEST999' });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 joinQuizRoom test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

testJoinQuizRoom();
