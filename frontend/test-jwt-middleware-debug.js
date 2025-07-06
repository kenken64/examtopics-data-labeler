const jwt = require('jsonwebtoken');

// Test if environment variables are loading properly
console.log('🔍 Testing JWT Secret Loading...');

// Load .env.local manually
require('dotenv').config({ path: '.env.local' });

const JWT_SECRET_FROM_ENV = process.env.JWT_SECRET;
const JWT_SECRET_FALLBACK = 'your_jwt_secret';

console.log('JWT_SECRET from environment:', JWT_SECRET_FROM_ENV);
console.log('Using fallback?', JWT_SECRET_FROM_ENV === undefined);

// Use the same logic as middleware and login API
const JWT_SECRET = JWT_SECRET_FROM_ENV || JWT_SECRET_FALLBACK;

console.log('Final JWT_SECRET:', JWT_SECRET);

// Create a test token
const testToken = jwt.sign({ userId: 'test123', username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
console.log('Test token:', testToken.substring(0, 50) + '...');

// Try to verify it
try {
  const decoded = jwt.verify(testToken, JWT_SECRET);
  console.log('✅ Token verification successful:', decoded);
} catch (error) {
  console.log('❌ Token verification failed:', error.message);
}

// Test with fallback secret to see if there's a mismatch
const fallbackSecret = 'your_jwt_secret';
try {
  const decodedFallback = jwt.verify(testToken, fallbackSecret);
  console.log('✅ Token verification with fallback successful:', decodedFallback);
} catch (error) {
  console.log('❌ Token verification with fallback failed:', error.message);
}
