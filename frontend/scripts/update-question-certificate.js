/**
 * Update the MLA-C01 question to have proper certificate structure
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examtopics-labeler';

async function updateQuestionCertificate() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('saved_questions');
    
    // Update the question to have the certificate structure that matches the URL
    const result = await collection.updateOne(
      { question_no: 5, certificateId: '688ebb355ac8971d57f813fc' },
      {
        $set: {
          certificate: {
            certificateId: '688ebb355ac8971d57f813fc',
            name: 'MLA-C01',
            code: 'MLA-C01'
          }
        }
      }
    );
    
    console.log('Update result:', result.modifiedCount, 'documents modified');
    
    // Verify the question structure
    const question = await collection.findOne({ question_no: 5, certificateId: '688ebb355ac8971d57f813fc' });
    if (question) {
      console.log('\n✅ Question updated successfully:');
      console.log('- Question Number:', question.question_no);
      console.log('- Type:', question.type);
      console.log('- Certificate ID:', question.certificateId);
      console.log('- Certificate Object:', question.certificate);
      console.log('- Has answers.step1?', !!question.answers?.step1);
      console.log('- Has correctAnswer?', !!question.correctAnswer);
      
      // Debug the conversion function
      console.log('\n🔍 Testing conversion function:');
      const stepKeys = Object.keys(question.answers).filter(key => key.startsWith('step'));
      console.log('- Step keys found:', stepKeys);
      console.log('- Type check:', question.type === 'steps');
      console.log('- Has answers?', !!question.answers);
      
      if (question.answers && question.answers.step1) {
        console.log('- Step1 options count:', question.answers.step1.length);
        console.log('- Step1 first option:', question.answers.step1[0]?.substring(0, 50) + '...');
      }
      
      console.log('\n🎯 The question should now work with the URL:');
      console.log('http://localhost:3001/saved-questions/question/5?from=certificate&certificateCode=MLA-C01');
      
    } else {
      console.log('❌ Question not found after update');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

updateQuestionCertificate().catch(console.error);
