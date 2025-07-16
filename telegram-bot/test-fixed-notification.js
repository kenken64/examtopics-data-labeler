const { Bot } = require('grammy');
require('dotenv').config();

// Import the modular services
const DatabaseService = require('./src/services/databaseService');
const NotificationService = require('./src/services/notificationService');

class NotificationTester {
  constructor() {
    this.databaseService = new DatabaseService();
    // Create a mock bot for testing
    this.mockBot = {
      api: {
        sendMessage: async (userId, message) => {
          console.log(`📱 [MOCK] Sending to user ${userId}:`);
          console.log(`   ${message.substring(0, 200)}...`);
          return { message_id: Math.random() };
        }
      }
    };
    this.notificationService = new NotificationService(this.databaseService, this.mockBot);
  }

  async testNotificationService() {
    console.log('🧪 Testing Fixed Notification Service');
    console.log('====================================');
    
    try {
      // Test initialization
      console.log('\n1. Testing session initialization...');
      await this.notificationService.initializeSessions();
      
      // Test notification processing
      console.log('\n2. Testing notification processing...');
      await this.notificationService.processQuizNotifications();
      
      // Test legacy notification system
      console.log('\n3. Testing legacy notification system...');
      await this.notificationService.checkForQuizNotifications();
      
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async testDirectQuestionSending() {
    console.log('\n🎯 Testing Direct Question Sending');
    console.log('===================================');
    
    try {
      // Test sending a sample question
      const sampleQuestion = {
        index: 0,
        question: 'What is the capital of Singapore?',
        options: {
          A: 'Singapore City',
          B: 'Marina Bay',
          C: 'Orchard Road',
          D: 'Sentosa'
        },
        timeLimit: 30,
        points: 1000
      };
      
      console.log('\nSending sample question...');
      await this.notificationService.sendQuizQuestion(123456789, sampleQuestion, 'TEST123');
      
      console.log('✅ Direct question sending test completed!');
    } catch (error) {
      console.error('❌ Direct question sending test failed:', error);
    }
  }

  async simulateQuizFlow() {
    console.log('\n🚀 Simulating Complete Quiz Flow');
    console.log('=================================');
    
    try {
      const db = await this.databaseService.connectToDatabase();
      
      // Find an active session
      const activeSession = await db.collection('quizSessions').findOne({ status: 'active' });
      
      if (!activeSession) {
        console.log('❌ No active session found for simulation');
        return;
      }
      
      console.log(`\n🎯 Simulating flow for quiz: ${activeSession.quizCode}`);
      
      // Check current state
      console.log(`   Current Question Index: ${activeSession.currentQuestionIndex}`);
      console.log(`   Last Notified Index: ${activeSession.lastNotifiedQuestionIndex}`);
      console.log(`   Total Questions: ${activeSession.questions?.length || 0}`);
      
      // Get quiz room
      const quizRoom = await db.collection('quizRooms').findOne({ 
        quizCode: activeSession.quizCode 
      });
      
      if (quizRoom) {
        const telegramPlayers = quizRoom.players?.filter(p => 
          p.id && (String(p.id).length >= 7 || p.source === 'telegram')
        ) || [];
        
        console.log(`   Telegram Players: ${telegramPlayers.length}`);
        telegramPlayers.forEach(player => {
          console.log(`     - ${player.name} (${player.id})`);
        });
      }
      
      // Simulate processing
      console.log('\n📤 Simulating notification processing...');
      await this.notificationService.processQuizNotifications();
      
      console.log('✅ Quiz flow simulation completed!');
    } catch (error) {
      console.error('❌ Quiz flow simulation failed:', error);
    }
  }

  async cleanup() {
    if (this.databaseService) {
      await this.databaseService.close();
    }
  }
}

async function main() {
  const tester = new NotificationTester();
  
  try {
    await tester.testNotificationService();
    await tester.testDirectQuestionSending();
    await tester.simulateQuizFlow();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await tester.cleanup();
  }
}

main();