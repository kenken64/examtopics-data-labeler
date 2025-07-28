const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkUsersStructure() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/awscert?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🔍 Checking users collection structure...');

    // Get all users to see the structure
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`📊 Found ${users.length} users in database:`);
    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   _id: ${user._id}`);
      console.log(`   username: ${user.username || 'undefined'}`);
      console.log(`   email: ${user.email || 'undefined'}`);
      console.log(`   role: ${user.role || 'undefined'}`);
      console.log(`   createdAt: ${user.createdAt || 'undefined'}`);
      console.log(`   All fields:`, Object.keys(user));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUsersStructure();
