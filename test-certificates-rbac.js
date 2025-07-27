const mongoose = require('mongoose');

async function testCertificatesRBAC() {
  console.log('🔍 Testing Certificates RBAC Implementation');
  console.log('=' .repeat(50));
  
  try {
    // Connect to MongoDB using mongoose
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB via Mongoose');
    
    // 1. Check users collection
    console.log('\n📋 USERS:');
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    users.forEach(user => {
      console.log(`  - ${user.email} (Role: ${user.role}, ID: ${user._id})`);
    });
    
    // 2. Check certificates collection
    console.log('\n📜 CERTIFICATES:');
    const certificates = await mongoose.connection.db.collection('certificates').find({}).toArray();
    
    if (certificates.length === 0) {
      console.log('  No certificates found in database');
    } else {
      certificates.forEach(cert => {
        console.log(`  - ${cert.name} (${cert.code})`);
        console.log(`    Created by: ${cert.userId} (Type: ${typeof cert.userId})`);
        console.log(`    Company: ${cert.companyId || 'None'}`);
        console.log('');
      });
    }
    
    // 3. Test API scenarios (simulated)
    console.log('\n🧪 RBAC SCENARIOS:');
    
    // Find admin and regular user
    const adminUser = users.find(u => u.role === 'admin');
    const regularUser = users.find(u => u.role !== 'admin');
    
    if (adminUser) {
      console.log(`✅ Admin user found: ${adminUser.email}`);
      console.log(`   Should see: ALL certificates (${certificates.length} total)`);
    } else {
      console.log('❌ No admin user found');
    }
    
    if (regularUser) {
      const userCertificates = certificates.filter(cert => 
        cert.userId && cert.userId.toString() === regularUser._id.toString()
      );
      console.log(`✅ Regular user found: ${regularUser.email}`);
      console.log(`   Should see: Only own certificates (${userCertificates.length} certificates)`);
      
      if (userCertificates.length > 0) {
        userCertificates.forEach(cert => {
          console.log(`     - ${cert.name} (${cert.code})`);
        });
      }
    } else {
      console.log('❌ No regular user found');
    }
    
    // 4. Check userId field types
    console.log('\n🔧 FIELD TYPE VALIDATION:');
    const userIdTypes = certificates.map(cert => ({
      name: cert.name,
      userIdType: typeof cert.userId,
      isObjectId: cert.userId && cert.userId.constructor && cert.userId.constructor.name === 'ObjectId'
    }));
    
    userIdTypes.forEach(({ name, userIdType, isObjectId }) => {
      const status = isObjectId ? '✅' : '❌';
      console.log(`  ${status} ${name}: userId is ${userIdType}${isObjectId ? ' (ObjectId)' : ''}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCertificatesRBAC();
