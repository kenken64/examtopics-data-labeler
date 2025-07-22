/**
 * Test Profile API Endpoints
 * 
 * This script tests both GET and PUT profile API endpoints to verify
 * data loading and saving functionality.
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
}, {
  timestamps: true
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function testProfileAPI() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the user from the screenshot (ID: 686b9dfa5ded30e0ea00155e)
    const userId = '686b9dfa5ded30e0ea00155e';
    const testUser = await User.findById(userId);
    
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('👤 Found test user:', {
      id: testUser._id,
      username: testUser.username,
      firstName: testUser.firstName || 'NULL/Empty',
      lastName: testUser.lastName || 'NULL/Empty',
      contactNumber: testUser.contactNumber || 'NULL/Empty',
      dateOfBirth: testUser.dateOfBirth || 'NULL/Empty',
      location: testUser.location || 'NULL/Empty',
      role: testUser.role
    });

    // Test 1: Simulate GET /api/profile endpoint
    console.log('\n🔍 Testing GET Profile Data Retrieval...');
    const userForGet = await User.findById(userId).select('-passkeys');
    
    const getResponseData = {
      username: userForGet.username,
      firstName: userForGet.firstName || '',
      lastName: userForGet.lastName || '',
      contactNumber: userForGet.contactNumber || '',
      dateOfBirth: userForGet.dateOfBirth,
      location: userForGet.location || '',
      role: userForGet.role,
    };
    
    console.log('📊 GET Response Data (what frontend receives):', getResponseData);
    console.log('🎯 Field Analysis:', {
      firstName: { value: getResponseData.firstName, isEmpty: !getResponseData.firstName },
      lastName: { value: getResponseData.lastName, isEmpty: !getResponseData.lastName },
      contactNumber: { value: getResponseData.contactNumber, isEmpty: !getResponseData.contactNumber },
      dateOfBirth: { value: getResponseData.dateOfBirth, isEmpty: !getResponseData.dateOfBirth },
      location: { value: getResponseData.location, isEmpty: !getResponseData.location }
    });

    // Test 2: Simulate PUT /api/profile endpoint with test data
    console.log('\n📤 Testing PUT Profile Data Update...');
    const testUpdateData = {
      firstName: 'Test',
      lastName: 'User',
      contactNumber: '+1234567890',
      dateOfBirth: new Date('1990-05-15'),
      location: 'Test City, Country'
    };

    console.log('📋 Data being sent to PUT endpoint:', testUpdateData);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName: testUpdateData.firstName.trim(),
        lastName: testUpdateData.lastName.trim(),
        contactNumber: testUpdateData.contactNumber.trim(),
        dateOfBirth: testUpdateData.dateOfBirth,
        location: testUpdateData.location.trim(),
      },
      { new: true, select: '-passkeys' }
    );

    if (updatedUser) {
      console.log('✅ PUT Update successful!');
      console.log('📊 Updated User Data:', {
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        contactNumber: updatedUser.contactNumber,
        dateOfBirth: updatedUser.dateOfBirth,
        location: updatedUser.location,
        updatedAt: updatedUser.updatedAt
      });

      // Test 3: Verify data persisted by re-fetching
      console.log('\n🔍 Re-fetching to verify data persistence...');
      const verifyUser = await User.findById(userId).select('-passkeys');
      
      console.log('✅ Verification - Data in DB after update:', {
        firstName: verifyUser.firstName,
        lastName: verifyUser.lastName,
        contactNumber: verifyUser.contactNumber,
        dateOfBirth: verifyUser.dateOfBirth,
        location: verifyUser.location
      });

      // Prepare GET response after update
      const getResponseAfterUpdate = {
        username: verifyUser.username,
        firstName: verifyUser.firstName || '',
        lastName: verifyUser.lastName || '',
        contactNumber: verifyUser.contactNumber || '',
        dateOfBirth: verifyUser.dateOfBirth,
        location: verifyUser.location || '',
        role: verifyUser.role,
      };

      console.log('📊 GET Response after update (what frontend would receive):', getResponseAfterUpdate);

    } else {
      console.log('❌ PUT Update failed');
    }

  } catch (error) {
    console.error('❌ Error testing profile API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testProfileAPI().catch(console.error);
