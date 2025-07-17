// Script to verify the new quiz state management system
// This checks the structure and consistency of the single-record-per-quiz system

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function verifyQuizStateSystem() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    console.log('\n🔍 VERIFYING QUIZ STATE SYSTEM\n');
    
    // Check quizEvents collection structure
    console.log('📊 QUIZ EVENTS COLLECTION:');
    const quizEvents = await db.collection('quizEvents').find({}).toArray();
    console.log(`   Total records: ${quizEvents.length}`);
    
    if (quizEvents.length > 0) {
      console.log('\n   Sample records:');
      quizEvents.slice(0, 3).forEach((event, index) => {
        console.log(`   ${index + 1}. Quiz ${event.quizCode}:`);
        console.log(`      Type: ${event.type}`);
        console.log(`      Question Index: ${event.data?.currentQuestionIndex || 'N/A'}`);
        console.log(`      Time Remaining: ${event.data?.timeRemaining || 'N/A'}`);
        console.log(`      Last Updated: ${event.lastUpdated}`);
        console.log(`      Question: ${event.data?.question?.question?.substring(0, 50) || 'N/A'}...`);
        console.log('');
      });
    }
    
    // Check for duplicate quizCodes (should be none)
    const quizCodes = quizEvents.map(e => e.quizCode);
    const duplicates = quizCodes.filter((code, index) => quizCodes.indexOf(code) !== index);
    if (duplicates.length > 0) {
      console.log(`❌ Found duplicate quizCodes: ${duplicates.join(', ')}`);
    } else {
      console.log('✅ No duplicate quizCodes found');
    }
    
    // Check quizSessions collection
    console.log('\n📊 QUIZ SESSIONS COLLECTION:');
    const quizSessions = await db.collection('quizSessions').find({ status: 'active' }).toArray();
    console.log(`   Active sessions: ${quizSessions.length}`);
    
    if (quizSessions.length > 0) {
      console.log('\n   Active sessions details:');
      quizSessions.forEach((session, index) => {
        console.log(`   ${index + 1}. Quiz ${session.quizCode}:`);
        console.log(`      Status: ${session.status}`);
        console.log(`      Current Question: ${session.currentQuestionIndex || 0}`);
        console.log(`      Total Questions: ${session.questions?.length || 0}`);
        console.log(`      Last Notified: ${session.lastNotifiedQuestionIndex || -1}`);
        console.log('');
      });
    }
    
    // Check quizRooms collection
    console.log('\n📊 QUIZ ROOMS COLLECTION:');
    const quizRooms = await db.collection('quizRooms').find({ status: 'active' }).toArray();
    console.log(`   Active rooms: ${quizRooms.length}`);
    
    if (quizRooms.length > 0) {
      console.log('\n   Active rooms details:');
      quizRooms.forEach((room, index) => {
        const telegramPlayers = room.players?.filter(p => 
          p.id && (String(p.id).length >= 7 || p.source === 'telegram')
        ) || [];
        
        console.log(`   ${index + 1}. Quiz ${room.quizCode}:`);
        console.log(`      Total Players: ${room.players?.length || 0}`);
        console.log(`      Telegram Players: ${telegramPlayers.length}`);
        console.log(`      Telegram Player IDs: ${telegramPlayers.map(p => p.id).join(', ') || 'None'}`);
        console.log('');
      });
    }
    
    // Cross-reference active quizzes
    console.log('\n🔗 CROSS-REFERENCE ANALYSIS:');
    const activeQuizCodes = new Set();
    
    quizEvents.forEach(event => activeQuizCodes.add(event.quizCode));
    quizSessions.forEach(session => activeQuizCodes.add(session.quizCode));
    quizRooms.forEach(room => activeQuizCodes.add(room.quizCode));
    
    console.log(`   Unique active quiz codes: ${Array.from(activeQuizCodes).join(', ')}`);
    
    for (const quizCode of activeQuizCodes) {
      const hasEvent = quizEvents.some(e => e.quizCode === quizCode);
      const hasSession = quizSessions.some(s => s.quizCode === quizCode);
      const hasRoom = quizRooms.some(r => r.quizCode === quizCode);
      
      console.log(`   ${quizCode}: Event=${hasEvent ? '✅' : '❌'} Session=${hasSession ? '✅' : '❌'} Room=${hasRoom ? '✅' : '❌'}`);
    }
    
    // System health check
    console.log('\n🩺 SYSTEM HEALTH CHECK:');
    
    const healthChecks = [
      {
        name: 'Single record per quiz in quizEvents',
        status: duplicates.length === 0 ? 'PASS' : 'FAIL',
        details: duplicates.length === 0 ? 'No duplicates found' : `${duplicates.length} duplicates found`
      },
      {
        name: 'Event structure consistency',
        status: quizEvents.every(e => e.quizCode && e.type && e.data && e.lastUpdated) ? 'PASS' : 'FAIL',
        details: 'All events have required fields'
      },
      {
        name: 'Question data availability',
        status: quizEvents.filter(e => e.type === 'question_started' || e.type === 'quiz_started').every(e => e.data?.question) ? 'PASS' : 'FAIL',
        details: 'All question events have question data'
      },
      {
        name: 'Telegram player detection',
        status: quizRooms.some(r => r.players?.some(p => String(p.id).length >= 7)) ? 'PASS' : 'WARN',
        details: 'At least one Telegram player detected'
      }
    ];
    
    healthChecks.forEach(check => {
      const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
      console.log(`   ${icon} ${check.name}: ${check.status}`);
      console.log(`      ${check.details}`);
    });
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('   1. Run the migration script if you see duplicate quizCodes');
    console.log('   2. Monitor debug logs for state change detection');
    console.log('   3. Verify Telegram players are joining with 7+ digit IDs');
    console.log('   4. Check that quiz events are being updated, not inserted');
    
  } catch (error) {
    console.error('❌ Verification error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the verification
verifyQuizStateSystem();