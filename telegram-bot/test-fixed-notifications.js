const { MongoClient } = require('mongodb');
require('dotenv').config();

class TelegramBotNotificationTest {
  constructor() {
    this.db = null;
  }

  async connectToDatabase() {
    try {
      console.log('🔗 Connecting to MongoDB...');
      console.log('📍 Environment check:');
      console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Missing'}`);
      console.log(`   MONGODB_DB_NAME: ${process.env.MONGODB_DB_NAME || 'Not set'}`);

      if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI environment variable is missing!');
        return false;
      }

      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      this.db = client.db(process.env.MONGODB_DB_NAME || 'quizblitz');
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      return false;
    }
  }

  async processQuizNotifications() {
    try {
      console.log('🔍 Processing quiz notifications...');

      if (!this.db) {
        console.error('❌ Database connection not available');
        return;
      }

      // Check for active quiz sessions
      const activeSessions = await this.db.collection('quizSessions')
        .find({
          status: 'active'
        })
        .toArray();

      console.log(`📊 Found ${activeSessions.length} active quiz sessions`);

      for (const session of activeSessions) {
        console.log(`🔍 Processing quiz session: ${session.quizCode}`);

        // Check if there are Telegram players for this quiz from the database
        const quizRoom = await this.db.collection('quizRooms').findOne({
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
              console.log(`📤 SHOULD SEND question ${currentQuestionIndex + 1} to ${telegramPlayers.length} Telegram players for quiz ${session.quizCode}`);

              for (const player of telegramPlayers) {
                console.log(`📱 [SIMULATED] Sending question to ${player.name} (${player.id})`);
                console.log(`   Question: ${currentQuestion.question}`);
                console.log(`   Options: ${JSON.stringify(currentQuestion.options)}`);
              }

              console.log(`✅ [SIMULATED] Updated lastNotifiedQuestionIndex from ${lastNotifiedIndex} to ${currentQuestionIndex} for quiz ${session.quizCode}`);

              // Actually update the database for testing
              await this.db.collection('quizSessions').updateOne(
                { _id: session._id },
                { $set: { lastNotifiedQuestionIndex: currentQuestionIndex } }
              );
              console.log(`✅ ACTUALLY UPDATED database - lastNotifiedQuestionIndex set to ${currentQuestionIndex}`);
            } else {
              console.log(`⏭️ Question ${currentQuestionIndex + 1} already sent (last notified: ${lastNotifiedIndex})`);
            }
          } else {
            console.log(`❌ No question found at index ${currentQuestionIndex} for quiz ${session.quizCode}`);
          }
        } else {
          console.log(`👥 No Telegram players found for quiz ${session.quizCode}`);
        }
      }

    } catch (error) {
      console.error('💥 Error processing quiz notifications:', error);
    }
  }

  async test() {
    console.log('🧪 Testing Fixed Telegram Bot Notification Logic...');

    if (!(await this.connectToDatabase())) {
      return;
    }

    console.log('🔄 Running notification test...');
    await this.processQuizNotifications();

    console.log('\n🔄 Running again to verify it doesn\'t send twice...');
    await this.processQuizNotifications();

    console.log('\n✅ Test completed!');
  }
}

// Create and start the test
const test = new TelegramBotNotificationTest();
test.test().catch(console.error);
