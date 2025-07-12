const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function checkAccessCodeStructure() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('awscert');
  
  console.log('Sample access-code-questions documents:');
  const samples = await db.collection('access-code-questions').find().limit(3).toArray();
  samples.forEach((doc, i) => {
    console.log(`Document ${i + 1}:`);
    console.log('  _id:', doc._id);
    console.log('  certificateId:', doc.certificateId, '(type:', typeof doc.certificateId, ')');
    console.log('  generatedAccessCode:', doc.generatedAccessCode);
    console.log('  isEnabled:', doc.isEnabled);
    console.log();
  });
  
  // Also check the specific access code from the screenshot
  console.log('Checking specific access code AC-BG4F3QA3:');
  const specificCode = await db.collection('access-code-questions').findOne({
    generatedAccessCode: 'AC-BG4F3QA3'
  });
  
  if (specificCode) {
    console.log('  Found access code:');
    console.log('  certificateId:', specificCode.certificateId, '(type:', typeof specificCode.certificateId, ')');
    
    // Get the certificate details
    const cert = await db.collection('certificates').findOne({
      _id: new ObjectId(specificCode.certificateId)
    });
    
    if (cert) {
      console.log('  Certificate:', cert.name, '(' + cert.code + ')');
    }
  } else {
    console.log('  Access code not found');
  }
  
  await client.close();
}

checkAccessCodeStructure().catch(console.error);
