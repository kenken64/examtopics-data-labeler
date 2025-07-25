// Debug the exact database query to see why AC-F2NOKPMQ is not found
async function debugExactQuery() {
  console.log('🔍 Debugging Exact Database Query for AC-F2NOKPMQ');
  console.log('================================================\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUzMDAxMCwiZXhwIjoxNzUyNTMzNjEwfQ.2OrKVL3T5UAGY92w1_KOCSMPpWvfA04WA3MWg4wDzFs';
  
  // Create a debug endpoint to test the exact query used in the API
  console.log('🧪 Testing API with detailed logging...');
  
  try {
    const response = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ accessCode: 'AC-F2NOKPMQ' })
    });
    
    const data = await response.json();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(data, null, 2));
    
    console.log('\n🔍 The API is using this query:');
    console.log('   db.collection("payee").findOne({ generatedAccessCode: "AC-F2NOKPMQ" })');
    console.log('\n🔍 Your record shows:');
    console.log('   generatedAccessCode: "AC-F2NOKPMQ"');
    console.log('\n❓ These should match exactly...');
    
    // Let's also check if there are any hidden characters or encoding issues
    const testCode = 'AC-F2NOKPMQ';
    console.log('\n🔍 Character analysis:');
    console.log('   Length:', testCode.length);
    console.log('   Char codes:', testCode.split('').map(c => c.charCodeAt(0)));
    console.log('   Upper case:', testCode.toUpperCase());
    
    // Test with various formats
    const testFormats = [
      'AC-F2NOKPMQ',      // exact
      'ac-f2nokpmq',      // lowercase  
      'AC-F2NOKPMQ',      // with possible hidden chars
      testCode.trim()     // trimmed
    ];
    
    for (const format of testFormats) {
      console.log(`\n🧪 Testing format: "${format}" (length: ${format.length})`);
      
      const testResponse = await fetch(`${baseUrl}/api/access-codes/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ accessCode: format })
      });
      
      console.log(`   Result: ${testResponse.status}`);
      
      if (testResponse.status === 200) {
        const successData = await testResponse.json();
        console.log('🎉 SUCCESS! Found it with this format:', format);
        console.log('   Data:', JSON.stringify(successData, null, 2));
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  }
  
  console.log('\n🏁 Debug completed');
}

debugExactQuery().catch(console.error);
