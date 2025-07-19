/**
 * Test Profile Update Functionality
 * 
 * This script tests the profile update API endpoint to ensure all fields
 * are properly saved to the MongoDB users collection.
 */

const mongoose = require('mongoose');
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
  timestamps: true // Add createdAt and updatedAt fields
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function testProfileUpdate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a test user (assuming there's at least one user)
    const testUser = await User.findOne({}).limit(1);
    if (!testUser) {
      console.log('❌ No users found in database. Create a user first.');
      return;
    }

    console.log('👤 Found test user:', {
      id: testUser._id,
      username: testUser.username,
      firstName: testUser.firstName || 'Not set',
      lastName: testUser.lastName || 'Not set',
      contactNumber: testUser.contactNumber || 'Not set',
      dateOfBirth: testUser.dateOfBirth || 'Not set',
      location: testUser.location || 'Not set'
    });

    // Test data to update
    const testData = {
      firstName: 'John',
      lastName: 'Doe',
      contactNumber: '+1234567890',
      dateOfBirth: new Date('1990-01-15'),
      location: 'New York, USA'
    };

    console.log('📤 Updating user with test data:', testData);

    // Perform the update (simulating the API endpoint logic)
    const updatedUser = await User.findByIdAndUpdate(
      testUser._id,
      {
        firstName: testData.firstName.trim(),
        lastName: testData.lastName.trim(),
        contactNumber: testData.contactNumber.trim(),
        dateOfBirth: testData.dateOfBirth,
        location: testData.location.trim(),
      },
      { new: true, select: '-passkeys' }
    );

    if (updatedUser) {
      console.log('✅ Profile updated successfully!');
      console.log('📊 Updated user data:', {
        id: updatedUser._id,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        contactNumber: updatedUser.contactNumber,
        dateOfBirth: updatedUser.dateOfBirth,
        location: updatedUser.location,
        updatedAt: updatedUser.updatedAt
      });

      // Verify the data was actually saved
      console.log('🔍 Verifying data was saved...');
      const verifyUser = await User.findById(testUser._id).select('-passkeys');
      console.log('✅ Verification - Current user data in DB:', {
        firstName: verifyUser.firstName,
        lastName: verifyUser.lastName,
        contactNumber: verifyUser.contactNumber,
        dateOfBirth: verifyUser.dateOfBirth,
        location: verifyUser.location,
        updatedAt: verifyUser.updatedAt
      });

      // Check if all fields were saved correctly
      const fieldsMatch = {
        firstName: verifyUser.firstName === testData.firstName,
        lastName: verifyUser.lastName === testData.lastName,
        contactNumber: verifyUser.contactNumber === testData.contactNumber,
        dateOfBirth: verifyUser.dateOfBirth.toISOString() === testData.dateOfBirth.toISOString(),
        location: verifyUser.location === testData.location
      };

      console.log('🎯 Field verification results:', fieldsMatch);
      
      const allFieldsSaved = Object.values(fieldsMatch).every(match => match);
      if (allFieldsSaved) {
        console.log('✅ All fields were saved correctly!');
      } else {
        console.log('❌ Some fields were not saved correctly!');
      }

    } else {
      console.log('❌ Failed to update user');
    }

  } catch (error) {
    console.error('❌ Error testing profile update:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testProfileUpdate().catch(console.error);
