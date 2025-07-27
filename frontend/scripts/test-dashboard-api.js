const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testDashboardAPI() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== TESTING DASHBOARD API RESPONSE ===\n');
    
    // Simulate the API call structure
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
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
      },
      {
        $limit: 30
      }
    ]).toArray();
    
    console.log('Recent Attempts Data (API format):');
    console.log(JSON.stringify(recentAttempts, null, 2));
    
    console.log('\n=== CHART DATA PROCESSING ===');
    
    // Simulate how the chart processes the data
    const sortedData = [...recentAttempts].sort((a, b) => {
      const dateA = new Date(a._id.year, a._id.month - 1, a._id.day);
      const dateB = new Date(b._id.year, b._id.month - 1, b._id.day);
      return dateA.getTime() - dateB.getTime();
    });

    console.log('Chart Labels:');
    const labels = sortedData.map(item => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    console.log(labels);
    
    console.log('\nChart Data - Attempts:');
    const attempts = sortedData.map(item => item.attempts);
    console.log(attempts);
    
    console.log('\nChart Data - Avg Scores (%):');
    const avgScores = sortedData.map(item => (item.avgScore || 0) * 100);
    console.log(avgScores);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testDashboardAPI();
