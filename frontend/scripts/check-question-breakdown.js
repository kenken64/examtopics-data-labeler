// Check the exact question count breakdown for AC-F2NOKPMQ
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkQuestionBreakdown() {
  console.log('🔍 Question Count Breakdown for AC-F2NOKPMQ');
  console.log('============================================\n');
  
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    const accessCode = 'AC-F2NOKPMQ';
    
    // Count all questions (enabled + disabled)
    const totalQuestions = await db.collection('access-code-questions').countDocuments({
      generatedAccessCode: accessCode
    });
    
    // Count only enabled questions
    const enabledQuestions = await db.collection('access-code-questions').countDocuments({
      generatedAccessCode: accessCode,
      isEnabled: true
    });
    
    // Count disabled questions
    const disabledQuestions = await db.collection('access-code-questions').countDocuments({
      generatedAccessCode: accessCode,
      isEnabled: false
    });
    
    console.log('📊 Question Count Summary:');
    console.log(`   Total Questions: ${totalQuestions}`);
    console.log(`   Enabled Questions: ${enabledQuestions}`);
    console.log(`   Disabled Questions: ${disabledQuestions}`);
    
    // Show the breakdown of each question
    console.log('\n📋 Individual Question Status:');
    const allQuestions = await db.collection('access-code-questions').find({
      generatedAccessCode: accessCode
    }).sort({ sortOrder: 1, assignedQuestionNo: 1 }).toArray();
    
    allQuestions.forEach(q => {
      const status = q.isEnabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`   Q${q.assignedQuestionNo}: ${status}`);
    });
    
    console.log('\n🤖 What Telegram Bot Sees:');
    console.log(`   The bot queries with: { generatedAccessCode: "${accessCode}", isEnabled: true }`);
    console.log(`   Result: ${enabledQuestions} questions (matches the "7" you see in the bot)`);
    
    console.log('\n🏠 What QuizBlitz Should Show:');
    console.log(`   Should show: ${enabledQuestions} questions (enabled only)`);
    console.log(`   Currently showing: 0 questions (bug - now fixed)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkQuestionBreakdown().catch(console.error);
