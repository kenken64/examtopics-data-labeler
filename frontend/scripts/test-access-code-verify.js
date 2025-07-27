// Test the access code verification endpoint with JWT token
async function testAccessCodeVerify() {
  console.log('🔐 Testing Access Code Verification with JWT');
  console.log('==============================================\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUzMDAxMCwiZXhwIjoxNzUyNTMzNjEwfQ.2OrKVL3T5UAGY92w1_KOCSMPpWvfA04WA3MWg4wDzFs';
  
  // Test 1: Verify access code with JWT token in Authorization header
  console.log('🧪 Test 1: POST /api/access-codes/verify with Authorization header');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ accessCode: 'TEST123' })
    });
    
    const data = await response.json();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ API endpoint is working with Authorization header!');
    } else if (response.status === 404) {
      console.log('⚠️  API working but access code not found in payee collection');
    } else if (response.status === 401) {
      console.log('❌ Authentication failed');
    } else {
      console.log('🔍 Other response status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing with Authorization header:', error.message);
  }
  
  // Test 2: Try with a different test access code
  console.log('\n🧪 Test 2: POST /api/access-codes/verify with different access code');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ accessCode: 'QUIZ123' })
    });
    
    const data = await response.json();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Found valid access code!');
    } else if (response.status === 404) {
      console.log('⚠️  Access code not found in payee collection');
    }
  } catch (error) {
    console.error('❌ Error testing second access code:', error.message);
  }
  
  // Test 3: Try without access code to test validation
  console.log('\n🧪 Test 3: POST /api/access-codes/verify without access code');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 400) {
      console.log('✅ Validation working - missing access code detected');
    }
  } catch (error) {
    console.error('❌ Error testing validation:', error.message);
  }
  
  console.log('\n🏁 Access code verification tests completed');
}

testAccessCodeVerify().catch(console.error);
