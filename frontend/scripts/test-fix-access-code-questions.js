// Script to test the fix-access-code-questions API endpoints
const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Mock auth token for testing (replace with actual token)
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token';

async function checkAccessCodeQuestionsStatus(certificateId = null) {
  try {
    let url = `${BASE_URL}/api/fix-access-code-questions`;
    if (certificateId) {
      url += `?certificateId=${certificateId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error checking status:', result);
      return null;
    }

    console.log('=== Access Code Questions Status ===');
    console.log(`Total certificates checked: ${result.totalCertificatesChecked}`);
    console.log(`Total missing records: ${result.totalMissingRecords}`);
    console.log(`Needs fix: ${result.needsFix ? 'YES' : 'NO'}\n`);

    if (result.results.length > 0) {
      result.results.forEach(cert => {
        console.log(`Certificate: ${cert.certificateId}`);
        console.log(`  Questions: ${cert.questionCount}, Access Codes: ${cert.accessCodeCount}`);
        console.log(`  Missing records: ${cert.totalMissingRecords}`);
        
        if (cert.accessCodeDetails.length > 0) {
          cert.accessCodeDetails.forEach(detail => {
            const status = detail.isComplete ? '✅' : '❌';
            console.log(`    ${status} ${detail.accessCode}: ${detail.existingRecords}/${detail.expectedRecords} records`);
          });
        }
        console.log('');
      });
    }

    return result;

  } catch (error) {
    console.error('Error checking access code questions status:', error);
    return null;
  }
}

async function fixAccessCodeQuestions(certificateId = null, fixAll = false) {
  try {
    const response = await fetch(`${BASE_URL}/api/fix-access-code-questions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        certificateId,
        fixAll
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error fixing access code questions:', result);
      return null;
    }

    console.log('=== Fix Access Code Questions Results ===');
    console.log(`Total certificates processed: ${result.totalCertificatesProcessed}`);
    console.log(`Total records created: ${result.totalRecordsCreated}\n`);

    if (result.results.length > 0) {
      result.results.forEach(cert => {
        console.log(`Certificate: ${cert.certificateId}`);
        console.log(`  Questions: ${cert.questionsFound}, Access Codes: ${cert.accessCodesFound}`);
        console.log(`  Records created: ${cert.recordsCreated}`);
        console.log(`  Status: ${cert.message}`);
        
        if (cert.accessCodeDetails && cert.accessCodeDetails.length > 0) {
          cert.accessCodeDetails.forEach(detail => {
            if (detail.recordsCreated > 0) {
              console.log(`    ${detail.accessCode}: Created ${detail.recordsCreated} missing records`);
            }
          });
        }
        console.log('');
      });
    }

    return result;

  } catch (error) {
    console.error('Error fixing access code questions:', error);
    return null;
  }
}

async function testSaveQuizIntegration(certificateId) {
  try {
    console.log('=== Testing Save Quiz Integration ===');
    console.log(`Testing with certificate: ${certificateId}\n`);

    // First, check current status
    console.log('1. Checking current status...');
    const statusBefore = await checkAccessCodeQuestionsStatus(certificateId);
    
    if (!statusBefore) {
      console.error('Failed to get initial status');
      return;
    }

    // Create a test quiz question
    const testQuiz = {
      certificateId: certificateId,
      question: "This is a test question created by the integrity test script",
      explanation: "This is a test explanation",
      options: [
        { id: 'A', text: 'Test option A', isCorrect: true },
        { id: 'B', text: 'Test option B', isCorrect: false },
        { id: 'C', text: 'Test option C', isCorrect: false },
        { id: 'D', text: 'Test option D', isCorrect: false }
      ],
      questionType: 'multiple-choice',
      tags: ['test', 'integrity-check']
    };

    console.log('2. Saving new test question...');
    const saveResponse = await fetch(`${BASE_URL}/api/save-quiz`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testQuiz)
    });

    const saveResult = await saveResponse.json();
    
    if (!saveResponse.ok) {
      console.error('Failed to save test quiz:', saveResult);
      return;
    }

    console.log(`✅ Test question saved with ID: ${saveResult.id}`);
    console.log(`   Question number: ${saveResult.questionNo}\n`);

    // Wait a moment for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check status after saving
    console.log('3. Checking status after saving...');
    const statusAfter = await checkAccessCodeQuestionsStatus(certificateId);
    
    if (!statusAfter) {
      console.error('Failed to get status after saving');
      return;
    }

    // Compare results
    const beforeMissing = statusBefore.results.find(r => r.certificateId === certificateId)?.totalMissingRecords || 0;
    const afterMissing = statusAfter.results.find(r => r.certificateId === certificateId)?.totalMissingRecords || 0;

    console.log('4. Integration test results:');
    console.log(`   Missing records before: ${beforeMissing}`);
    console.log(`   Missing records after: ${afterMissing}`);
    
    if (afterMissing === 0) {
      console.log('   ✅ Integration working correctly - all access codes have complete question sets');
    } else {
      console.log('   ❌ Integration issue - some access codes still missing records');
    }

    return {
      testQuizId: saveResult.id,
      beforeMissing,
      afterMissing,
      success: afterMissing === 0
    };

  } catch (error) {
    console.error('Error testing save quiz integration:', error);
    return null;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'check':
      const certificateId = args[1];
      await checkAccessCodeQuestionsStatus(certificateId);
      break;

    case 'fix':
      const certId = args[1];
      if (certId) {
        await fixAccessCodeQuestions(certId);
      } else {
        await fixAccessCodeQuestions(null, true);
      }
      break;

    case 'test':
      const testCertId = args[1];
      if (!testCertId) {
        console.error('Please provide a certificate ID for testing');
        process.exit(1);
      }
      await testSaveQuizIntegration(testCertId);
      break;

    default:
      console.log('Usage:');
      console.log('  node test-fix-access-code-questions.js check [certificateId]     - Check status');
      console.log('  node test-fix-access-code-questions.js fix [certificateId]       - Fix issues (no ID = fix all)');
      console.log('  node test-fix-access-code-questions.js test <certificateId>      - Test integration');
      console.log('');
      console.log('Environment variables:');
      console.log('  BASE_URL - API base URL (default: http://localhost:3000)');
      console.log('  TEST_AUTH_TOKEN - Auth token for API calls');
      break;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  checkAccessCodeQuestionsStatus,
  fixAccessCodeQuestions,
  testSaveQuizIntegration
};
