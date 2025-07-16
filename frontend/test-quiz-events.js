// Test MongoDB Change Streams and quiz events
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testQuizEvents() {
  console.log('🧪 Testing MongoDB Change Streams for Quiz Events');
  console.log('===============================================\n');

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    console.log('✅ Connected to MongoDB');

    // 1. Check if quizEvents collection exists and has data
    const existingEvents = await db.collection('quizEvents').find({}).toArray();
    console.log(`📋 Found ${existingEvents.length} existing quiz events:`);
    
    existingEvents.slice(-5).forEach((event, index) => {
      console.log(`   ${index + 1}. Type: ${event.type}, Quiz: ${event.quizCode}, Time: ${event.timestamp}`);
    });

    // 2. Test inserting a quiz event
    console.log('\n🔧 Testing event insertion...');
    const testEvent = {
      type: 'question_started',
      quizCode: 'TEST001',
      data: {
        question: {
          questionIndex: 0,
          question: 'What is 2+2?',
          options: {
            A: '3',
            B: '4', 
            C: '5',
            D: '6'
          },
          timeLimit: 30
        }
      },
      timestamp: new Date()
    };

    const insertResult = await db.collection('quizEvents').insertOne(testEvent);
    console.log(`✅ Test event inserted with ID: ${insertResult.insertedId}`);

    // 3. Set up change stream to listen for new events
    console.log('\n📡 Setting up Change Stream listener...');
    const pipeline = [
      {
        $match: {
          'fullDocument.type': {
            $in: ['quiz_started', 'question_started', 'question_ended', 'timer_update', 'quiz_ended']
          }
        }
      }
    ];

    const changeStream = db.collection('quizEvents').watch(pipeline, {
      fullDocument: 'updateLookup'
    });

    changeStream.on('change', (change) => {
      console.log('🔔 Change Stream Event:', {
        operationType: change.operationType,
        eventType: change.fullDocument?.type,
        quizCode: change.fullDocument?.quizCode,
        timestamp: change.fullDocument?.timestamp
      });
    });

    console.log('🎧 Listening for changes... (will stop after 10 seconds)');

    // 4. Insert another test event to trigger the change stream
    setTimeout(async () => {
      const anotherTestEvent = {
        type: 'timer_update',
        quizCode: 'TEST001',
        data: { timeRemaining: 25 },
        timestamp: new Date()
      };
      
      await db.collection('quizEvents').insertOne(anotherTestEvent);
      console.log('✅ Second test event inserted');
    }, 2000);

    // Stop after 10 seconds
    setTimeout(async () => {
      await changeStream.close();
      await client.close();
      console.log('\n🏁 Test completed');
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testQuizEvents().catch(console.error);
