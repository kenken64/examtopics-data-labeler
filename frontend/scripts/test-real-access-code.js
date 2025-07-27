// Check what generated access codes exist in the payee collection
async function checkGeneratedAccessCodes() {
  console.log('🔍 Checking Generated Access Codes in Database');
  console.log('=============================================\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUzMDAxMCwiZXhwIjoxNzUyNTMzNjEwfQ.2OrKVL3T5UAGY92w1_KOCSMPpWvfA04WA3MWg4wDzFs';
  
  // Call the list endpoint to see what access codes exist
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/list`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    const data = await response.json();
    console.log('📋 Response status:', response.status);
    console.log('📋 Available access codes:', JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.length > 0) {
      console.log('\n🎯 Testing with first available access code...');
      const firstAccessCode = data[0].generatedAccessCode;
      
      // Test verification with actual access code
      const verifyResponse = await fetch(`${baseUrl}/api/access-codes/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ accessCode: firstAccessCode })
      });
      
      const verifyData = await verifyResponse.json();
      console.log('📋 Verify response status:', verifyResponse.status);
      console.log('📋 Verify response data:', JSON.stringify(verifyData, null, 2));
      
      if (verifyResponse.status === 200) {
        console.log('✅ SUCCESS! Access code verification is working perfectly!');
      }
    } else {
      console.log('⚠️  No access codes found in database');
    }
  } catch (error) {
    console.error('❌ Error checking access codes:', error.message);
  }
}

checkGeneratedAccessCodes().catch(console.error);
