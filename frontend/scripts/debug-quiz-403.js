// Debug QuizBlitz 403 Authorization Issue
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function debugAuthorizationIssue() {
  console.log('🕵️ DEBUG: QuizBlitz 403 Authorization Issue');
  console.log('==========================================\n');
  
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'awscert';
  
  if (!uri) {
    console.log('❌ MONGODB_URI not configured');
    return;
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('1️⃣ Checking existing quiz rooms...\n');
    
    const quizRooms = await db.collection('quizRooms').find({}).limit(5).toArray();
    
    if (quizRooms.length === 0) {
      console.log('   ❌ No quiz rooms found');
    } else {
      console.log(`   📋 Found ${quizRooms.length} quiz rooms:`);
      
      quizRooms.forEach((room, index) => {
        console.log(`\n   Room ${index + 1}:`);
        console.log(`   - Quiz Code: ${room.quizCode}`);
        console.log(`   - Host User ID: ${room.hostUserId} (${typeof room.hostUserId})`);
        console.log(`   - Status: ${room.status}`);
        console.log(`   - Created: ${room.createdAt}`);
        console.log(`   - Players: ${room.players?.length || 0}`);
      });
    }
    
    console.log('\n2️⃣ Checking user collection for reference...\n');
    
    const users = await db.collection('users').find({}).limit(3).toArray();
    
    if (users.length > 0) {
      console.log(`   👥 Sample users (for ID format reference):`);
      users.forEach((user, index) => {
        console.log(`   User ${index + 1}:`);
        console.log(`   - ID: ${user._id} (${typeof user._id})`);
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Email: ${user.email}`);
      });
    }
    
    console.log('\n3️⃣ Looking for "waiting" status rooms...\n');
    
    const waitingRooms = await db.collection('quizRooms').find({
      status: 'waiting'
    }).toArray();
    
    if (waitingRooms.length === 0) {
      console.log('   ❌ No rooms with "waiting" status found');
      
      // Check what statuses exist
      const statusesPipeline = [
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ];
      
      const statuses = await db.collection('quizRooms').aggregate(statusesPipeline).toArray();
      console.log('\n   📊 Available room statuses:');
      statuses.forEach(status => {
        console.log(`   - ${status._id}: ${status.count} rooms`);
      });
    } else {
      console.log(`   ✅ Found ${waitingRooms.length} waiting rooms:`);
      waitingRooms.forEach((room, index) => {
        console.log(`\n   Waiting Room ${index + 1}:`);
        console.log(`   - Quiz Code: ${room.quizCode}`);
        console.log(`   - Host User ID: ${room.hostUserId}`);
        console.log(`   - Host User Type: ${typeof room.hostUserId}`);
      });
    }
    
    console.log('\n💡 DEBUGGING TIPS:');
    console.log('==================');
    console.log('1. Check if hostUserId is stored as ObjectId vs string');
    console.log('2. Verify user authentication is working (userId extraction)');
    console.log('3. Ensure quiz room was created with correct hostUserId');
    console.log('4. Check if room status is "waiting" vs other status');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await client.close();
  }
}

debugAuthorizationIssue();
