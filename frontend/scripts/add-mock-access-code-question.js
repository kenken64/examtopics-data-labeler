// Script to directly mock the 5th question in access-code-questions collection
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/";

async function addMockAccessCodeQuestion(certificateId, accessCode, questionNo = 5) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("awscert");
    
    console.log('=== Adding Mock Access Code Question ===');
    console.log(`Certificate ID: ${certificateId}`);
    console.log(`Access Code: ${accessCode}`);
    console.log(`Mock Question Number: ${questionNo}\n`);

    // Get certificate info
    const certInfo = await db.collection('certificates').findOne({
      _id: new ObjectId(certificateId)
    });

    console.log(`Certificate: ${certInfo?.name || 'Unknown'}`);

    // Get payee info for the access code
    const payee = await db.collection('payees').findOne({
      certificateId: new ObjectId(certificateId),
      generatedAccessCode: accessCode,
      status: 'paid'
    });

    if (!payee) {
      console.error(`Payee with access code ${accessCode} not found for certificate ${certificateId}`);
      return;
    }

    console.log(`Payee ID: ${payee._id}`);

    // Check current access-code-questions for this access code
    const existingAssignments = await db.collection('access-code-questions').find({
      generatedAccessCode: accessCode
    }).sort({ originalQuestionNo: 1 }).toArray();

    console.log(`Current assignments: ${existingAssignments.length}`);
    
    const existingQuestionNos = existingAssignments.map(a => a.originalQuestionNo);
    console.log(`Existing question numbers: [${existingQuestionNos.join(', ')}]`);

    // Check if mock question already exists
    const existingMockQuestion = existingAssignments.find(a => a.originalQuestionNo === questionNo);
    if (existingMockQuestion) {
      console.log(`❌ Mock question ${questionNo} already exists for access code ${accessCode}`);
      return;
    }

    // Get proper ordering values
    const maxSortResult = await db.collection('access-code-questions').aggregate([
      { $match: { generatedAccessCode: accessCode } },
      { $group: { _id: null, maxSort: { $max: '$sortOrder' } } }
    ]).toArray();

    const maxAssignedResult = await db.collection('access-code-questions').aggregate([
      { $match: { generatedAccessCode: accessCode } },
      { $group: { _id: null, maxAssigned: { $max: '$assignedQuestionNo' } } }
    ]).toArray();

    const nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;
    const nextAssignedQuestionNo = (maxAssignedResult[0]?.maxAssigned || 0) + 1;

    // Create a mock ObjectId for the non-existent question
    const mockQuestionId = new ObjectId();

    // Create the mock assignment
    const mockAssignment = {
      generatedAccessCode: accessCode,
      payeeId: payee._id,
      certificateId: new ObjectId(certificateId),
      questionId: mockQuestionId,
      originalQuestionNo: questionNo,
      assignedQuestionNo: nextAssignedQuestionNo,
      isEnabled: true,
      assignedAt: new Date(),
      updatedAt: new Date(),
      sortOrder: nextSortOrder,
      // Add a flag to identify this as a mock record
      _isMockRecord: true,
      _mockNote: `Mock question ${questionNo} for testing integrity system`
    };

    // Insert the mock assignment
    const result = await db.collection('access-code-questions').insertOne(mockAssignment);
    
    console.log(`✅ Mock assignment created with ID: ${result.insertedId}`);
    console.log(`   Question ID: ${mockQuestionId} (MOCK - does not exist in quizzes collection)`);
    console.log(`   Original Question No: ${questionNo}`);
    console.log(`   Assigned Question No: ${nextAssignedQuestionNo}`);
    console.log(`   Sort Order: ${nextSortOrder}`);

    // Show updated state
    const updatedAssignments = await db.collection('access-code-questions').find({
      generatedAccessCode: accessCode
    }).sort({ originalQuestionNo: 1 }).toArray();

    console.log(`\nUpdated assignments: ${updatedAssignments.length}`);
    const updatedQuestionNos = updatedAssignments.map(a => a.originalQuestionNo);
    console.log(`Question numbers: [${updatedQuestionNos.join(', ')}]`);

    console.log('\n=== Testing Instructions ===');
    console.log('This creates a scenario where the access-code-questions collection has a record');
    console.log('for a question that does NOT exist in the quizzes collection.');
    console.log('');
    console.log('To test the integrity system:');
    console.log(`1. Check current state: node scripts/test-access-code-questions-integrity.js ${certificateId}`);
    console.log(`2. Run integrity fix: node scripts/test-fix-access-code-questions.js fix ${certificateId}`);
    console.log(`3. Clean up: node scripts/add-mock-access-code-question.js ${certificateId} ${accessCode} cleanup`);

    return {
      assignmentId: result.insertedId,
      mockQuestionId,
      accessCode,
      questionNo,
      success: true
    };

  } catch (error) {
    console.error('Error adding mock access code question:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function cleanupMockAssignments(certificateId, accessCode = null) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("awscert");
    
    console.log('=== Cleaning Up Mock Assignments ===');

    let filter = { _isMockRecord: true };
    if (certificateId) {
      filter.certificateId = new ObjectId(certificateId);
    }
    if (accessCode) {
      filter.generatedAccessCode = accessCode;
    }

    const mockAssignments = await db.collection('access-code-questions').find(filter).toArray();
    console.log(`Found ${mockAssignments.length} mock assignments to clean up`);

    for (const assignment of mockAssignments) {
      console.log(`Deleting mock assignment: ${assignment.generatedAccessCode} -> Question ${assignment.originalQuestionNo}`);
    }

    const deleteResult = await db.collection('access-code-questions').deleteMany(filter);
    console.log(`✅ Deleted ${deleteResult.deletedCount} mock assignments`);

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function listAccessCodes(certificateId) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("awscert");
    
    console.log('=== Available Access Codes ===');

    const payees = await db.collection('payees').find({
      certificateId: new ObjectId(certificateId),
      status: 'paid',
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Certificate ID: ${certificateId}`);
    console.log(`Access codes found: ${payees.length}\n`);

    for (const payee of payees) {
      const assignments = await db.collection('access-code-questions').find({
        generatedAccessCode: payee.generatedAccessCode
      }).toArray();

      console.log(`Access Code: ${payee.generatedAccessCode}`);
      console.log(`  Payee ID: ${payee._id}`);
      console.log(`  Current assignments: ${assignments.length}`);
      
      const questionNos = assignments.map(a => a.originalQuestionNo).sort((a, b) => a - b);
      console.log(`  Question numbers: [${questionNos.join(', ')}]`);
      
      const hasMockRecords = assignments.some(a => a._isMockRecord);
      if (hasMockRecords) {
        console.log(`  ⚠️  Contains mock records`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error listing access codes:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const certificateId = args[0];
  const accessCode = args[1];
  const action = args[2];

  if (!certificateId) {
    console.log('Usage:');
    console.log('  node add-mock-access-code-question.js <certificateId> list');
    console.log('  node add-mock-access-code-question.js <certificateId> <accessCode> [questionNo]');
    console.log('  node add-mock-access-code-question.js <certificateId> <accessCode> cleanup');
    console.log('  node add-mock-access-code-question.js <certificateId> cleanup');
    console.log('');
    console.log('Examples:');
    console.log('  node add-mock-access-code-question.js 507f1f77bcf86cd799439011 list');
    console.log('  node add-mock-access-code-question.js 507f1f77bcf86cd799439011 ABC123 5');
    console.log('  node add-mock-access-code-question.js 507f1f77bcf86cd799439011 ABC123 cleanup');
    console.log('  node add-mock-access-code-question.js 507f1f77bcf86cd799439011 cleanup');
    return;
  }

  try {
    if (accessCode === 'list') {
      await listAccessCodes(certificateId);
    } else if (action === 'cleanup') {
      await cleanupMockAssignments(certificateId, accessCode);
    } else if (certificateId && accessCode === 'cleanup') {
      await cleanupMockAssignments(certificateId);
    } else if (certificateId && accessCode) {
      const questionNo = parseInt(action) || 5;
      await addMockAccessCodeQuestion(certificateId, accessCode, questionNo);
    } else {
      console.log('Invalid arguments. Use --help for usage information.');
    }
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { addMockAccessCodeQuestion, cleanupMockAssignments, listAccessCodes };
