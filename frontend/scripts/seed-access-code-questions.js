// Seed script for access-code-questions collection
// This collection manages the relationship between generated access codes and their assigned questions
// Run this script using: node seed-access-code-questions.js

const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017/awscert';

async function seedAccessCodeQuestions() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('awscert');
    
    // Get all paid payees with generated access codes
    console.log('Fetching paid payees...');
    const payees = await db.collection('payees').find({ 
      status: 'paid',
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();
    
    if (payees.length === 0) {
      console.log('No paid payees with generated access codes found. Please ensure payees have generated access codes.');
      return;
    }
    
    console.log(`Found ${payees.length} paid payees with generated access codes`);
    
    // Check if access-code-questions collection exists and has data
    const existingRecords = await db.collection('access-code-questions').countDocuments();
    
    if (existingRecords > 0) {
      console.log(`Found ${existingRecords} existing access code question records. Clearing collection...`);
      await db.collection('access-code-questions').deleteMany({});
    }
    
    const accessCodeQuestionsData = [];
    
    // For each payee, get all questions for their certificate and create assignments
    for (const payee of payees) {
      console.log(`Processing payee: ${payee.payeeName} (${payee.generatedAccessCode})`);
      
      // Get all questions for this payee's certificate
      const questions = await db.collection('quizzes')
        .find({ certificateId: payee.certificateId.toString() })
        .sort({ question_no: 1 })
        .toArray();
      
      if (questions.length === 0) {
        console.log(`  No questions found for certificate ${payee.certificateId}`);
        continue;
      }
      
      // Create question assignments for this generated access code
      const questionAssignments = questions.map((question, index) => ({
        generatedAccessCode: payee.generatedAccessCode,
        payeeId: payee._id,
        certificateId: payee.certificateId,
        questionId: question._id,
        originalQuestionNo: question.question_no,
        assignedQuestionNo: index + 1, // Start from 1, allow reordering
        isEnabled: true, // Can be disabled to hide questions
        assignedAt: new Date(),
        updatedAt: new Date(),
        sortOrder: index + 1 // For custom ordering
      }));
      
      accessCodeQuestionsData.push(...questionAssignments);
      console.log(`  Assigned ${questionAssignments.length} questions`);
    }
    
    if (accessCodeQuestionsData.length === 0) {
      console.log('No access code question assignments to create.');
      return;
    }
    
    console.log('Inserting access code question assignments...');
    const result = await db.collection('access-code-questions').insertMany(accessCodeQuestionsData);
    
    console.log(`Successfully inserted ${result.insertedCount} access code question assignments`);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.collection('access-code-questions').createIndex({ generatedAccessCode: 1 });
    await db.collection('access-code-questions').createIndex({ payeeId: 1 });
    await db.collection('access-code-questions').createIndex({ certificateId: 1 });
    await db.collection('access-code-questions').createIndex({ questionId: 1 });
    await db.collection('access-code-questions').createIndex({ generatedAccessCode: 1, sortOrder: 1 });
    await db.collection('access-code-questions').createIndex({ generatedAccessCode: 1, isEnabled: 1, sortOrder: 1 });
    
    console.log('Indexes created successfully');
    
    // Summary
    const summary = await db.collection('access-code-questions').aggregate([
      {
        $group: {
          _id: '$generatedAccessCode',
          totalQuestions: { $sum: 1 },
          enabledQuestions: { $sum: { $cond: ['$isEnabled', 1, 0] } }
        }
      }
    ]).toArray();
    
    console.log('\nSummary of assigned questions:');
    summary.forEach(item => {
      console.log(`${item._id}: ${item.enabledQuestions}/${item.totalQuestions} questions enabled`);
    });
    
  } catch (error) {
    console.error('Error seeding access code questions:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed.');
    }
  }
}

// Run the seed function
seedAccessCodeQuestions();
