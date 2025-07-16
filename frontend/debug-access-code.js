const { MongoClient } = require('mongodb');

async function checkCollections() {
  const client = new MongoClient('mongodb://localhost:27017/awscert');
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== Database Collections ===');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(col => console.log('  -', col.name));
    
    // Check if there's a 'questions' collection
    const questionsExists = collections.find(col => col.name === 'questions');
    console.log('\nQuestions collection exists:', !!questionsExists);
    
    // Check quizzes collection
    const quizzesCount = await db.collection('quizzes').countDocuments();
    console.log('Quizzes collection count:', quizzesCount);
    
    console.log('\n=== Checking access-code-questions for AC-34JUR81 ===');
    const assignments = await db.collection('access-code-questions').find({
      generatedAccessCode: 'AC-34JUR81'
    }).toArray();
    console.log('Found', assignments.length, 'question assignments');
    
    if (assignments.length > 0) {
      console.log('Sample assignment:', JSON.stringify(assignments[0], null, 2));
      
      // Check if the referenced questions exist in quizzes collection
      console.log('\n=== Checking referenced questions in quizzes collection ===');
      for (const assignment of assignments) {
        const question = await db.collection('quizzes').findOne({
          _id: assignment.questionId
        });
        console.log(`Question ${assignment.assignedQuestionNo}:`, question ? 'EXISTS' : 'MISSING');
      }
    }
    
    console.log('\n=== Checking payee for AC-34JUR81 ===');
    const payee = await db.collection('payees').findOne({
      generatedAccessCode: 'AC-34JUR81'
    });
    console.log('Payee found:', !!payee);
    if (payee) {
      console.log('Certificate ID:', payee.certificateId);
      console.log('Status:', payee.status);
    }
    
  } finally {
    await client.close();
  }
}

checkCollections().catch(console.error);
