// Test script to verify actual database question format and transformation
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function testQuestionTransformation() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('Connected to MongoDB...');
    
    // Get a sample question from the database
    const sampleQuestion = await db.collection('quizzes').findOne({});
    
    if (!sampleQuestion) {
      console.log('No questions found in database');
      return;
    }
    
    console.log('Sample question from database:');
    console.log(JSON.stringify(sampleQuestion, null, 2));
    
    // Test our transformation functions
    console.log('\n=== Testing Transformation ===');
    
    // Parse answers to options
    if (sampleQuestion.answers) {
      console.log('\nOriginal answers field:');
      console.log(sampleQuestion.answers);
      
      const options = parseAnswersToOptions(sampleQuestion.answers);
      console.log('\nParsed options:');
      console.log(options);
    }
    
    // Convert correct answer
    if (sampleQuestion.correctAnswer) {
      console.log('\nOriginal correctAnswer:', sampleQuestion.correctAnswer);
      const correctIndex = convertCorrectAnswerToIndex(sampleQuestion.correctAnswer);
      console.log('Converted to index:', correctIndex);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

/**
 * Converts answers text format to options array
 */
function parseAnswersToOptions(answers) {
  if (!answers || typeof answers !== 'string') {
    return [];
  }

  const lines = answers.split('\n').filter(line => line.trim());
  const options = [];

  for (const line of lines) {
    const match = line.match(/^[\s-]*[A-Z][.)]\s*(.+)$/i);
    if (match && match[1]) {
      options.push(match[1].trim());
    }
  }

  return options;
}

/**
 * Converts letter-based correct answer to numeric index
 */
function convertCorrectAnswerToIndex(correctAnswer) {
  if (typeof correctAnswer === 'number') {
    return correctAnswer;
  }

  if (typeof correctAnswer === 'string') {
    const upperCase = correctAnswer.toUpperCase();
    const charCode = upperCase.charCodeAt(0);
    
    if (charCode >= 65 && charCode <= 90) { // A-Z
      return charCode - 65;
    }
  }

  return 0;
}

testQuestionTransformation();
