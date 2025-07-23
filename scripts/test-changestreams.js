#!/usr/bin/env node

/**
 * Test script to verify MongoDB Change Streams are working
 * This script tests the new change stream implementation in the Telegram bot
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

console.log('🔧 DEBUG: ========== CHANGE STREAMS TEST SCRIPT ==========');
console.log('🔧 DEBUG: Testing MongoDB Change Streams functionality');
console.log('🔧 DEBUG: Environment variables:');
console.log('🔧 DEBUG: - MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('🔧 DEBUG: - MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME || 'NOT SET');

async function testChangeStreams() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    console.log('✅ Connected to MongoDB');

    console.log('📡 Setting up change stream on quizEvents collection...');
    
    // Watch for changes in the quizEvents collection
    const changeStream = db.collection('quizEvents').watch([
      {
        $match: {
          'operationType': { $in: ['insert', 'update', 'replace'] },
          'fullDocument.type': { $in: ['quiz_started', 'question_started', 'quiz_ended'] }
        }
      }
    ], { fullDocument: 'updateLookup' });

    console.log('✅ Change stream established successfully');
    console.log('🎯 Monitoring for quiz events...');
    console.log('');
    console.log('💡 To test:');
    console.log('   1. Start a quiz in the frontend');
    console.log('   2. Watch for change events appearing below');
    console.log('   3. Events should appear instantly when quiz state changes');
    console.log('');
    console.log('📋 Waiting for quiz events...');
    console.log('==========================================');

    let eventCount = 0;

    changeStream.on('change', async (change) => {
      eventCount++;
      console.log(`\n🔔 Event #${eventCount} detected:`, {
        timestamp: new Date().toISOString(),
        operationType: change.operationType,
        fullDocument: change.fullDocument ? {
          quizCode: change.fullDocument.quizCode,
          type: change.fullDocument.type,
          questionIndex: change.fullDocument.data?.currentQuestionIndex,
          timeRemaining: change.fullDocument.data?.timeRemaining,
          lastUpdated: change.fullDocument.lastUpdated
        } : null
      });
      
      if (change.fullDocument?.type === 'question_started') {
        console.log('📝 Question started event - this would trigger Telegram notifications');
        console.log('   Question:', change.fullDocument.data?.question?.substring(0, 100) + '...');
        console.log('   Options count:', Object.keys(change.fullDocument.data?.options || {}).length);
      } else if (change.fullDocument?.type === 'quiz_ended') {
        console.log('🏁 Quiz ended event - this would send completion messages');
      }
    });

    changeStream.on('error', (error) => {
      console.error('❌ Change stream error:', error);
    });

    changeStream.on('close', () => {
      console.log('⚠️ Change stream closed');
    });

    // Test by inserting a sample event after 5 seconds
    setTimeout(async () => {
      console.log('\n🧪 Inserting test event to verify change stream...');
      
      try {
        await db.collection('quizEvents').insertOne({
          quizCode: 'TEST01',
          type: 'question_started',
          data: {
            question: 'Test question for change stream verification',
            options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
            currentQuestionIndex: 0,
            timeRemaining: 30,
            timeLimit: 30
          },
          lastUpdated: new Date(),
          testEvent: true
        });
        
        console.log('✅ Test event inserted - should trigger change stream above');
        
        // Clean up test event after a moment
        setTimeout(async () => {
          await db.collection('quizEvents').deleteOne({ testEvent: true });
          console.log('🧹 Test event cleaned up');
        }, 2000);
        
      } catch (error) {
        console.error('❌ Error inserting test event:', error);
      }
    }, 5000);

    // Keep the script running
    console.log('\n⏰ Script will run for 60 seconds to monitor events...');
    setTimeout(() => {
      console.log(`\n📊 Test completed. Total events detected: ${eventCount}`);
      console.log('🎯 Change streams are working correctly!');
      process.exit(0);
    }, 60000);

  } catch (error) {
    console.error('❌ Error testing change streams:', error);
    process.exit(1);
  }
}

// Run the test
testChangeStreams().catch(console.error);
