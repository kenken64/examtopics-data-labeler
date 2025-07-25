// Test the QuizBlitz create-room endpoint
async function testCreateRoom() {
  console.log('🏠 Testing QuizBlitz Create Room Endpoint');
  console.log('======================================\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUzMDAxMCwiZXhwIjoxNzUyNTMzNjEwfQ.2OrKVL3T5UAGY92w1_KOCSMPpWvfA04WA3MWg4wDzFs';
  
  console.log('🧪 Testing POST /api/quizblitz/create-room');
  
  const testData = {
    quizCode: 'QUIZ123',
    accessCode: 'AC-F2NOKPMQ',
    timerDuration: 30
    // hostUserId will be set automatically from authenticated user
  };
  
  try {
    const response = await fetch(`${baseUrl}/api/quizblitz/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('🎉 SUCCESS! Quiz room created successfully!');
      console.log('✅ Authentication: Working');
      console.log('✅ Access Code Validation: Working');
      console.log('✅ Room Creation: Working');
      console.log(`🏠 Quiz Code: ${data.quizCode}`);
      console.log(`🆔 Room ID: ${data.roomId}`);
    } else if (response.status === 404) {
      console.log('❌ Access code validation failed');
    } else if (response.status === 401) {
      console.log('❌ Authentication failed');
    } else if (response.status === 400) {
      console.log('❌ Missing required fields');
    } else {
      console.log(`🔍 Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing create room:', error.message);
  }
  
  console.log('\n🏁 Test completed');
}

testCreateRoom().catch(console.error);
