// Script to fix invalid questionStartedAt timestamps in quiz sessions
const { MongoClient } = require('mongodb');

async function fixQuizSessionTimestamps() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'quizblitz');
    
    console.log('🔍 Checking for quiz sessions with invalid timestamps...');
    
    // Find sessions where questionStartedAt is a Date object or invalid
    const sessions = await db.collection('quizSessions').find({
      status: 'active'
    }).toArray();
    
    console.log(`Found ${sessions.length} active sessions`);
    
    for (const session of sessions) {
      console.log(`\n📝 Session ${session.quizCode}:`);
      console.log(`   - questionStartedAt type: ${typeof session.questionStartedAt}`);
      console.log(`   - questionStartedAt value: ${session.questionStartedAt}`);
      
      if (session.questionStartedAt) {
        try {
          const date = new Date(session.questionStartedAt);
          console.log(`   - As Date: ${date.toISOString()}`);
          console.log(`   - As Timestamp: ${date.getTime()}`);
          
          // Check if the timestamp is in the future (invalid)
          const now = Date.now();
          const timeDiff = date.getTime() - now;
          
          if (timeDiff > 0) {
            console.log(`   ⚠️  INVALID: Timestamp is ${(timeDiff / 1000).toFixed(0)}s in the future!`);
            
            // Fix by setting to current time
            const fixedTimestamp = now;
            await db.collection('quizSessions').updateOne(
              { _id: session._id },
              { 
                $set: { 
                  questionStartedAt: fixedTimestamp,
                  timeRemaining: session.timerDuration || 30 // Reset timer
                } 
              }
            );
            console.log(`   ✅ Fixed timestamp to: ${new Date(fixedTimestamp).toISOString()}`);
          } else {
            console.log(`   ✅ Timestamp is valid`);
          }
        } catch (error) {
          console.log(`   ❌ Error parsing timestamp: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  No questionStartedAt timestamp`);
      }
    }
    
    console.log('\n🔧 Timestamp fix complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixQuizSessionTimestamps();
