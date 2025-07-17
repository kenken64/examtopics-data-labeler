// Test Telegram bot quiz notification system
require('dotenv').config();

const { MongoClient } = require('mongodb');

async function testTelegramQuizNotifications() {
  console.log('🧪 Testing Telegram Bot Quiz Notifications...\n');

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    console.log('1. Checking for active quiz sessions...');
    const activeSessions = await db.collection('quizSessions')
      .find({ status: 'active' })
      .toArray();

    console.log(`✅ Found ${activeSessions.length} active quiz sessions`);

    if (activeSessions.length > 0) {
      for (const session of activeSessions) {
        console.log(`\n📊 Quiz Session: ${session.quizCode}`);
        console.log(`  - Questions: ${session.questions?.length || 0}`);
        console.log(`  - Current Question Index: ${session.currentQuestionIndex || 0}`);
        console.log(`  - Last Notified Index: ${session.lastNotifiedQuestionIndex || -1}`);
        console.log(`  - Timer Duration: ${session.timerDuration || 30}s`);

        if (session.questions && session.questions.length > 0) {
          const currentQuestion = session.questions[session.currentQuestionIndex || 0];
          console.log(`  - Current Question: "${currentQuestion.question.substring(0, 50)}..."`);
          console.log('  - Options:', Object.keys(currentQuestion.options || {}));
        }
      }
    } else {
      console.log('ℹ️ No active quiz sessions found. Start a quiz to test notifications.');
    }

    console.log('\n2. Checking quiz rooms...');
    const quizRooms = await db.collection('quizRooms')
      .find({ status: { $in: ['waiting', 'active'] } })
      .toArray();

    console.log(`✅ Found ${quizRooms.length} quiz rooms`);

    for (const room of quizRooms) {
      console.log(`\n🏠 Quiz Room: ${room.quizCode}`);
      console.log(`  - Status: ${room.status}`);
      console.log(`  - Players: ${room.players?.length || 0}`);
      if (room.players && room.players.length > 0) {
        room.players.forEach(player => {
          console.log(`    - ${player.name} (${player.telegramId ? 'Telegram' : 'Web'})`);
        });
      }
    }

    await client.close();

    console.log('\n✅ Test completed!');
    console.log('\n📋 To test Telegram notifications:');
    console.log('1. Join a quiz via Telegram bot (/quizblitz command)');
    console.log('2. Start the quiz from the web interface');
    console.log('3. Check if questions appear in Telegram');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  process.exit(0);
}

testTelegramQuizNotifications();
