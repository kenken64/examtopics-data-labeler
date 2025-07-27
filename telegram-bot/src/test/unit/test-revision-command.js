/**
 * Test script for the /revision command functionality
 */

console.log('🧪 Testing /revision command functionality...\n');

// Mock services to avoid database connection
class MockDatabaseService {}
class MockQuizService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }
}

// Import the message handlers after setting up mocks
const MessageHandlers = require('../../handlers/messageHandlers');

// Mock context object
function createMockContext(userId) {
  return {
    from: { id: userId },
    reply: async (message, options) => {
      console.log(`📤 Bot Reply (${options?.parse_mode || 'text'}):`);
      console.log(message);
      console.log('');
    }
  };
}

async function testRevisionCommand() {
  console.log('1. Testing revision command...');

  // Create mock services and handlers
  const databaseService = new MockDatabaseService();
  const quizService = new MockQuizService(databaseService);
  const messageHandlers = new MessageHandlers(databaseService, quizService);

  // Create mock user sessions
  const userSessions = new Map();
  const userId = 12345;

  console.log('\n2. Testing with no active session...');
  const ctx1 = createMockContext(userId);
  await messageHandlers.handleRevision(ctx1, userSessions);

  console.log('\n3. Testing with session but no wrong answers...');
  userSessions.set(userId, {
    currentQuestionIndex: 0,
    correctAnswers: 3,
    wrongAnswers: []
  });
  const ctx2 = createMockContext(userId);
  await messageHandlers.handleRevision(ctx2, userSessions);

  console.log('\n4. Testing with wrong answers...');
  userSessions.set(userId, {
    currentQuestionIndex: 5,
    correctAnswers: 3,
    wrongAnswers: [
      {
        questionId: 'question_1_id',
        questionNumber: 2,
        userAnswer: 'B',
        correctAnswer: 'A'
      },
      {
        questionId: 'question_2_id',
        questionNumber: 4,
        userAnswer: 'C,D',
        correctAnswer: 'A,B'
      }
    ]
  });
  const ctx3 = createMockContext(userId);
  await messageHandlers.handleRevision(ctx3, userSessions);

  console.log('✅ Revision command tests completed!\n');
}

// Run the test
testRevisionCommand().catch(error => {
  console.error('❌ Test failed:', error);
});
