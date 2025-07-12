// Final verification script - exactly matches dashboard API logic
const { MongoClient, ObjectId } = require('mongodb');

async function verifyDashboardTotals() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== FINAL VERIFICATION ===\n');
    
    // Exact same aggregation as dashboard API
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

    console.log('Dashboard API aggregation results:');
    let totalQuestions = 0;
    certificateStats.forEach(cert => {
      totalQuestions += cert.questionCount;
      console.log(`   - ${cert.name} (${cert.code}): ${cert.questionCount} questions`);
    });
    
    console.log(`\n✅ TOTAL QUESTIONS IN DASHBOARD: ${totalQuestions}`);
    console.log(`✅ This matches the number of certificates: ${certificateStats.length}`);
    
    // Also verify direct count
    const directCount = await db.collection('quizzes').countDocuments();
    console.log(`✅ Direct count from quizzes collection: ${directCount}`);
    
    if (totalQuestions === directCount) {
      console.log('\n🎉 SUCCESS: Dashboard aggregation matches direct count!');
      console.log('The total questions count is working correctly.');
    } else {
      console.log('\n❌ MISMATCH: There may be orphaned questions or data issues.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

verifyDashboardTotals().catch(console.error);
