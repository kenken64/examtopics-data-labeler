/**
 * Direct API Test for Profile Endpoint
 * 
 * This script tests the profile API endpoint by making a direct HTTP request
 * to see what response we get. This will help identify if there are any
 * authentication or API issues.
 */

const https = require('https');
const http = require('http');

async function testProfileAPIDirectly() {
  console.log('🌐 Testing Profile API Endpoint Directly...');
  console.log('📍 Target: http://localhost:3000/api/profile');
  
  // You'll need to replace this with an actual JWT token from your browser
  // Go to your browser dev tools -> Application -> Cookies -> localhost:3000 -> token value
  const testToken = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token from browser
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/profile',
    method: 'GET',
    headers: {
      'Cookie': `token=${testToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Direct-API-Test/1.0'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log('📊 Response Status:', res.statusCode);
      console.log('📋 Response Headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📤 Raw Response Body:', data);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Parsed JSON Response:', jsonData);
          resolve(jsonData);
        } catch (error) {
          console.log('⚠️ Response is not valid JSON:', data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('❌ Request Timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

console.log('🚀 Starting Direct API Test...');
console.log('');
console.log('⚠️ IMPORTANT: Replace YOUR_JWT_TOKEN_HERE with actual token from browser cookies!');
console.log('   1. Open your browser dev tools');
console.log('   2. Go to Application > Cookies > localhost:3000');
console.log('   3. Copy the "token" cookie value');
console.log('   4. Replace YOUR_JWT_TOKEN_HERE in this script');
console.log('');

// Run the test
testProfileAPIDirectly()
  .then(result => {
    console.log('✅ Test completed successfully');
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
  });
