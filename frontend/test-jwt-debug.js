#!/usr/bin/env node

/**
 * Test script to debug JWT authentication issue
 * This will help us understand why the middleware is not recognizing the JWT cookie
 */

const jwt = require('jsonwebtoken');

// Use the same JWT secret as in the application
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

console.log('🔍 JWT Authentication Debug Test');
console.log('================================');

// Simulate token creation (like in login API)
console.log('\n1. Creating JWT token...');
const testPayload = { 
  userId: 'test_user_id', 
  username: 'test_user' 
};

const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });
console.log('✅ Token created:', token.substring(0, 50) + '...');

// Simulate token verification (like in middleware)
console.log('\n2. Verifying JWT token...');
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verified successfully');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.log('❌ Token verification failed:', error.message);
  console.log('Error type:', error.constructor.name);
}

// Test with wrong secret
console.log('\n3. Testing with wrong secret...');
try {
  const wrongDecoded = jwt.verify(token, 'wrong_secret');
  console.log('⚠️  This should not happen - wrong secret worked?');
} catch (error) {
  console.log('✅ Correctly failed with wrong secret:', error.message);
}

// Check environment variables
console.log('\n4. Environment check...');
console.log('JWT_SECRET from env:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);

console.log('\n✅ JWT Debug test complete');
