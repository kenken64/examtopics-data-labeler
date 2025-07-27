const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkAccessCodeStructure() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }
  
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    const db = client.db('awscert');
    
    console.log('🔍 Checking access code related collections...');

    // Check access-code-questions collection
    const accessCodeQuestions = await db.collection('access-code-questions').find({}).limit(2).toArray();
    console.log(`\n📝 access-code-questions collection (${accessCodeQuestions.length} samples):`);
    if (accessCodeQuestions.length > 0) {
      console.log('   Fields:', Object.keys(accessCodeQuestions[0]));
      console.log('   Has userId?', accessCodeQuestions[0].userId ? 'Yes' : 'No');
      console.log('   Sample:', {
        _id: accessCodeQuestions[0]._id,
        generatedAccessCode: accessCodeQuestions[0].generatedAccessCode,
        userId: accessCodeQuestions[0].userId || 'missing'
      });
    }

    // Check payees with generated access codes
    const payeesWithAccessCodes = await db.collection('payees').find({
      generatedAccessCode: { $exists: true, $ne: null }
    }).limit(2).toArray();
    
    console.log(`\n💰 payees with access codes (${payeesWithAccessCodes.length} samples):`);
    if (payeesWithAccessCodes.length > 0) {
      console.log('   Fields:', Object.keys(payeesWithAccessCodes[0]));
      console.log('   Has userId?', payeesWithAccessCodes[0].userId ? 'Yes' : 'No');
      console.log('   Sample:', {
        _id: payeesWithAccessCodes[0]._id,
        payeeName: payeesWithAccessCodes[0].payeeName,
        generatedAccessCode: payeesWithAccessCodes[0].generatedAccessCode,
        userId: payeesWithAccessCodes[0].userId || 'missing'
      });
    }

    // Count documents without userId
    const accessCodeQuestionsWithoutUserId = await db.collection('access-code-questions').countDocuments({ 
      userId: { $exists: false } 
    });
    const totalAccessCodeQuestions = await db.collection('access-code-questions').countDocuments({});
    
    console.log(`\n📊 access-code-questions: ${totalAccessCodeQuestions - accessCodeQuestionsWithoutUserId}/${totalAccessCodeQuestions} have userId`);

    // Get users for reference
    const users = await db.collection('users').find({}).toArray();
    console.log('\n👥 Users in database:');
    users.forEach(user => {
      console.log(`   ${user.username}: ${user.role} (ID: ${user._id})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAccessCodeStructure();
