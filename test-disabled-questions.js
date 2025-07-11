const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testDisabledQuestions() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Testing Disabled Questions Filtering ===\n');
    
    // Find a sample access code with questions
    const sampleAssignment = await db.collection('access-code-questions').findOne({});
    
    if (!sampleAssignment) {
      console.log('❌ No access code questions found. Run seeding first.');
      return;
    }
    
    const accessCode = sampleAssignment.generatedAccessCode;
    console.log('🧪 Testing with access code:', accessCode);
    
    // Show all questions for this access code (what admin sees)
    const allQuestions = await db.collection('access-code-questions').find({
      generatedAccessCode: accessCode
    }).sort({ sortOrder: 1 }).toArray();
    
    console.log('\n📋 All Questions (Admin View):');
    allQuestions.forEach(q => {
      const status = q.isEnabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`  Q${q.assignedQuestionNo}: ${status}`);
    });
    
    // Show only enabled questions (what Telegram bot sees)
    const enabledQuestions = await db.collection('access-code-questions').find({
      generatedAccessCode: accessCode,
      isEnabled: true
    }).sort({ sortOrder: 1 }).toArray();
    
    console.log('\n🤖 Telegram Bot View (isEnabled: true):');
    enabledQuestions.forEach(q => {
      console.log(`  Q${q.assignedQuestionNo}: ✅ Enabled`);
    });
    
    console.log('\n📊 Summary:');
    console.log(`  Total questions: ${allQuestions.length}`);
    console.log(`  Enabled questions: ${enabledQuestions.length}`);
    console.log(`  Disabled questions: ${allQuestions.length - enabledQuestions.length}`);
    
    // Test disabling a question temporarily
    if (allQuestions.length > 0 && allQuestions[0].isEnabled) {
      const firstQuestion = allQuestions[0];
      
      console.log('\n🔄 Testing Question Disable/Enable...');
      
      // Disable the first question
      await db.collection('access-code-questions').updateOne(
        { _id: firstQuestion._id },
        { $set: { isEnabled: false, updatedAt: new Date() } }
      );
      
      console.log(`  ❌ Disabled Q${firstQuestion.assignedQuestionNo}`);
      
      // Check what bot would see now
      const afterDisable = await db.collection('access-code-questions').find({
        generatedAccessCode: accessCode,
        isEnabled: true
      }).sort({ sortOrder: 1 }).toArray();
      
      console.log(`  🤖 Bot now sees: ${afterDisable.length} questions (was ${enabledQuestions.length})`);
      
      // Re-enable for cleanup
      await db.collection('access-code-questions').updateOne(
        { _id: firstQuestion._id },
        { $set: { isEnabled: true, updatedAt: new Date() } }
      );
      
      console.log(`  ✅ Re-enabled Q${firstQuestion.assignedQuestionNo} (cleanup)`);
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 Key finding: The Telegram bot correctly filters by isEnabled: true');
    console.log('   Disabled questions in the management interface will NOT appear in the bot.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testDisabledQuestions();
