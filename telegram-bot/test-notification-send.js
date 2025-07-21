require('dotenv').config();
const { Bot } = require('grammy');
const { InlineKeyboard } = require('grammy');

// Test if telegram bot can send messages
async function testBotConnection() {
  console.log('🧪 Testing Telegram bot message sending...');
  
  try {
    // Create a test bot instance
    const bot = new Bot(process.env.BOT_TOKEN);
    
    console.log('✅ Bot token loaded');
    
    // Test bot info
    const botInfo = await bot.api.getMe();
    console.log('🤖 Bot info:', botInfo);
    
    // Test sending a simple message to a test user
    const testUserId = '7547736315'; // From your logs
    
    console.log(`📤 Sending test message to user ${testUserId}...`);
    
    const keyboard = new InlineKeyboard()
      .text('A. Test Option A', 'test_answer_A_123456')
      .row()
      .text('B. Test Option B', 'test_answer_B_123456')
      .row()
      .text('C. Test Option C', 'test_answer_C_123456');
    
    const testMessage = 
      '🧪 TEST MESSAGE\n\n' +
      'This is a test from the notification service.\n\n' +
      'A. Test Option A\n' +
      'B. Test Option B\n' +
      'C. Test Option C\n\n' +
      '🎯 Tap an answer button below:';
    
    const result = await bot.api.sendMessage(testUserId, testMessage, {
      reply_markup: keyboard
    });
    
    console.log('✅ Test message sent successfully!', result);
    
  } catch (error) {
    console.error('❌ Bot test failed:', error);
    
    if (error.error_code === 403) {
      console.log('📝 NOTE: User might have blocked the bot or not started a chat');
    } else if (error.error_code === 400) {
      console.log('📝 NOTE: Invalid user ID or message format');
    }
  }
}

testBotConnection();
