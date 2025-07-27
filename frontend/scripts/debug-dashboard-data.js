const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugDashboardData() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== DEBUGGING DASHBOARD DATA ===\n');
    
    // Check if quiz-attempts collection exists and has data
    const quizAttempts = await db.collection('quiz-attempts').find({}).limit(5).toArray();
    console.log('Quiz Attempts Collection:');
    console.log(`Total documents: ${await db.collection('quiz-attempts').countDocuments()}`);
    console.log('Sample documents:');
    quizAttempts.forEach((attempt, index) => {
      console.log(`${index + 1}. User: ${attempt.userId}, Score: ${attempt.correctAnswers}/${attempt.totalQuestions}, Date: ${attempt.createdAt}`);
      console.log(`   Access Code: ${attempt.accessCode}`);
      console.log(`   Certificate: ${attempt.certificateName} (${attempt.certificateCode})`);
      console.log('');
    });
    
    // Check recent quiz attempts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCount = await db.collection('quiz-attempts').countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    console.log(`Recent quiz attempts (last 30 days): ${recentCount}`);
    
    if (recentCount > 0) {
      const recentAttempts = await db.collection('quiz-attempts').aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            attempts: { $sum: 1 },
            avgScore: { $avg: { $divide: ['$correctAnswers', '$totalQuestions'] } }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]).toArray();
      
      console.log('\nDaily aggregated data:');
      recentAttempts.forEach(day => {
        const date = new Date(day._id.year, day._id.month - 1, day._id.day);
        console.log(`${date.toDateString()}: ${day.attempts} attempts, ${Math.round(day.avgScore * 100)}% avg score`);
      });
    }
    
    // Check other collections
    console.log('\n=== OTHER COLLECTIONS ===');
    const collections = ['certificates', 'access-code-questions', 'payees', 'bookmarks', 'wrong-answers'];
    for (const collectionName of collections) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`${collectionName}: ${count} documents`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugDashboardData();
