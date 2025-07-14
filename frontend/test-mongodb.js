const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testMongoDB() {
  console.log('🚀 Starting MongoDB direct tests...');
  console.log('📄 Environment variables:');
  console.log('   MONGODB_URI:', process.env.MONGODB_URI);
  console.log('   MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME);
  
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';
  const dbName = process.env.MONGODB_DB_NAME || 'awscert';
  
  let client;
  
  try {
    // Test 1: Connect to MongoDB
    console.log('\n🧪 Test 1: Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    // Test 2: Get database
    console.log('\n🧪 Test 2: Getting database...');
    const db = client.db(dbName);
    console.log('✅ Database obtained:', dbName);
    
    // Test 3: List all collections
    console.log('\n🧪 Test 3: Listing all collections...');
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections found:', collections.map(c => c.name));
    
    // Test 4: Check if accessCodes collection exists and count documents
    console.log('\n🧪 Test 4: Checking accessCodes collection...');
    const accessCodesExists = collections.some(c => c.name === 'accessCodes');
    console.log('📁 accessCodes collection exists:', accessCodesExists);
    
    if (accessCodesExists) {
      const accessCodesCount = await db.collection('accessCodes').countDocuments();
      console.log('📊 Total access codes:', accessCodesCount);
      
      // Test 5: Get some sample access codes
      console.log('\n🧪 Test 5: Getting sample access codes...');
      const sampleCodes = await db.collection('accessCodes').find({}).limit(5).toArray();
      console.log('📄 Sample access codes:');
      sampleCodes.forEach((code, index) => {
        console.log(`   ${index + 1}. Code: ${code.code}, Active: ${code.isActive}, Type: ${code.certificateType || 'Unknown'}`);
      });
      
      // Test 6: Search for specific access codes
      console.log('\n🧪 Test 6: Testing specific access code searches...');
      const testCodes = ['TEST123', 'AWSCP001', 'AWS-SAA-C03'];
      
      for (const testCode of testCodes) {
        const found = await db.collection('accessCodes').findOne({ 
          code: testCode.toUpperCase(),
          isActive: true 
        });
        console.log(`🔍 ${testCode}: ${found ? '✅ Found' : '❌ Not found'}`);
        if (found) {
          console.log(`   Type: ${found.certificateType || 'Unknown'}, Created: ${found.createdAt || 'Unknown'}`);
        }
      }
    } else {
      console.log('❌ accessCodes collection does not exist');
      
      // Test 5a: Create sample access code for testing
      console.log('\n🧪 Test 5a: Creating sample access code...');
      const sampleAccessCode = {
        code: 'TEST123',
        isActive: true,
        certificateType: 'AWS Solutions Architect',
        createdAt: new Date(),
        description: 'Test access code for QuizBlitz'
      };
      
      await db.collection('accessCodes').insertOne(sampleAccessCode);
      console.log('✅ Sample access code created');
    }
    
    // Test 7: Check questions collection
    console.log('\n🧪 Test 7: Checking questions collection...');
    const questionsExists = collections.some(c => c.name === 'questions');
    console.log('📁 questions collection exists:', questionsExists);
    
    if (questionsExists) {
      const questionsCount = await db.collection('questions').countDocuments();
      console.log('📊 Total questions:', questionsCount);
      
      // Count questions by access code
      const questionsByCode = await db.collection('questions').aggregate([
        { $group: { _id: '$accessCode', count: { $sum: 1 } } },
        { $limit: 10 }
      ]).toArray();
      
      console.log('📈 Questions by access code:');
      questionsByCode.forEach(group => {
        console.log(`   ${group._id}: ${group.count} questions`);
      });
    } else {
      console.log('❌ questions collection does not exist');
    }
    
    // Test 8: Database stats
    console.log('\n🧪 Test 8: Database statistics...');
    const stats = await db.stats();
    console.log('💽 Database stats:');
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Index size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Test 9: Test the exact query that the API uses
    console.log('\n🧪 Test 9: Testing exact API query...');
    const testAccessCode = 'TEST123';
    
    console.log(`🔍 Searching for access code: ${testAccessCode}`);
    const accessCodeDoc = await db.collection('accessCodes').findOne({ 
      code: testAccessCode.toUpperCase(),
      isActive: true 
    });
    
    if (accessCodeDoc) {
      console.log('✅ Access code found:', {
        code: accessCodeDoc.code,
        isActive: accessCodeDoc.isActive,
        certificateType: accessCodeDoc.certificateType
      });
      
      // Count questions for this access code
      const questionCount = await db.collection('questions').countDocuments({
        accessCode: testAccessCode.toUpperCase()
      });
      
      console.log('📊 Questions for this access code:', questionCount);
      
      // This is what the API should return
      const apiResponse = {
        valid: true,
        accessCode: testAccessCode.toUpperCase(),
        questionCount,
        certificateType: accessCodeDoc.certificateType || 'Unknown'
      };
      
      console.log('📋 Expected API response:', JSON.stringify(apiResponse, null, 2));
    } else {
      console.log('❌ Access code not found - API should return 404');
    }
    
  } catch (error) {
    console.error('💥 MongoDB test error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🏁 MongoDB connection closed');
    }
  }
}

// Check if MongoDB is running
async function checkMongoConnection() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';
  console.log('\n🔧 Checking MongoDB connection...');
  console.log('🔗 URI:', uri);
  
  try {
    const client = new MongoClient(uri, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000 
    });
    
    await client.connect();
    console.log('✅ MongoDB is running and accessible');
    await client.close();
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Suggestion: Make sure MongoDB is running locally on port 27017');
      console.log('   You can start it with: mongod');
    }
    return false;
  }
}

// Run tests
async function runAllTests() {
  console.log('🎯 MongoDB Direct Test Suite');
  console.log('============================\n');
  
  const isConnected = await checkMongoConnection();
  
  if (isConnected) {
    await testMongoDB();
  } else {
    console.log('\n❌ Cannot run tests - MongoDB is not accessible');
    console.log('🔧 Please start MongoDB and try again');
  }
}

runAllTests().catch(console.error);
