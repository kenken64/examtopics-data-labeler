// Simple JWT test without dotenv dependency
const jwt = require('jsonwebtoken');

console.log('🔍 Testing JWT Secrets...');

// Test both possible secrets
const envSecret = 'your_super_secret_jwt_key'; // From .env.local
const fallbackSecret = 'your_jwt_secret'; // Fallback

console.log('Environment secret:', envSecret);
console.log('Fallback secret:', fallbackSecret);

// Create token with environment secret
const tokenWithEnvSecret = jwt.sign({ userId: 'test123', username: 'testuser' }, envSecret, { expiresIn: '1h' });
console.log('Token with env secret:', tokenWithEnvSecret.substring(0, 50) + '...');

// Create token with fallback secret
const tokenWithFallbackSecret = jwt.sign({ userId: 'test123', username: 'testuser' }, fallbackSecret, { expiresIn: '1h' });
console.log('Token with fallback secret:', tokenWithFallbackSecret.substring(0, 50) + '...');

// Test cross-verification (this is where the issue might be)
console.log('\n🔄 Cross-verification tests:');

try {
  jwt.verify(tokenWithEnvSecret, envSecret);
  console.log('✅ Env token verified with env secret');
} catch (e) {
  console.log('❌ Env token failed with env secret:', e.message);
}

try {
  jwt.verify(tokenWithEnvSecret, fallbackSecret);
  console.log('✅ Env token verified with fallback secret');
} catch (e) {
  console.log('❌ Env token failed with fallback secret:', e.message);
}

try {
  jwt.verify(tokenWithFallbackSecret, envSecret);
  console.log('✅ Fallback token verified with env secret');
} catch (e) {
  console.log('❌ Fallback token failed with env secret:', e.message);
}

try {
  jwt.verify(tokenWithFallbackSecret, fallbackSecret);
  console.log('✅ Fallback token verified with fallback secret');
} catch (e) {
  console.log('❌ Fallback token failed with fallback secret:', e.message);
}
