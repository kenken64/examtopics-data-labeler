const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkQuizRooms() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'quizblitz');
    console.log('✅ Connected to MongoDB');

    // Check quiz rooms for Telegram players
    console.log('\n📊 Checking quiz rooms...');
    const quizRooms = await db.collection('quizRooms').find({}).toArray();
    console.log(`Found ${quizRooms.length} quiz rooms`);

    for (const room of quizRooms) {
      console.log(`\n🏠 Quiz Room: ${room.quizCode}`);
      console.log(`   - Status: ${room.status}`);
      console.log(`   - Created: ${room.createdAt}`);
      console.log(`   - Players: ${room.players ? room.players.length : 0}`);

      if (room.players && room.players.length > 0) {
        room.players.forEach((player, idx) => {
          console.log(`     ${idx + 1}. ${player.name || 'Unknown'} (${player.source || 'Unknown'} - ID: ${player.id})`);
        });
      }
    }

    // Check active quiz sessions
    console.log('\n📋 Checking active quiz sessions...');
    const activeSessions = await db.collection('quizSessions').find({ status: 'active' }).toArray();
    console.log(`Found ${activeSessions.length} active sessions`);

    for (const session of activeSessions) {
      console.log(`\n🎯 Quiz Session: ${session.quizCode}`);
      console.log(`   - Status: ${session.status}`);
      console.log(`   - Current Question: ${session.currentQuestionIndex || 0}`);
      console.log(`   - Last Notified: ${session.lastNotifiedQuestionIndex || -1}`);
      console.log(`   - Questions: ${session.questions ? session.questions.length : 0}`);
    }

    await client.close();
    console.log('\n✅ Check completed');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkQuizRooms();
