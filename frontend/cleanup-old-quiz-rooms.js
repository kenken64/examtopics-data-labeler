// Cleanup script for quiz rooms with undefined hostUserId
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function cleanupQuizRooms() {
  console.log('🧹 Cleaning up quiz rooms with undefined hostUserId');
  console.log('=================================================\n');

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // 1. Count rooms with undefined hostUserId
    const undefinedHostRooms = await db.collection('quizRooms').countDocuments({
      $or: [
        { hostUserId: undefined },
        { hostUserId: null },
        { hostUserId: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${undefinedHostRooms} quiz rooms with undefined hostUserId`);

    if (undefinedHostRooms > 0) {
      // 2. Delete rooms with undefined hostUserId
      const deleteResult = await db.collection('quizRooms').deleteMany({
        $or: [
          { hostUserId: undefined },
          { hostUserId: null },
          { hostUserId: { $exists: false } }
        ]
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} quiz rooms with undefined hostUserId`);
    }

    // 3. Show remaining rooms
    const remainingRooms = await db.collection('quizRooms').find({}).toArray();
    console.log(`\n📋 Remaining quiz rooms: ${remainingRooms.length}`);
    
    if (remainingRooms.length > 0) {
      remainingRooms.forEach((room, index) => {
        console.log(`   Room ${index + 1}:`);
        console.log(`   - Quiz Code: ${room.quizCode}`);
        console.log(`   - Host User ID: ${room.hostUserId} (${typeof room.hostUserId})`);
        console.log(`   - Status: ${room.status}`);
        console.log(`   - Created: ${room.createdAt}`);
        console.log('');
      });
    }

    await client.close();
    console.log('🎯 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupQuizRooms().catch(console.error);
