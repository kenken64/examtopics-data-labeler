const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function investigateQuestionCount() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🔍 Investigating Question Count Discrepancy for SAP-C02\n');
    
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
    
    // Check different ways the question count might be calculated
    
    console.log('📊 METHOD 1: Direct count in quizzes collection');
    const directCount = await db.collection('quizzes').countDocuments({
      certificateId: sapCertificate._id.toString()
    });
    console.log(`   Result: ${directCount} questions\n`);
    
    console.log('📊 METHOD 2: Using ObjectId for certificateId');
    const objectIdCount = await db.collection('quizzes').countDocuments({
      certificateId: sapCertificate._id
    });
    console.log(`   Result: ${objectIdCount} questions\n`);
    
    console.log('📊 METHOD 3: Check all possible certificateId formats');
    const allQuestions = await db.collection('quizzes').find({}).toArray();
    const sapQuestions = allQuestions.filter(q => {
      return q.certificateId === sapCertificate._id.toString() ||
             q.certificateId === sapCertificate._id ||
             (q.certificateId && q.certificateId.toString() === sapCertificate._id.toString());
    });
    console.log(`   Result: ${sapQuestions.length} questions\n`);
    
    console.log('📊 METHOD 4: Check if there are questions with different certificate references');
    const allSapQuestions = await db.collection('quizzes').find({
      $or: [
        { certificateId: sapCertificate._id.toString() },
        { certificateId: sapCertificate._id },
        { certificate: 'SAP-C02' },
        { certificateCode: 'SAP-C02' },
        { cert: 'SAP-C02' }
      ]
    }).toArray();
    console.log(`   Result: ${allSapQuestions.length} questions\n`);
    
    // Check what the API endpoint returns
    console.log('📊 METHOD 5: Test the API endpoint logic');
    const apiQueryResult = await db.collection('quizzes').find({
      certificateId: sapCertificate._id.toString()
    }).toArray();
    console.log(`   API would return: ${apiQueryResult.length} questions`);
    
    if (apiQueryResult.length > 0) {
      const questionNumbers = apiQueryResult.map(q => q.question_no).sort((a, b) => a - b);
      console.log(`   Question numbers: ${questionNumbers.join(', ')}`);
    }
    
    // Check the certificates collection for any stored question count
    console.log('\n📊 METHOD 6: Check if certificate has a questionCount field');
    console.log('Certificate document fields:');
    Object.keys(sapCertificate).forEach(key => {
      console.log(`   ${key}: ${sapCertificate[key]}`);
    });
    
    // Check if there are questions in other collections
    console.log('\n📊 METHOD 7: Check other possible collections');
    const collections = await db.listCollections().toArray();
    const questionCollections = collections.filter(c => 
      c.name.toLowerCase().includes('question') || 
      c.name.toLowerCase().includes('quiz')
    );
    
    console.log('Collections that might contain questions:');
    for (const collection of questionCollections) {
      const count = await db.collection(collection.name).countDocuments({});
      console.log(`   ${collection.name}: ${count} documents`);
      
      if (count > 0) {
        const sample = await db.collection(collection.name).findOne({});
        console.log(`     Sample fields: ${Object.keys(sample).join(', ')}`);
        
        // Check if any relate to SAP-C02
        const sapRelated = await db.collection(collection.name).countDocuments({
          $or: [
            { certificateId: sapCertificate._id.toString() },
            { certificateId: sapCertificate._id },
            { certificate: 'SAP-C02' },
            { certificateCode: 'SAP-C02' }
          ]
        });
        console.log(`     SAP-C02 related: ${sapRelated} documents`);
      }
    }
    
    // Check access-code-questions collection specifically
    console.log('\n📊 METHOD 8: Check access-code-questions collection');
    const accessCodeQuestions = await db.collection('access-code-questions').countDocuments({
      certificateId: sapCertificate._id
    });
    console.log(`   access-code-questions for SAP-C02: ${accessCodeQuestions} records`);
    
    if (accessCodeQuestions > 0) {
      const sampleAccessCodeQuestion = await db.collection('access-code-questions').findOne({
        certificateId: sapCertificate._id
      });
      console.log(`   Sample access-code-question:`, {
        _id: sampleAccessCodeQuestion._id,
        generatedAccessCode: sampleAccessCodeQuestion.generatedAccessCode,
        questionId: sampleAccessCodeQuestion.questionId,
        assignedQuestionNo: sampleAccessCodeQuestion.assignedQuestionNo,
        originalQuestionNo: sampleAccessCodeQuestion.originalQuestionNo
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

investigateQuestionCount();
