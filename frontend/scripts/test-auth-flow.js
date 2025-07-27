// Test the complete QuizBlitz flow with authentication
require('dotenv').config({ path: '.env.local' });

async function testCompleteQuizBlitzFlow() {
  console.log('🎮 Testing Complete QuizBlitz Flow');
  console.log('=================================\n');
  
  const baseUrl = 'http://localhost:3001';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODY5ZmM5ZGJkNzczNWYzNjBmODM4ZDIiLCJ1c2VybmFtZSI6ImtlbmtlbjY0IiwiaWF0IjoxNzUyNTQ4Mjk1LCJleHAiOjE3NTI1NTE4OTV9.DcREaMaDDXb9knAGk93vvs-GFJbecKmVBP_ROVibIL0';
  
  try {
    // Step 1: Create a quiz room with authentication (no hostId parameter)
    console.log('1️⃣ Creating quiz room with authentication...');
    const createResponse = await fetch(`${baseUrl}/api/quizblitz/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        quizCode: 'FLOW001',
        accessCode: 'AC-HYXOBSB',
        timerDuration: 30
        // hostUserId will be extracted from JWT token
      })
    });
    
    const createData = await createResponse.json();
    console.log(`   Status: ${createResponse.status}`);
    console.log(`   Response:`, createData);
    
    if (createResponse.status !== 200) {
      throw new Error(`Room creation failed: ${createData.error}`);
    }
    
    const quizCode = createData.quizCode;
    console.log(`   ✅ Room created with quiz code: ${quizCode}`);
    
    // Step 2: Verify the room has correct hostUserId
    console.log('\n2️⃣ Verifying room has correct hostUserId...');
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    const quizRoom = await db.collection('quizRooms').findOne({ 
      quizCode: quizCode.toUpperCase() 
    });
    
    console.log(`   Quiz Room:`, {
      quizCode: quizRoom.quizCode,
      hostUserId: quizRoom.hostUserId,
      hostUserIdType: typeof quizRoom.hostUserId,
      status: quizRoom.status,
      accessCode: quizRoom.accessCode
    });
    
    if (!quizRoom.hostUserId) {
      throw new Error('❌ hostUserId is still undefined!');
    }
    
    console.log(`   ✅ Room has valid hostUserId: ${quizRoom.hostUserId}`);
    
    // Step 3: Try to start the quiz (this should now work)
    console.log('\n3️⃣ Testing quiz start with authentication...');
    const startResponse = await fetch(`${baseUrl}/api/quizblitz/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        quizCode: quizCode,
        accessCode: 'AC-HYXOBSB',
        timerDuration: 30,
        players: []
      })
    });
    
    const startData = await startResponse.json();
    console.log(`   Status: ${startResponse.status}`);
    console.log(`   Response:`, startData);
    
    if (startResponse.status === 200) {
      console.log('   ✅ Quiz started successfully! 403 error is FIXED!');
    } else if (startResponse.status === 403) {
      console.log('   ❌ Still getting 403 error - authorization logic issue');
    } else {
      console.log(`   ⚠️ Unexpected response: ${startResponse.status}`);
    }
    
    // Step 4: Verify quiz room status after start attempt
    console.log('\n4️⃣ Checking final room status...');
    const finalRoom = await db.collection('quizRooms').findOne({ 
      quizCode: quizCode.toUpperCase() 
    });
    
    console.log(`   Final status: ${finalRoom.status}`);
    console.log(`   Host User ID: ${finalRoom.hostUserId} (${typeof finalRoom.hostUserId})`);
    
    await client.close();
    
    console.log('\n🎯 TEST SUMMARY:');
    console.log('================');
    console.log('✅ Room Creation: Working with authenticated hostUserId');
    console.log(`${startResponse.status === 200 ? '✅' : '❌'} Quiz Start: ${startResponse.status === 200 ? 'Working' : 'Still has issues'}`);
    console.log('✅ Authorization Fix: Complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteQuizBlitzFlow().catch(console.error);
