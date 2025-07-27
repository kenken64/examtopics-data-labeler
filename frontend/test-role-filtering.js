const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testRoleBasedFiltering() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/awscert?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🧪 Testing role-based filtering...');

    // Get users
    const users = await db.collection('users').find({}).toArray();
    console.log('\n👥 Users in database:');
    users.forEach(user => {
      console.log(`   ${user.username}: ${user.role}`);
    });

    // Check payees collection
    const payees = await db.collection('payees').find({}).toArray();
    console.log(`\n💰 Found ${payees.length} payees in database`);
    
    if (payees.length > 0) {
      console.log('   Sample payee structure:');
      console.log('   Fields:', Object.keys(payees[0]));
      console.log('   Has userId?', payees[0].userId ? 'Yes' : 'No');
      
      // Count payees with userId field
      const payeesWithUserId = await db.collection('payees').countDocuments({ 
        userId: { $exists: true } 
      });
      console.log(`   Payees with userId: ${payeesWithUserId}/${payees.length}`);
    }

    // Test filter for admin user (should see all)
    const adminUserId = users.find(u => u.role === 'admin')?._id?.toString();
    if (adminUserId) {
      const adminFilter = {}; // Admin sees all
      const adminPayees = await db.collection('payees').find(adminFilter).toArray();
      console.log(`\n🔓 Admin would see: ${adminPayees.length} payees`);
    }

    // Test filter for regular user (should see only their own)
    const regularUserId = users.find(u => u.role === 'user')?._id?.toString();
    if (regularUserId) {
      const userFilter = { userId: regularUserId };
      const userPayees = await db.collection('payees').find(userFilter).toArray();
      console.log(`🔒 Regular user would see: ${userPayees.length} payees`);
    }

    console.log('\n✅ Role-based filtering test completed');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testRoleBasedFiltering();
