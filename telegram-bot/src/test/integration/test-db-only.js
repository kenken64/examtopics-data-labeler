// Simple test to check database connection without starting the full bot
require('dotenv').config();

const { MongoClient } = require('mongodb');

async function testDatabaseConnection() {
  console.log('🧪 Testing MongoDB Connection...\n');

  try {
    console.log('Environment check:');
    console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
    console.log('- MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME ? '✅ Set' : '❌ Missing');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is missing');
    }

    console.log('\n1. Connecting to MongoDB...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    console.log('✅ Connected to MongoDB successfully!');

    const db = client.db(process.env.MONGODB_DB_NAME);

    console.log('\n2. Testing collections access...');
    const collections = await db.listCollections().toArray();
    console.log('✅ Available collections:', collections.map(c => c.name).join(', '));

    // Test specific collections used by the bot
    const requiredCollections = ['quizRooms', 'quizNotifications', 'telegramNotifications'];
    console.log('\n3. Checking required collections...');

    for (const collName of requiredCollections) {
      const exists = collections.some(c => c.name === collName);
      console.log(`- ${collName}: ${exists ? '✅ Found' : '⚠️ Not found (will be created when needed)'}`);
    }

    console.log('\n🎉 Database connection test successful!');

    await client.close();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  process.exit(0);
}

testDatabaseConnection();
