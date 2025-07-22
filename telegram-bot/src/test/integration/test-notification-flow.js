const { MongoClient } = require('mongodb');
require('dotenv').config();

class NotificationTester {
  constructor() {
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
  }

  async connectToDatabase() {
    if (!this.db) {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(process.env.MONGODB_DB_NAME);
    }
    return this.db;
  }

  async testNotificationFlow() {
    console.log('🧪 Testing QuizBlitz Notification Flow');
    console.log('=====================================');

    const db = await this.connectToDatabase();

    // Simulate the exact logic from bot.js
    const activeSessions = await db.collection('quizSessions')
      .find({ status: 'active' })
      .toArray();

    console.log(`\n📊 Found ${activeSessions.length} active quiz sessions`);

    for (const session of activeSessions) {
      console.log(`\n🔍 Processing quiz session: ${session.quizCode}`);
      console.log(`   Current Question Index: ${session.currentQuestionIndex}`);
      console.log(`   Last Notified Index: ${session.lastNotifiedQuestionIndex}`);
      console.log(`   Total Questions: ${session.questions?.length || 0}`);

      // Check if there are Telegram players for this quiz from the database
      const quizRoom = await db.collection('quizRooms').findOne({
        quizCode: session.quizCode
      });

      const telegramPlayers = [];
      if (quizRoom && quizRoom.players) {
        // Find players that joined via Telegram (check for Telegram ID format or source)
        for (const player of quizRoom.players) {
          // Telegram IDs are typically large numbers (7+ digits)
          if (player.id && (String(player.id).length >= 7 || player.source === 'telegram')) {
            telegramPlayers.push({
              id: player.id,
              name: player.name
            });
          }
        }
      }

      console.log(`👥 Found ${telegramPlayers.length} Telegram players for quiz ${session.quizCode}`);
      telegramPlayers.forEach(player => {
        console.log(`   - ${player.name} (ID: ${player.id})`);
      });

      if (telegramPlayers.length > 0) {
        // Send current question to Telegram players
        const currentQuestionIndex = session.currentQuestionIndex || 0;
        if (session.questions && session.questions[currentQuestionIndex]) {
          const currentQuestion = session.questions[currentQuestionIndex];

          // Check if we need to send this question (based on lastNotifiedQuestionIndex)
          const lastNotifiedIndex = session.lastNotifiedQuestionIndex || -1;

          console.log(`📝 Question check: current=${currentQuestionIndex}, lastNotified=${lastNotifiedIndex}`);

          if (currentQuestionIndex > lastNotifiedIndex) {
            console.log(`✅ SHOULD SEND: Question ${currentQuestionIndex + 1} to ${telegramPlayers.length} Telegram players`);

            // Show what question data would be sent
            console.log('📤 Question data to send:', {
              questionNumber: currentQuestionIndex + 1,
              questionText: currentQuestion.question.substring(0, 100) + '...',
              options: Object.keys(currentQuestion.options || {}),
              timeLimit: session.timerDuration || 30
            });

            // Simulate updating lastNotifiedQuestionIndex
            console.log(`📝 Would update lastNotifiedQuestionIndex from ${lastNotifiedIndex} to ${currentQuestionIndex}`);

          } else {
            console.log(`⏭️ ALREADY SENT: Question ${currentQuestionIndex + 1} (last notified: ${lastNotifiedIndex})`);
          }
        } else {
          console.log(`❌ NO QUESTION: No question found at index ${currentQuestionIndex}`);
        }
      } else {
        console.log(`❌ NO PLAYERS: No Telegram players found for quiz ${session.quizCode}`);
      }
    }

    await this.mongoClient.close();
  }

  async testChangeStreamEvents() {
    console.log('\n🔄 Testing Change Stream Events');
    console.log('================================');

    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    await this.mongoClient.connect();
    const db = this.mongoClient.db(process.env.MONGODB_DB_NAME);

    // Check recent quiz events
    const recentEvents = await db.collection('quizEvents')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log(`\n📡 Recent Quiz Events: ${recentEvents.length}`);

    recentEvents.forEach(event => {
      console.log(`\n🎯 Event: ${event.type}`);
      console.log(`   Quiz Code: ${event.quizCode}`);
      console.log(`   Timestamp: ${event.createdAt || event.timestamp}`);

      if (event.type === 'question_started') {
        console.log('   Question Data:', {
          questionIndex: event.questionIndex,
          hasQuestion: !!event.question,
          questionText: event.question?.substring(0, 50) + '...' || 'No question text'
        });
      }
    });

    await this.mongoClient.close();
  }

  async fixActiveSession() {
    console.log('\n🔧 Fixing Active Session');
    console.log('========================');

    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    await this.mongoClient.connect();
    const db = this.mongoClient.db(process.env.MONGODB_DB_NAME);

    // Find active session with undefined lastNotifiedQuestionIndex
    const activeSession = await db.collection('quizSessions')
      .findOne({
        status: 'active',
        lastNotifiedQuestionIndex: { $exists: false }
      });

    if (activeSession) {
      console.log(`\n🔧 Found session to fix: ${activeSession.quizCode}`);

      // Set lastNotifiedQuestionIndex to -1 so next question will be sent
      const result = await db.collection('quizSessions').updateOne(
        { _id: activeSession._id },
        { $set: { lastNotifiedQuestionIndex: -1 } }
      );

      console.log(`✅ Fixed session ${activeSession.quizCode}: lastNotifiedQuestionIndex set to -1`);
      console.log(`   Modified count: ${result.modifiedCount}`);
    } else {
      console.log('❌ No active session found that needs fixing');
    }

    await this.mongoClient.close();
  }
}

async function main() {
  const tester = new NotificationTester();

  try {
    await tester.testNotificationFlow();
    await tester.testChangeStreamEvents();
    await tester.fixActiveSession();

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main();