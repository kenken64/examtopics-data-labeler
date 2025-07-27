const mongoose = require('mongoose');

async function checkSavedQuestionsData() {
  console.log('🔍 Analyzing Saved Questions Data Structure');
  console.log('=' .repeat(50));
  
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Check payees collection (main data source for saved questions)
    console.log('\n💰 PAYEES COLLECTION:');
    const payees = await mongoose.connection.db.collection('payees').find({}).toArray();
    
    if (payees.length === 0) {
      console.log('  No payees found');
    } else {
      console.log(`  Found ${payees.length} payees:`);
      payees.forEach(payee => {
        console.log(`  - ${payee.payeeName} (${payee.originalAccessCode || payee.accessCode})`);
        console.log(`    Status: ${payee.status}`);
        console.log(`    User ID: ${payee.userId || 'NOT SET'} (Type: ${typeof payee.userId})`);
        console.log(`    Certificate: ${payee.certificateId}`);
        console.log('');
      });
    }
    
    // 2. Check access-code-questions collection
    console.log('\n📝 ACCESS-CODE-QUESTIONS COLLECTION:');
    const accessCodeQuestions = await mongoose.connection.db.collection('access-code-questions').find({}).limit(5).toArray();
    
    if (accessCodeQuestions.length === 0) {
      console.log('  No access-code-questions found');
    } else {
      console.log(`  Found ${accessCodeQuestions.length} access-code-questions (showing first 5):`);
      accessCodeQuestions.forEach(acq => {
        console.log(`  - Access Code: ${acq.generatedAccessCode}`);
        console.log(`    Question: ${acq.questionId}`);
        console.log(`    User ID: ${acq.userId || 'NOT SET'} (Type: ${typeof acq.userId})`);
        console.log('');
      });
    }
    
    // 3. Check users collection for reference
    console.log('\n👥 USERS COLLECTION:');
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    users.forEach(user => {
      console.log(`  - ${user.email} (Role: ${user.role}, ID: ${user._id})`);
    });
    
    // 4. RBAC Analysis
    console.log('\n🔒 RBAC IMPLEMENTATION NEEDED:');
    const adminUser = users.find(u => u.role === 'admin');
    const regularUser = users.find(u => u.role !== 'admin');
    
    if (adminUser) {
      const adminPayees = payees.filter(p => 
        p.userId && p.userId.toString() === adminUser._id.toString()
      );
      console.log(`✅ Admin user (${adminUser.email}):`);
      console.log(`   Should see: ALL ${payees.length} payees/access codes`);
      console.log(`   Currently owns: ${adminPayees.length} payees`);
    }
    
    if (regularUser) {
      const userPayees = payees.filter(p => 
        p.userId && p.userId.toString() === regularUser._id.toString()
      );
      console.log(`✅ Regular user (${regularUser.email}):`);
      console.log(`   Should see: Only own payees/access codes`);
      console.log(`   Currently owns: ${userPayees.length} payees`);
    }
    
    // 5. Check userId field consistency
    console.log('\n🔧 USERID FIELD STATUS:');
    const payeesWithUserId = payees.filter(p => p.userId);
    const payeesWithoutUserId = payees.filter(p => !p.userId);
    
    console.log(`  Payees with userId: ${payeesWithUserId.length}/${payees.length}`);
    console.log(`  Payees without userId: ${payeesWithoutUserId.length}/${payees.length}`);
    
    if (payeesWithoutUserId.length > 0) {
      console.log('  ❌ Some payees missing userId - migration needed!');
    } else {
      console.log('  ✅ All payees have userId field');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Analysis complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSavedQuestionsData();
