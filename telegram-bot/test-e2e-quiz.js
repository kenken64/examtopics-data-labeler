#!/usr/bin/env node

// End-to-end test: Create quiz through frontend API and monitor bot behavior
const fetch = require('node-fetch');

async function testEndToEndQuizFlow() {
  console.log('🧪 Testing End-to-End QuizBlitz Flow...\n');

  try {
    // 1. First, create a quiz room through frontend API
    console.log('1. Creating quiz room through frontend API...');

    const createRoomResponse = await fetch('http://localhost:3000/api/quizblitz/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-user-token', // Simulate auth
      },
      body: JSON.stringify({
        accessCode: 'AC-4AC2H2G', // Use existing access code from DB
        timerDuration: 30
      })
    });

    if (!createRoomResponse.ok) {
      const error = await createRoomResponse.text();
      console.log(`❌ Failed to create room: ${createRoomResponse.status} - ${error}`);
      return;
    }

    const roomData = await createRoomResponse.json();
    console.log('✅ Quiz room created:', roomData);
    const quizCode = roomData.quizCode;

    // 2. Start the quiz
    console.log('\n2. Starting the quiz...');

    const startQuizResponse = await fetch('http://localhost:3000/api/quizblitz/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-user-token',
      },
      body: JSON.stringify({
        quizCode: quizCode
      })
    });

    if (!startQuizResponse.ok) {
      const error = await startQuizResponse.text();
      console.log(`❌ Failed to start quiz: ${startQuizResponse.status} - ${error}`);
      return;
    }

    const startData = await startQuizResponse.json();
    console.log('✅ Quiz started:', startData);

    // 3. Wait a moment for bot to detect the changes
    console.log('\n3. Waiting for bot to detect quiz...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('✅ Test completed! Check bot logs for activity.');
    console.log(`Quiz Code: ${quizCode}`);
    console.log('You can now test joining via Telegram with: /quizblitz');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEndToEndQuizFlow().catch(console.error);
