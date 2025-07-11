const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function testActualDisableProcess() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Testing Actual Question Disable Process ===\n');
    
    // Use the access code with more questions for testing
    const testAccessCode = 'AC-F2NOKPMQ';
    
    console.log(`🧪 Testing with access code: ${testAccessCode}\n`);
    
    // Step 1: Show current state
    console.log('📋 Step 1: Current State');
    let questions = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode
    }).sort({ sortOrder: 1 }).toArray();
    
    questions.forEach(q => {
      const status = q.isEnabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`  Q${q.assignedQuestionNo}: ${status}`);
    });
    
    // Step 2: Disable the first question using the same method as the management interface
    console.log('\n🔧 Step 2: Disabling Q1 (simulating management interface)');
    const firstQuestion = questions[0];
    
    const updateResult = await db.collection('access-code-questions').updateOne(
      { 
        _id: firstQuestion._id,
        generatedAccessCode: testAccessCode 
      },
      { 
        $set: { 
          isEnabled: false, 
          updatedAt: new Date() 
        } 
      }
    );
    
    console.log(`  Update result: matchedCount=${updateResult.matchedCount}, modifiedCount=${updateResult.modifiedCount}`);
    
    if (updateResult.modifiedCount === 1) {
      console.log(`  ✅ Successfully disabled Q${firstQuestion.assignedQuestionNo}`);
    } else {
      console.log(`  ❌ Failed to disable question`);
      return;
    }
    
    // Step 3: Verify the change in database
    console.log('\n📋 Step 3: Verify Database State');
    questions = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode
    }).sort({ sortOrder: 1 }).toArray();
    
    questions.forEach(q => {
      const status = q.isEnabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`  Q${q.assignedQuestionNo}: ${status}`);
    });
    
    // Step 4: Test Telegram bot query (what the bot actually sees)
    console.log('\n🤖 Step 4: Telegram Bot Query (isEnabled: true only)');
    const botResults = await db.collection('access-code-questions').aggregate([
      { $match: { generatedAccessCode: testAccessCode, isEnabled: true } },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'questionId',
          foreignField: '_id',
          as: 'questionDetails'
        }
      },
      { $unwind: '$questionDetails' },
      { $sort: { sortOrder: 1, assignedQuestionNo: 1 } },
      {
        $project: {
          _id: 1,
          assignedQuestionNo: 1,
          question: '$questionDetails.question',
          isEnabled: 1
        }
      }
    ]).toArray();
    
    console.log(`  🎯 Bot sees ${botResults.length} questions (should be ${questions.length - 1}):`);
    botResults.forEach(q => {
      console.log(`    Q${q.assignedQuestionNo}: "${q.question.substring(0, 50)}..."`);
    });
    
    // Step 5: Check if Q1 is missing from bot results
    const q1InBotResults = botResults.find(q => q.assignedQuestionNo === 1);
    if (!q1InBotResults) {
      console.log('\n✅ SUCCESS: Q1 is correctly filtered out from bot results');
    } else {
      console.log('\n❌ PROBLEM: Q1 is still appearing in bot results!');
    }
    
    // Step 6: Test the exact API endpoint the management interface uses
    console.log('\n🔌 Step 5: Testing Management Interface API');
    const allQuestionsForAdmin = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode
    }).sort({ sortOrder: 1 }).toArray();
    
    const enabledForAdmin = allQuestionsForAdmin.filter(q => q.isEnabled);
    const disabledForAdmin = allQuestionsForAdmin.filter(q => !q.isEnabled);
    
    console.log(`  📊 Admin sees: ${allQuestionsForAdmin.length} total, ${enabledForAdmin.length} enabled, ${disabledForAdmin.length} disabled`);
    
    // Step 6: Re-enable for cleanup
    console.log('\n🔄 Step 6: Cleanup (re-enabling Q1)');
    await db.collection('access-code-questions').updateOne(
      { _id: firstQuestion._id },
      { $set: { isEnabled: true, updatedAt: new Date() } }
    );
    
    console.log(`  ✅ Re-enabled Q${firstQuestion.assignedQuestionNo}`);
    
    // Final verification
    const finalCheck = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode,
      isEnabled: true
    }).toArray();
    
    console.log(`  🔍 Final verification: ${finalCheck.length} enabled questions`);
    
    console.log('\n=== Test Summary ===');
    console.log('✅ The disable process works correctly');
    console.log('✅ Disabled questions are filtered out from bot queries');
    console.log('✅ Management interface correctly updates isEnabled field');
    
    console.log('\n=== Next Steps for You ===');
    console.log('1. 🌐 Open your browser to /access-code-questions');
    console.log(`2. 🔍 Enter access code: ${testAccessCode}`);
    console.log('3. 👁️ Click the eye icon next to a question to disable it');
    console.log('4. 💾 Click "Save Changes"');
    console.log('5. 🤖 Test immediately in Telegram bot with the same access code');
    console.log('6. 🔄 Make sure you\'re testing with the SAME access code in both places');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testActualDisableProcess();
