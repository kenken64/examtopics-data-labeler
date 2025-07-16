#!/usr/bin/env node

// Test bot startup simulation to debug the timeout issue
const { Bot } = require('grammy');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testBotStartup() {
  console.log('🧪 Testing Bot Startup Logic...\n');
  
  try {
    // Test MongoDB connection first
    console.log('🔌 Testing MongoDB connection...');
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB_NAME);
    await db.admin().ping();
    console.log('✅ MongoDB connection successful');
    await mongoClient.close();
    
    // Test Telegram bot initialization with timeout
    console.log('\n🤖 Testing Telegram bot connection...');
    const bot = new Bot(process.env.BOT_TOKEN);
    
    const botStartPromise = bot.start({
      onStart: () => console.log('✅ Bot started successfully!'),
      drop_pending_updates: true
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bot start timeout after 5 seconds')), 5000);
    });
    
    try {
      await Promise.race([botStartPromise, timeoutPromise]);
      console.log('✅ Telegram bot connected successfully');
      await bot.stop();
    } catch (timeoutError) {
      console.log('⚠️  Telegram bot timeout detected:', timeoutError.message);
      console.log('🔄 This would trigger offline mode in the actual bot');
      
      // Simulate offline mode
      console.log('\n📱 OFFLINE MODE SIMULATION:');
      console.log('   - Telegram bot features: DISABLED');
      console.log('   - MongoDB connection: ACTIVE');
      console.log('   - QuizBlitz backend: READY');
      console.log('   - Notification polling: ACTIVE');
      console.log('   - Health check server: RUNNING');
    }
    
    console.log('\n✅ Bot startup test completed');
    console.log('💡 The bot should continue running even with Telegram timeout');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBotStartup();
