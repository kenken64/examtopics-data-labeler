const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testAccessCodeRBAC() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');

    console.log('🔒 Testing Access Code Management Role-Based Access Control');
    console.log('='.repeat(60));

    // Get user information
    const admin = await db.collection('users').findOne({ username: 'bunnyppl@gmail.com' });
    const user1 = await db.collection('users').findOne({ username: 'kenken64@hotmail.com' });
    const user2 = await db.collection('users').findOne({ username: 'bunnyppl@hotmail.com' });

    console.log('\n👥 User Roles:');
    console.log(`   Admin: ${admin?.username} (${admin?.role}) - ID: ${admin?._id}`);
    console.log(`   User1: ${user1?.username} (${user1?.role}) - ID: ${user1?._id}`);
    console.log(`   User2: ${user2?.username} (${user2?.role}) - ID: ${user2?._id}`);

    // Check payees with access codes by user
    console.log('\n📋 Payees with Access Codes by User:');
    
    const adminPayees = await db.collection('payees').find({
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();
    console.log(`   Admin can see: ${adminPayees.length} payees with access codes`);
    
    for (const user of [user1, user2]) {
      if (user) {
        const userPayees = await db.collection('payees').find({
          generatedAccessCode: { $exists: true, $ne: null },
          userId: user._id
        }).toArray();
        console.log(`   ${user.username} can see: ${userPayees.length} payees with access codes`);
      }
    }

    // Check access-code-questions by user
    console.log('\n🔢 Access Code Questions by User:');
    
    const allAccessQuestions = await db.collection('access-code-questions').find({}).toArray();
    console.log(`   Admin can see: ${allAccessQuestions.length} access code questions`);
    
    for (const user of [user1, user2]) {
      if (user) {
        const userAccessQuestions = await db.collection('access-code-questions').find({
          userId: user._id
        }).toArray();
        console.log(`   ${user.username} can see: ${userAccessQuestions.length} access code questions`);
      }
    }

    // Show detailed breakdown of access codes
    console.log('\n📊 Detailed Access Code Analysis:');
    
    const accessCodes = await db.collection('payees').find({
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();

    for (const payee of accessCodes) {
      console.log(`\n   Access Code: ${payee.generatedAccessCode}`);
      console.log(`     Payee: ${payee.payeeName} (${payee.email})`);
      console.log(`     Owner: ${payee.userId}`);
      
      const questions = await db.collection('access-code-questions').find({
        generatedAccessCode: payee.generatedAccessCode
      }).toArray();
      console.log(`     Questions: ${questions.length}`);
      
      // Show which user can access this
      if (payee.userId?.toString() === admin?._id?.toString()) {
        console.log(`     Accessible to: Admin`);
      } else if (payee.userId?.toString() === user1?._id?.toString()) {
        console.log(`     Accessible to: ${user1.username}`);
      } else if (payee.userId?.toString() === user2?._id?.toString()) {
        console.log(`     Accessible to: ${user2.username}`);
      } else {
        console.log(`     Accessible to: Unknown user (${payee.userId})`);
      }
    }

    // Test role-based filtering simulation
    console.log('\n🧪 RBAC Filter Simulation:');
    
    // Simulate admin filter (no restrictions)
    const adminFilter = {};
    const adminResults = await db.collection('access-code-questions').find(adminFilter).toArray();
    console.log(`   Admin filter {} → ${adminResults.length} results`);
    
    // Simulate user filter (restricted to userId)
    if (user1) {
      const userFilter = { userId: user1._id };
      const userResults = await db.collection('access-code-questions').find(userFilter).toArray();
      console.log(`   User filter {userId: "${user1._id}"} → ${userResults.length} results`);
    }

    console.log('\n✅ Access Code RBAC Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

testAccessCodeRBAC();
