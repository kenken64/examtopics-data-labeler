const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugAccessCodeUsage() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Debug: Access Code Usage Analysis ===\n');
    
    // Check all payees and their access codes
    const payees = await db.collection('payees').find({
      status: 'paid',
      $or: [
        { generatedAccessCode: { $exists: true, $ne: null } },
        { accessCode: { $exists: true, $ne: null } }
      ]
    }).toArray();
    
    console.log(`👥 Found ${payees.length} paid payees:\n`);
    
    for (const payee of payees) {
      console.log(`📧 Payee: ${payee.payeeName}`);
      console.log(`   Original Access Code: ${payee.accessCode || 'N/A'}`);
      console.log(`   Generated Access Code: ${payee.generatedAccessCode || 'N/A'}`);
      
      // Check if this payee has questions in access-code-questions
      if (payee.generatedAccessCode) {
        const questionCount = await db.collection('access-code-questions').countDocuments({
          generatedAccessCode: payee.generatedAccessCode
        });
        console.log(`   📋 Questions in access-code-questions: ${questionCount}`);
        
        // Check for disabled questions
        const disabledCount = await db.collection('access-code-questions').countDocuments({
          generatedAccessCode: payee.generatedAccessCode,
          isEnabled: false
        });
        
        if (disabledCount > 0) {
          console.log(`   ❌ Disabled questions: ${disabledCount}`);
        } else {
          console.log(`   ✅ All questions enabled`);
        }
      }
      
      console.log('');
    }
    
    // Show what happens if someone uses original access code vs generated
    console.log('=== Access Code Format Analysis ===\n');
    
    const samplePayee = payees[0];
    if (samplePayee) {
      console.log(`🧪 Testing with payee: ${samplePayee.payeeName}`);
      console.log(`   Original format: ${samplePayee.accessCode}`);
      console.log(`   Generated format: ${samplePayee.generatedAccessCode}`);
      
      console.log('\n🔍 What happens in each system:');
      
      console.log('\n📱 Telegram Bot:');
      console.log('   - Uses generated access codes (AC-XXXXXXXX format)');
      console.log('   - Queries access-code-questions collection');
      console.log('   - Filters by isEnabled: true');
      console.log(`   - For ${samplePayee.generatedAccessCode}: Will show enabled questions only`);
      
      console.log('\n💻 Management Interface:');
      console.log('   - Also uses generated access codes (AC-XXXXXXXX format)');
      console.log('   - Updates isEnabled field in access-code-questions collection');
      console.log('   - Can disable/enable individual questions');
      
      console.log('\n🌐 Web Application:');
      console.log('   - Can use both original and generated access codes');
      console.log('   - Original codes: Show all questions from quizzes collection');
      console.log('   - Generated codes: Show questions from access-code-questions collection');
    }
    
    console.log('\n=== Troubleshooting Your Issue ===\n');
    
    console.log('❓ Are you sure you disabled a question? Here\'s how to verify:');
    console.log('');
    console.log('1. 🌐 Go to /access-code-questions in your browser');
    console.log('2. 🔍 Enter one of these generated access codes:');
    
    payees.forEach(p => {
      if (p.generatedAccessCode) {
        console.log(`   - ${p.generatedAccessCode} (${p.payeeName})`);
      }
    });
    
    console.log('3. 👁️ Look for an eye icon next to questions - click it to disable');
    console.log('4. 💾 Click "Save Changes" button');
    console.log('5. 🤖 Test in Telegram bot with the EXACT SAME access code');
    console.log('');
    console.log('💡 Common issues:');
    console.log('   - Using different access codes in management vs bot');
    console.log('   - Using original access code format instead of generated');
    console.log('   - Not clicking "Save Changes" after disabling');
    console.log('   - Testing with wrong access code in Telegram bot');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugAccessCodeUsage();
