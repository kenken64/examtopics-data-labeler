const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkAccessCodeQuestionsCollection() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Access Code Questions Collection Analysis ===\n');
    
    // Get all access codes and their question states
    const allAssignments = await db.collection('access-code-questions').find({}).toArray();
    
    if (allAssignments.length === 0) {
      console.log('❌ No records found in access-code-questions collection');
      return;
    }
    
    console.log(`📊 Total records in collection: ${allAssignments.length}\n`);
    
    // Group by access code
    const accessCodeGroups = {};
    allAssignments.forEach(assignment => {
      const code = assignment.generatedAccessCode;
      if (!accessCodeGroups[code]) {
        accessCodeGroups[code] = [];
      }
      accessCodeGroups[code].push(assignment);
    });
    
    console.log(`🔍 Found ${Object.keys(accessCodeGroups).length} unique access codes:\n`);
    
    for (const [accessCode, assignments] of Object.entries(accessCodeGroups)) {
      console.log(`📋 Access Code: ${accessCode}`);
      
      const enabled = assignments.filter(a => a.isEnabled);
      const disabled = assignments.filter(a => !a.isEnabled);
      
      console.log(`  📊 Total: ${assignments.length}, Enabled: ${enabled.length}, Disabled: ${disabled.length}`);
      
      // Show question details
      assignments.sort((a, b) => a.sortOrder - b.sortOrder);
      assignments.forEach(a => {
        const status = a.isEnabled ? '✅' : '❌';
        console.log(`    Q${a.assignedQuestionNo}: ${status} ${a.isEnabled ? 'ENABLED' : 'DISABLED'} (sort: ${a.sortOrder})`);
      });
      
      // Show what Telegram bot would see
      console.log(`  🤖 Bot Query Result (isEnabled: true):`);
      const botResults = enabled.sort((a, b) => a.sortOrder - b.sortOrder);
      if (botResults.length > 0) {
        botResults.forEach(a => {
          console.log(`    Q${a.assignedQuestionNo}: ✅ (questionId: ${a.questionId})`);
        });
      } else {
        console.log(`    (No enabled questions)`);
      }
      
      console.log('');
    }
    
    // Check for any inconsistencies
    console.log('=== Consistency Checks ===\n');
    
    const disabledCount = allAssignments.filter(a => !a.isEnabled).length;
    const enabledCount = allAssignments.filter(a => a.isEnabled).length;
    
    console.log(`📈 Summary:`);
    console.log(`  Total assignments: ${allAssignments.length}`);
    console.log(`  Enabled: ${enabledCount}`);
    console.log(`  Disabled: ${disabledCount}`);
    
    if (disabledCount > 0) {
      console.log(`\n⚠️  WARNING: Found ${disabledCount} disabled questions!`);
      console.log(`   If these are appearing in the Telegram bot, there may be an issue.`);
      
      // Show disabled questions
      const disabledQuestions = allAssignments.filter(a => !a.isEnabled);
      console.log(`\n❌ Disabled Questions:`);
      disabledQuestions.forEach(q => {
        console.log(`   Access Code: ${q.generatedAccessCode}, Q${q.assignedQuestionNo}, ID: ${q.questionId}`);
      });
    } else {
      console.log(`\n✅ All questions are currently enabled`);
    }
    
    // Test the exact query the Telegram bot uses
    console.log(`\n=== Telegram Bot Query Test ===\n`);
    
    for (const accessCode of Object.keys(accessCodeGroups)) {
      console.log(`🤖 Testing bot query for: ${accessCode}`);
      
      // This is the exact query the bot uses
      const botQuery = await db.collection('access-code-questions').find({
        generatedAccessCode: accessCode,
        isEnabled: true
      }).sort({ sortOrder: 1, assignedQuestionNo: 1 }).toArray();
      
      console.log(`   Query: { generatedAccessCode: "${accessCode}", isEnabled: true }`);
      console.log(`   Results: ${botQuery.length} questions`);
      
      if (botQuery.length > 0) {
        botQuery.forEach(q => {
          console.log(`     Q${q.assignedQuestionNo}: ID ${q.questionId}`);
        });
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAccessCodeQuestionsCollection();
