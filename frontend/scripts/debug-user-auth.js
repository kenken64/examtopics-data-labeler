/**
 * Debug User Authentication and Database
 * 
 * This script helps debug user authentication issues by:
 * 1. Checking if there are any users in the database
 * 2. Examining JWT token structure
 * 3. Testing user lookup functionality
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

// User Schema (matching the one in lib/db.ts)
const passkeySchema = new mongoose.Schema({
  credentialID: { type: String, required: true },
  credentialPublicKey: { type: Buffer, required: true },
  counter: { type: Number, required: true },
  credentialDeviceType: { type: String, required: true },
  credentialBackedUp: { type: Boolean, required: true },
  transports: { type: [String] },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passkeys: [passkeySchema],
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  firstName: { type: String, trim: true, default: '' },
  lastName: { type: String, trim: true, default: '' },
  contactNumber: { type: String, trim: true, default: '' },
  dateOfBirth: { type: Date },
  location: { type: String, trim: true, default: '' },
  profilePhotoId: { type: String, default: null },
  profilePhotoUrl: { type: String, default: null },
}, {
  timestamps: true
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function debugUserAuth() {
  console.log('🔍 Debugging User Authentication Issues...');
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    console.log('📋 MongoDB URI:', process.env.MONGODB_URI);
    console.log('📋 Database Name:', process.env.MONGODB_DB_NAME);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check how many users exist
    console.log('\n👥 Checking users in database...');
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);

    if (userCount === 0) {
      console.log('⚠️ No users found in database!');
      console.log('💡 This explains why profile lookup is failing');
      console.log('🔧 You need to register/login to create a user first');
      return;
    }

    // Show all users (without sensitive data)
    console.log('\n📋 Users in database:');
    const users = await User.find({}).select('-passkeys').limit(5);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user._id}`);
      console.log(`      Username: ${user.username}`);
      console.log(`      Role: ${user.role || 'user'}`);
      console.log(`      Created: ${user.createdAt}`);
      console.log(`      Has Profile Data: ${!!(user.firstName && user.lastName)}`);
      console.log('');
    });

    // Test JWT token decoding if available
    console.log('\n🔐 JWT Configuration:');
    console.log(`   JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
    
    // Create a sample JWT for testing
    if (users.length > 0) {
      const testUser = users[0];
      const testToken = jwt.sign(
        {
          userId: testUser._id.toString(),
          username: testUser.username,
          role: testUser.role || 'user'
        },
        process.env.JWT_SECRET || 'your_super_secret_jwt_key',
        { expiresIn: '7d' }
      );

      console.log('\n🧪 Sample JWT token for testing:');
      console.log(`   User: ${testUser.username} (${testUser._id})`);
      console.log(`   Token: ${testToken.substring(0, 50)}...`);
      
      // Decode it back
      try {
        const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'your_super_secret_jwt_key');
        console.log('✅ Token verification successful');
        console.log('📋 Decoded payload:', {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role
        });
      } catch (jwtError) {
        console.error('❌ JWT verification failed:', jwtError.message);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('📋 Error details:', {
      name: error.name,
      message: error.message
    });
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug
if (require.main === module) {
  debugUserAuth();
}

module.exports = { debugUserAuth };
