// Test the complete QuizBlitz flow to verify question count display
async function testCompleteQuizBlitzFlow() {
  console.log('🔄 Testing Complete QuizBlitz Flow');
  console.log('=================================\n');
  
  const baseUrl = 'http://localhost:3000';
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZiOWRmYTVkZWQzMGUwZWEwMDE1NWUiLCJ1c2VybmFtZSI6ImJ1bm55cHBsQGdtYWlsLmNvbSIsImlhdCI6MTc1MjUzMDAxMCwiZXhwIjoxNzUyNTMzNjEwfQ.2OrKVL3T5UAGY92w1_KOCSMPpWvfA04WA3MWg4wDzFs';
  
  console.log('📋 Step 1: Verify access code (what happens when you click Continue)');
  
  try {
    const verifyResponse = await fetch(`${baseUrl}/api/access-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ accessCode: 'AC-F2NOKPMQ' })
    });
    
    const verifyData = await verifyResponse.json();
    console.log('📋 Verification response:', verifyData);
    
    if (verifyResponse.status === 200) {
      console.log('✅ Access code verification successful!');
      
      // Simulate what the frontend does
      const accessCode = 'AC-F2NOKPMQ';
      const timerDuration = 30;
      const questionCount = verifyData.questionCount;
      
      console.log('\n🧭 Step 2: Navigation URL that frontend would generate:');
      const navigationUrl = `/quizblitz/host?accessCode=${accessCode}&timer=${timerDuration}&questions=${questionCount}`;
      console.log(`   ${baseUrl}${navigationUrl}`);
      
      console.log('\n📊 Step 3: What the host page should display:');
      console.log(`   Access Code: ${accessCode}`);
      console.log(`   Timer per Question: ${timerDuration}s`);
      console.log(`   Total Questions: ${questionCount}`);
      
      console.log('\n💡 If you\'re still seeing 0 questions:');
      console.log('1. Clear browser cache and refresh the page');
      console.log('2. Try the access code verification again');
      console.log('3. Check browser dev tools for any JavaScript errors');
      console.log('4. Verify the URL contains the questions parameter');
      
    } else {
      console.log('❌ Access code verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error during flow test:', error.message);
  }
  
  console.log('\n🏁 Complete flow test finished');
}

testCompleteQuizBlitzFlow().catch(console.error);
