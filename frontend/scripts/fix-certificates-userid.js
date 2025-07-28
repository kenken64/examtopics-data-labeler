const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function fixCertificatesUserId() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🔧 Checking certificates userId field type...');

    // Get all certificates with string userId
    const certificates = await db.collection('certificates').find({
      userId: { $type: 'string' }
    }).toArray();

    console.log(`📊 Found ${certificates.length} certificates with string userId`);

    if (certificates.length === 0) {
      console.log('✅ All certificates already have ObjectId userId');
      
      // Test the current setup
      const testUser = await db.collection('users').findOne({ username: 'bunnyppl@hotmail.com' });
      if (testUser) {
        const userCerts = await db.collection('certificates').find({
          userId: testUser._id
        }).toArray();
        console.log(`🧪 Filter test: User ${testUser.username} can see ${userCerts.length} certificates`);
        
        const userCertsString = await db.collection('certificates').find({
          userId: testUser._id.toString()
        }).toArray();
        console.log(`🧪 String filter test: User ${testUser.username} can see ${userCertsString.length} certificates (string match)`);
      }
      return;
    }

    let fixedCount = 0;

    for (const cert of certificates) {
      try {
        if (cert.userId) {
          // Convert string userId to ObjectId
          const objectIdUserId = new ObjectId(cert.userId);
          
          await db.collection('certificates').updateOne(
            { _id: cert._id },
            { $set: { userId: objectIdUserId } }
          );
          fixedCount++;
          console.log(`   ✅ Fixed certificate "${cert.name}" userId: ${cert.userId} → ObjectId`);
        }
      } catch (error) {
        console.error(`   ❌ Error fixing certificate ${cert._id}:`, error);
      }
    }

    console.log(`\n✅ Fix completed: ${fixedCount}/${certificates.length} certificates updated`);

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await client.close();
  }
}

fixCertificatesUserId();
