#!/usr/bin/env node

/**
 * Comprehensive Login Flow Debug Test
 * Tests the entire authentication flow and identifies where it's failing
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testLoginFlow() {
  console.log('🔍 Debugging Login Flow Issues');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Check if server is running
    console.log('\n1️⃣ Testing server accessibility...');
    const healthCheck = await fetch(BASE_URL);
    console.log(`   Server status: ${healthCheck.status} ${healthCheck.statusText}`);
    
    if (healthCheck.status !== 200) {
      console.log('❌ Server not accessible. Start with: npm run dev');
      return;
    }
    
    // Test 2: Check public routes work
    console.log('\n2️⃣ Testing public routes...');
    const publicTests = [
      '/api/auth/verify',
      '/api/auth/passkey/login-challenge',
    ];
    
    for (const route of publicTests) {
      try {
        const response = await fetch(`${BASE_URL}${route}`);
        console.log(`   ${route}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`   ${route}: ERROR - ${error.message}`);
      }
    }
    
    // Test 3: Check protected routes return 401 without auth
    console.log('\n3️⃣ Testing protected routes (should return 401)...');
    const protectedTests = [
      '/api/payees',
      '/api/certificates',
    ];
    
    for (const route of protectedTests) {
      try {
        const response = await fetch(`${BASE_URL}${route}`);
        console.log(`   ${route}: ${response.status} ${response.statusText}`);
        if (response.status === 401) {
          console.log(`   ✅ Correctly protected`);
        } else {
          console.log(`   ⚠️  Expected 401, got ${response.status}`);
        }
      } catch (error) {
        console.log(`   ${route}: ERROR - ${error.message}`);
      }
    }
    
    // Test 4: Check if /home redirects to login
    console.log('\n4️⃣ Testing /home page protection...');
    try {
      const homeResponse = await fetch(`${BASE_URL}/home`, {
        redirect: 'manual' // Don't follow redirects automatically
      });
      console.log(`   /home status: ${homeResponse.status} ${homeResponse.statusText}`);
      
      if (homeResponse.status === 302 || homeResponse.status === 307) {
        const location = homeResponse.headers.get('location');
        console.log(`   ✅ Correctly redirects to: ${location}`);
      } else {
        console.log(`   ⚠️  Expected redirect, got ${homeResponse.status}`);
      }
    } catch (error) {
      console.log(`   /home: ERROR - ${error.message}`);
    }
    
    // Test 5: Check login challenge flow
    console.log('\n5️⃣ Testing login challenge with test user...');
    try {
      const challengeResponse = await fetch(`${BASE_URL}/api/auth/passkey/login-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' })
      });
      
      console.log(`   Challenge status: ${challengeResponse.status}`);
      const challengeData = await challengeResponse.json();
      
      if (challengeData.error) {
        console.log(`   Challenge error: ${challengeData.error}`);
      } else {
        console.log(`   ✅ Challenge generated successfully`);
      }
    } catch (error) {
      console.log(`   Challenge ERROR: ${error.message}`);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 SUMMARY & RECOMMENDATIONS:');
    console.log('');
    console.log('If tests show:');
    console.log('✅ Server running (200)');
    console.log('✅ Public routes accessible');
    console.log('✅ Protected routes return 401');
    console.log('✅ /home redirects to login');
    console.log('');
    console.log('Then the issue is likely:');
    console.log('1. 🍪 Cookie not being set properly after login');
    console.log('2. ⏱️ Timing issue with cookie processing');
    console.log('3. 🔧 WebAuthn flow not completing correctly');
    console.log('');
    console.log('🛠️  DEBUGGING STEPS:');
    console.log('1. Open browser dev tools');
    console.log('2. Go to Application > Cookies');
    console.log('3. Login with passkey');
    console.log('4. Check if "token" cookie appears');
    console.log('5. If cookie appears, check if redirect happens');
    console.log('6. If no cookie, check login API response');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLoginFlow();
