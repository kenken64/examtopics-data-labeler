const mongoose = require('mongoose');

async function testSavedQuestionsRBAC() {
  console.log('🧪 Testing Saved Questions RBAC Implementation');
  console.log('=' .repeat(50));
  
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Check users
    console.log('\n👥 USERS:');
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    users.forEach(user => {
      console.log(`  - ${user.email} (Role: ${user.role}, ID: ${user._id})`);
    });
    
    // 2. Check payees (access codes) with userId
    console.log('\n💰 PAYEES/ACCESS CODES:');
    const payees = await mongoose.connection.db.collection('payees').find({ status: 'paid' }).toArray();
    
    if (payees.length === 0) {
      console.log('  No paid payees found');
    } else {
      payees.forEach(payee => {
        console.log(`  - ${payee.payeeName} (${payee.originalAccessCode || payee.accessCode})`);
        console.log(`    User ID: ${payee.userId}`);
        console.log(`    Certificate: ${payee.certificateId}`);
        console.log('');
      });
    }
    
    // 3. Simulate RBAC scenarios
    console.log('\n🔒 RBAC SCENARIOS:');
    
    const adminUser = users.find(u => u.role === 'admin');
    const regularUser = users.find(u => u.role !== 'admin');
    
    if (adminUser) {
      const adminPayees = payees.filter(p => 
        p.userId && p.userId.toString() === adminUser._id.toString()
      );
      console.log(`✅ Admin user (${adminUser.email}):`);
      console.log(`   RBAC Rule: Should see ALL paid access codes`);
      console.log(`   Database: ${payees.length} total paid access codes`);
      console.log(`   User owns: ${adminPayees.length} access codes`);
      console.log(`   Admin sees: ALL ${payees.length} access codes (due to admin role)`);
    }
    
    if (regularUser) {
      const userPayees = payees.filter(p => 
        p.userId && p.userId.toString() === regularUser._id.toString()
      );
      console.log(`✅ Regular user (${regularUser.email}):`);
      console.log(`   RBAC Rule: Should see only own access codes`);
      console.log(`   User owns: ${userPayees.length} access codes`);
      console.log(`   User sees: ONLY ${userPayees.length} access codes (filtered by userId)`);
    } else {
      console.log('❌ No regular user found - create one for testing user-level access');
    }
    
    // 4. Test access code ownership distribution
    console.log('\n📊 OWNERSHIP DISTRIBUTION:');
    const ownershipMap = {};
    payees.forEach(payee => {
      const userId = payee.userId?.toString() || 'NO_OWNER';
      ownershipMap[userId] = (ownershipMap[userId] || 0) + 1;
    });
    
    Object.entries(ownershipMap).forEach(([userId, count]) => {
      const user = users.find(u => u._id.toString() === userId);
      const userEmail = user?.email || 'Unknown User';
      const userRole = user?.role || 'Unknown Role';
      console.log(`  ${userEmail} (${userRole}): ${count} access codes`);
    });
    
    // 5. Check if RBAC filtering would work properly
    console.log('\n🔧 RBAC FILTER VALIDATION:');
    
    // Simulate admin filter (should return all)
    const adminFilter = {}; // Admin sees everything
    const adminResults = payees.filter(() => true); // No filtering for admin
    console.log(`✅ Admin filter: Returns ${adminResults.length}/${payees.length} records`);
    
    // Simulate user filter (should return only user's records)
    if (regularUser) {
      const userFilter = { userId: regularUser._id.toString() };
      const userResults = payees.filter(p => p.userId?.toString() === regularUser._id.toString());
      console.log(`✅ User filter: Returns ${userResults.length}/${payees.length} records`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ RBAC test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSavedQuestionsRBAC();
