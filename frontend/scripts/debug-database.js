// Create a debug endpoint to check database contents directly
async function debugDatabase() {
  console.log('🔍 Database Debug - Looking for AC-F2NOKPMQ');
  console.log('============================================\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUzMDAxMCwiZXhwIjoxNzUyNTMzNjEwfQ.2OrKVL3T5UAGY92w1_KOCSMPpWvfA04WA3MWg4wDzFs';
  
  // First, let's check what's actually in the payee collection
  console.log('🧪 Checking payee collection via list endpoint...');
  try {
    const listResponse = await fetch(`${baseUrl}/api/access-codes/list`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    const listData = await listResponse.json();
    console.log('📋 List response status:', listResponse.status);
    console.log('📋 List response data:', JSON.stringify(listData, null, 2));
    
    if (listData.accessCodes && listData.accessCodes.length > 0) {
      console.log('\n✅ Found some access codes in payee collection!');
      listData.accessCodes.forEach((code, index) => {
        console.log(`   ${index + 1}. ${code.generatedAccessCode} (${code.email})`);
      });
    } else {
      console.log('\n❌ No access codes found in payee collection');
      console.log('🔍 This suggests the access code AC-F2NOKPMQ might be:');
      console.log('   - In a different collection');
      console.log('   - Not yet created in the database');
      console.log('   - Stored with a different field name');
    }
    
    // Now test with different case variations
    const variations = ['AC-F2NOKPMQ', 'ac-f2nokpmq', 'Ac-F2nokpmq'];
    
    for (const variation of variations) {
      console.log(`\n🧪 Testing variation: ${variation}`);
      const testResponse = await fetch(`${baseUrl}/api/access-codes/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ accessCode: variation })
      });
      
      const testData = await testResponse.json();
      console.log(`   Status: ${testResponse.status} - ${testData.error || 'Success'}`);
      
      if (testResponse.status === 200) {
        console.log('🎉 FOUND IT! This variation works:', variation);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  }
  
  console.log('\n🏁 Debug completed');
}

debugDatabase().catch(console.error);
