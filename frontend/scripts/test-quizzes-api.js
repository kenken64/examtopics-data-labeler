async function testAllAPIsRBAC() {
  console.log('🧪 Testing All APIs for RBAC Implementation');
  console.log('='.repeat(60));
  
  const endpoints = [
    { name: 'Quizzes', path: '/api/quizzes', description: 'Quiz questions created by users' },
    { name: 'Payees', path: '/api/payees', description: 'Payment records and access codes' },
    { name: 'Access Codes List', path: '/api/access-codes/list', description: 'List access codes with collaborative RBAC' },
    { name: 'Access Code Questions', path: '/api/access-code-questions', description: 'Questions linked to access codes with collaborative permissions' },
    { name: 'Saved Questions', path: '/api/saved-questions', description: 'User saved questions' },
    { name: 'Certificates', path: '/api/certificates', description: 'Certificate management' },
    { name: 'Companies', path: '/api/companies', description: 'Company management' }
  ];
  
  try {
    for (const endpoint of endpoints) {
      console.log(`\n📋 Testing ${endpoint.name} API`);
      console.log(`   Description: ${endpoint.description}`);
      console.log(`   Endpoint: ${endpoint.path}`);
      
      // Test unauthorized access
      console.log('\n   🔒 Testing unauthorized access...');
      const unauthorizedResponse = await fetch(`http://localhost:3000${endpoint.path}`);
      console.log(`   Status: ${unauthorizedResponse.status}`);
      
      if (unauthorizedResponse.status === 401) {
        console.log('   ✅ Unauthorized access properly blocked');
      } else if (unauthorizedResponse.status === 404) {
        console.log('   ⚠️  Endpoint not found - may not be implemented yet');
      } else {
        console.log('   ❌ Unauthorized access not properly blocked');
        try {
          const data = await unauthorizedResponse.text();
          console.log(`   Response preview: ${data.substring(0, 100)}...`);
        } catch (e) {
          console.log('   Could not read response data');
        }
      }
      
      console.log('   ' + '-'.repeat(50));
    }
    
    // Summary
    console.log('\n📊 RBAC IMPLEMENTATION SUMMARY:');
    console.log('✅ Expected: All APIs should return 401 Unauthorized without authentication');
    console.log('🔍 Next Steps:');
    console.log('   1. Implement missing APIs that return 404');
    console.log('   2. Fix APIs that don\'t return 401 for unauthorized access');
    console.log('   3. Test with authentication (run in browser console when logged in)');
    console.log('   4. Verify user-specific data filtering');
    console.log('   5. Test admin vs regular user permissions');
    
    console.log('\n🧪 AUTHENTICATED TESTING:');
    console.log('To test authenticated access:');
    console.log('1. Log in to the application at http://localhost:3000');
    console.log('2. Open browser console (F12)');
    console.log('3. Run: testAuthenticatedAPIs()');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running on localhost:3000');
      console.log('   Make sure the Next.js dev server is running');
    } else {
      console.error('❌ Error testing APIs:', error.message);
    }
  }
}

// Function for testing authenticated access (to be run in browser console)
async function testAuthenticatedAPIs() {
  console.log('🔐 Testing Authenticated API Access');
  console.log('='.repeat(50));
  
  const endpoints = [
    '/api/quizzes',
    '/api/payees', 
    '/api/access-code-questions?listAccessCodes=true',
    '/api/saved-questions?listAccessCodes=true',
    '/api/certificates',
    '/api/companies'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📋 Testing ${endpoint}...`);
    
    try {
      const response = await fetch(endpoint);
      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if response has RBAC metadata
        if (data.userInfo) {
          console.log(`   ✅ RBAC-enabled response detected`);
          console.log(`   👤 User: ${data.userInfo.email || data.userInfo.userId}`);
          console.log(`   🔑 Role: ${data.userInfo.isAdmin ? 'Admin' : 'User'}`);
          console.log(`   🔍 Filter: ${data.filterApplied || 'Not specified'}`);
          
          if (Array.isArray(data.quizzes)) {
            console.log(`   📊 Quizzes returned: ${data.quizzes.length}`);
          } else if (Array.isArray(data.payees)) {
            console.log(`   📊 Payees returned: ${data.payees.length}`);
          } else if (Array.isArray(data.certificates)) {
            console.log(`   📊 Certificates returned: ${data.certificates.length}`);
          } else if (Array.isArray(data.companies)) {
            console.log(`   📊 Companies returned: ${data.companies.length}`);
          } else if (data.accessCodes) {
            console.log(`   📊 Access codes returned: ${Array.isArray(data.accessCodes) ? data.accessCodes.length : 'N/A'}`);
          }
        } else {
          console.log(`   ⚠️  Response lacks RBAC metadata`);
          console.log(`   📊 Raw data: ${JSON.stringify(data).substring(0, 100)}...`);
        }
      } else {
        console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`);
    }
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.testAuthenticatedAPIs = testAuthenticatedAPIs;
}

testAllAPIsRBAC();
