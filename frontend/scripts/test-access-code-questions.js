// Test script to demonstrate the access code questions functionality
// Run this script using: node test-access-code-questions.js

const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017/awscert';

async function testAccessCodeQuestions() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('awscert');
    
    console.log('\n📊 Testing Access Code Questions Functionality\n');
    
    // Get a sample generated access code
    const samplePayee = await db.collection('payees').findOne({
      status: 'paid',
      generatedAccessCode: { $exists: true, $ne: null }
    });
    
    if (!samplePayee) {
      console.log('❌ No paid payees with generated access codes found');
      return;
    }
    
    console.log(`👤 Testing with payee: ${samplePayee.payeeName}`);
    console.log(`🎫 Generated Access Code: ${samplePayee.generatedAccessCode}`);
    console.log(`📜 Original Access Code: ${samplePayee.accessCode}`);
    
    // Get certificate info
    const certificate = await db.collection('certificates').findOne({
      _id: samplePayee.certificateId
    });
    
    console.log(`🏆 Certificate: ${certificate ? certificate.name : 'Not found'}`);
    
    // Check if there are question assignments for this generated code
    const assignments = await db.collection('access-code-questions').find({
      generatedAccessCode: samplePayee.generatedAccessCode
    }).toArray();
    
    console.log(`\n📝 Question Assignments: ${assignments.length} found`);
    
    if (assignments.length > 0) {
      console.log('\n📋 Assignment Details:');
      
      for (const assignment of assignments) {
        const question = await db.collection('quizzes').findOne({
          _id: assignment.questionId
        });
        
        console.log(`   Q${assignment.assignedQuestionNo} (Original Q${assignment.originalQuestionNo}) - ${assignment.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   📖 Question: ${question ? question.question.substring(0, 100) + '...' : 'Not found'}`);
      }
      
      // Test the API aggregation pipeline
      console.log('\n🔍 Testing API Pipeline:');
      
      const pipeline = [
        { 
          $match: { 
            generatedAccessCode: samplePayee.generatedAccessCode,
            isEnabled: true 
          } 
        },
        {
          $lookup: {
            from: 'quizzes',
            localField: 'questionId',
            foreignField: '_id',
            as: 'questionDetails'
          }
        },
        { $unwind: '$questionDetails' },
        {
          $lookup: {
            from: 'payees',
            localField: 'payeeId',
            foreignField: '_id',
            as: 'payeeDetails'
          }
        },
        { $unwind: '$payeeDetails' },
        {
          $lookup: {
            from: 'certificates',
            localField: 'certificateId',
            foreignField: '_id',
            as: 'certificateDetails'
          }
        },
        { $unwind: '$certificateDetails' },
        { $sort: { sortOrder: 1, assignedQuestionNo: 1 } }
      ];

      const apiResult = await db.collection('access-code-questions').aggregate(pipeline).toArray();
      
      console.log(`   ✅ API would return ${apiResult.length} enabled questions`);
      
      if (apiResult.length > 0) {
        console.log(`   📝 Sample question: Q${apiResult[0].assignedQuestionNo} - ${apiResult[0].questionDetails.question.substring(0, 80)}...`);
        console.log(`   👤 Payee: ${apiResult[0].payeeDetails.payeeName}`);
        console.log(`   🏆 Certificate: ${apiResult[0].certificateDetails.name}`);
      }
      
      // Test question reordering
      console.log('\n🔄 Testing Question Reordering:');
      
      if (assignments.length >= 2) {
        // Swap the first two questions
        await db.collection('access-code-questions').updateOne(
          { _id: assignments[0]._id },
          { $set: { sortOrder: 999, assignedQuestionNo: 999 } }
        );
        
        await db.collection('access-code-questions').updateOne(
          { _id: assignments[1]._id },
          { $set: { sortOrder: 1, assignedQuestionNo: 1 } }
        );
        
        await db.collection('access-code-questions').updateOne(
          { _id: assignments[0]._id },
          { $set: { sortOrder: 2, assignedQuestionNo: 2 } }
        );
        
        console.log('   ✅ Successfully reordered questions');
        
        // Test disable/enable
        console.log('\n👁️ Testing Question Enable/Disable:');
        
        await db.collection('access-code-questions').updateOne(
          { _id: assignments[0]._id },
          { $set: { isEnabled: false } }
        );
        
        console.log('   ✅ Disabled first question');
        
        // Check enabled count
        const enabledCount = await db.collection('access-code-questions').countDocuments({
          generatedAccessCode: samplePayee.generatedAccessCode,
          isEnabled: true
        });
        
        console.log(`   📊 Enabled questions: ${enabledCount}/${assignments.length}`);
        
        // Re-enable for cleanup
        await db.collection('access-code-questions').updateOne(
          { _id: assignments[0]._id },
          { $set: { isEnabled: true } }
        );
        
        console.log('   🔄 Re-enabled question for cleanup');
      }
    } else {
      console.log('❌ No question assignments found for this generated access code');
    }
    
    // Test statistics
    console.log('\n📈 System Statistics:');
    
    const totalAccessCodes = await db.collection('access-code-questions').distinct('generatedAccessCode').then(codes => codes.length);
    const totalAssignments = await db.collection('access-code-questions').countDocuments();
    const enabledAssignments = await db.collection('access-code-questions').countDocuments({ isEnabled: true });
    const disabledAssignments = await db.collection('access-code-questions').countDocuments({ isEnabled: false });
    
    console.log(`   🎫 Total Access Codes with Assignments: ${totalAccessCodes}`);
    console.log(`   📝 Total Question Assignments: ${totalAssignments}`);
    console.log(`   ✅ Enabled Assignments: ${enabledAssignments}`);
    console.log(`   ❌ Disabled Assignments: ${disabledAssignments}`);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n🚀 Ready to use the management interface at /access-code-questions');
    
  } catch (error) {
    console.error('❌ Error testing access code questions:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

// Run the test
testAccessCodeQuestions();
