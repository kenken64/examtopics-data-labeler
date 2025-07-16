// Script to migrate quizEvents collection from multiple records per quiz to single record per quiz
// This consolidates all quiz events into a single record per quizCode with the latest state

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrateQuizEvents() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection('quizEvents');
    
    // Get all quiz events
    const allEvents = await collection.find({}).toArray();
    console.log(`📊 Found ${allEvents.length} quiz events`);
    
    // Group events by quizCode
    const eventsByQuizCode = {};
    allEvents.forEach(event => {
      const quizCode = event.quizCode.toUpperCase();
      if (!eventsByQuizCode[quizCode]) {
        eventsByQuizCode[quizCode] = [];
      }
      eventsByQuizCode[quizCode].push(event);
    });
    
    console.log(`📈 Found ${Object.keys(eventsByQuizCode).length} unique quiz codes`);
    
    // Clear existing collection
    await collection.deleteMany({});
    console.log('🧹 Cleared existing quizEvents collection');
    
    // For each quiz code, create a single consolidated record
    for (const [quizCode, events] of Object.entries(eventsByQuizCode)) {
      console.log(`🔄 Processing quiz ${quizCode} with ${events.length} events`);
      
      // Sort events by timestamp to get the latest state
      events.sort((a, b) => new Date(a.timestamp || a.lastUpdated) - new Date(b.timestamp || b.lastUpdated));
      
      // Find the most recent question_started or quiz_started event
      const questionEvents = events.filter(e => e.type === 'question_started' || e.type === 'quiz_started');
      const latestQuestionEvent = questionEvents[questionEvents.length - 1];
      
      if (latestQuestionEvent) {
        // Create consolidated record
        const consolidatedEvent = {
          quizCode: quizCode,
          type: latestQuestionEvent.type,
          data: {
            question: latestQuestionEvent.data?.question || latestQuestionEvent.data,
            currentQuestionIndex: latestQuestionEvent.data?.question?.questionIndex || 0,
            timeRemaining: latestQuestionEvent.data?.question?.timeLimit || 30
          },
          lastUpdated: new Date()
        };
        
        console.log(`📝 Creating consolidated record for ${quizCode}:`, {
          type: consolidatedEvent.type,
          currentQuestionIndex: consolidatedEvent.data.currentQuestionIndex,
          timeRemaining: consolidatedEvent.data.timeRemaining
        });
        
        await collection.insertOne(consolidatedEvent);
        console.log(`✅ Consolidated record created for ${quizCode}`);
      } else {
        console.log(`⚠️ No valid question events found for ${quizCode}, skipping`);
      }
    }
    
    // Verify the migration
    const finalCount = await collection.countDocuments();
    console.log(`🎉 Migration completed! ${finalCount} consolidated records created`);
    
    // Show sample of migrated data
    const sampleRecords = await collection.find({}).limit(3).toArray();
    console.log('📋 Sample migrated records:');
    sampleRecords.forEach(record => {
      console.log(`  - ${record.quizCode}: ${record.type} (Q${record.data.currentQuestionIndex + 1})`);
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateQuizEvents();