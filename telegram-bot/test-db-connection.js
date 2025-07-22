// Test script to validate the updated bot's database connection
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testDatabaseConnection() {
  try {
    console.log('🔧 Testing MongoDB connection for bot...');
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    // Test finding a quiz room
    const quizRoom = await db.collection('quizRooms').findOne({}, { limit: 1 });
    console.log('✅ Sample quiz room found:', quizRoom ? 'YES' : 'NO');
    
    // Test finding quiz sessions
    const quizSession = await db.collection('quizSessions').findOne({}, { limit: 1 });
    console.log('✅ Sample quiz session found:', quizSession ? 'YES' : 'NO');
    
    // Test collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('✅ Available collections:', collectionNames.slice(0, 10).join(', '));
    
    await client.close();
    console.log('✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
  }
}

testDatabaseConnection();
