// Script to clean up duplicate quiz start records in quizEvents collection
// This removes duplicate quiz_started events and keeps only the oldest one

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function cleanupDuplicateQuizEvents() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection('quizEvents');
    
    // Find all quiz_started events
    const quizStartedEvents = await collection.find({
      type: 'quiz_started'
    }).toArray();
    
    console.log(`📊 Found ${quizStartedEvents.length} quiz_started events`);
    
    // Group by quizCode to identify duplicates
    const eventsByQuizCode = {};
    quizStartedEvents.forEach(event => {
      const quizCode = event.quizCode.toUpperCase();
      if (!eventsByQuizCode[quizCode]) {
        eventsByQuizCode[quizCode] = [];
      }
      eventsByQuizCode[quizCode].push(event);
    });
    
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    
    // Process each quiz code group
    for (const [quizCode, events] of Object.entries(eventsByQuizCode)) {
      if (events.length > 1) {
        duplicatesFound++;
        console.log(`🔍 Found ${events.length} duplicate quiz_started events for quiz: ${quizCode}`);
        
        // Sort by timestamp (oldest first)
        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Keep the oldest event, remove the rest
        const eventsToRemove = events.slice(1);
        
        for (const eventToRemove of eventsToRemove) {
          console.log(`🗑️ Removing duplicate event: ${eventToRemove._id} (${eventToRemove.timestamp})`);
          await collection.deleteOne({ _id: eventToRemove._id });
          duplicatesRemoved++;
        }
        
        console.log(`✅ Kept oldest event: ${events[0]._id} (${events[0].timestamp})`);
      }
    }
    
    console.log(`📈 Summary:`);
    console.log(`   • Total quiz codes with duplicates: ${duplicatesFound}`);
    console.log(`   • Total duplicate events removed: ${duplicatesRemoved}`);
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
cleanupDuplicateQuizEvents();