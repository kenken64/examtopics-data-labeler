async function testCertificatesAPI() {
  console.log('🧪 Testing Certificates API RBAC');
  console.log('=' .repeat(40));
  
  try {
    // Test unauthorized access
    console.log('\n1️⃣ Testing unauthorized access...');
    const unauthorizedResponse = await fetch('http://localhost:3000/api/certificates');
    console.log(`Status: ${unauthorizedResponse.status}`);
    
    if (unauthorizedResponse.status === 401) {
      console.log('✅ Unauthorized access properly blocked');
    } else {
      console.log('❌ Unauthorized access not properly blocked');
      const data = await unauthorizedResponse.text();
      console.log('Response:', data);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running on localhost:3000');
      console.log('   Make sure the Next.js dev server is running: npm run dev');
    } else {
      console.error('❌ Error testing API:', error.message);
    }
  }
}

testCertificatesAPI();
