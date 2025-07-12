// Debug script to investigate total questions count
const { MongoClient, ObjectId } = require('mongodb');

async function debugTotalQuestions() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== DEBUGGING TOTAL QUESTIONS COUNT ===\n');
    
    // 1. Check total count in quizzes collection
    const totalQuizzesCount = await db.collection('quizzes').countDocuments();
    console.log(`1. Total documents in 'quizzes' collection: ${totalQuizzesCount}`);
    
    // 2. Check certificates collection
    const certificates = await db.collection('certificates').find({}).toArray();
    console.log(`\n2. Certificates in database (${certificates.length}):`);
    certificates.forEach(cert => {
      console.log(`   - ${cert.name} (${cert.code}) - ID: ${cert._id} (type: ${typeof cert._id})`);
    });
    
    // 3. Check sample quizzes to see certificateId format
    const sampleQuizzes = await db.collection('quizzes').find({}).limit(5).toArray();
    console.log(`\n3. Sample quizzes (showing certificateId formats):`);
    sampleQuizzes.forEach((quiz, index) => {
      console.log(`   Quiz ${index + 1}: certificateId = ${quiz.certificateId} (type: ${typeof quiz.certificateId})`);
    });
    
    // 4. Run the current aggregation pipeline
    console.log('\n4. Running current aggregation pipeline:');
    const currentAggregation = await db.collection('quizzes').aggregate([
      {
        $addFields: {
          certificateObjectId: { $toObjectId: '$certificateId' }
        }
      },
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateObjectId',
          foreignField: '_id',
          as: 'certificate'
        }
      },
      {
        $unwind: '$certificate'
      },
      {
        $group: {
          _id: '$certificateObjectId',
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
    
    console.log('Current aggregation results:');
    let totalFromAggregation = 0;
    currentAggregation.forEach(cert => {
      totalFromAggregation += cert.questionCount;
      console.log(`   - ${cert.name} (${cert.code}): ${cert.questionCount} questions`);
    });
    console.log(`   TOTAL from aggregation: ${totalFromAggregation}`);
    
    // 5. Try aggregation without conversion to see if that's the issue
    console.log('\n5. Testing aggregation WITHOUT ObjectId conversion:');
    const noConversionAggregation = await db.collection('quizzes').aggregate([
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
          'certificate.0': { $exists: true }  // Only include quizzes with matching certificates
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
    
    console.log('Aggregation WITHOUT ObjectId conversion:');
    let totalWithoutConversion = 0;
    noConversionAggregation.forEach(cert => {
      totalWithoutConversion += cert.questionCount;
      console.log(`   - ${cert.name} (${cert.code}): ${cert.questionCount} questions`);
    });
    console.log(`   TOTAL without conversion: ${totalWithoutConversion}`);
    
    // 6. Check for orphaned quizzes (those without matching certificates)
    console.log('\n6. Checking for orphaned quizzes:');
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
          'certificate.0': { $exists: false }  // Quizzes without matching certificates
        }
      },
      {
        $group: {
          _id: '$certificateId',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    if (orphanedQuizzes.length > 0) {
      console.log('Found orphaned quizzes:');
      orphanedQuizzes.forEach(orphan => {
        console.log(`   - certificateId: ${orphan._id} - Count: ${orphan.count}`);
      });
    } else {
      console.log('No orphaned quizzes found.');
    }
    
    // 7. Try converting certificateId strings to ObjectId in the lookup
    console.log('\n7. Testing aggregation with string-to-ObjectId conversion:');
    const stringToObjectIdAggregation = await db.collection('quizzes').aggregate([
      {
        $addFields: {
          certificateObjectId: {
            $cond: {
              if: { $type: '$certificateId' === 'string' },
              then: { $toObjectId: '$certificateId' },
              else: '$certificateId'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateObjectId',
          foreignField: '_id',
          as: 'certificate'
        }
      },
      {
        $match: {
          'certificate.0': { $exists: true }
        }
      },
      {
        $unwind: '$certificate'
      },
      {
        $group: {
          _id: '$certificateObjectId',
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
    
    console.log('String-to-ObjectId aggregation results:');
    let totalWithStringConversion = 0;
    stringToObjectIdAggregation.forEach(cert => {
      totalWithStringConversion += cert.questionCount;
      console.log(`   - ${cert.name} (${cert.code}): ${cert.questionCount} questions`);
    });
    console.log(`   TOTAL with string conversion: ${totalWithStringConversion}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run the debug function
debugTotalQuestions().catch(console.error);
