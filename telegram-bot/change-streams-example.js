// Example: MongoDB Change Streams implementation for real-time quiz state monitoring
// This is an alternative to simple polling that watches for changes in real-time

const { MongoClient } = require('mongodb');
require('dotenv').config();

class QuizChangeStreamMonitor {
  constructor() {
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.changeStream = null;
  }

  async connect() {
    try {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(process.env.MONGODB_DB_NAME);
      console.log('✅ Connected to MongoDB for Change Streams');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  startChangeStreamMonitoring() {
    console.log('🔄 Starting MongoDB Change Streams monitoring...');
    console.log('📡 MONITORING MECHANISM: MongoDB Change Streams (Real-time)');
    
    // Watch for changes in quizEvents collection
    this.changeStream = this.db.collection('quizEvents').watch([
      {
        $match: {
          'operationType': { $in: ['insert', 'update', 'replace'] },
          'fullDocument.type': { $in: ['quiz_started', 'question_started', 'timer_update'] }
        }
      }
    ], {
      fullDocument: 'updateLookup' // Get the full document after update
    });

    console.log('👀 Change Stream active - watching quizEvents collection...');
    console.log('🎯 Watching for: insert, update, replace operations');
    console.log('📋 Filtering: quiz_started, question_started, timer_update events');
    
    this.changeStream.on('change', (change) => {
      this.handleQuizEventChange(change);
    });

    this.changeStream.on('error', (error) => {
      console.error('❌ Change Stream error:', error);
      this.reconnectChangeStream();
    });

    this.changeStream.on('close', () => {
      console.log('⚠️ Change Stream closed');
      this.reconnectChangeStream();
    });
  }

  handleQuizEventChange(change) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`⚡ REAL-TIME CHANGE DETECTED - ${timestamp}`);
    console.log(`   Operation: ${change.operationType}`);
    console.log(`   Quiz Code: ${change.fullDocument?.quizCode}`);
    console.log(`   Type: ${change.fullDocument?.type}`);
    console.log(`   Question: ${change.fullDocument?.data?.currentQuestionIndex || 0} + 1`);
    console.log(`   Time: ${change.fullDocument?.data?.timeRemaining || 0}s`);
    
    // Process the change immediately (no 3-second delay)
    this.processQuizEventChange(change.fullDocument);
  }

  async processQuizEventChange(quizEvent) {
    try {
      console.log(`🔄 Processing real-time change for quiz ${quizEvent.quizCode}`);
      
      // Only process question starts (not timer updates)
      if (quizEvent.type === 'question_started' || quizEvent.type === 'quiz_started') {
        console.log(`📤 New question detected - sending to Telegram players`);
        
        // Find Telegram players for this quiz
        const quizRoom = await this.db.collection('quizRooms').findOne({ 
          quizCode: quizEvent.quizCode 
        });
        
        if (quizRoom && quizRoom.players) {
          const telegramPlayers = quizRoom.players.filter(p => 
            p.id && (String(p.id).length >= 7 || p.source === 'telegram')
          );
          
          console.log(`👥 Found ${telegramPlayers.length} Telegram players`);
          
          if (telegramPlayers.length > 0 && quizEvent.data?.question) {
            console.log(`📱 Sending question to Telegram players immediately`);
            
            // Here you would send the question to Telegram players
            // For this example, we'll just log it
            telegramPlayers.forEach(player => {
              console.log(`   📨 Would send to ${player.name} (${player.id})`);
            });
          }
        }
      } else {
        console.log(`⏭️ Timer update - no action needed`);
      }
      
    } catch (error) {
      console.error('❌ Error processing change:', error);
    }
  }

  async reconnectChangeStream() {
    console.log('🔄 Attempting to reconnect Change Stream...');
    
    try {
      if (this.changeStream) {
        await this.changeStream.close();
      }
      
      // Wait 5 seconds before reconnecting
      setTimeout(() => {
        this.startChangeStreamMonitoring();
      }, 5000);
      
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
    }
  }

  async close() {
    console.log('🔌 Closing Change Stream monitor...');
    
    if (this.changeStream) {
      await this.changeStream.close();
    }
    
    await this.mongoClient.close();
    console.log('✅ Change Stream monitor closed');
  }
}

// Example usage
async function demonstrateChangeStreams() {
  const monitor = new QuizChangeStreamMonitor();
  
  try {
    await monitor.connect();
    monitor.startChangeStreamMonitoring();
    
    console.log('🚀 Change Stream monitoring active');
    console.log('📝 Make changes to quizEvents collection to see real-time updates');
    console.log('⏹️  Press Ctrl+C to stop');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down Change Stream monitor...');
      await monitor.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Change Stream monitoring:', error);
    process.exit(1);
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateChangeStreams();
}

module.exports = { QuizChangeStreamMonitor };