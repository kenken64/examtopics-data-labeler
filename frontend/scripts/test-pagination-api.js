const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

// Use environment variable for MongoDB URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function testPaginationAPI() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('awscert');
    
    // Simulate the API logic for access code AC-FMNBLQ7W
    const accessCode = 'AC-FMNBLQ7W';
    const page = 2; // Second page
    const limit = 50;
    const skip = (page - 1) * limit; // Skip = 50 for page 2
    
    console.log(`Testing pagination for access code: ${accessCode}`);
    console.log(`Page: ${page}, Limit: ${limit}, Skip: ${skip}`);
    
    // First get the payee
    const payee = await db.collection('payees').findOne({
      $or: [
        { accessCode: accessCode },
        { generatedAccessCode: accessCode }
      ],
      status: 'paid'
    });
    
    if (!payee) {
      console.log('Payee not found');
      return;
    }
    
    console.log(`Found payee: ${payee.payeeName}`);
    console.log(`Generated access code: ${payee.generatedAccessCode}`);
    
    // Test the access-code-questions query
    let baseMatchCondition = {
      generatedAccessCode: accessCode,
      isEnabled: true 
    };
    
    // Get total count
    const totalCountResult = await db.collection('access-code-questions').aggregate([
      { $match: baseMatchCondition },
      { $count: "total" }
    ]).toArray();
    
    const totalQuestions = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    console.log(`Total questions: ${totalQuestions}`);
    
    // Get paginated results
    const pipeline = [
      { $match: baseMatchCondition },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'questionId',
          foreignField: '_id',
          as: 'questionDetails'
        }
      },
      { $unwind: '$questionDetails' },
      { $sort: { sortOrder: 1, assignedQuestionNo: 1 } },
      {
        $project: {
          _id: '$questionDetails._id',
          question_no: '$assignedQuestionNo',
          question: '$questionDetails.question',
          options: '$questionDetails.options',
          correctAnswer: '$questionDetails.correctAnswer',
          explanation: '$questionDetails.explanation',
          createdAt: '$questionDetails.createdAt',
          originalQuestionNo: '$questionDetails.question_no',
          isEnabled: 1,
          sortOrder: 1
        }
      },
      { $skip: skip },
      { $limit: limit }
    ];
    
    const paginatedQuestions = await db.collection('access-code-questions').aggregate(pipeline).toArray();
    
    console.log(`\nFound ${paginatedQuestions.length} questions for page ${page}:`);
    paginatedQuestions.forEach((q, index) => {
      console.log(`${skip + index + 1}. Question ${q.question_no}: ${q.question.substring(0, 80)}...`);
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalQuestions / limit);
    const hasNextPage = skip + limit < totalQuestions;
    const hasPrevPage = page > 1;
    
    console.log(`\nPagination Info:`);
    console.log(`- Current Page: ${page}`);
    console.log(`- Total Pages: ${totalPages}`);
    console.log(`- Questions Per Page: ${limit}`);
    console.log(`- Has Next Page: ${hasNextPage}`);
    console.log(`- Has Previous Page: ${hasPrevPage}`);
    console.log(`- Showing questions ${skip + 1} to ${Math.min(skip + limit, totalQuestions)}`);
    
    // Also test specifically for questions 79-80
    console.log(`\n=== Testing Questions 79-80 Specifically ===`);
    const questions79_80 = await db.collection('access-code-questions').aggregate([
      { 
        $match: { 
          generatedAccessCode: accessCode,
          isEnabled: true,
          assignedQuestionNo: { $in: [79, 80] }
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
      { $sort: { assignedQuestionNo: 1 } }
    ]).toArray();
    
    console.log(`Found ${questions79_80.length} questions for 79-80:`);
    questions79_80.forEach(q => {
      console.log(`  Question ${q.assignedQuestionNo}: ${q.questionDetails.question.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testPaginationAPI().catch(console.error);
