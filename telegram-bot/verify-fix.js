const { MongoClient } = require('mongodb');
require('dotenv').config();

async function verifyFix() {
  console.log('🔍 Verifying QuizBlitz Change Stream Fix');
  console.log('=======================================');
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  
  // Check active sessions
  const activeSessions = await db.collection('quizSessions').find({ status: 'active' }).toArray();
  console.log(`\n📊 Active Sessions: ${activeSessions.length}`);
  
  let fixedCount = 0;
  let readyCount = 0;
  
  for (const session of activeSessions) {
    const hasIndex = session.lastNotifiedQuestionIndex !== undefined;
    const hasPlayers = session.players && session.players.length > 0;
    const hasQuestions = session.questions && session.questions.length > 0;
    
    console.log(`\n🎯 Quiz ${session.quizCode}:`);
    console.log(`   ✓ Has lastNotifiedQuestionIndex: ${hasIndex ? '✅' : '❌'}`);
    console.log(`   ✓ Has players: ${hasPlayers ? '✅' : '❌'}`);
    console.log(`   ✓ Has questions: ${hasQuestions ? '✅' : '❌'}`);
    console.log(`   Current Index: ${session.currentQuestionIndex || 0}`);
    console.log(`   Last Notified: ${session.lastNotifiedQuestionIndex || 'undefined'}`);
    
    if (hasIndex && hasPlayers && hasQuestions) {
      readyCount++;
      console.log(`   🟢 Status: READY for notifications`);
    } else {
      console.log(`   🔴 Status: NOT READY`);
    }
  }
  
  // Check quiz rooms with Telegram players
  const quizRooms = await db.collection('quizRooms').find({}).toArray();
  let roomsWithTelegram = 0;
  
  for (const room of quizRooms) {
    const telegramPlayers = room.players?.filter(p => 
      p.id && (String(p.id).length >= 7 || p.source === 'telegram')
    ) || [];
    
    if (telegramPlayers.length > 0) {
      roomsWithTelegram++;
      
      // Check if this room has an active session
      const activeSession = activeSessions.find(s => s.quizCode === room.quizCode);
      
      console.log(`\n🏠 Quiz Room ${room.quizCode}:`);
      console.log(`   Telegram Players: ${telegramPlayers.length}`);
      console.log(`   Active Session: ${activeSession ? '✅' : '❌'}`);
      
      if (activeSession) {
        const shouldSendQuestion = (activeSession.currentQuestionIndex || 0) > (activeSession.lastNotifiedQuestionIndex || -1);
        console.log(`   Should Send Question: ${shouldSendQuestion ? '✅' : '❌'}`);
      }
    }
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total Active Sessions: ${activeSessions.length}`);
  console.log(`   Ready for Notifications: ${readyCount}`);
  console.log(`   Quiz Rooms with Telegram Players: ${roomsWithTelegram}`);
  
  if (readyCount > 0) {
    console.log(`\n✅ Fix Applied Successfully!`);
    console.log(`   ${readyCount} session(s) ready to send notifications`);
  } else {
    console.log(`\n⚠️  No sessions ready for notifications`);
  }
  
  await client.close();
}

verifyFix().catch(console.error);