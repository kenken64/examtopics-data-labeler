// Test the fixed payee status aggregation
const { MongoClient } = require('mongodb');

async function testFixedPayeeAggregation() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== TESTING FIXED PAYEE AGGREGATION ===\n');
    
    // Test the fixed aggregation (using 'status' field)
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
    
    console.log('Fixed aggregation results:');
    let totalPayees = 0;
    payeeStats.forEach(stat => {
      totalPayees += stat.count;
      console.log(`   - ${stat.paymentStatus}: ${stat.count}`);
    });
    console.log(`   TOTAL: ${totalPayees}`);
    
    // Also show the raw data for verification
    console.log('\nRaw payee data for verification:');
    const allPayees = await db.collection('payees').find({}, { 
      projection: { name: 1, status: 1, paymentStatus: 1 } 
    }).toArray();
    
    allPayees.forEach((payee, index) => {
      console.log(`   ${index + 1}. ${payee.name || 'Unnamed'} - status: "${payee.status}", paymentStatus: "${payee.paymentStatus}"`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testFixedPayeeAggregation().catch(console.error);
