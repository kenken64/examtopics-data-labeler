/**
 * Test script to add a multi-answer question to the database and verify functionality
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/";

async function addMultiAnswerTestQuestion() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("awscert");
    
    console.log('=== Adding Multi-Answer Test Question ===');
    
    // First, let's check if there are any certificates to work with
    const certificates = await db.collection('certificates').find({}).toArray();
    
    if (certificates.length === 0) {
      console.log('No certificates found. Creating a test certificate...');
      
      const testCert = {
        name: "Test Certificate for Multi-Answer",
        code: "TEST-MULTI",
        description: "Test certificate for multi-answer questions",
        createdAt: new Date()
      };
      
      const certResult = await db.collection('certificates').insertOne(testCert);
      console.log(`Created test certificate with ID: ${certResult.insertedId}`);
    }
    
    // Get the first certificate
    const certificate = await db.collection('certificates').findOne({});
    console.log(`Using certificate: ${certificate.name} (${certificate.code})`);
    
    // Check if there are any questions for this certificate
    const questionsCount = await db.collection('questions').countDocuments({
      certificateId: certificate._id
    });
    
    console.log(`Current questions count for certificate: ${questionsCount}`);
    
    // Create a multi-answer test question
    const multiAnswerQuestion = {
      certificateId: certificate._id,
      question_no: questionsCount + 1,
      question: "Which of the following are core components of Amazon Web Services? (Select TWO)",
      options: {
        A: "Amazon EC2 (Elastic Compute Cloud)",
        B: "Amazon S3 (Simple Storage Service)", 
        C: "Microsoft Azure Virtual Machines",
        D: "Google Cloud Storage"
      },
      correctAnswer: "AB", // Multiple correct answers
      explanation: "Amazon EC2 and Amazon S3 are core AWS services. EC2 provides scalable computing capacity, while S3 provides object storage. Microsoft Azure Virtual Machines and Google Cloud Storage are services from other cloud providers, not AWS.",
      difficulty: "medium",
      topics: ["AWS Fundamentals", "Core Services"],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert the question
    const questionResult = await db.collection('questions').insertOne(multiAnswerQuestion);
    console.log(`✅ Created multi-answer question with ID: ${questionResult.insertedId}`);
    console.log(`Question: ${multiAnswerQuestion.question}`);
    console.log(`Options: A) ${multiAnswerQuestion.options.A}`);
    console.log(`         B) ${multiAnswerQuestion.options.B}`);
    console.log(`         C) ${multiAnswerQuestion.options.C}`);
    console.log(`         D) ${multiAnswerQuestion.options.D}`);
    console.log(`Correct Answer: ${multiAnswerQuestion.correctAnswer}`);
    
    // Create another multi-answer question with 3 correct answers
    const multiAnswerQuestion2 = {
      certificateId: certificate._id,
      question_no: questionsCount + 2,
      question: "Which of the following are AWS security best practices? (Select THREE)",
      options: {
        A: "Enable AWS CloudTrail for logging",
        B: "Use root user for daily operations",
        C: "Implement multi-factor authentication (MFA)",
        D: "Use IAM roles instead of hard-coded credentials"
      },
      correctAnswer: "A C D", // Three correct answers with spaces
      explanation: "Security best practices include enabling CloudTrail for logging, implementing MFA, and using IAM roles. Using the root user for daily operations is NOT a best practice - it should be avoided.",
      difficulty: "intermediate", 
      topics: ["Security", "IAM", "Best Practices"],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const question2Result = await db.collection('questions').insertOne(multiAnswerQuestion2);
    console.log(`✅ Created second multi-answer question with ID: ${question2Result.insertedId}`);
    console.log(`Question: ${multiAnswerQuestion2.question}`);
    console.log(`Correct Answer: ${multiAnswerQuestion2.correctAnswer}`);
    
    // Test the utility functions from bot.js
    console.log('\n=== Testing Multi-Answer Utility Functions ===');
    
    // Copy utility functions for testing
    function normalizeAnswer(answer) {
      if (!answer) return '';
      const normalized = answer.replace(/\s+/g, '').toUpperCase();
      return normalized.split('').sort().join('');
    }
    
    function isMultipleAnswerQuestion(correctAnswer) {
      if (!correctAnswer) return false;
      const normalized = normalizeAnswer(correctAnswer);
      return normalized.length > 1;
    }
    
    function validateMultipleAnswers(selectedAnswers, correctAnswer) {
      if (!correctAnswer) return false;
      const selectedString = Array.isArray(selectedAnswers) 
        ? selectedAnswers.join('') 
        : selectedAnswers;
      const normalizedSelected = normalizeAnswer(selectedString);
      const normalizedCorrect = normalizeAnswer(correctAnswer);
      return normalizedSelected === normalizedCorrect;
    }
    
    // Test with our new questions
    console.log(`Question 1 is multi-answer: ${isMultipleAnswerQuestion(multiAnswerQuestion.correctAnswer)}`);
    console.log(`Question 2 is multi-answer: ${isMultipleAnswerQuestion(multiAnswerQuestion2.correctAnswer)}`);
    
    // Test validation
    console.log(`Validate AB against AB: ${validateMultipleAnswers("AB", multiAnswerQuestion.correctAnswer)}`);
    console.log(`Validate BA against AB: ${validateMultipleAnswers("BA", multiAnswerQuestion.correctAnswer)}`);
    console.log(`Validate AC against AB: ${validateMultipleAnswers("AC", multiAnswerQuestion.correctAnswer)}`);
    
    console.log(`Validate ACD against "A C D": ${validateMultipleAnswers("ACD", multiAnswerQuestion2.correctAnswer)}`);
    console.log(`Validate DCA against "A C D": ${validateMultipleAnswers("DCA", multiAnswerQuestion2.correctAnswer)}`);
    
    console.log('\n✅ Multi-answer test questions created successfully!');
    console.log('\nYou can now:');
    console.log('1. Test the frontend by navigating to a question detail page');
    console.log('2. Test the Telegram bot with multi-answer questions');
    console.log('3. Verify the UI shows multi-answer selection options');
    
  } catch (error) {
    console.error('Error creating test questions:', error);
  } finally {
    await client.close();
  }
}

// Run the test
addMultiAnswerTestQuestion();
