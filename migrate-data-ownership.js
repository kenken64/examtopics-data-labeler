const { MongoClient } = require('./frontend/node_modules/mongodb');

async function migrateDataOwnership() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('awscert');
    
    // Use the user ID from the JWT token
    const userId = "686b9dfa5ded30e0ea00155e"; // From JWT: bunnyppl@gmail.com
    console.log(`📋 Using user ID: ${userId} for bunnyppl@gmail.com`);

    // Migrate Certificates Collection
    console.log('\n🔄 Migrating certificates...');
    const certificatesResult = await db.collection('certificates').updateMany(
      { userId: { $exists: false } }, // Only update documents without userId
      { $set: { userId: userId } }
    );
    console.log(`   ✅ Updated ${certificatesResult.modifiedCount} certificates`);

    // Migrate Payees Collection
    console.log('\n🔄 Migrating payees...');
    const payeesResult = await db.collection('payees').updateMany(
      { userId: { $exists: false } },
      { $set: { userId: userId } }
    );
    console.log(`   ✅ Updated ${payeesResult.modifiedCount} payees`);

    // Migrate Quizzes Collection (questions)
    console.log('\n🔄 Migrating quizzes...');
    const quizzesResult = await db.collection('quizzes').updateMany(
      { userId: { $exists: false } },
      { $set: { userId: userId } }
    );
    console.log(`   ✅ Updated ${quizzesResult.modifiedCount} quiz questions`);

    // Migrate Access-Code-Questions Collection
    console.log('\n🔄 Migrating access-code-questions...');
    const accessCodeResult = await db.collection('access-code-questions').updateMany(
      { userId: { $exists: false } },
      { $set: { userId: userId } }
    );
    console.log(`   ✅ Updated ${accessCodeResult.modifiedCount} access code questions`);

    // Set user role to admin
    console.log('\n🔄 Setting admin role...');
    const roleResult = await db.collection('users').updateOne(
      { username: 'bunnyppl@gmail.com' },
      { $set: { role: 'admin' } }
    );
    
    if (roleResult.modifiedCount > 0) {
      console.log(`   ✅ User bunnyppl@gmail.com is now an admin`);
    } else {
      console.log(`   ℹ️ User bunnyppl@gmail.com was already an admin`);
    }

    console.log('\n🎉 Migration completed successfully!');
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   - Certificates: ${certificatesResult.modifiedCount} records`);
    console.log(`   - Payees: ${payeesResult.modifiedCount} records`);
    console.log(`   - Quiz Questions: ${quizzesResult.modifiedCount} records`);
    console.log(`   - Access Code Questions: ${accessCodeResult.modifiedCount} records`);
    console.log(`   - Admin Role: Set for bunnyppl@gmail.com`);

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
migrateDataOwnership();