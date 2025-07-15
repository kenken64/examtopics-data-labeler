// Check available access codes in the database
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkAccessCodes() {
  console.log('🔑 Checking Available Access Codes');
  console.log('=================================\n');

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Check payees collection for available access codes
    const payees = await db.collection('payees').find({}).toArray();
    
    console.log(`📋 Found ${payees.length} payees with access codes:`);
    payees.forEach((payee, index) => {
      console.log(`   ${index + 1}. Access Code: ${payee.generatedAccessCode}`);
      console.log(`      Payee: ${payee.payeeName}`);
      console.log(`      Status: ${payee.status}`);
      console.log('');
    });

    // Let's use the first available access code
    if (payees.length > 0) {
      const validAccessCode = payees[0].generatedAccessCode;
      console.log(`✅ Will use access code: ${validAccessCode}`);
      return validAccessCode;
    } else {
      console.log('❌ No access codes found!');
      return null;
    }

  } catch (error) {
    console.error('❌ Error checking access codes:', error);
  }
}

checkAccessCodes().catch(console.error);
