async function testSavedQuestionsAPI() {
  console.log('🧪 Testing Saved Questions API RBAC');
  console.log('=' .repeat(40));
  
  try {
    // Test 1: Unauthorized access to list access codes
    console.log('\n1️⃣ Testing unauthorized access...');
    const unauthorizedResponse = await fetch('http://localhost:3000/api/saved-questions?listAccessCodes=true');
    console.log(`Status: ${unauthorizedResponse.status}`);
    
    if (unauthorizedResponse.status === 401) {
      console.log('✅ Unauthorized access properly blocked');
    } else {
      console.log('❌ Unauthorized access not properly blocked');
      const data = await unauthorizedResponse.text();
      console.log('Response:', data.substring(0, 200) + '...');
    }
    
    // Test 2: Unauthorized access to specific access code
    console.log('\n2️⃣ Testing unauthorized access to specific access code...');
    const accessCodeResponse = await fetch('http://localhost:3000/api/saved-questions?accessCode=123456789');
    console.log(`Status: ${accessCodeResponse.status}`);
    
    if (accessCodeResponse.status === 401) {
      console.log('✅ Unauthorized access code search properly blocked');
    } else {
      console.log('❌ Unauthorized access code search not properly blocked');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running on localhost:3000');
      console.log('   Make sure the Next.js dev server is running');
    } else {
      console.error('❌ Error testing API:', error.message);
    }
  }
}

testSavedQuestionsAPI();
