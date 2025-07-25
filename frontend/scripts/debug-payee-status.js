// Debug script to investigate payee status distribution
const { MongoClient } = require('mongodb');

async function debugPayeeStatus() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('=== PAYEE STATUS INVESTIGATION ===\n');
    
    // 1. Check raw payee data
    const allPayees = await db.collection('payees').find({}).toArray();
    console.log(`1. Total payees in database: ${allPayees.length}\n`);
    
    console.log('Raw payee data:');
    allPayees.forEach((payee, index) => {
      console.log(`   ${index + 1}. ${payee.name} - Status: "${payee.paymentStatus}" (type: ${typeof payee.paymentStatus})`);
    });
    
    // 2. Manual count by status
    console.log('\n2. Manual status count:');
    const statusCount = {};
    allPayees.forEach(payee => {
      const status = payee.paymentStatus || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    
    // 3. Current dashboard aggregation
    console.log('\n3. Current dashboard aggregation result:');
    const payeeStats = await db.collection('payees').aggregate([
      {
        $group: {
          _id: { 
            $ifNull: ['$paymentStatus', 'Unknown'] 
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
    
    console.log('Aggregation results:');
    payeeStats.forEach(stat => {
      console.log(`   - ${stat.paymentStatus}: ${stat.count}`);
    });
    
    // 4. Test different aggregation approaches
    console.log('\n4. Alternative aggregation (direct grouping):');
    const alternativeStats = await db.collection('payees').aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          paymentStatus: { $ifNull: ['$_id', 'Unknown'] },
          count: 1,
          _id: 0
        }
      }
    ]).toArray();
    
    console.log('Alternative aggregation results:');
    alternativeStats.forEach(stat => {
      console.log(`   - ${stat.paymentStatus}: ${stat.count}`);
    });
    
    // 5. Check for null/undefined values specifically
    console.log('\n5. Checking for null/undefined values:');
    const nullStatusCount = await db.collection('payees').countDocuments({ paymentStatus: null });
    const undefinedStatusCount = await db.collection('payees').countDocuments({ paymentStatus: { $exists: false } });
    const emptyStringCount = await db.collection('payees').countDocuments({ paymentStatus: '' });
    
    console.log(`   - Null paymentStatus: ${nullStatusCount}`);
    console.log(`   - Undefined paymentStatus: ${undefinedStatusCount}`);
    console.log(`   - Empty string paymentStatus: ${emptyStringCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugPayeeStatus().catch(console.error);
