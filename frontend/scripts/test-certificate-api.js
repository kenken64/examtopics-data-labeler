const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

// Use environment variable for MongoDB URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function testCertificateAPI() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('awscert');
    const certificateCode = 'AIF-C01';
    
    // Test the exact API call that the frontend makes
    console.log(`\n=== TESTING API CALL: /api/saved-questions?certificateCode=${certificateCode}&page=1&limit=50 ===`);
    
    // Find certificate by code
    const certificate = await db.collection('certificates').findOne({
      code: certificateCode
    });
    
    if (!certificate) {
      console.log('Certificate not found!');
      return;
    }
    
    console.log(`Found certificate: ${certificate.name} (${certificate.code})`);
    console.log(`Certificate ID: ${certificate._id}`);
    
    // Test pagination parameters
    const page = 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    console.log(`\nPagination params: page=${page}, limit=${limit}, skip=${skip}`);
    
    // Count total questions for this certificate
    const totalQuestions = await db.collection('quizzes')
      .countDocuments({ certificateId: certificate._id.toString() });
    
    console.log(`Total questions count: ${totalQuestions}`);
    
    // Find paginated questions for this certificate
    const questions = await db.collection('quizzes')
      .find({ certificateId: certificate._id.toString() })
      .sort({ question_no: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    console.log(`Questions returned: ${questions.length}`);
    console.log(`Question numbers: ${questions.map(q => q.question_no).join(', ')}`);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalQuestions / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    console.log(`\nPagination calculation:`);
    console.log(`- Total pages: ${totalPages}`);
    console.log(`- Has next page: ${hasNextPage}`);
    console.log(`- Has previous page: ${hasPrevPage}`);
    
    // Test page 2
    console.log(`\n=== TESTING PAGE 2 ===`);
    const page2 = 2;
    const skip2 = (page2 - 1) * limit; // skip = 50
    
    console.log(`Page 2 params: page=${page2}, skip=${skip2}`);
    
    const questions2 = await db.collection('quizzes')
      .find({ certificateId: certificate._id.toString() })
      .sort({ question_no: 1 })
      .skip(skip2)
      .limit(limit)
      .toArray();
    
    console.log(`Page 2 questions returned: ${questions2.length}`);
    console.log(`Page 2 question numbers: ${questions2.map(q => q.question_no).join(', ') || 'none'}`);
    
    const hasNextPage2 = page2 < totalPages;
    console.log(`Page 2 has next page: ${hasNextPage2}`);
    
    // Check if there are any data inconsistencies
    console.log(`\n=== DATA CONSISTENCY CHECK ===`);
    
    // Check if there are questions with certificateId as ObjectId vs string
    const questionsObjectId = await db.collection('quizzes')
      .countDocuments({ certificateId: certificate._id });
    
    const questionsStringId = await db.collection('quizzes')
      .countDocuments({ certificateId: certificate._id.toString() });
    
    console.log(`Questions with ObjectId certificateId: ${questionsObjectId}`);
    console.log(`Questions with String certificateId: ${questionsStringId}`);
    
    // Check all question numbers for this certificate
    const allQuestions = await db.collection('quizzes')
      .find({ certificateId: certificate._id.toString() })
      .sort({ question_no: 1 })
      .toArray();
    
    console.log(`\nAll questions for AIF-C01:`);
    allQuestions.forEach(q => {
      console.log(`  Question ${q.question_no}: ${q.question.substring(0, 60)}...`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testCertificateAPI().catch(console.error);
