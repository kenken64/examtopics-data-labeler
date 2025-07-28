const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function fixCompaniesUserId() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🔧 Fixing companies userId to use ObjectId...');

    // Get all companies with string userId
    const companies = await db.collection('companies').find({
      userId: { $type: 'string' }
    }).toArray();

    console.log(`📊 Found ${companies.length} companies with string userId`);

    let fixedCount = 0;

    for (const company of companies) {
      try {
        if (company.userId) {
          // Convert string userId to ObjectId
          const objectIdUserId = new ObjectId(company.userId);
          
          await db.collection('companies').updateOne(
            { _id: company._id },
            { $set: { userId: objectIdUserId } }
          );
          fixedCount++;
          console.log(`   ✅ Fixed company "${company.name}" userId: ${company.userId} → ObjectId`);
        }
      } catch (error) {
        console.error(`   ❌ Error fixing company ${company._id}:`, error);
      }
    }

    console.log(`\n✅ Fix completed: ${fixedCount}/${companies.length} companies updated`);

    // Verify the fix
    const companiesAfterFix = await db.collection('companies').find({}).toArray();
    console.log('\n🏢 Companies after fix:');
    companiesAfterFix.forEach(company => {
      console.log(`   ${company.name}: userId = ${company.userId} (${typeof company.userId})`);
    });

    // Test the filter now
    const testUser = await db.collection('users').findOne({ username: 'bunnyppl@hotmail.com' });
    if (testUser) {
      const userCompanies = await db.collection('companies').find({
        userId: testUser._id
      }).toArray();
      console.log(`\n🧪 Filter test: User ${testUser.username} can see ${userCompanies.length} companies`);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await client.close();
  }
}

fixCompaniesUserId();
