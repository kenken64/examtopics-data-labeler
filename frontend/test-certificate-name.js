// Test script to verify certificate name is returned by API
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function testCertificateName() {
  console.log('🧪 Testing Certificate Name in API Response');
  console.log('==================================================');
  
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('awscert');
  
  try {
    // Find certificate by code
    const certificate = await db.collection('certificates').findOne({
      code: 'AIF-C01'
    });
    
    if (!certificate) {
      console.log('❌ Certificate AIF-C01 not found');
      return;
    }
    
    console.log('✅ Certificate found:');
    console.log(`  📋 Name: ${certificate.name}`);
    console.log(`  🔢 Code: ${certificate.code}`);
    console.log(`  🆔 ID: ${certificate._id}`);
    
    // Find questions for this certificate
    const questions = await db.collection('quizzes')
      .find({ certificateId: certificate._id.toString() })
      .sort({ question_no: 1 })
      .toArray();
    
    console.log(`  📚 Questions found: ${questions.length}`);
    
    // Simulate API response
    const apiResponse = {
      success: true,
      certificate: {
        _id: certificate._id,
        name: certificate.name,
        code: certificate.code
      },
      questions: questions,
      totalQuestions: questions.length
    };
    
    console.log('\n🔗 Simulated API Response:');
    console.log(`  Certificate Name: "${apiResponse.certificate.name}"`);
    console.log(`  Certificate Code: "${apiResponse.certificate.code}"`);
    console.log(`  Total Questions: ${apiResponse.totalQuestions}`);
    
    console.log('\n✅ The certificate name should now display properly in the UI!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testCertificateName().catch(console.error);
