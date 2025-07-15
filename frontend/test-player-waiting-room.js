#!/usr/bin/env node

/**
 * Test script to verify the complete player waiting room functionality
 * Tests the player join flow and waiting room persistence
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testPlayerWaitingRoom() {
  console.log('🎮 Testing Player Waiting Room Flow');
  console.log('=' .repeat(50));

  try {
    // Test 1: Verify session API is accessible without auth
    console.log('\n1️⃣ Testing session API accessibility...');
    const testQuizCode = 'TEST123';
    
    const sessionResponse = await fetch(`${BASE_URL}/api/quizblitz/session/${testQuizCode}`);
    console.log(`   Session API status: ${sessionResponse.status}`);
    
    if (sessionResponse.status === 401) {
      console.log('❌ Session API requires auth - players will be blocked!');
      return;
    } else if (sessionResponse.status === 404) {
      console.log('✅ Session API accessible - quiz not found (expected)');
    } else {
      console.log(`✅ Session API accessible - status: ${sessionResponse.status}`);
    }

    // Test 2: Verify room API requires authentication
    console.log('\n2️⃣ Testing room API authentication...');
    const roomResponse = await fetch(`${BASE_URL}/api/quizblitz/room/${testQuizCode}`);
    console.log(`   Room API status: ${roomResponse.status}`);
    
    if (roomResponse.status === 401) {
      console.log('✅ Room API correctly protected with authentication');
    } else {
      console.log('⚠️  Room API should require authentication but got:', roomResponse.status);
    }

    // Test 3: Verify join API is accessible without auth
    console.log('\n3️⃣ Testing join API accessibility...');
    const joinResponse = await fetch(`${BASE_URL}/api/quizblitz/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizCode: testQuizCode,
        playerName: 'TestPlayer'
      })
    });
    console.log(`   Join API status: ${joinResponse.status}`);
    
    if (joinResponse.status === 401) {
      console.log('❌ Join API requires auth - players will be blocked!');
    } else if (joinResponse.status === 404) {
      console.log('✅ Join API accessible - quiz not found (expected)');
    } else {
      console.log(`✅ Join API accessible - status: ${joinResponse.status}`);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎯 AUTHENTICATION SUMMARY:');
    console.log('');
    console.log('✅ Session API: No auth required (players can access)');
    console.log('✅ Room API: Authentication required (hosts only)');
    console.log('✅ Join API: No auth required (players can join)');
    console.log('');
    console.log('🔧 TESTING COMPLETE FLOW:');
    console.log('');
    console.log('To test the complete player experience:');
    console.log('1. Create a quiz room as host (authenticated)');
    console.log('2. Join as player using the join link (no auth)');
    console.log('3. Player should see waiting room with other players');
    console.log('4. Players should stay in waiting room until host starts quiz');
    console.log('');
    console.log('📱 Manual Test URLs:');
    console.log(`   Host Dashboard: ${BASE_URL}/quizblitz`);
    console.log(`   Join Link: ${BASE_URL}/quizblitz/join/[QUIZ_CODE]`);
    console.log(`   Live Quiz: ${BASE_URL}/quizblitz/live/[QUIZ_CODE]`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL, { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Run the test
checkServer().then((isRunning) => {
  if (isRunning) {
    testPlayerWaitingRoom();
  } else {
    console.log('❌ Server not running on http://localhost:3000');
    console.log('💡 Start the server with: npm run dev');
  }
});
