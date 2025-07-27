// Test script for collaborative RBAC features
// This should be run in the browser console when logged in

console.log('🧪 Collaborative Access Code RBAC Test Suite');
console.log('='.repeat(60));

// Test collaborative permissions for access codes
async function testCollaborativeRBAC() {
  console.log('\n🔐 Testing Collaborative Access Code Management...\n');

  try {
    // Test 1: Access codes list with collaborative info
    console.log('📋 Test 1: Access Codes List API');
    const listResponse = await fetch('/api/access-codes/list');
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('✅ Access codes list retrieved successfully');
      console.log(`   Filter applied: ${listData.filterApplied}`);
      console.log(`   User info: ${listData.userInfo?.email} (${listData.userInfo?.role})`);
      console.log(`   Total access codes: ${listData.pagination?.totalCount || 0}`);
      
      if (listData.accessCodes && listData.accessCodes.length > 0) {
        const firstCode = listData.accessCodes[0];
        console.log('   Sample access code structure:');
        console.log(`     - Access Code: ${firstCode.accessCode}`);
        console.log(`     - Customer: ${firstCode.customerName}`);
        console.log(`     - Link Status: ${firstCode.linkStatus}`);
        console.log(`     - Question Count: ${firstCode.questionStats?.totalQuestions || 0}`);
        console.log(`     - Contributors: ${firstCode.contributors?.length || 0}`);
        
        // Test 2: Access code questions with collaborative info
        if (firstCode.accessCode) {
          console.log('\n📝 Test 2: Access Code Questions API');
          const questionsResponse = await fetch(`/api/access-code-questions?generatedAccessCode=${firstCode.accessCode}`);
          
          if (questionsResponse.ok) {
            const questionsData = await questionsResponse.json();
            console.log('✅ Access code questions retrieved successfully');
            console.log(`   Permissions: ${JSON.stringify(questionsData.permissions)}`);
            console.log(`   Total questions: ${questionsData.stats?.totalQuestions || 0}`);
            console.log(`   Payee owner: ${questionsData.collaborativeInfo?.payeeOwner?.username || 'N/A'}`);
            console.log(`   Has collaborative questions: ${questionsData.collaborativeInfo?.hasCollaborativeQuestions}`);
            
            if (questionsData.stats?.collaborationStats) {
              const collab = questionsData.stats.collaborationStats;
              console.log(`   Question linkers: ${collab.totalLinkers}`);
              collab.linkers?.forEach((linker, i) => {
                console.log(`     ${i + 1}. ${linker.username} (${linker.role})`);
              });
            }
          } else {
            console.log(`⚠️  Access code questions: ${questionsResponse.status} - ${questionsResponse.statusText}`);
          }
        }
      } else {
        console.log('   No access codes found for current user');
      }
    } else {
      console.log(`❌ Access codes list failed: ${listResponse.status} - ${listResponse.statusText}`);
    }

    // Test 3: Quiz list for labeler page
    console.log('\n📚 Test 3: Quiz List API');
    const quizzesResponse = await fetch('/api/quizzes');
    
    if (quizzesResponse.ok) {
      const quizzesData = await quizzesResponse.json();
      console.log('✅ Quiz list retrieved successfully');
      console.log(`   Filter applied: ${quizzesData.filterApplied}`);
      console.log(`   Total quizzes: ${quizzesData.pagination?.totalCount || 0}`);
      console.log(`   User can create: ${quizzesData.userInfo?.role === 'admin' || quizzesData.userInfo?.role === 'user'}`);
    } else {
      console.log(`⚠️  Quiz list: ${quizzesResponse.status} - ${quizzesResponse.statusText}`);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n📊 Collaborative RBAC Test Complete');
  console.log('='.repeat(60));
}

// Test collaborative question management permissions
async function testQuestionManagement(accessCode) {
  if (!accessCode) {
    console.log('❌ Please provide an access code to test question management');
    console.log('Usage: testQuestionManagement("your-access-code-here")');
    return;
  }

  console.log(`\n🔧 Testing Question Management for Access Code: ${accessCode}`);
  console.log('-'.repeat(50));

  try {
    // Test viewing questions
    const viewResponse = await fetch(`/api/access-code-questions?generatedAccessCode=${accessCode}`);
    console.log(`View permissions: ${viewResponse.status} (${viewResponse.ok ? 'Allowed' : 'Denied'})`);

    if (viewResponse.ok) {
      const data = await viewResponse.json();
      const permissions = data.permissions;
      console.log('Permissions breakdown:');
      console.log(`  - Can view: ${permissions?.canView || false}`);
      console.log(`  - Can modify: ${permissions?.canModify || false}`);
      console.log(`  - User is payee owner: ${permissions?.isPayeeOwner || false}`);
      console.log(`  - User is admin: ${permissions?.isAdmin || false}`);
      console.log(`  - Access reason: ${permissions?.accessReason || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Question management test error:', error.message);
  }
}

// Test user role and permissions
async function testUserRole() {
  console.log('\n👤 Testing Current User Role and Permissions');
  console.log('-'.repeat(50));

  try {
    // Test multiple APIs to see role-based filtering
    const apis = [
      { name: 'Companies', endpoint: '/api/companies' },
      { name: 'Certificates', endpoint: '/api/certificates' },
      { name: 'Saved Questions', endpoint: '/api/saved-questions' },
      { name: 'Access Codes', endpoint: '/api/access-codes/list' }
    ];

    for (const api of apis) {
      const response = await fetch(api.endpoint);
      if (response.ok) {
        const data = await response.json();
        console.log(`${api.name}:`);
        console.log(`  User: ${data.userInfo?.email || 'N/A'} (${data.userInfo?.role || 'N/A'})`);
        console.log(`  Filter: ${data.filterApplied || 'N/A'}`);
        console.log(`  Count: ${data.pagination?.totalCount || data.companies?.length || data.certificates?.length || data.accessCodes?.length || 0}`);
      } else {
        console.log(`${api.name}: ${response.status} - ${response.statusText}`);
      }
    }

  } catch (error) {
    console.error('❌ User role test error:', error.message);
  }
}

// Auto-run main test
console.log('\n🚀 Running collaborative RBAC tests...');
console.log('Additional commands available:');
console.log('  - testQuestionManagement("access-code") - Test specific access code permissions');
console.log('  - testUserRole() - Test current user role across all APIs');
console.log('');

testCollaborativeRBAC();
