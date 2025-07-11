const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testSaveChangesAPI() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Testing Save Changes API Issue ===\n');
    
    const testAccessCode = 'AC-F2NOKPMQ';
    
    // Step 1: Get current state
    console.log('📋 Step 1: Current Database State');
    const currentQuestions = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode
    }).sort({ sortOrder: 1 }).toArray();
    
    currentQuestions.forEach(q => {
      const status = q.isEnabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`  Q${q.assignedQuestionNo}: ${status} (ID: ${q._id})`);
    });
    
    // Step 2: Simulate the exact API call the frontend makes
    console.log('\n🔧 Step 2: Simulating Management Interface Save');
    
    // Let's disable Q4, Q6, Q7 like in your screenshot
    const q4 = currentQuestions.find(q => q.assignedQuestionNo === 4);
    const q6 = currentQuestions.find(q => q.assignedQuestionNo === 6);
    const q7 = currentQuestions.find(q => q.assignedQuestionNo === 7);
    
    if (!q4 || !q6 || !q7) {
      console.log('❌ Could not find questions 4, 6, 7');
      return;
    }
    
    // This simulates what the frontend sends to the API
    const updates = [
      { _id: q4._id.toString(), isEnabled: false },
      { _id: q6._id.toString(), isEnabled: false },
      { _id: q7._id.toString(), isEnabled: false }
    ];
    
    console.log('📤 API Request Body:');
    console.log(JSON.stringify({
      generatedAccessCode: testAccessCode,
      updates: updates
    }, null, 2));
    
    // Step 3: Manually perform the same operation the API does
    console.log('\n🔧 Step 3: Performing Database Updates');
    
    for (const update of updates) {
      const result = await db.collection('access-code-questions').updateOne(
        { 
          _id: new MongoClient.ObjectId(update._id),
          generatedAccessCode: testAccessCode 
        },
        { 
          $set: { 
            isEnabled: update.isEnabled,
            updatedAt: new Date() 
          } 
        }
      );
      
      console.log(`  Q${update._id === q4._id.toString() ? '4' : update._id === q6._id.toString() ? '6' : '7'}: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);
    }
    
    // Step 4: Verify the changes
    console.log('\n📋 Step 4: Verify Database State After Update');
    const updatedQuestions = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode
    }).sort({ sortOrder: 1 }).toArray();
    
    updatedQuestions.forEach(q => {
      const status = q.isEnabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`  Q${q.assignedQuestionNo}: ${status}`);
    });
    
    // Step 5: Test bot query
    console.log('\n🤖 Step 5: Test Bot Query After Changes');
    const botResults = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode,
      isEnabled: true
    }).sort({ sortOrder: 1 }).toArray();
    
    console.log(`  🎯 Bot would see ${botResults.length} questions:`);
    botResults.forEach(q => {
      console.log(`    Q${q.assignedQuestionNo}: ✅`);
    });
    
    // Step 6: Cleanup - re-enable all questions
    console.log('\n🔄 Step 6: Cleanup (re-enabling all questions)');
    await db.collection('access-code-questions').updateMany(
      { generatedAccessCode: testAccessCode },
      { $set: { isEnabled: true, updatedAt: new Date() } }
    );
    
    console.log('  ✅ All questions re-enabled');
    
    console.log('\n=== Analysis ===');
    console.log('If this test works but your management interface doesn\'t:');
    console.log('1. 🔍 Check browser dev tools for API errors');
    console.log('2. 🔍 Check if you\'re clicking "Save Changes" button');
    console.log('3. 🔍 Check if there are authentication issues');
    console.log('4. 🔍 Check server logs for API errors');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testSaveChangesAPI();
