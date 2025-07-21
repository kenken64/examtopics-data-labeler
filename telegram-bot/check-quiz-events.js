const { MongoClient } = require('mongodb');
require('dotenv').config();

(async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    const events = await db.collection('quizEvents').find({}).sort({_id: -1}).limit(5).toArray();
    console.log('📋 Recent quiz events:');
    
    events.forEach((event, i) => {
      console.log(`${i+1}. Type: ${event.type}, Quiz: ${event.quizCode || 'N/A'}, Time: ${event.timestamp}`);
      if (event.data) {
        console.log(`   Data: ${JSON.stringify(event.data).substring(0, 100)}...`);
      }
      if (event.player) {
        console.log(`   Player: ${event.player.name || event.player.id}`);
      }
    });
    
    await client.close();
    console.log('✅ Quiz events check completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
