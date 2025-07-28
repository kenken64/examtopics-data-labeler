const { MongoClient } = require('mongodb');
require('dotenv').config();

async function setupUserRoles() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/awscert?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🚀 Setting up user roles...');

    // Add role field to existing users (default to 'user')
    const defaultRoleResult = await db.collection('users').updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    );
    console.log(`📝 Updated ${defaultRoleResult.modifiedCount} users with default 'user' role`);

    // Set specific admin user
    const adminResult = await db.collection('users').updateOne(
      { email: 'bunnyppl@gmail.com' },
      { $set: { role: 'admin' } }
    );

    if (adminResult.matchedCount === 0) {
      console.log(`❌ Admin user 'bunnyppl@gmail.com' not found`);
    } else if (adminResult.modifiedCount === 1) {
      console.log(`✅ User 'bunnyppl@gmail.com' is now an admin`);
    } else {
      console.log(`ℹ️ User 'bunnyppl@gmail.com' was already an admin`);
    }

    // Ensure kenken64@hotmail.com is set as user
    const userResult = await db.collection('users').updateOne(
      { email: 'kenken64@hotmail.com' },
      { $set: { role: 'user' } }
    );

    if (userResult.matchedCount === 0) {
      console.log(`❌ User 'kenken64@hotmail.com' not found`);
    } else {
      console.log(`✅ User 'kenken64@hotmail.com' role confirmed as 'user'`);
    }

    // Display current user roles
    console.log('\n📊 Current user roles:');
    const users = await db.collection('users').find({}, { 
      projection: { email: 1, role: 1, _id: 0 } 
    }).toArray();
    
    users.forEach(user => {
      console.log(`   ${user.email}: ${user.role || 'user'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

setupUserRoles();