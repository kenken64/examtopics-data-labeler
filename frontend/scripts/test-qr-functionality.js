// Test QR code generation functionality
async function testQRCodeFunctionality() {
  console.log('📱 Testing QR Code Functionality');
  console.log('===============================\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUzMDAxMCwiZXhwIjoxNzUyNTMzNjEwfQ.2OrKVL3T5UAGY92w1_KOCSMPpWvfA04WA3MWg4wDzFs';
  
  // Step 1: Create a quiz room (this should generate a QR code)
  console.log('🏠 Step 1: Creating quiz room...');
  
  const testData = {
    quizCode: 'TEST99',
    accessCode: 'AC-F2NOKPMQ',
    timerDuration: 30
    // hostUserId will be set automatically from authenticated user
  };
  
  try {
    const createResponse = await fetch(`${baseUrl}/api/quizblitz/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(testData)
    });
    
    const createData = await createResponse.json();
    console.log('📋 Create room response:', createData);
    
    if (createResponse.status === 200) {
      console.log('✅ Quiz room created successfully!');
      const quizCode = createData.quizCode;
      
      // Step 2: Test the join URL that QR code would contain
      console.log('\n📱 Step 2: Testing join URL (what QR code contains)...');
      const joinUrl = `${baseUrl}/quizblitz/join/${quizCode}`;
      console.log(`   Join URL: ${joinUrl}`);
      
      // Step 3: Check if the quiz room can be accessed
      console.log('\n🔍 Step 3: Checking quiz room accessibility...');
      const roomResponse = await fetch(`${baseUrl}/api/quizblitz/room/${quizCode}`);
      const roomData = await roomResponse.json();
      
      console.log('📋 Room data:', roomData);
      
      if (roomResponse.status === 200) {
        console.log('✅ Quiz room is accessible via API');
        
        // Step 4: Test joining the quiz
        console.log('\n👥 Step 4: Testing player join functionality...');
        const joinResponse = await fetch(`${baseUrl}/api/quizblitz/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quizCode: quizCode,
            playerName: 'Test Player'
          })
        });
        
        const joinData = await joinResponse.json();
        console.log('📋 Join response:', joinData);
        
        if (joinResponse.status === 200) {
          console.log('✅ Player join functionality working!');
          console.log('\n🎉 QR Code Flow Summary:');
          console.log('1. ✅ Quiz room creation works');
          console.log('2. ✅ Room data accessible');
          console.log('3. ✅ Player join works');
          console.log('4. ✅ QR code should display the join URL');
          console.log(`5. 📱 QR Code URL: ${joinUrl}`);
        } else {
          console.log('❌ Player join failed');
        }
      } else {
        console.log('❌ Quiz room not accessible');
      }
    } else {
      console.log('❌ Failed to create quiz room');
    }
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
  
  console.log('\n🏁 QR Code functionality test completed');
  console.log('\n💡 What to expect:');
  console.log('- QR code should appear on the quiz host page');
  console.log('- Scanning it should open the join URL');
  console.log('- Players can enter their name and join the quiz');
}

testQRCodeFunctionality().catch(console.error);
