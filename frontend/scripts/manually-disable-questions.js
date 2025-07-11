const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function manuallyDisableQuestions() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Manually Disabling Questions to Test Bot ===\n');
    
    const testAccessCode = 'AC-F2NOKPMQ';
    
    // Step 1: Show current state
    console.log('📋 Step 1: Current State');
    const currentQuestions = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode
    }).sort({ sortOrder: 1 }).toArray();
    
    currentQuestions.forEach(q => {
      console.log(`  Q${q.assignedQuestionNo}: ${q.isEnabled ? '✅ Enabled' : '❌ Disabled'} (ID: ${q._id})`);
    });
    
    // Step 2: Manually disable Q4, Q6, Q7 (same as in screenshot)
    console.log('\n🔧 Step 2: Manually Disabling Q4, Q6, Q7');
    
    const questionsToDisable = [4, 6, 7];
    
    for (const questionNo of questionsToDisable) {
      const question = currentQuestions.find(q => q.assignedQuestionNo === questionNo);
      if (question) {
        const result = await db.collection('access-code-questions').updateOne(
          { _id: question._id },
          { $set: { isEnabled: false, updatedAt: new Date() } }
        );
        console.log(`  Q${questionNo}: ${result.modifiedCount > 0 ? '✅ Disabled' : '❌ Failed'}`);
      }
    }
    
    // Step 3: Verify database state
    console.log('\n📋 Step 3: Verify Database State');
    const updatedQuestions = await db.collection('access-code-questions').find({
      generatedAccessCode: testAccessCode
    }).sort({ sortOrder: 1 }).toArray();
    
    updatedQuestions.forEach(q => {
      console.log(`  Q${q.assignedQuestionNo}: ${q.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    });
    
    // Step 4: Test what Telegram bot would see
    console.log('\n🤖 Step 4: Test Telegram Bot Query');
    const botQuery = await db.collection('access-code-questions').aggregate([
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
      { $sort: { sortOrder: 1, assignedQuestionNo: 1 } }
    ]).toArray();
    
    console.log(`  🎯 Bot sees ${botQuery.length} questions (should be 5):`);
    botQuery.forEach(q => {
      console.log(`    Q${q.assignedQuestionNo}: ✅`);
    });
    
    const enabledCount = updatedQuestions.filter(q => q.isEnabled).length;
    const disabledCount = updatedQuestions.filter(q => !q.isEnabled).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total: ${updatedQuestions.length}`);
    console.log(`  Enabled: ${enabledCount}`);
    console.log(`  Disabled: ${disabledCount}`);
    console.log(`  Bot sees: ${botQuery.length}`);
    
    if (botQuery.length === enabledCount) {
      console.log('\n✅ SUCCESS: Bot correctly shows only enabled questions!');
      console.log('   The system works - the issue is with the management interface save process.');
    } else {
      console.log('\n❌ ISSUE: Bot count doesn\'t match enabled count!');
    }
    
    console.log('\n=== Instructions for Testing ===');
    console.log('1. 🤖 Now test your Telegram bot with access code: AC-F2NOKPMQ');
    console.log(`2. 📊 It should show ${enabledCount} questions instead of ${updatedQuestions.length}`);
    console.log('3. ❌ Questions 4, 6, 7 should NOT appear');
    console.log('4. ✅ Only questions 1, 2, 3, 5, 8 should appear');
    console.log('\n💡 If the bot still shows all questions, there might be a caching issue.');
    
    // Don't clean up yet - let user test the bot first
    console.log('\n⚠️  Questions are now disabled. Test the bot, then run the cleanup script.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

manuallyDisableQuestions();
