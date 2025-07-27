// Test dashboard API directly
const { MongoClient } = require('mongodb');

async function testDashboardPayeeData() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== TESTING DASHBOARD PAYEE DATA ===\n');
    
    // Run the exact same aggregation as the dashboard API
    const payeeStats = await db.collection('payees').aggregate([
      {
        $group: {
          _id: { 
            $ifNull: ['$status', 'Unknown'] 
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          paymentStatus: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]).toArray();

    console.log('Dashboard API payee stats:');
    payeeStats.forEach(stat => {
      console.log(`   - ${stat.paymentStatus}: ${stat.count}`);
    });
    
    console.log('\nThis should now match your screenshot:');
    console.log('   - Paid: 4 (Kenneth Phang appears multiple times + others)');
    console.log('   - Pending: 1 (Matthew Adams)');
    console.log('   - Failed: 1 (John Smith)');
    console.log('   - Refunded: 1 (Alex Wang)');
    
    // Check if the PayeeStatusChart will receive the correct data
    console.log('\nData structure for PayeeStatusChart:');
    console.log('payees:', JSON.stringify(payeeStats, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testDashboardPayeeData().catch(console.error);
