// Script to clean up inconsistent quiz rooms
// This removes quiz rooms that may have been created with mismatched codes

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function cleanupInconsistentRooms() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection('quizRooms');
    
    // Find all quiz rooms
    const rooms = await collection.find({}).toArray();
    console.log(`📊 Found ${rooms.length} quiz rooms`);
    
    // Clean up any rooms that are in 'waiting' status but are old
    const oldRooms = rooms.filter(room => {
      const createdAt = new Date(room.createdAt);
      const now = new Date();
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
      
      return room.status === 'waiting' && hoursSinceCreation > 1; // Older than 1 hour
    });
    
    console.log(`🧹 Found ${oldRooms.length} old waiting rooms to clean up`);
    
    for (const room of oldRooms) {
      console.log(`🗑️ Removing old room: ${room.quizCode} (created: ${room.createdAt})`);
      await collection.deleteOne({ _id: room._id });
    }
    
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
cleanupInconsistentRooms();