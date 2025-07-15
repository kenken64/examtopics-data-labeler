// Test the specific generated access code AC-F2NOKPMQ
async function testSpecificAccessCode() {
  console.log('🔐 Testing Specific Generated Access Code: AC-F2NOKPMQ');
  console.log('====================================================\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUzMDAxMCwiZXhwIjoxNzUyNTMzNjEwfQ.2OrKVL3T5UAGY92w1_KOCSMPpWvfA04WA3MWg4wDzFs';
  const accessCode = 'AC-F2NOKPMQ';
  
  console.log('🧪 Testing access code verification...');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ accessCode: accessCode })
    });
    
    const data = await response.json();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('🎉 SUCCESS! Access code verification is working perfectly!');
      console.log('✅ Authentication: Working');
      console.log('✅ API Endpoint: Responding correctly');
      console.log('✅ Database Query: Finding payee record');
      console.log('✅ Generated Access Code: Valid and found');
      
      if (data.questionCount !== undefined) {
        console.log(`📊 Question count for this access code: ${data.questionCount}`);
      }
      if (data.certificateType) {
        console.log(`🏆 Certificate type: ${data.certificateType}`);
      }
    } else if (response.status === 404) {
      console.log('❌ Access code not found in payee collection');
      console.log('🔍 This could mean:');
      console.log('   - The access code doesn\'t exist in the database');
      console.log('   - It\'s stored in a different format (case sensitivity?)');
      console.log('   - It\'s in a different field name');
    } else if (response.status === 401) {
      console.log('❌ Authentication failed - JWT token might be expired');
    } else {
      console.log(`🔍 Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing access code:', error.message);
  }
  
  console.log('\n🏁 Test completed');
}

testSpecificAccessCode().catch(console.error);
