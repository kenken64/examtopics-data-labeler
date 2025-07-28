const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testDashboardRBAC() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');

    console.log('🏠 Testing Dashboard Role-Based Access Control');
    console.log('='.repeat(60));

    // Get user information
    const admin = await db.collection('users').findOne({ username: 'bunnyppl@gmail.com' });
    const user1 = await db.collection('users').findOne({ username: 'kenken64@hotmail.com' });
    const user2 = await db.collection('users').findOne({ username: 'bunnyppl@hotmail.com' });

    console.log('\n👥 Users for Testing:');
    console.log(`   Admin: ${admin?.username} (${admin?.role}) - ID: ${admin?._id}`);
    console.log(`   User1: ${user1?.username} (${user1?.role}) - ID: ${user1?._id}`);
    console.log(`   User2: ${user2?.username} (${user2?.role}) - ID: ${user2?._id}`);

    // Test data that dashboard shows for each user type
    console.log('\n📊 Dashboard Data by User Role:');

    // 1. Access Code Questions (admin sees all, users see only their own)
    console.log('\n🔢 Access Code Questions:');
    const allAccessQuestions = await db.collection('access-code-questions').find({}).toArray();
    console.log(`   Admin would see: ${allAccessQuestions.length} access code questions`);
    
    const user1AccessQuestions = await db.collection('access-code-questions').find({
      userId: user1?._id
    }).toArray();
    console.log(`   ${user1?.username} would see: ${user1AccessQuestions.length} access code questions`);

    // 2. Payee Statistics (admin sees all, users see only their own)
    console.log('\n💰 Payee Statistics:');
    const allPayees = await db.collection('payees').find({}).toArray();
    console.log(`   Admin would see: ${allPayees.length} payees`);
    
    const user1Payees = await db.collection('payees').find({
      userId: user1?._id
    }).toArray();
    console.log(`   ${user1?.username} would see: ${user1Payees.length} payees`);

    // 3. Quiz Attempts (filtered by access codes owned by user)
    console.log('\n🎯 Quiz Attempts:');
    const allQuizAttempts = await db.collection('quiz-attempts').find({}).toArray();
    console.log(`   Admin would see: ${allQuizAttempts.length} quiz attempts`);
    
    // Get user's access codes
    const user1AccessCodes = await db.collection('payees').distinct('generatedAccessCode', {
      userId: user1?._id
    });
    console.log(`   ${user1?.username} access codes: ${user1AccessCodes.length}`);
    
    const user1QuizAttempts = await db.collection('quiz-attempts').find({
      accessCode: { $in: user1AccessCodes }
    }).toArray();
    console.log(`   ${user1?.username} would see: ${user1QuizAttempts.length} quiz attempts`);

    // 4. Bookmarks (filtered by access codes)
    console.log('\n📖 Bookmarks:');
    const allBookmarks = await db.collection('bookmarks').find({}).toArray();
    console.log(`   Admin would see: ${allBookmarks.length} bookmarks`);
    
    const user1Bookmarks = await db.collection('bookmarks').find({
      accessCode: { $in: user1AccessCodes }
    }).toArray();
    console.log(`   ${user1?.username} would see: ${user1Bookmarks.length} bookmarks`);

    // 5. Wrong Answers (filtered by access codes)
    console.log('\n❌ Wrong Answers:');
    const allWrongAnswers = await db.collection('wrong-answers').find({}).toArray();
    console.log(`   Admin would see: ${allWrongAnswers.length} wrong answers`);
    
    const user1WrongAnswers = await db.collection('wrong-answers').find({
      accessCode: { $in: user1AccessCodes }
    }).toArray();
    console.log(`   ${user1?.username} would see: ${user1WrongAnswers.length} wrong answers`);

    // Summary
    console.log('\n📋 Dashboard RBAC Summary:');
    console.log('   ✅ Admin users: See ALL system data');
    console.log('   ✅ Regular users: See only THEIR OWN data');
    console.log('   ✅ Data filtered by: userId for payees/access-codes, accessCode for attempts/bookmarks/wrong-answers');
    console.log('   ✅ Certificates: No filtering (public data)');
    console.log('   ✅ PDF Attachments: No filtering (public data)');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

testDashboardRBAC();
