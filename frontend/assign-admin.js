const { MongoClient } = require('mongodb');
require('dotenv').config();

async function assignAdminRole() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/awscert?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    // Get username from command line argument
    const username = process.argv[2];
    if (!username) {
      console.error('Usage: node assign-admin.js <username>');
      process.exit(1);
    }

    // Update user to admin role
    const result = await db.collection('users').updateOne(
      { username: username },
      { $set: { role: 'admin' } }
    );

    if (result.matchedCount === 0) {
      console.log(`❌ User '${username}' not found`);
    } else if (result.modifiedCount === 1) {
      console.log(`✅ User '${username}' is now an admin`);
    } else {
      console.log(`ℹ️ User '${username}' was already an admin`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

assignAdminRole();