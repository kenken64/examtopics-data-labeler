const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017/awscert';

async function checkQuestionData() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('awscert');
  
  console.log('Checking question data integrity...');
  
  const questions = await db.collection('quizzes').find({}).toArray();
  console.log('Total questions:', questions.length);
  
  let issuesFound = 0;
  questions.forEach((q, index) => {
    const issues = [];
    
    if (!q.options) {
      issues.push('missing options');
    } else if (!Array.isArray(q.options)) {
      issues.push('options not array');
    } else if (q.options.length === 0) {
      issues.push('empty options array');
    }
    
    if (q.correctAnswer === undefined || q.correctAnswer === null) {
      issues.push('missing correctAnswer');
    }
    
    if (!q.question) {
      issues.push('missing question text');
    }
    
    if (issues.length > 0) {
      console.log(`Question ${index + 1} (ID: ${q._id}): ${issues.join(', ')}`);
      console.log('  Question data:', JSON.stringify(q, null, 2));
      issuesFound++;
    }
  });
  
  if (issuesFound === 0) {
    console.log('✅ All questions have valid data structure');
  } else {
    console.log(`❌ Found ${issuesFound} questions with issues`);
  }
  
  // Also show a sample of valid question structure
  if (questions.length > 0) {
    console.log('\nSample question structure:');
    const sample = questions.find(q => q.options && Array.isArray(q.options)) || questions[0];
    console.log(JSON.stringify(sample, null, 2));
  }
  
  await client.close();
}

checkQuestionData().catch(console.error);
