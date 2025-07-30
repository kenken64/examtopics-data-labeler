const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function findQuestion80() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🔍 Searching for Question 80 across all certificates\n');
    
    // Find all questions with number 80
    const question80s = await db.collection('quizzes').find({
      question_no: 80
    }).toArray();
    
    console.log(`📊 Found ${question80s.length} questions with number 80\n`);
    
    if (question80s.length === 0) {
      console.log('❌ No question 80 found in any certificate');
      
      // Check what's the highest question number
      const highestQuestion = await db.collection('quizzes').findOne(
        {},
        { sort: { question_no: -1 } }
      );
      
      console.log(`\n🔝 Highest question number in database: ${highestQuestion?.question_no || 'None'}`);
      
      if (highestQuestion) {
        const cert = await db.collection('certificates').findOne({
          _id: highestQuestion.certificateId
        });
        console.log(`   Certificate: ${cert?.name || 'Unknown'} (${cert?.code || 'Unknown'})`);
      }
    } else {
      // Show which certificates have question 80
      for (const question of question80s) {
        const certificate = await db.collection('certificates').findOne({
          _id: question.certificateId
        });
        
        console.log(`✅ Question 80 exists in:`);
        console.log(`   Certificate: ${certificate?.name || 'Unknown'}`);
        console.log(`   Code: ${certificate?.code || 'Unknown'}`);
        console.log(`   Question ID: ${question._id}`);
        console.log(`   Question: ${question.question.substring(0, 100)}...`);
        console.log('');
      }
    }
    
    // Check questions around 80 to see if there's any pattern
    console.log('\n🔍 Checking questions 75-85 across all certificates:');
    const nearbyQuestions = await db.collection('quizzes').find({
      question_no: { $gte: 75, $lte: 85 }
    }).sort({ question_no: 1 }).toArray();
    
    if (nearbyQuestions.length === 0) {
      console.log('❌ No questions found in range 75-85');
    } else {
      console.log(`📋 Found ${nearbyQuestions.length} questions in range 75-85:`);
      
      for (const question of nearbyQuestions) {
        const certificate = await db.collection('certificates').findOne({
          _id: question.certificateId
        });
        
        console.log(`   Q${question.question_no}: ${certificate?.code || 'Unknown'} - ${certificate?.name || 'Unknown'}`);
      }
    }
    
    // Check what certificates exist and their question ranges
    console.log('\n📜 All certificates and their question ranges:');
    const certificates = await db.collection('certificates').find({}).toArray();
    
    for (const cert of certificates) {
      const questions = await db.collection('quizzes').find({
        certificateId: cert._id.toString()
      }).toArray();
      
      if (questions.length > 0) {
        const questionNos = questions.map(q => q.question_no).sort((a, b) => a - b);
        const min = questionNos[0];
        const max = questionNos[questionNos.length - 1];
        console.log(`   ${cert.code}: ${questions.length} questions (${min}-${max})`);
      } else {
        console.log(`   ${cert.code}: 0 questions`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

findQuestion80();
