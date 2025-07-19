const { MongoClient } = require('./frontend/node_modules/mongodb');

async function testProfileAPI() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('awscert');
    
    // Find the bunnyppl@gmail.com user directly
    const user = await db.collection('users').findOne({ username: 'bunnyppl@gmail.com' });
    
    if (user) {
      console.log('\n👤 Found user:');
      console.log('   Username:', user.username);
      console.log('   Role:', user.role);
      console.log('   First Name:', user.firstName || 'NOT SET');
      console.log('   Last Name:', user.lastName || 'NOT SET');
      console.log('   Contact Number:', user.contactNumber || 'NOT SET');
      console.log('   Date of Birth:', user.dateOfBirth || 'NOT SET');
      console.log('   Location:', user.location || 'NOT SET');
      console.log('   Has Passkeys:', user.passkeys ? user.passkeys.length : 0);
    } else {
      console.log('❌ User bunnyppl@gmail.com not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

testProfileAPI();