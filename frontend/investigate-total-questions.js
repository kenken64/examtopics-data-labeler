const { MongoClient } = require('mongodb');
require('dotenv').config();

async function investigateTotalQuestions() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== INVESTIGATING TOTAL QUESTIONS ISSUE ===\n');
    
    // 1. Check total documents in quizzes collection
    const totalQuizCount = await db.collection('quizzes').countDocuments();
    console.log(`1. Total documents in 'quizzes' collection: ${totalQuizCount}`);
    
    // 2. Sample some quiz documents to check structure
    console.log('\n2. Sample quiz documents:');
    const sampleQuizzes = await db.collection('quizzes').find({}).limit(3).toArray();
    sampleQuizzes.forEach((quiz, index) => {
      console.log(`   ${index + 1}. ID: ${quiz._id}`);
      console.log(`      Certificate ID: ${quiz.certificateId}`);
      console.log(`      Question: ${quiz.question ? quiz.question.substring(0, 50) + '...' : 'No question field'}`);
      console.log(`      Created: ${quiz.createdAt || 'No createdAt field'}`);
      console.log('');
    });
    
    // 3. Check certificates collection
    const totalCertCount = await db.collection('certificates').countDocuments();
    console.log(`3. Total documents in 'certificates' collection: ${totalCertCount}`);
    
    const sampleCerts = await db.collection('certificates').find({}).toArray();
    console.log('\n   Certificate documents:');
    sampleCerts.forEach((cert, index) => {
      console.log(`   ${index + 1}. ID: ${cert._id}`);
      console.log(`      Name: ${cert.name}`);
      console.log(`      Code: ${cert.code}`);
      console.log('');
    });
    
    // 4. Run the exact dashboard aggregation pipeline
    console.log('4. Running dashboard aggregation pipeline:');
    const certificateStats = await db.collection('quizzes').aggregate([
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateId',
          foreignField: '_id',
          as: 'certificate'
        }
      },
      {
        $unwind: '$certificate'
      },
      {
        $group: {
          _id: '$certificateId',
          name: { $first: '$certificate.name' },
          code: { $first: '$certificate.code' },
          questionCount: { $sum: 1 },
          lastQuestionAdded: { $max: '$createdAt' }
        }
      },
      {
        $sort: { questionCount: -1 }
      }
    ]).toArray();
    
    console.log('\n   Aggregation results:');
    let totalFromAggregation = 0;
    certificateStats.forEach((cert, index) => {
      console.log(`   ${index + 1}. Certificate: ${cert.name} (${cert.code})`);
      console.log(`      Question Count: ${cert.questionCount}`);
      console.log(`      Last Added: ${cert.lastQuestionAdded}`);
      console.log('');
      totalFromAggregation += cert.questionCount;
    });
    
    console.log(`   Total from aggregation: ${totalFromAggregation}`);
    
    // 5. Check for orphaned quizzes (no matching certificate)
    console.log('\n5. Checking for orphaned quizzes (no matching certificate):');
    const orphanedQuizzes = await db.collection('quizzes').aggregate([
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateId',
          foreignField: '_id',
          as: 'certificate'
        }
      },
      {
        $match: {
          certificate: { $size: 0 }
        }
      }
    ]).toArray();
    
    console.log(`   Orphaned quizzes (no matching certificate): ${orphanedQuizzes.length}`);
    if (orphanedQuizzes.length > 0) {
      orphanedQuizzes.forEach((quiz, index) => {
        console.log(`   ${index + 1}. Quiz ID: ${quiz._id}, Certificate ID: ${quiz.certificateId}`);
      });
    }
    
    // 6. Check certificateId data types
    console.log('\n6. Checking certificateId data types in quizzes:');
    const quizzesCertIds = await db.collection('quizzes').distinct('certificateId');
    console.log('   Unique certificateId values in quizzes:');
    quizzesCertIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id} (Type: ${typeof id})`);
    });
    
    const certIds = await db.collection('certificates').distinct('_id');
    console.log('\n   _id values in certificates:');
    certIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id} (Type: ${typeof id})`);
    });
    
    // 7. Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Expected total questions: 18`);
    console.log(`Actual quizzes collection count: ${totalQuizCount}`);
    console.log(`Aggregation pipeline result total: ${totalFromAggregation}`);
    console.log(`Orphaned quizzes: ${orphanedQuizzes.length}`);
    
    if (totalQuizCount !== totalFromAggregation) {
      console.log('\n⚠️  ISSUE FOUND: Mismatch between collection count and aggregation result!');
      console.log('   This indicates some quizzes are not being matched with certificates.');
      console.log('   Possible causes:');
      console.log('   - certificateId in quizzes does not match _id in certificates');
      console.log('   - Data type mismatch (string vs ObjectId)');
      console.log('   - Missing certificates for some quizzes');
    } else {
      console.log('\n✅ Aggregation pipeline is working correctly.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

investigateTotalQuestions();
