const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function checkSAPQuestions() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🔍 Analyzing SAP-C02 Questions\n');
    
    // Find SAP-C02 certificate
    const sapCertificate = await db.collection('certificates').findOne({
      code: 'SAP-C02'
    });
    
    if (!sapCertificate) {
      console.log('❌ SAP-C02 certificate not found');
      return;
    }
    
    console.log(`✅ Found SAP-C02: ${sapCertificate.name}`);
    console.log(`   Certificate ID: ${sapCertificate._id}\n`);
    
    // Find all questions for SAP-C02
    const questions = await db.collection('quizzes').find({
      certificateId: sapCertificate._id.toString()
    }).sort({ question_no: 1 }).toArray();
    
    console.log(`📊 Total questions found: ${questions.length}\n`);
    
    if (questions.length === 0) {
      console.log('❌ No questions found for SAP-C02');
      return;
    }
    
    // Check question number ranges
    const questionNumbers = questions.map(q => q.question_no).sort((a, b) => a - b);
    console.log(`📈 Question number range: ${questionNumbers[0]} to ${questionNumbers[questionNumbers.length - 1]}`);
    
    // Check if questions 79 and 80 exist
    const question79 = questions.find(q => q.question_no === 79);
    const question80 = questions.find(q => q.question_no === 80);
    
    console.log(`\n🎯 Specific question checks:`);
    console.log(`   Question 79: ${question79 ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   Question 80: ${question80 ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Show highest question numbers
    const highestQuestions = questions
      .slice(-10) // Get last 10 questions
      .map(q => ({ no: q.question_no, id: q._id }));
    
    console.log(`\n🔝 Highest question numbers:`);
    highestQuestions.forEach(q => {
      console.log(`   Q${q.no}: ${q.id}`);
    });
    
    // Check gaps in question numbers
    console.log(`\n🕳️  Checking for gaps in question numbers:`);
    const gaps = [];
    for (let i = questionNumbers[0]; i <= questionNumbers[questionNumbers.length - 1]; i++) {
      if (!questionNumbers.includes(i)) {
        gaps.push(i);
      }
    }
    
    if (gaps.length > 0) {
      console.log(`   Found ${gaps.length} gaps:`, gaps.slice(0, 20)); // Show first 20 gaps
      if (gaps.length > 20) {
        console.log(`   ... and ${gaps.length - 20} more`);
      }
    } else {
      console.log(`   ✅ No gaps found`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkSAPQuestions();
