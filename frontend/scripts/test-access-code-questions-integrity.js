// Test script for validating access-code-questions integrity
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/";

async function testAccessCodeQuestionsIntegrity() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("awscert");
    
    console.log('=== Access Code Questions Integrity Test ===\n');

    // Get all certificates with questions
    const certificates = await db.collection('quizzes').aggregate([
      { $group: { _id: "$certificateId" } },
      { $lookup: {
          from: "certificates",
          localField: "_id",
          foreignField: "_id",
          as: "certInfo"
      }},
      { $project: { 
          certificateId: "$_id",
          certName: { $arrayElemAt: ["$certInfo.name", 0] }
      }}
    ]).toArray();

    console.log(`Found ${certificates.length} certificates with questions\n`);

    let totalIssues = 0;
    const detailedResults = [];

    for (const cert of certificates) {
      const certId = cert.certificateId;
      const certName = cert.certName || 'Unknown Certificate';

      console.log(`Checking certificate: ${certName} (${certId})`);

      // Get all questions for this certificate
      const questions = await db.collection('quizzes').find({
        certificateId: certId
      }).sort({ question_no: 1 }).toArray();

      // Get all access codes for this certificate
      const payees = await db.collection('payees').find({
        certificateId: new ObjectId(certId),
        status: 'paid',
        generatedAccessCode: { $exists: true, $ne: null }
      }).toArray();

      console.log(`  Questions: ${questions.length}, Access Codes: ${payees.length}`);

      if (questions.length === 0 || payees.length === 0) {
        console.log(`  No issues to check (no questions or access codes)\n`);
        continue;
      }

      const questionIds = new Set(questions.map(q => q._id.toString()));
      let certificateIssues = 0;
      const accessCodeResults = [];

      for (const payee of payees) {
        const accessCode = payee.generatedAccessCode;

        // Get existing assignments for this access code
        const assignments = await db.collection('access-code-questions').find({
          generatedAccessCode: accessCode
        }).toArray();

        const assignedQuestionIds = new Set(assignments.map(a => a.questionId.toString()));

        // Find missing questions
        const missingQuestions = questions.filter(q => !assignedQuestionIds.has(q._id.toString()));
        
        // Find extra assignments (assignments for questions that don't exist)
        const extraAssignments = assignments.filter(a => !questionIds.has(a.questionId.toString()));

        const hasIssues = missingQuestions.length > 0 || extraAssignments.length > 0;
        
        if (hasIssues) {
          certificateIssues++;
          totalIssues++;
          
          console.log(`    ❌ Access Code: ${accessCode}`);
          console.log(`       Expected: ${questions.length}, Actual: ${assignments.length}`);
          
          if (missingQuestions.length > 0) {
            console.log(`       Missing questions: ${missingQuestions.map(q => q.question_no).join(', ')}`);
          }
          
          if (extraAssignments.length > 0) {
            console.log(`       Extra assignments: ${extraAssignments.length}`);
          }
        } else {
          console.log(`    ✅ Access Code: ${accessCode} (${assignments.length}/${questions.length})`);
        }

        accessCodeResults.push({
          accessCode,
          expected: questions.length,
          actual: assignments.length,
          missing: missingQuestions.length,
          extra: extraAssignments.length,
          isComplete: !hasIssues
        });
      }

      detailedResults.push({
        certificateId: certId,
        certificateName: certName,
        questionCount: questions.length,
        accessCodeCount: payees.length,
        issueCount: certificateIssues,
        accessCodeResults
      });

      if (certificateIssues === 0) {
        console.log(`  ✅ All access codes have complete question sets`);
      } else {
        console.log(`  ❌ Found ${certificateIssues} access codes with issues`);
      }
      
      console.log('');
    }

    console.log('\n=== Summary ===');
    console.log(`Total certificates checked: ${certificates.length}`);
    console.log(`Total access codes with issues: ${totalIssues}`);
    
    if (totalIssues === 0) {
      console.log('✅ All access codes have complete question sets!');
    } else {
      console.log('❌ Issues found that need to be fixed');
      console.log('\nTo fix these issues, call the fix API endpoint:');
      console.log('POST /api/fix-access-code-questions with { "fixAll": true }');
    }

    return {
      totalCertificates: certificates.length,
      totalIssues,
      detailedResults,
      needsFix: totalIssues > 0
    };

  } catch (error) {
    console.error('Error testing access code questions integrity:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Test individual certificate
async function testSpecificCertificate(certificateId) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("awscert");
    
    console.log(`=== Testing certificate: ${certificateId} ===\n`);

    // Get certificate info
    const certInfo = await db.collection('certificates').findOne({
      _id: new ObjectId(certificateId)
    });

    console.log(`Certificate: ${certInfo?.name || 'Unknown'}`);

    // Get questions
    const questions = await db.collection('quizzes').find({
      certificateId: certificateId
    }).sort({ question_no: 1 }).toArray();

    console.log(`Questions found: ${questions.length}`);

    if (questions.length === 0) {
      console.log('No questions found for this certificate');
      return;
    }

    // Get access codes
    const payees = await db.collection('payees').find({
      certificateId: new ObjectId(certificateId),
      status: 'paid',
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Access codes found: ${payees.length}\n`);

    if (payees.length === 0) {
      console.log('No access codes found for this certificate');
      return;
    }

    // Check each access code
    for (const payee of payees) {
      const assignments = await db.collection('access-code-questions').find({
        generatedAccessCode: payee.generatedAccessCode
      }).toArray();

      console.log(`Access Code: ${payee.generatedAccessCode}`);
      console.log(`  Expected records: ${questions.length}`);
      console.log(`  Actual records: ${assignments.length}`);
      
      if (assignments.length === questions.length) {
        console.log(`  ✅ Complete`);
      } else {
        console.log(`  ❌ Incomplete (missing ${questions.length - assignments.length} records)`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error testing specific certificate:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the test
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] !== '--all') {
    // Test specific certificate
    const certificateId = args[0];
    testSpecificCertificate(certificateId)
      .then(() => console.log('Test completed'))
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  } else {
    // Test all certificates
    testAccessCodeQuestionsIntegrity()
      .then(result => {
        console.log('Test completed');
        if (result.needsFix) {
          process.exit(1); // Exit with error code if issues found
        }
      })
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { testAccessCodeQuestionsIntegrity, testSpecificCertificate };
