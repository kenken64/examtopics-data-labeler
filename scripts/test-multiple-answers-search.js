require('dotenv').config();
const { MongoClient } = require('mongodb');

async function findMultipleAnswerQuestions() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('awscert');
    
    // Search for questions with multiple answers (space-separated letters)
    const questions = await db.collection('quizzes').find({
      correctAnswer: { $regex: /^[A-F]\s+[A-F]/, $options: 'i' }
    }).limit(10).toArray();
    
    console.log(`Found ${questions.length} multiple choice questions:`);
    questions.forEach((q, index) => {
      console.log(`${index + 1}. correctAnswer: '${q.correctAnswer}' - ID: ${q._id}`);
      console.log(`   Question: ${q.question?.substring(0, 120)}...`);
      console.log('');
    });
    
    if (questions.length > 0) {
      console.log('✅ Perfect! We have questions with multiple answers to test.');
      console.log(`Use question ID ${questions[0]._id} for testing.`);
    } else {
      console.log('❌ No questions found with space-separated multiple answers.');
      console.log('Let\'s create a test question...');
      
      // Create a test question
      const testQuestion = {
        question: "Which of the following are AWS compute services? (Select TWO)",
        options: {
          A: "Amazon EC2",
          B: "Amazon S3", 
          C: "AWS Lambda",
          D: "Amazon RDS"
        },
        correctAnswer: "A C", // This is the format we need to test
        explanation: "EC2 and Lambda are compute services. S3 is storage, RDS is database.",
        difficulty: "easy",
        topics: ["AWS", "Compute"],
        createdAt: new Date()
      };
      
      const result = await db.collection('quizzes').insertOne(testQuestion);
      console.log(`✅ Created test question with ID: ${result.insertedId}`);
      console.log(`   correctAnswer: "${testQuestion.correctAnswer}"`);
    }
    
  } finally {
    await client.close();
  }
}

findMultipleAnswerQuestions().catch(console.error);
