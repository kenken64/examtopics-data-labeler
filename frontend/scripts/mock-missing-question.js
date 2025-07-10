// Script to mock a missing question scenario for testing access code questions integrity
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/";

async function mockMissingQuestionScenario(certificateId, createMissingQuestion = true) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("awscert");
    
    console.log('=== Mock Missing Question Scenario ===\n');
    console.log(`Certificate ID: ${certificateId}`);
    console.log(`Create missing question: ${createMissingQuestion}\n`);

    // Get certificate info
    const certInfo = await db.collection('certificates').findOne({
      _id: new ObjectId(certificateId)
    });

    if (!certInfo) {
      console.error('Certificate not found!');
      return;
    }

    console.log(`Certificate: ${certInfo.name}`);

    // Get existing questions for this certificate
    const existingQuestions = await db.collection('quizzes').find({
      certificateId: certificateId
    }).sort({ question_no: 1 }).toArray();

    console.log(`Existing questions: ${existingQuestions.length}`);

    // Get access codes for this certificate
    const payees = await db.collection('payees').find({
      certificateId: new ObjectId(certificateId),
      status: 'paid',
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Access codes found: ${payees.length}\n`);

    if (payees.length === 0) {
      console.log('No access codes found for this certificate. Cannot create mock scenario.');
      return;
    }

    let mockQuestionId;
    let nextQuestionNo;

    if (createMissingQuestion) {
      // Create a mock 5th question (or next question)
      nextQuestionNo = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.question_no)) + 1 
        : 1;

      const mockQuestion = {
        certificateId: certificateId,
        question: `Mock Question ${nextQuestionNo} - Testing Access Code Integrity`,
        explanation: "This is a mock question created for testing the access code questions integrity system.",
        options: [
          { id: 'A', text: 'Mock Option A', isCorrect: true },
          { id: 'B', text: 'Mock Option B', isCorrect: false },
          { id: 'C', text: 'Mock Option C', isCorrect: false },
          { id: 'D', text: 'Mock Option D', isCorrect: false }
        ],
        questionType: 'multiple-choice',
        tags: ['mock', 'integrity-test'],
        question_no: nextQuestionNo,
        createdAt: new Date()
      };

      const questionResult = await db.collection('quizzes').insertOne(mockQuestion);
      mockQuestionId = questionResult.insertedId;
      
      console.log(`✅ Created mock question ${nextQuestionNo} with ID: ${mockQuestionId}`);
    }

    // Show current state of access-code-questions
    console.log('\n=== Current Access Code Questions State ===');
    
    for (const payee of payees) {
      const assignments = await db.collection('access-code-questions').find({
        generatedAccessCode: payee.generatedAccessCode
      }).sort({ originalQuestionNo: 1 }).toArray();

      console.log(`\nAccess Code: ${payee.generatedAccessCode}`);
      console.log(`  Current assignments: ${assignments.length}`);
      console.log(`  Expected assignments: ${existingQuestions.length + (createMissingQuestion ? 1 : 0)}`);
      
      const assignedQuestionNos = assignments.map(a => a.originalQuestionNo).sort((a, b) => a - b);
      console.log(`  Assigned questions: [${assignedQuestionNos.join(', ')}]`);

      // Check if the new mock question is missing
      if (createMissingQuestion) {
        const hasMockQuestion = assignments.some(a => a.questionId.toString() === mockQuestionId.toString());
        if (!hasMockQuestion) {
          console.log(`  ❌ Missing mock question ${nextQuestionNo} - INTEGRITY ISSUE DETECTED!`);
        } else {
          console.log(`  ✅ Mock question ${nextQuestionNo} is properly linked`);
        }
      }
    }

    // Now deliberately create an incomplete scenario by adding the question to only SOME access codes
    if (createMissingQuestion) {
      console.log('\n=== Creating Incomplete Scenario ===');
      
      // Add the mock question to only the first access code (to simulate the issue)
      const firstPayee = payees[0];
      
      // Get proper ordering values for the first access code
      const maxSortResult = await db.collection('access-code-questions').aggregate([
        { $match: { generatedAccessCode: firstPayee.generatedAccessCode } },
        { $group: { _id: null, maxSort: { $max: '$sortOrder' } } }
      ]).toArray();

      const maxAssignedResult = await db.collection('access-code-questions').aggregate([
        { $match: { generatedAccessCode: firstPayee.generatedAccessCode } },
        { $group: { _id: null, maxAssigned: { $max: '$assignedQuestionNo' } } }
      ]).toArray();

      const nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;
      const nextAssignedQuestionNo = (maxAssignedResult[0]?.maxAssigned || 0) + 1;

      const mockAssignment = {
        generatedAccessCode: firstPayee.generatedAccessCode,
        payeeId: firstPayee._id,
        certificateId: new ObjectId(certificateId),
        questionId: mockQuestionId,
        originalQuestionNo: nextQuestionNo,
        assignedQuestionNo: nextAssignedQuestionNo,
        isEnabled: true,
        assignedAt: new Date(),
        updatedAt: new Date(),
        sortOrder: nextSortOrder
      };

      await db.collection('access-code-questions').insertOne(mockAssignment);
      
      console.log(`✅ Added mock question to first access code: ${firstPayee.generatedAccessCode}`);
      console.log(`❌ Other access codes (${payees.length - 1}) are missing this question - INTEGRITY ISSUE CREATED!`);
    }

    console.log('\n=== Final State Summary ===');
    
    for (const payee of payees) {
      const assignments = await db.collection('access-code-questions').find({
        generatedAccessCode: payee.generatedAccessCode
      }).toArray();

      const totalQuestions = existingQuestions.length + (createMissingQuestion ? 1 : 0);
      const isComplete = assignments.length === totalQuestions;
      const status = isComplete ? '✅' : '❌';
      
      console.log(`${status} Access Code ${payee.generatedAccessCode}: ${assignments.length}/${totalQuestions} questions`);
    }

    if (createMissingQuestion) {
      console.log('\n=== Test Instructions ===');
      console.log('1. Run integrity check script to see the issue:');
      console.log(`   node scripts/test-access-code-questions-integrity.js ${certificateId}`);
      console.log('');
      console.log('2. Test the fix API:');
      console.log(`   node scripts/test-fix-access-code-questions.js fix ${certificateId}`);
      console.log('');
      console.log('3. Or test by saving another question via the exam labeler');
      console.log('   (it should automatically fix the missing links)');
      console.log('');
      console.log('4. Clean up by deleting the mock question:');
      console.log(`   node scripts/mock-missing-question.js ${certificateId} cleanup`);
    }

    return {
      certificateId,
      certificateName: certInfo.name,
      mockQuestionId: createMissingQuestion ? mockQuestionId : null,
      mockQuestionNo: createMissingQuestion ? nextQuestionNo : null,
      totalAccessCodes: payees.length,
      integritiesIssueCreated: createMissingQuestion
    };

  } catch (error) {
    console.error('Error creating mock scenario:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function cleanupMockQuestion(certificateId) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("awscert");
    
    console.log('=== Cleaning Up Mock Questions ===\n');

    // Find mock questions (by tags or pattern)
    const mockQuestions = await db.collection('quizzes').find({
      certificateId: certificateId,
      $or: [
        { tags: { $in: ['mock', 'integrity-test'] } },
        { question: { $regex: /Mock Question.*Testing Access Code Integrity/ } }
      ]
    }).toArray();

    console.log(`Found ${mockQuestions.length} mock questions to clean up`);

    for (const mockQ of mockQuestions) {
      console.log(`Deleting mock question ${mockQ.question_no}: ${mockQ.question}`);
      
      // Delete from quizzes collection
      await db.collection('quizzes').deleteOne({ _id: mockQ._id });
      
      // Delete related access-code-questions
      const deleteResult = await db.collection('access-code-questions').deleteMany({
        questionId: mockQ._id
      });
      
      console.log(`  Deleted ${deleteResult.deletedCount} access-code-questions records`);
    }

    console.log('\n✅ Cleanup completed');

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const certificateId = args[0];
  const action = args[1];

  if (!certificateId) {
    console.log('Usage:');
    console.log('  node mock-missing-question.js <certificateId>           - Create mock missing question scenario');
    console.log('  node mock-missing-question.js <certificateId> cleanup  - Clean up mock questions');
    console.log('');
    console.log('Examples:');
    console.log('  node mock-missing-question.js 507f1f77bcf86cd799439011');
    console.log('  node mock-missing-question.js 507f1f77bcf86cd799439011 cleanup');
    return;
  }

  try {
    if (action === 'cleanup') {
      await cleanupMockQuestion(certificateId);
    } else {
      await mockMissingQuestionScenario(certificateId, true);
    }
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { mockMissingQuestionScenario, cleanupMockQuestion };
