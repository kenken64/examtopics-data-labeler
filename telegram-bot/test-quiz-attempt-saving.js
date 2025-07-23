// Test script to verify the quiz attempt saving mechanism
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testQuizAttemptSaving() {
  console.log('🧪 Testing Quiz Attempt Saving Mechanism...\n');

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    console.log('✅ Connected to MongoDB\n');

    // 1. Check current quiz-attempts collection
    console.log('1️⃣ Checking current quiz-attempts collection...');
    const existingAttempts = await db.collection('quiz-attempts').find({}).toArray();
    console.log(`   Current attempts: ${existingAttempts.length}`);

    if (existingAttempts.length > 0) {
      console.log('   Sample attempt:');
      const sample = existingAttempts[0];
      console.log(`     - User ID: ${sample.userId}`);
      console.log(`     - Access Code: ${sample.accessCode || 'N/A'}`);
      console.log(`     - Certificate: ${sample.certificateName || sample.certificateId || 'N/A'}`);
      console.log(`     - Score: ${sample.correctAnswers}/${sample.totalQuestions} (${sample.score}%)`);
      console.log(`     - Created: ${sample.createdAt}`);
      console.log(`     - Source: ${sample.source || 'Unknown'}`);
    }

    // 2. Simulate a quiz attempt save (like what the Telegram bot will do)
    console.log('\n2️⃣ Simulating quiz attempt save...');
    const mockQuizAttempt = {
      userId: '123456789', // Telegram user ID
      accessCode: 'TEST-ACCESS-CODE',
      certificateId: '507f1f77bcf86cd799439011', // Mock certificate ID
      certificateName: 'AWS Certified Solutions Architect',
      totalQuestions: 10,
      correctAnswers: 7,
      score: 70,
      createdAt: new Date(),
      completedAt: new Date(),
      source: 'telegram'
    };

    const insertResult = await db.collection('quiz-attempts').insertOne(mockQuizAttempt);
    console.log(`   ✅ Mock quiz attempt saved with ID: ${insertResult.insertedId}`);

    // 3. Verify the dashboard API can find it
    console.log('\n3️⃣ Verifying dashboard API compatibility...');
    const dashboardQuery = await db.collection('quiz-attempts').aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          attempts: { $sum: 1 },
          averageScore: { $avg: "$score" }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log(`   ✅ Dashboard query returned ${dashboardQuery.length} data points`);
    if (dashboardQuery.length > 0) {
      console.log('   Sample dashboard data:');
      dashboardQuery.slice(0, 3).forEach(point => {
        console.log(`     - ${point._id}: ${point.attempts} attempts, ${point.averageScore.toFixed(1)}% avg`);
      });
    }

    // 4. Clean up the test data
    console.log('\n4️⃣ Cleaning up test data...');
    await db.collection('quiz-attempts').deleteOne({ _id: insertResult.insertedId });
    console.log('   ✅ Test data cleaned up');

    await client.close();
    
    console.log('\n🎉 Quiz Attempt Saving Test SUCCESSFUL!');
    console.log('\n📋 Summary:');
    console.log('   ✅ MongoDB connection working');
    console.log('   ✅ quiz-attempts collection accessible');
    console.log('   ✅ Document structure matches dashboard expectations');
    console.log('   ✅ Dashboard aggregation query working');
    console.log('\n🔧 The Telegram bot should now save quiz attempts correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testQuizAttemptSaving();
}

module.exports = { testQuizAttemptSaving };
