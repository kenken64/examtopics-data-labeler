/**
 * Test script to verify modular bot components load correctly
 */

const path = require('path');

// Set up module paths
const srcPath = path.join(__dirname, 'src');
require('module').globalPaths.push(srcPath);

console.log('🧪 Testing modular bot components...\n');

// Test utility functions
console.log('1. Testing answerUtils...');
try {
  const { normalizeAnswer, isMultipleAnswerQuestion, validateMultipleAnswers, formatAnswerForDisplay } = require('./src/utils/answerUtils');
  
  // Test normalizeAnswer
  const testNormalize = normalizeAnswer('B C A');
  console.log('   ✅ normalizeAnswer("B C A") =', testNormalize);
  
  // Test isMultipleAnswerQuestion
  const testMultiple = isMultipleAnswerQuestion('BC');
  console.log('   ✅ isMultipleAnswerQuestion("BC") =', testMultiple);
  
  // Test validateMultipleAnswers
  const testValidate = validateMultipleAnswers(['B', 'C'], 'BC');
  console.log('   ✅ validateMultipleAnswers(["B", "C"], "BC") =', testValidate);
  
  // Test formatAnswerForDisplay
  const testFormat = formatAnswerForDisplay('BC');
  console.log('   ✅ formatAnswerForDisplay("BC") =', testFormat);
  
  console.log('   ✅ answerUtils loaded successfully\n');
} catch (error) {
  console.error('   ❌ answerUtils failed:', error.message);
}

// Test services
console.log('2. Testing services...');
try {
  const DatabaseService = require('./src/services/databaseService');
  console.log('   ✅ DatabaseService loaded successfully');
  
  const QuizService = require('./src/services/quizService');
  console.log('   ✅ QuizService loaded successfully');
  
  const NotificationService = require('./src/services/notificationService');
  console.log('   ✅ NotificationService loaded successfully\n');
} catch (error) {
  console.error('   ❌ Services failed:', error.message);
}

// Test handlers
console.log('3. Testing handlers...');
try {
  const MessageHandlers = require('./src/handlers/messageHandlers');
  console.log('   ✅ MessageHandlers loaded successfully');
  
  const CallbackHandlers = require('./src/handlers/callbackHandlers');
  console.log('   ✅ CallbackHandlers loaded successfully\n');
} catch (error) {
  console.error('   ❌ Handlers failed:', error.message);
}

// Test instantiation (without actual bot token)
console.log('4. Testing service instantiation...');
try {
  // Mock environment for testing
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  
  const DatabaseService = require('./src/services/databaseService');
  const databaseService = new DatabaseService();
  console.log('   ✅ DatabaseService instantiated successfully');
  
  const QuizService = require('./src/services/quizService');
  const quizService = new QuizService(databaseService);
  console.log('   ✅ QuizService instantiated successfully');
  
  const MessageHandlers = require('./src/handlers/messageHandlers');
  const messageHandlers = new MessageHandlers(databaseService, quizService);
  console.log('   ✅ MessageHandlers instantiated successfully');
  
  const CallbackHandlers = require('./src/handlers/callbackHandlers');
  const callbackHandlers = new CallbackHandlers(databaseService, quizService, messageHandlers);
  console.log('   ✅ CallbackHandlers instantiated successfully\n');
} catch (error) {
  console.error('   ❌ Service instantiation failed:', error.message);
}

console.log('🎉 Modular bot component test completed!');
console.log('💡 To run the actual bot, use: node bot-modular.js');