const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migrateCompanies() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🏢 Migrating companies to add userId field...');

    // Get all companies without userId
    const companiesWithoutUserId = await db.collection('companies').find({
      userId: { $exists: false }
    }).toArray();

    console.log(`📊 Found ${companiesWithoutUserId.length} companies without userId`);

    if (companiesWithoutUserId.length === 0) {
      console.log('✅ All companies already have userId');
      return;
    }

    let migratedCount = 0;

    // For each company, copy createdBy to userId
    for (const company of companiesWithoutUserId) {
      try {
        if (company.createdBy) {
          // Update the company with userId = createdBy
          await db.collection('companies').updateOne(
            { _id: company._id },
            { $set: { userId: company.createdBy } }
          );
          migratedCount++;
          console.log(`   ✅ Updated company "${company.name}" with userId ${company.createdBy}`);
        } else {
          console.log(`   ⚠️ Company "${company.name}" has no createdBy field`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating company ${company._id}:`, error);
      }
    }

    console.log(`\n✅ Migration completed: ${migratedCount}/${companiesWithoutUserId.length} companies updated`);

    // Verify the migration
    const companiesWithUserId = await db.collection('companies').countDocuments({ 
      userId: { $exists: true } 
    });
    const totalCompanies = await db.collection('companies').countDocuments({});
    
    console.log(`📊 After migration: ${companiesWithUserId}/${totalCompanies} companies have userId`);

    // Show final state
    const updatedCompanies = await db.collection('companies').find({}).toArray();
    console.log('\n🏢 Final company ownership:');
    updatedCompanies.forEach(company => {
      console.log(`   ${company.name} (${company.code}): userId = ${company.userId}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrateCompanies();
