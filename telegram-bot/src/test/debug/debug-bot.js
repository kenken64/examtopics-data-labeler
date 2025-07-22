const { MongoClient } = require('mongodb');
require('dotenv').config();

class TelegramBotDebugger {
  constructor() {
    this.db = null;
    this.userSessions = new Map();
    // Add a test user session for user "ds"
    this.userSessions.set('test_user_ds', {
      quizJoined: true,
      quizCode: '791482',
      username: 'ds'
    });
  }

  async connectToDatabase() {
    try {
      console.log('🔗 Connecting to MongoDB...');
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
        console.log(`📋 Processing session: ${session.quizCode}`);
        console.log(`   - Current question index: ${session.currentQuestionIndex}`);
        console.log(`   - Last notified index: ${session.lastNotifiedQuestionIndex || -1}`);
        console.log(`   - Status: ${session.status}`);

        // Check if there are Telegram players for this quiz
        const telegramPlayers = [];
        for (const [telegramId, userSession] of this.userSessions.entries()) {
          if (userSession.quizJoined && userSession.quizCode === session.quizCode) {
            telegramPlayers.push({ id: telegramId, username: userSession.username });
          }
        }

        console.log(`👥 Found ${telegramPlayers.length} Telegram players for quiz ${session.quizCode}`);
        telegramPlayers.forEach(player => {
          console.log(`   - ${player.username} (${player.id})`);
        });

        if (telegramPlayers.length > 0) {
          // Send current question to Telegram players
          const currentQuestionIndex = session.currentQuestionIndex || 0;
          if (session.questions && session.questions[currentQuestionIndex]) {
            const currentQuestion = session.questions[currentQuestionIndex];

            // Check if we need to send this question (based on lastNotifiedQuestionIndex)
            const lastNotifiedIndex = session.lastNotifiedQuestionIndex || -1;

            console.log('📝 Question details:');
            console.log(`   - Question: ${currentQuestion.question.substring(0, 100)}...`);
            console.log(`   - Options: ${JSON.stringify(currentQuestion.options)}`);
            console.log(`   - Current index: ${currentQuestionIndex}, Last notified: ${lastNotifiedIndex}`);

            if (currentQuestionIndex > lastNotifiedIndex) {
              console.log(`📤 SHOULD SEND question ${currentQuestionIndex + 1} to ${telegramPlayers.length} Telegram players`);

              // Simulate sending to Telegram users
              for (const player of telegramPlayers) {
                console.log(`📱 [SIMULATED] Sending question to ${player.username}:`);
                console.log(`   Question: ${currentQuestion.question}`);
                console.log(`   Options: ${JSON.stringify(currentQuestion.options)}`);
              }

              // Simulate updating the last notified question index
              console.log(`📝 [SIMULATED] Updating lastNotifiedQuestionIndex to ${currentQuestionIndex}`);

            } else {
              console.log(`⏭️ Question ${currentQuestionIndex + 1} already sent (last notified: ${lastNotifiedIndex})`);
            }
          } else {
            console.log(`❌ No question found at index ${currentQuestionIndex}`);
          }
        }
      }

    } catch (error) {
      console.error('💥 Error processing quiz notifications:', error);
    }
  }

  async start() {
    console.log('🚀 Starting Telegram Bot Debugger...');

    if (!(await this.connectToDatabase())) {
      return;
    }

    console.log('🔄 Starting notification polling (every 3 seconds)...');

    // Run once immediately
    await this.processQuizNotifications();

    // Then every 3 seconds
    setInterval(async () => {
      console.log('\n' + '='.repeat(50));
      console.log('🔄 Polling cycle starting...');
      await this.processQuizNotifications();
    }, 3000);
  }
}

// Create and start the debugger
const botDebugger = new TelegramBotDebugger();
botDebugger.start().catch(console.error);

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n👋 Debug session ending...');
  process.exit(0);
});
