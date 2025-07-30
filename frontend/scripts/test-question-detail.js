const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

// Use environment variable for MongoDB URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function testQuestionDetailAPI() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('awscert');
    
    // Test loading individual questions 79 and 80
    const accessCode = 'AC-FMNBLQ7W';
    const questionNumbers = [79, 80];
    
    console.log(`Testing question detail loading for access code: ${accessCode}`);
    
    // Get payee info first
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
    
    // For each question number, test the lookup
    for (const questionNo of questionNumbers) {
      console.log(`\n=== Testing Question ${questionNo} ===`);
      
      // First method: Get all questions and find by question number (current API approach)
      const allQuestions = await db.collection('access-code-questions').aggregate([
        { 
          $match: { 
            generatedAccessCode: accessCode,
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
        }
      ]).toArray();
      
      // Find the specific question
      const specificQuestion = allQuestions.find(q => q.question_no === questionNo);
      
      if (specificQuestion) {
        console.log(`✅ Found Question ${questionNo}:`);
        console.log(`   Question Text: ${specificQuestion.question.substring(0, 100)}...`);
        console.log(`   Options: ${specificQuestion.options ? specificQuestion.options.length : 'No options'} options`);
        console.log(`   Correct Answer: ${specificQuestion.correctAnswer}`);
        console.log(`   Has Explanation: ${specificQuestion.explanation ? 'Yes' : 'No'}`);
      } else {
        console.log(`❌ Question ${questionNo} NOT FOUND in results`);
        console.log(`   Total questions returned: ${allQuestions.length}`);
        console.log(`   Question numbers available: ${allQuestions.map(q => q.question_no).sort((a,b) => a-b)}`);
      }
      
      // Second method: Direct lookup by assigned question number
      const directLookup = await db.collection('access-code-questions').aggregate([
        { 
          $match: { 
            generatedAccessCode: accessCode,
            isEnabled: true,
            assignedQuestionNo: questionNo
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
        { $unwind: '$questionDetails' }
      ]).toArray();
      
      console.log(`   Direct lookup result: ${directLookup.length} questions found`);
      if (directLookup.length > 0) {
        console.log(`   Direct lookup question: ${directLookup[0].questionDetails.question.substring(0, 100)}...`);
      }
    }
    
    // Check if there are any gaps in question numbers
    console.log(`\n=== Checking for Question Number Gaps ===`);
    const allQuestionNumbers = await db.collection('access-code-questions').aggregate([
      { 
        $match: { 
          generatedAccessCode: accessCode,
          isEnabled: true 
        }
      },
      {
        $group: {
          _id: null,
          questionNumbers: { $push: '$assignedQuestionNo' }
        }
      }
    ]).toArray();
    
    if (allQuestionNumbers.length > 0) {
      const numbers = allQuestionNumbers[0].questionNumbers.sort((a, b) => a - b);
      console.log(`Question numbers range: ${numbers[0]} to ${numbers[numbers.length - 1]}`);
      console.log(`Total questions: ${numbers.length}`);
      
      // Check for gaps
      const gaps = [];
      for (let i = numbers[0]; i <= numbers[numbers.length - 1]; i++) {
        if (!numbers.includes(i)) {
          gaps.push(i);
        }
      }
      
      if (gaps.length > 0) {
        console.log(`⚠️  Gaps found in question numbers: ${gaps}`);
      } else {
        console.log(`✅ No gaps found in question sequence`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testQuestionDetailAPI().catch(console.error);
