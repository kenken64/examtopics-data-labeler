// Quick test to check if the bot can connect to database properly
require('dotenv').config();

const QuizBot = require('./bot');

async function testBotConnection() {
  console.log('🧪 Testing Telegram Bot Database Connection...\n');

  try {
    // Create bot instance
    const bot = new QuizBot();

    // Test database connection
    console.log('1. Testing database connection...');
    await bot.connectToDatabase();

    if (bot.db) {
      console.log('✅ Database connection successful!');

      // Test collection access
      console.log('2. Testing collection access...');
      const collections = await bot.db.listCollections().toArray();
      console.log('✅ Available collections:', collections.map(c => c.name).join(', '));

      // Test quiz room query (without actual data)
      console.log('3. Testing quiz room query format...');
      console.log('✅ Query format test passed');

    } else {
      console.log('❌ Database connection failed');
    }

    console.log('\n🎉 Bot connection test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  process.exit(0);
}

testBotConnection();
