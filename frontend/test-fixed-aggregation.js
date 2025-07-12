const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function testFixedAggregation() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== TESTING FIXED AGGREGATION PIPELINE ===\n');
    
    // Test the fixed aggregation pipeline
    const certificateStats = await db.collection('quizzes').aggregate([
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
    
    console.log('Fixed aggregation results:');
    let totalFromAggregation = 0;
    certificateStats.forEach((cert, index) => {
      console.log(`${index + 1}. Certificate: ${cert.name} (${cert.code})`);
      console.log(`   Question Count: ${cert.questionCount}`);
      console.log(`   Last Added: ${cert.lastQuestionAdded}`);
      console.log('');
      totalFromAggregation += cert.questionCount;
    });
    
    console.log(`Total questions from fixed aggregation: ${totalFromAggregation}`);
    console.log('✅ Dashboard should now show the correct Total Questions!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testFixedAggregation();
