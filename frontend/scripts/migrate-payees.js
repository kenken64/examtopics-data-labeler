const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function migratePayeesToAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/awscert?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🚀 Migrating payees to admin ownership...');

    // Find the admin user
    const adminUser = await db.collection('users').findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ No admin user found!');
      return;
    }

    console.log(`👑 Found admin user: ${adminUser.username} (ID: ${adminUser._id})`);

    // Count payees without userId
    const payeesWithoutUserId = await db.collection('payees').countDocuments({ 
      userId: { $exists: false } 
    });
    console.log(`📊 Found ${payeesWithoutUserId} payees without userId`);

    if (payeesWithoutUserId === 0) {
      console.log('✅ All payees already have userId - no migration needed');
      return;
    }

    // Migrate payees to admin ownership
    const result = await db.collection('payees').updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminUser._id.toString() } }
    );

    console.log(`✅ Migrated ${result.modifiedCount} payees to admin ownership`);

    // Verify the migration
    const payeesWithUserId = await db.collection('payees').countDocuments({ 
      userId: { $exists: true } 
    });
    const totalPayees = await db.collection('payees').countDocuments({});
    
    console.log(`📊 After migration: ${payeesWithUserId}/${totalPayees} payees have userId`);

    // Show some sample payees
    const samplePayees = await db.collection('payees').find({})
      .limit(3)
      .project({ _id: 1, payeeName: 1, userId: 1 })
      .toArray();

    console.log('\n📋 Sample payees after migration:');
    samplePayees.forEach((payee, index) => {
      console.log(`   ${index + 1}. ${payee.payeeName} - userId: ${payee.userId || 'missing'}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
  }
}

migratePayeesToAdmin();
