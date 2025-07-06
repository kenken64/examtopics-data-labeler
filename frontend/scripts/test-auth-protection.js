#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

// Test endpoints that should be protected
const PROTECTED_ENDPOINTS = [
  '/api/payees',
  '/api/payees/123',
  '/api/certificates',
  '/api/certificates/123',
  '/api/certificates/123/next-question-no',
  '/api/save-quiz',
  '/api/ai-explanation',
  '/api/access-code-questions',
  '/api/saved-questions'
];

// Test endpoints that should be public
const PUBLIC_ENDPOINTS = [
  '/api/auth/verify',
  '/api/auth/logout',
  '/api/auth/passkey/register-challenge',
  '/api/auth/passkey/register',
  '/api/auth/passkey/login-challenge',
  '/api/auth/passkey/login'
];

async function testEndpoint(url, shouldBeProtected = true) {
  try {
    console.log(`\n🧪 Testing: ${url}`);
    
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    const text = await response.text();
    
    if (shouldBeProtected) {
      if (status === 401) {
        console.log(`✅ PROTECTED - Correctly returned 401 Unauthorized`);
        return true;
      } else {
        console.log(`❌ UNPROTECTED - Expected 401, got ${status}`);
        console.log(`Response: ${text.substring(0, 200)}...`);
        return false;
      }
    } else {
      if (status !== 401) {
        console.log(`✅ PUBLIC - Accessible (status: ${status})`);
        return true;
      } else {
        console.log(`❌ INCORRECTLY PROTECTED - Public endpoint returned 401`);
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🔐 JWT Authentication Protection Test');
  console.log('=' .repeat(50));
  
  let passedTests = 0;
  let totalTests = 0;
  
  console.log('\n📊 Testing Protected Endpoints (should return 401):');
  for (const endpoint of PROTECTED_ENDPOINTS) {
    totalTests++;
    const passed = await testEndpoint(endpoint, true);
    if (passed) passedTests++;
  }
  
  console.log('\n🌐 Testing Public Endpoints (should be accessible):');
  for (const endpoint of PUBLIC_ENDPOINTS) {
    totalTests++;
    const passed = await testEndpoint(endpoint, false);
    if (passed) passedTests++;
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📈 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - JWT Authentication is properly configured!');
  } else {
    console.log('⚠️  Some tests failed - Check the endpoints above');
  }
}

// Only run if this is the main module
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };
