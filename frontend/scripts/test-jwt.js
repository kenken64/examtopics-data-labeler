// Test script to verify JWT token access to /api/access-codes/verify endpoint
// Using the provided JWT token

async function testJWTAccess() {
  console.log('🔐 Testing JWT Token Access to API');
  console.log('====================================\n');
  
  const baseUrl = 'http://localhost:3000'; // Corrected port
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUyOTQ4OCwiZXhwIjoxNzUyNTMzMDg4fQ.6YXg7rwT1DkQeNpTn7wAw5PannBFe6k77CR9XUwdRa8';
  
  // First, let's decode the JWT token to see what's in it
  console.log('🔍 JWT Token Analysis:');
  try {
    const [header, payload, signature] = jwtToken.split('.');
    const decodedPayload = JSON.parse(atob(payload));
    console.log('📋 Token Payload:', JSON.stringify(decodedPayload, null, 2));
    
    const now = Math.floor(Date.now() / 1000);
    const isExpired = decodedPayload.exp < now;
    console.log('⏰ Token Status:', isExpired ? '❌ EXPIRED' : '✅ VALID');
    console.log('⏰ Expires at:', new Date(decodedPayload.exp * 1000).toISOString());
    console.log('⏰ Current time:', new Date().toISOString());
  } catch (error) {
    console.error('❌ Error decoding JWT:', error.message);
  }
  
  console.log('\n🧪 Test 1: Testing /api/access-codes/verify with Authorization header');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ accessCode: 'TEST123' })
    });
    
    const responseText = await response.text();
    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('📋 Response Body:', responseText);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: API accessible with JWT token');
    } else if (response.status === 401) {
      console.log('❌ UNAUTHORIZED: JWT token rejected');
    } else if (response.status === 404) {
      console.log('❌ NOT FOUND: Endpoint not accessible');
    } else {
      console.log(`❌ UNEXPECTED STATUS: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing with Authorization header:', error.message);
  }
  
  console.log('\n🧪 Test 2: Testing /api/access-codes/verify with Cookie (simulating browser)');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${jwtToken}`
      },
      body: JSON.stringify({ accessCode: 'TEST123' })
    });
    
    const responseText = await response.text();
    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Body:', responseText);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: API accessible with JWT cookie');
    } else if (response.status === 401) {
      console.log('❌ UNAUTHORIZED: JWT token rejected');
    } else if (response.status === 404) {
      console.log('❌ NOT FOUND: Endpoint not accessible');
    } else {
      console.log(`❌ UNEXPECTED STATUS: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing with Cookie:', error.message);
  }
  
  console.log('\n🧪 Test 3: Testing /api/access-codes/list endpoint');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    const responseText = await response.text();
    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Body:', responseText);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: List API accessible with JWT token');
    } else {
      console.log(`❌ FAILED: Status ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing list endpoint:', error.message);
  }
  
  console.log('\n🧪 Test 4: Testing without any authentication');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accessCode: 'TEST123' })
    });
    
    const responseText = await response.text();
    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Body:', responseText);
    
    if (response.status === 401) {
      console.log('✅ EXPECTED: 401 Unauthorized without token');
    } else {
      console.log(`❌ UNEXPECTED: Expected 401 but got ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing without auth:', error.message);
  }
  
  console.log('\n🧪 Test 5: Testing health endpoint (should be public)');
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const responseText = await response.text();
    console.log('📋 Health Response Status:', response.status);
    console.log('📋 Health Response Body:', responseText);
  } catch (error) {
    console.error('❌ Error testing health endpoint:', error.message);
  }
  
  console.log('\n🏁 JWT Access tests completed');
}

// Run the tests
testJWTAccess().catch(console.error);
