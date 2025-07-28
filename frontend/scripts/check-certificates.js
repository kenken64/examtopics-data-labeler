const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkCertificatesStructure() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('📜 Checking certificates collection structure...');

    // Check certificates collection
    const certificates = await db.collection('certificates').find({}).limit(3).toArray();
    console.log(`\n📝 certificates collection (${certificates.length} samples):`);
    if (certificates.length > 0) {
      console.log('   Fields:', Object.keys(certificates[0]));
      console.log('   Has userId?', certificates[0].userId ? 'Yes' : 'No');
      console.log('   Sample:', {
        _id: certificates[0]._id,
        name: certificates[0].name,
        code: certificates[0].code,
        userId: certificates[0].userId || 'missing'
      });
    }

    // Count documents
    const totalCertificates = await db.collection('certificates').countDocuments({});
    const certificatesWithUserId = await db.collection('certificates').countDocuments({ 
      userId: { $exists: true } 
    });
    
    console.log(`\n📊 Certificates ownership status:`);
    console.log(`   Total certificates: ${totalCertificates}`);
    console.log(`   With userId: ${certificatesWithUserId}/${totalCertificates}`);

    // Get users for reference
    const users = await db.collection('users').find({}).toArray();
    console.log('\n👥 Users in database:');
    users.forEach(user => {
      console.log(`   ${user.username}: ${user.role} (ID: ${user._id})`);
    });

    // Show specific certificate details
    if (certificates.length > 0) {
      console.log('\n📜 Certificate Details:');
      certificates.forEach((cert, index) => {
        console.log(`   Certificate ${index + 1}:`);
        console.log(`     Name: ${cert.name}`);
        console.log(`     Code: ${cert.code}`);
        console.log(`     User ID: ${cert.userId || 'Not set'}`);
        console.log(`     Created: ${cert.createdAt}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCertificatesStructure();
