// Manual test to send a question directly to Telegram user
require('dotenv').config();

const { MongoClient } = require('mongodb');

async function manualSendQuestionTest() {
  console.log('🧪 Manual Telegram Question Send Test...\n');

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Find an active quiz session
    const activeSession = await db.collection('quizSessions')
      .findOne({ status: 'active' });

    if (!activeSession) {
      console.log('❌ No active quiz sessions found. Start a quiz first.');
      return;
    }

    console.log(`📊 Found active quiz: ${activeSession.quizCode}`);
    console.log(`📍 Current question index: ${activeSession.currentQuestionIndex || 0}`);

    // Get current question
    const currentQuestionIndex = activeSession.currentQuestionIndex || 0;
    const currentQuestion = activeSession.questions[currentQuestionIndex];

    if (!currentQuestion) {
      console.log('❌ No current question found');
      return;
    }

    console.log('📝 Current question:', currentQuestion.question.substring(0, 100) + '...');
    console.log('📋 Options:', JSON.stringify(currentQuestion.options, null, 2));

    // Force update the lastNotifiedQuestionIndex to trigger notification
    console.log('\n🔄 Forcing notification update...');
    await db.collection('quizSessions').updateOne(
      { _id: activeSession._id },
      { $set: { lastNotifiedQuestionIndex: currentQuestionIndex - 1 } }
    );

    console.log('✅ Updated lastNotifiedQuestionIndex to trigger notification');
    console.log('⏳ The Telegram bot should pick this up in the next polling cycle (within 3 seconds)');

    await client.close();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  process.exit(0);
}

manualSendQuestionTest();
