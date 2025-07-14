// Test creating a simple quiz room to verify the bot can interact with it
require('dotenv').config();

const { MongoClient } = require('mongodb');

async function testQuizRoomInteraction() {
  console.log('🧪 Testing Quiz Room Bot Interaction...\n');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    console.log('1. Creating test quiz room...');
    
    const testQuizRoom = {
      quizCode: 'BOT001',
      hostUserId: 'test-host',
      title: 'Bot Connection Test',
      status: 'waiting',
      players: [],
      maxPlayers: 10,
      createdAt: new Date(),
      questionsCount: 5
    };
    
    // Clean up any existing test room
    await db.collection('quizRooms').deleteOne({ quizCode: 'BOT001' });
    
    // Insert test room
    const result = await db.collection('quizRooms').insertOne(testQuizRoom);
    console.log('✅ Test quiz room created with ID:', result.insertedId);
    
    console.log('\n2. Testing quiz room lookup (simulating bot behavior)...');
    
    const foundRoom = await db.collection('quizRooms').findOne({
      quizCode: 'BOT001',
      status: { $in: ['waiting', 'active'] }
    });
    
    if (foundRoom) {
      console.log('✅ Quiz room found successfully!');
      console.log('  - Code:', foundRoom.quizCode);
      console.log('  - Status:', foundRoom.status);
      console.log('  - Players:', foundRoom.players.length);
    } else {
      console.log('❌ Quiz room not found');
    }
    
    console.log('\n3. Simulating player join...');
    
    const playerData = {
      userId: 'test-telegram-user',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      joinedAt: new Date()
    };
    
    const updateResult = await db.collection('quizRooms').updateOne(
      { quizCode: 'BOT001' },
      { $push: { players: playerData } }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Player successfully added to quiz room');
      
      // Verify the update
      const updatedRoom = await db.collection('quizRooms').findOne({ quizCode: 'BOT001' });
      console.log('  - Total players now:', updatedRoom.players.length);
    } else {
      console.log('❌ Failed to add player to quiz room');
    }
    
    console.log('\n4. Testing notification insertion...');
    
    const notification = {
      type: 'player_joined',
      quizCode: 'BOT001',
      player: playerData,
      timestamp: new Date()
    };
    
    const notificationResult = await db.collection('quizNotifications').insertOne(notification);
    console.log('✅ Notification created with ID:', notificationResult.insertedId);
    
    console.log('\n5. Cleaning up test data...');
    await db.collection('quizRooms').deleteOne({ quizCode: 'BOT001' });
    await db.collection('quizNotifications').deleteOne({ _id: notificationResult.insertedId });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 Quiz room interaction test successful!');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testQuizRoomInteraction();
