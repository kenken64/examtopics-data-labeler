// Simple test to call the actual dashboard API
const fetch = require('node-fetch');

async function testLiveDashboardAPI() {
  try {
    console.log('Testing dashboard API at http://localhost:3001/api/dashboard...\n');
    
    const response = await fetch('http://localhost:3001/api/dashboard');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('=== LIVE DASHBOARD API RESPONSE ===\n');
    
    console.log('Certificates:');
    let totalQuestions = 0;
    data.certificates.forEach(cert => {
      totalQuestions += cert.questionCount;
      console.log(`   - ${cert.name} (${cert.code}): ${cert.questionCount} questions`);
    });
    
    console.log(`\nTOTAL QUESTIONS: ${totalQuestions}`);
    console.log('\nOther stats:');
    console.log(`   - Total Access Codes: ${data.accessCodes.totalAccessCodes}`);
    console.log(`   - Total Assignments: ${data.accessCodes.totalAssignments}`);
    console.log(`   - Total Quiz Attempts: ${data.quizAttempts.totalAttempts}`);
    console.log(`   - Unique Users: ${data.quizAttempts.uniqueUsers}`);
    
    console.log('\nPayee Status:');
    data.payees.forEach(payee => {
      console.log(`   - ${payee.paymentStatus}: ${payee.count}`);
    });
    
  } catch (error) {
    console.error('Error testing dashboard API:', error.message);
    console.log('Make sure the Next.js dev server is running on localhost:3001');
  }
}

testLiveDashboardAPI();
