// Check MongoDB configuration and setup
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkMongoDBSetup() {
  console.log('🔍 Checking MongoDB Configuration');
  console.log('=================================\n');

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Check server status
    const serverStatus = await db.admin().command({ serverStatus: 1 });
    console.log('📊 MongoDB Server Info:');
    console.log(`   Version: ${serverStatus.version}`);
    console.log(`   Host: ${serverStatus.host}`);
    console.log(`   Storage Engine: ${serverStatus.storageEngine?.name || 'Unknown'}`);
    
    // Check replica set status
    try {
      const replSetStatus = await db.admin().command({ replSetGetStatus: 1 });
      console.log(`   Replica Set: ${replSetStatus.set}`);
      console.log(`   Primary: ${replSetStatus.members?.find(m => m.stateStr === 'PRIMARY')?.name || 'None'}`);
      console.log('   ✅ Replica set detected - Change Streams supported');
    } catch (replError) {
      console.log('   ❌ Replica set not configured - Change Streams NOT supported');
      console.log(`   Error: ${replError.message}`);
    }

    // Check if we're using MongoDB Atlas or local
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri.includes('mongodb.net')) {
      console.log('\n🌐 Using MongoDB Atlas (should support Change Streams)');
    } else if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
      console.log('\n🏠 Using Local MongoDB (may need replica set configuration)');
    } else {
      console.log('\n🔧 Using Custom MongoDB deployment');
    }

    console.log(`\n📝 Connection URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

    await client.close();

  } catch (error) {
    console.error('❌ MongoDB check failed:', error.message);
  }
}

checkMongoDBSetup().catch(console.error);
