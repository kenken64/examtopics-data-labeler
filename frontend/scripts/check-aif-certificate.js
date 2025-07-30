const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

// Use environment variable for MongoDB URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function checkAIFCertificate() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('awscert');
    
    // Check AIF-C01 certificate
    console.log('\n=== AIF-C01 CERTIFICATE CHECK ===');
    const aifCert = await db.collection('certificates').findOne({ code: 'AIF-C01' });
    if (!aifCert) {
      console.log('AIF-C01 certificate not found!');
      return;
    }
    
    console.log(`AIF-C01 Certificate ID: ${aifCert._id}`);
    console.log(`Certificate Name: ${aifCert.name}`);
    
    // Check questions for AIF-C01
    console.log('\n=== AIF-C01 QUESTIONS ===');
    const aifQuestions = await db.collection('quizzes').find({ 
      certificateId: aifCert._id.toString() 
    }).sort({ question_no: 1 }).toArray();
    
    console.log(`Found ${aifQuestions.length} questions for AIF-C01:`);
    aifQuestions.forEach((q, index) => {
      console.log(`${index + 1}. Question ${q.question_no}: ${q.question.substring(0, 80)}...`);
    });
    
    // Check specific question ranges
    const questionNumbers = aifQuestions.map(q => q.question_no).sort((a, b) => a - b);
    console.log(`\nQuestion number range: ${questionNumbers[0]} to ${questionNumbers[questionNumbers.length - 1]}`);
    
    // Check if question 51 exists
    const question51 = aifQuestions.find(q => q.question_no === 51);
    if (question51) {
      console.log(`\n✅ Question 51 EXISTS:`);
      console.log(`   Question: ${question51.question.substring(0, 100)}...`);
      console.log(`   Options: ${question51.options?.length || 'No options'}`);
    } else {
      console.log(`\n❌ Question 51 NOT FOUND`);
      console.log(`   Available questions: ${questionNumbers.join(', ')}`);
      console.log(`   Total questions: ${questionNumbers.length}`);
    }
    
    // Test the API call that the frontend would make
    console.log(`\n=== SIMULATING API CALL ===`);
    console.log(`Simulating: /api/saved-questions?certificateCode=AIF-C01&limit=1000`);
    
    const totalQuestions = await db.collection('quizzes')
      .countDocuments({ certificateId: aifCert._id.toString() });
    
    const allQuestions = await db.collection('quizzes')
      .find({ certificateId: aifCert._id.toString() })
      .sort({ question_no: 1 })
      .limit(1000)
      .toArray();
    
    console.log(`Total questions in DB: ${totalQuestions}`);
    console.log(`Questions returned by API simulation: ${allQuestions.length}`);
    
    const question51FromAPI = allQuestions.find(q => q.question_no === 51);
    if (question51FromAPI) {
      console.log(`✅ Question 51 found in API simulation`);
    } else {
      console.log(`❌ Question 51 NOT found in API simulation`);
      console.log(`Available question numbers from API: ${allQuestions.map(q => q.question_no).sort((a, b) => a - b).join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAIFCertificate().catch(console.error);
