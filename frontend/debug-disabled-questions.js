const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugDisabledQuestionsIssue() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Debug: Disabled Questions Still Appearing in Telegram Bot ===\n');
    
    // Find all access codes and their question states
    const allAccessCodes = await db.collection('access-code-questions').distinct('generatedAccessCode');
    
    console.log(`🔍 Found ${allAccessCodes.length} access codes with question assignments\n`);
    
    for (const accessCode of allAccessCodes) {
      console.log(`📋 Access Code: ${accessCode}`);
      
      // All questions for this access code
      const allQuestions = await db.collection('access-code-questions').find({
        generatedAccessCode: accessCode
      }).sort({ sortOrder: 1 }).toArray();
      
      // Only enabled questions (what Telegram bot sees)
      const enabledQuestions = await db.collection('access-code-questions').find({
        generatedAccessCode: accessCode,
        isEnabled: true
      }).sort({ sortOrder: 1 }).toArray();
      
      const disabledCount = allQuestions.length - enabledQuestions.length;
      
      console.log(`  📊 Total: ${allQuestions.length}, Enabled: ${enabledQuestions.length}, Disabled: ${disabledCount}`);
      
      if (disabledCount > 0) {
        console.log('  ❌ Disabled questions:');
        allQuestions.forEach(q => {
          if (!q.isEnabled) {
            console.log(`    Q${q.assignedQuestionNo}: DISABLED`);
          }
        });
        
        console.log('  🤖 Telegram bot would show these questions:');
        enabledQuestions.forEach(q => {
          console.log(`    Q${q.assignedQuestionNo}: ✅`);
        });
      } else {
        console.log('  ✅ All questions are enabled');
      }
      
      console.log('');
    }
    
    console.log('=== Troubleshooting Steps ===\n');
    console.log('1. 🔍 Check if the specific access code you\'re testing in Telegram has disabled questions:');
    console.log('   - Look at the results above');
    console.log('   - If all questions show as "enabled", the issue might be elsewhere');
    console.log('');
    console.log('2. 🤖 Verify Telegram bot is using the correct access code:');
    console.log('   - Make sure you\'re testing with a "generated access code" (format: AC-XXXXXXXX)');
    console.log('   - Not the original access code format');
    console.log('');
    console.log('3. 🔄 Test the disable/enable process:');
    console.log('   - Go to the management interface (/access-code-questions)');
    console.log('   - Enter your access code and disable a question');
    console.log('   - Save changes');
    console.log('   - Test in Telegram bot immediately');
    console.log('');
    console.log('4. ⚡ Check for caching issues:');
    console.log('   - Restart the Telegram bot if it\'s running');
    console.log('   - The bot doesn\'t cache questions, so changes should be immediate');
    
    // Show sample management interface usage
    const sampleAccessCode = allAccessCodes[0];
    if (sampleAccessCode) {
      console.log('\n=== Sample Management Interface Usage ===\n');
      console.log('To test question disabling:');
      console.log('1. Open browser to /access-code-questions');
      console.log(`2. Enter access code: ${sampleAccessCode}`);
      console.log('3. Click "Load Assignment"');
      console.log('4. Click the eye icon next to a question to disable it');
      console.log('5. Click "Save Changes"');
      console.log('6. Test in Telegram bot with the same access code');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugDisabledQuestionsIssue();
