// Script to add unique index to quizRooms collection
// This prevents duplicate quiz codes at the database level

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function addUniqueIndexToQuizRooms() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection('quizRooms');
    
    // First, let's check if there are any existing duplicates
    const duplicates = await collection.aggregate([
      { $group: { _id: '$quizCode', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicates.length > 0) {
      console.log('⚠️ Found duplicate quiz codes:', duplicates);
      
      // Remove duplicates, keeping only the most recent one
      for (const dup of duplicates) {
        const quizCode = dup._id;
        const rooms = await collection.find({ quizCode: quizCode }).sort({ createdAt: -1 }).toArray();
        
        // Keep the first one (most recent), delete the rest
        for (let i = 1; i < rooms.length; i++) {
          await collection.deleteOne({ _id: rooms[i]._id });
          console.log(`🗑️ Deleted duplicate room: ${rooms[i]._id}`);
        }
      }
    }
    
    // Create unique index on quizCode
    await collection.createIndex({ quizCode: 1 }, { unique: true });
    console.log('✅ Created unique index on quizCode field');
    
    // List all indexes to verify
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:', indexes);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addUniqueIndexToQuizRooms();