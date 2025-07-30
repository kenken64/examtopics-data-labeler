const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

// Use environment variable for MongoDB URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function checkAtlasDatabase() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('awscert');
    
    // Check certificates collection
    console.log('\n=== CERTIFICATES ===');
    const certificates = await db.collection('certificates').find({}).toArray();
    certificates.forEach(cert => {
      console.log(`${cert.code}: ${cert.name}`);
    });
    
    // Check SAP-C02 certificate ID
    const sapCert = await db.collection('certificates').findOne({ code: 'SAP-C02' });
    if (!sapCert) {
      console.log('\nSAP-C02 certificate not found!');
      return;
    }
    
    console.log(`\nSAP-C02 Certificate ID: ${sapCert._id}`);
    
    // Check quizzes for SAP-C02
    console.log('\n=== SAP-C02 QUESTIONS IN QUIZZES COLLECTION ===');
    const sapQuestions = await db.collection('quizzes').find({ 
      certificateId: sapCert._id.toString() 
    }).sort({ question_no: 1 }).toArray();
    
    console.log(`Found ${sapQuestions.length} questions in quizzes collection:`);
    sapQuestions.forEach(q => {
      console.log(`Question ${q.question_no}: ${q.question.substring(0, 80)}...`);
    });
    
    // Check access-code-questions collection for SAP-C02
    console.log('\n=== SAP-C02 QUESTIONS IN ACCESS-CODE-QUESTIONS COLLECTION ===');
    
    // First find all access codes for SAP-C02
    const sapPayees = await db.collection('payees').find({ 
      certificateId: sapCert._id 
    }).toArray();
    
    console.log(`Found ${sapPayees.length} payees for SAP-C02:`);
    sapPayees.forEach(payee => {
      console.log(`  - ${payee.payeeName}: ${payee.generatedAccessCode || payee.accessCode}`);
    });
    
    // Check access-code-questions for each generated access code
    for (const payee of sapPayees) {
      if (payee.generatedAccessCode) {
        const accessCodeQuestions = await db.collection('access-code-questions').find({
          generatedAccessCode: payee.generatedAccessCode
        }).sort({ assignedQuestionNo: 1 }).toArray();
        
        console.log(`\nAccess code ${payee.generatedAccessCode} has ${accessCodeQuestions.length} questions:`);
        accessCodeQuestions.forEach(acq => {
          console.log(`  Question ${acq.assignedQuestionNo}: Enabled=${acq.isEnabled}`);
        });
        
        // Get the highest question number for this access code
        if (accessCodeQuestions.length > 0) {
          const maxQuestion = Math.max(...accessCodeQuestions.map(q => q.assignedQuestionNo));
          console.log(`  Highest question number: ${maxQuestion}`);
        }
      }
    }
    
    // Check if there are any questions with high numbers (70-80 range)
    console.log('\n=== HIGH NUMBERED QUESTIONS (70-80) ===');
    const highQuestions = await db.collection('access-code-questions').find({
      assignedQuestionNo: { $gte: 70, $lte: 80 }
    }).toArray();
    
    console.log(`Found ${highQuestions.length} questions in range 70-80`);
    highQuestions.forEach(q => {
      console.log(`  Question ${q.assignedQuestionNo}: Access Code ${q.generatedAccessCode}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAtlasDatabase().catch(console.error);
