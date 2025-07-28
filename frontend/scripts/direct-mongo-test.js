// Direct MongoDB test to verify the record exists and check database name
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function directMongoTest() {
  console.log('🔍 Direct MongoDB Test for AC-F2NOKPMQ');
  console.log('====================================\n');
  
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'awscert';
  
  console.log('🔌 Connection Details:');
  console.log('   URI:', uri);
  console.log('   Database Name:', dbName);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(dbName);
    
    // First, check if the payee collection exists
    console.log('📋 Checking collections in database...');
    const collections = await db.listCollections().toArray();
    console.log('   Available collections:', collections.map(c => c.name));
    
    if (!collections.find(c => c.name === 'payee')) {
      console.log('❌ "payee" collection not found in this database!');
      console.log('🔍 This explains why the API returns 404');
      return;
    }
    
    console.log('✅ "payee" collection found\n');
    
    // Count total payee records
    const payeeCount = await db.collection('payee').countDocuments({});
    console.log(`📊 Total payee records: ${payeeCount}`);
    
    // Search for the specific access code
    console.log('\n🔍 Searching for AC-F2NOKPMQ...');
    
    const exactMatch = await db.collection('payee').findOne({
      generatedAccessCode: 'AC-F2NOKPMQ'
    });
    
    if (exactMatch) {
      console.log('🎉 FOUND IT! Record exists:');
      console.log('   ID:', exactMatch._id);
      console.log('   Email:', exactMatch.email);
      console.log('   Generated Access Code:', exactMatch.generatedAccessCode);
      console.log('   Certificate ID:', exactMatch.certificateId);
      
      // Now test the query with .toUpperCase() like the API does
      console.log('\n🔍 Testing with .toUpperCase() like the API...');
      const upperMatch = await db.collection('payee').findOne({
        generatedAccessCode: 'AC-F2NOKPMQ'.toUpperCase()
      });
      
      if (upperMatch) {
        console.log('✅ Also found with .toUpperCase()');
      } else {
        console.log('❌ NOT found with .toUpperCase() - This is the bug!');
        console.log('🔧 The API is converting to uppercase but the data is stored in mixed case');
      }
      
    } else {
      console.log('❌ Record NOT found in this database/collection');
      
      // Let's search for any record with generatedAccessCode field
      console.log('\n🔍 Searching for any records with generatedAccessCode...');
      const anyGenerated = await db.collection('payee').find({
        generatedAccessCode: { $exists: true }
      }).limit(5).toArray();
      
      if (anyGenerated.length > 0) {
        console.log(`   Found ${anyGenerated.length} records with generatedAccessCode:`);
        anyGenerated.forEach(record => {
          console.log(`   - "${record.generatedAccessCode}" (${record.email})`);
        });
      } else {
        console.log('   No records with generatedAccessCode field found');
      }
    }
    
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message);
  } finally {
    await client.close();
  }
}

directMongoTest().catch(console.error);
