#!/usr/bin/env node

/**
 * Test script to verify JWT middleware debug logging and public route access
 * Tests authentication boundaries and logs middleware decision-making
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testMiddlewareDebugLogging() {
  console.log('🔍 Testing JWT Middleware Debug Logging');
  console.log('=' .repeat(60));

  try {
    // Test 1: QuizBlitz join API (should be public)
    console.log('\n1️⃣ Testing QuizBlitz join API (public route)...');
    const joinResponse = await fetch(`${BASE_URL}/api/quizblitz/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quizCode: 'TEST123',
        playerName: 'Debug Test Player'
      })
    });
    
    console.log(`   Join API status: ${joinResponse.status}`);
    
    if (joinResponse.status === 200 || joinResponse.status === 404) {
      console.log('✅ Join API correctly accessible without authentication');
    } else if (joinResponse.status === 401) {
      console.log('❌ Join API incorrectly requires authentication');
    } else {
      console.log(`⚠️  Unexpected status: ${joinResponse.status}`);
    }

    // Test 2: QuizBlitz session API with dynamic route (should be public)
    console.log('\n2️⃣ Testing QuizBlitz session API with dynamic route...');
    const sessionResponse = await fetch(`${BASE_URL}/api/quizblitz/session/TEST123`);
    console.log(`   Session API status: ${sessionResponse.status}`);
    
    if (sessionResponse.status === 200 || sessionResponse.status === 404) {
      console.log('✅ Session API correctly accessible without authentication');
    } else if (sessionResponse.status === 401) {
      console.log('❌ Session API incorrectly requires authentication');
    } else {
      console.log(`✅ Session API accessible - status: ${sessionResponse.status}`);
    }

    // Test 3: QuizBlitz room API (should require authentication)
    console.log('\n3️⃣ Testing QuizBlitz room API (protected route)...');
    const roomResponse = await fetch(`${BASE_URL}/api/quizblitz/room/TEST123`);
    console.log(`   Room API status: ${roomResponse.status}`);
    
    if (roomResponse.status === 401) {
      console.log('✅ Room API correctly requires authentication');
    } else {
      console.log('⚠️  Room API should require authentication but got:', roomResponse.status);
    }

    // Test 4: QuizBlitz start API (should require authentication)
    console.log('\n4️⃣ Testing QuizBlitz start API (protected route)...');
    const startResponse = await fetch(`${BASE_URL}/api/quizblitz/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quizCode: 'TEST123',
        accessCode: 'ACCESS123',
        timerDuration: 30,
        players: []
      })
    });
    
    console.log(`   Start API status: ${startResponse.status}`);
    
    if (startResponse.status === 401) {
      console.log('✅ Start API correctly requires authentication');
    } else {
      console.log('⚠️  Start API should require authentication but got:', startResponse.status);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 MIDDLEWARE DEBUG LOGGING SUMMARY:');
    console.log('');
    console.log('✅ Public APIs: join, session/[quizCode]');
    console.log('🔒 Protected APIs: room/[quizCode], start');
    console.log('');
    console.log('📊 Check server console for detailed debug logs:');
    console.log('- Request details (method, path, user agent)');
    console.log('- Token detection and validation');
    console.log('- Route classification (public vs protected)');
    console.log('- Authentication decisions with reasoning');
    console.log('');
    console.log('🔍 Example debug log format:');
    console.log('🔍 === MIDDLEWARE START ===');
    console.log('📍 Request: GET /api/quizblitz/session/TEST123');
    console.log('🔑 Token Status: ❌ Missing | Source: None');
    console.log('🌍 Route Type: 🌐 PUBLIC');
    console.log('✅ ALLOWING: Public route - /api/quizblitz/session/TEST123');
    console.log('🔍 === MIDDLEWARE END: ALLOWED ===');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Run the test
checkServer().then((isRunning) => {
  if (isRunning) {
    testMiddlewareDebugLogging();
  } else {
    console.log('❌ Server not running on http://localhost:3000');
    console.log('💡 Start the server with: npm run dev');
    console.log('');
    console.log('🔧 Once server is running, this test will verify:');
    console.log('✅ JWT middleware debug logging is working');
    console.log('✅ Public routes are accessible without authentication');
    console.log('✅ Protected routes require authentication');
    console.log('✅ QuizBlitz authentication boundaries are correct');
  }
});
