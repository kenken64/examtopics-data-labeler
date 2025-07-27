// Use built-in fetch for Node.js 18+
async function testAuthentication() {
  console.log('🔐 Testing QuizBlitz Authentication');
  console.log('=====================================\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test 1: Try to access QuizBlitz page without authentication
  console.log('🧪 Test 1: Accessing /quizblitz without authentication');
  try {
    const response = await fetch(`${baseUrl}/quizblitz`, {
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    console.log('📋 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      console.log('✅ Correctly redirected to:', location);
    } else {
      console.log('❌ Expected redirect but got status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error accessing QuizBlitz page:', error.message);
  }
  
  // Test 2: Try to access API endpoint without authentication
  console.log('\n🧪 Test 2: Accessing /api/access-codes/verify without authentication');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accessCode: 'TEST123' })
    });
    
    const data = await response.text();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response body:', data);
    
    if (response.status === 401) {
      console.log('✅ Correctly blocked with 401 Unauthorized');
    } else {
      console.log('❌ Expected 401 but got:', response.status);
    }
  } catch (error) {
    console.error('❌ Error accessing API:', error.message);
  }
  
  // Test 3: Try to access API list endpoint without authentication
  console.log('\n🧪 Test 3: Accessing /api/access-codes/list without authentication');
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/list`);
    
    const data = await response.text();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response body:', data);
    
    if (response.status === 401) {
      console.log('✅ Correctly blocked with 401 Unauthorized');
    } else {
      console.log('❌ Expected 401 but got:', response.status);
    }
  } catch (error) {
    console.error('❌ Error accessing API:', error.message);
  }
  
  // Test 4: Check login page is accessible
  console.log('\n🧪 Test 4: Accessing login page');
  try {
    const response = await fetch(`${baseUrl}/`);
    
    console.log('📋 Response status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Login page accessible');
    } else {
      console.log('❌ Login page not accessible, status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error accessing login page:', error.message);
  }
  
  console.log('\n🏁 Authentication tests completed');
}

testAuthentication().catch(console.error);
